const mockInvestmentRepository = {
  findById: jest.fn(),
  createRepresentativeRequestIfAvailable: jest.fn(),
  claimRepresentativeRequestIfPending: jest.fn(),
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
});
