const mockInvestmentRepository = {
  findById: jest.fn(),
  createRepresentativeRequestIfAvailable: jest.fn(),
  claimRepresentativeRequestIfPending: jest.fn(),
  paginate: jest.fn(),
};

const mockLocalRepresentativeModel = {
  findById: jest.fn(),
};

jest.mock("../../repositories/investmentRepository", () =>
  jest.fn().mockImplementation(() => mockInvestmentRepository)
);

jest.mock("../../repositories/propertyRepository", () =>
  jest.fn().mockImplementation(() => ({}))
);

jest.mock("../../repositories/investorRepository", () =>
  jest.fn().mockImplementation(() => ({}))
);

jest.mock("../../models/LocalRepresentative", () => mockLocalRepresentativeModel);

const InvestmentService = require("../../services/investmentService");

const objectIdLike = (value) => ({
  toString: () => String(value),
});

const buildRequestableInvestment = () => ({
  _id: "investment-1",
  property: {
    owner: objectIdLike("owner-1"),
    country: "Portugal",
    city: "Porto",
  },
  investor: {
    _id: objectIdLike("investor-1"),
  },
  localRepresentative: null,
  representativeRequestStatus: "none",
});

describe("InvestmentService local representative guards", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new InvestmentService();
    service.safeNotify = jest.fn().mockResolvedValue(null);
    service.loadInvestmentForResponse = jest
      .fn()
      .mockResolvedValue({ id: "investment-1", refreshed: true });
    service.toDetailResponse = jest.fn((value) => value);
  });

  test("rejects a concurrent second representative request cleanly", async () => {
    mockInvestmentRepository.findById
      .mockResolvedValueOnce(buildRequestableInvestment())
      .mockResolvedValueOnce({
        localRepresentative: null,
        representativeRequestStatus: "pending",
      });
    mockInvestmentRepository.createRepresentativeRequestIfAvailable.mockResolvedValueOnce(
      null
    );

    await expect(
      service.requestLocalRepresentative(
        "investment-1",
        "owner-1",
        "property_owner"
      )
    ).rejects.toThrow("A representative request is already pending");

    expect(
      mockInvestmentRepository.createRepresentativeRequestIfAvailable
    ).toHaveBeenCalledWith(
      "investment-1",
      expect.objectContaining({
        representativeRequestedBy: "owner-1",
        representativeRequestedByRole: "property_owner",
        representativeRequestedRegion: "Portugal",
        representativeRequestStatus: "pending",
      })
    );
    expect(service.safeNotify).not.toHaveBeenCalled();
  });

  test("returns refreshed investment when the request wins the race", async () => {
    mockInvestmentRepository.findById.mockResolvedValueOnce(
      buildRequestableInvestment()
    );
    mockInvestmentRepository.createRepresentativeRequestIfAvailable.mockResolvedValueOnce(
      { _id: "investment-1" }
    );

    await expect(
      service.requestLocalRepresentative(
        "investment-1",
        "investor-1",
        "investor"
      )
    ).resolves.toEqual({ id: "investment-1", refreshed: true });

    expect(service.safeNotify).toHaveBeenCalledWith(
      "notifyAdminRepresentativeRequested",
      "investment-1",
      expect.objectContaining({
        requestedBy: "investor-1",
        propertyCity: "Porto",
      })
    );
  });

  test("rejects a concurrent second representative claim cleanly", async () => {
    mockLocalRepresentativeModel.findById.mockResolvedValue({
      _id: "rep-1",
      accountStatus: "active",
      regions: ["Portugal"],
    });
    mockInvestmentRepository.findById
      .mockResolvedValueOnce({
        _id: "investment-1",
        property: {
          country: "Portugal",
          city: "Porto",
        },
        investor: {
          _id: objectIdLike("investor-1"),
        },
        localRepresentative: null,
        representativeRequestStatus: "pending",
      })
      .mockResolvedValueOnce({
        localRepresentative: "rep-2",
        representativeRequestStatus: "fulfilled",
      });
    mockInvestmentRepository.claimRepresentativeRequestIfPending.mockResolvedValueOnce(
      null
    );

    await expect(
      service.claimRepresentativeRequest("investment-1", "rep-1")
    ).rejects.toThrow("This request has already been claimed");

    expect(
      mockInvestmentRepository.claimRepresentativeRequestIfPending
    ).toHaveBeenCalledWith(
      "investment-1",
      "rep-1",
      expect.any(Date)
    );
    expect(service.safeNotify).not.toHaveBeenCalled();
  });

  test("does not require local representative approval for signed contracts", () => {
    const investment = {
      investor: { _id: "investor-1" },
      propertyOwner: { _id: "owner-1" },
      localRepresentative: { _id: "rep-1" },
      property: { owner: "owner-1" },
    };

    expect(
      service.getRequiredApprovalsForDocument(
        "contract_investor_signed",
        investment,
        "investor-1"
      )
    ).toEqual([
      expect.objectContaining({
        reviewerId: "owner-1",
        reviewerRole: "property_owner",
      }),
    ]);

    expect(
      service.getRequiredApprovalsForDocument(
        "contract_owner_signed",
        investment,
        "owner-1"
      )
    ).toEqual([
      expect.objectContaining({
        reviewerId: "investor-1",
        reviewerRole: "investor",
      }),
    ]);
  });

  test("still requires local representative approval for title deed stage documents", () => {
    const investment = {
      investor: { _id: "investor-1" },
      propertyOwner: { _id: "owner-1" },
      localRepresentative: { _id: "rep-1" },
      property: { owner: "owner-1" },
    };

    expect(
      service.getRequiredApprovalsForDocument(
        "title_deed",
        investment,
        "owner-1"
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reviewerId: "investor-1",
          reviewerRole: "investor",
        }),
        expect.objectContaining({
          reviewerId: "rep-1",
          reviewerRole: "local_representative",
        }),
      ])
    );
  });

  test("maps investor rental payments with property snapshot and date aliases", async () => {
    const paidAt = new Date("2026-06-15T00:00:00.000Z");
    const dueDate = new Date("2026-06-10T00:00:00.000Z");

    mockInvestmentRepository.paginate.mockResolvedValueOnce({
      data: [
        {
          _id: "investment-1",
          property: {
            _id: "property-1",
            title: "Avenida dos Aliados 45",
            city: "Porto",
            country: "Portugal",
            fullAddress: "Avenida dos Aliados 45, Porto, Portugal",
            propertyType: "house",
          },
          propertyOwner: {
            fullName: "Owner Name",
          },
          rentalPayments: [
            {
              month: "2026-06",
              amount: 1200,
              status: "paid",
              dueDate,
              paidAt,
              paymentReceipt: {
                url: "https://example.com/receipt.pdf",
              },
            },
          ],
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
      },
    });

    const result = await service.getInvestorRentalPayments("investor-1");

    expect(result.data[0]).toMatchObject({
      investmentId: "investment-1",
      propertyId: "property-1",
      propertyTitle: "Avenida dos Aliados 45",
      propertyCity: "Porto",
      propertyCountry: "Portugal",
      propertyOwnerName: "Owner Name",
      dueDate,
      expectedDate: dueDate,
      paidAt,
      receivedAt: paidAt,
      receiptUrl: "https://example.com/receipt.pdf",
      property: expect.objectContaining({
        id: "property-1",
        title: "Avenida dos Aliados 45",
      }),
    });
  });

  test("maps owner rental payments with investor name and property snapshot", async () => {
    const dueDate = new Date("2026-07-10T00:00:00.000Z");

    mockInvestmentRepository.paginate.mockResolvedValueOnce({
      data: [
        {
          _id: "investment-2",
          property: {
            _id: "property-2",
            title: "Rua do Almada 12",
            city: "Porto",
            country: "Portugal",
            propertyType: "apartment",
          },
          investor: {
            fullName: "Investor Name",
          },
          rentalPayments: [
            {
              month: "2026-07",
              amount: 950,
              status: "pending",
              dueDate,
              paidAt: null,
            },
          ],
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
      },
    });

    const result = await service.getPropertyOwnerRentalPayments("owner-1");

    expect(result.data[0]).toMatchObject({
      investmentId: "investment-2",
      propertyId: "property-2",
      propertyTitle: "Rua do Almada 12",
      propertyCity: "Porto",
      propertyCountry: "Portugal",
      investorName: "Investor Name",
      dueDate,
      expectedDate: dueDate,
      paidAt: null,
      receivedAt: null,
      property: expect.objectContaining({
        id: "property-2",
        title: "Rua do Almada 12",
      }),
    });
  });
});
