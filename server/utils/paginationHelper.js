class PaginationHelper {
  static getPaginationParams(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const safeLimit = Math.min(limit, 100);

    return {
      page,
      limit: safeLimit,
      skip,
    };
  }

  static getSortParams(query, allowedFields = []) {
    const { sortBy = "createdAt", sortOrder = "desc" } = query;

    const safeSortBy =
      allowedFields.length > 0 && !allowedFields.includes(sortBy)
        ? "createdAt"
        : sortBy;

    const safeSortOrder = sortOrder === "asc" ? 1 : -1;

    return { [safeSortBy]: safeSortOrder };
  }

  static getFilterParams(query, allowedFilters = {}) {
    const filters = {};

    Object.keys(allowedFilters).forEach((key) => {
      const filterType = allowedFilters[key];

      switch (filterType) {
        case "numberRange": {
          const minKey = `${key}Min`;
          const maxKey = `${key}Max`;
          if (query[minKey] !== undefined || query[maxKey] !== undefined) {
            filters[key] = {};
            if (query[minKey] !== undefined) {
              filters[key].$gte = Number(query[minKey]);
            }
            if (query[maxKey] !== undefined) {
              filters[key].$lte = Number(query[maxKey]);
            }
          }
          break;
        }

        default: {
          if (query[key] !== undefined && query[key] !== "") {
            switch (filterType) {
              case "exact":
                filters[key] = query[key];
                break;

              case "contains":
                filters[key] = { $regex: query[key], $options: "i" };
                break;

              case "number":
                filters[key] = Number(query[key]);
                break;

              case "boolean":
                filters[key] = query[key] === "true";
                break;

              case "array":
                filters[key] = {
                  $in: Array.isArray(query[key]) ? query[key] : [query[key]],
                };
                break;

              case "dateRange":
                const start = query[`${key}Start`];
                const end = query[`${key}End`];
                if (start || end) {
                  filters[key] = {};
                  if (start) filters[key].$gte = new Date(start);
                  if (end) filters[key].$lte = new Date(end);
                }
                break;
            }
          }
        }
      }
    });

    return filters;
  }

  static async paginate(model, query = {}, options = {}) {
    const {
      populate = "",
      select = "",
      allowedFilters = {},
      allowedSortFields = [],
      customFilters = {},
    } = options;

    const { page, limit, skip } = this.getPaginationParams(query);

    const sort = this.getSortParams(query, allowedSortFields);

    const queryFilters = this.getFilterParams(query, allowedFilters);
    const filters = { ...queryFilters, ...customFilters };
    console.log("🎯 Final Applied Filters:", JSON.stringify(filters, null, 2));
    const total = await model.countDocuments(filters);

    let queryBuilder = model.find(filters).sort(sort).skip(skip).limit(limit);

    if (populate) {
      queryBuilder = queryBuilder.populate(populate);
    }

    if (select) {
      queryBuilder = queryBuilder.select(select);
    }

    const data = await queryBuilder;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}

const propertyFilters = {
  country: "exact",
  city: "contains",
  propertyType: "exact",
  status: "exact",
  currency: "exact",
  requestedInvestment: "numberRange",
  annualYieldPercent: "numberRange",
  size: "numberRange",
  rooms: "numberRange",
  contractPeriodMonths: "numberRange",
  trustScore: "numberRange",
  createdAt: "dateRange",
};

const propertySortFields = [
  "createdAt",
  "updatedAt",
  "requestedInvestment",
  "annualYieldPercent",
  "size",
  "rooms",
  "trustScore",
  "rentOffered",
];

const investmentFilters = {
  status: "exact",
  currency: "exact",
  amountInvested: "numberRange",
  createdAt: "dateRange",
  // Property filters through populate
  "property.country": "exact",
  "property.city": "contains",
  "property.propertyType": "exact",
};

const investmentSortFields = [
  "createdAt",
  "updatedAt",
  "amountInvested",
  "status",
];

module.exports = {
  PaginationHelper,
  propertyFilters,
  propertySortFields,
  investmentFilters,
  investmentSortFields,
};
