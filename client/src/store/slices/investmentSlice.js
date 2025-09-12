// src/store/slices/investmentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import bridge from "../../controllers/bridge";

// Async thunks
export const fetchInvestments = createAsyncThunk(
  "investments/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await bridge.investments.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchInvestmentById = createAsyncThunk(
  "investments/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await bridge.investments.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updateInvestmentStatus = createAsyncThunk(
  "investments/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await bridge.investments.updateStatus(id, status);
      return { id, investment: response.data };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updateRentalPayment = createAsyncThunk(
  "investments/updatePayment",
  async ({ investmentId, paymentId, data }, { rejectWithValue }) => {
    try {
      const response = await bridge.investments.updatePayment(
        investmentId,
        paymentId,
        data
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const uploadInvestmentDocument = createAsyncThunk(
  "investments/uploadDocument",
  async ({ id, type, formData }, { rejectWithValue }) => {
    try {
      const response = await bridge.investments.uploadDocument(
        id,
        type,
        formData
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  list: [],
  currentInvestment: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  },
  filters: {
    status: "",
    propertyCountry: "",
    investorCountry: "",
    minAmount: "",
    maxAmount: "",
    search: "",
    dateRange: {
      start: "",
      end: "",
    },
  },
  statistics: {
    totalInvestments: 0,
    activeInvestments: 0,
    totalAmount: 0,
    averageROI: 0,
  },
  loading: false,
  error: null,
  updateLoading: false,
  uploadLoading: false,
};

const investmentSlice = createSlice({
  name: "investments",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentInvestment: (state, action) => {
      state.currentInvestment = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateInvestmentInList: (state, action) => {
      const index = state.list.findIndex((i) => i.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all investments
      .addCase(fetchInvestments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvestments.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination || initialState.pagination;
        // Calculate statistics
        if (action.payload.statistics) {
          state.statistics = action.payload.statistics;
        }
      })
      .addCase(fetchInvestments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch investments";
      })
      // Fetch investment by ID
      .addCase(fetchInvestmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvestmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvestment = action.payload;
      })
      .addCase(fetchInvestmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch investment";
      })
      // Update investment status
      .addCase(updateInvestmentStatus.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateInvestmentStatus.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.list.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload.investment;
        }
        if (state.currentInvestment?.id === action.payload.id) {
          state.currentInvestment = action.payload.investment;
        }
      })
      .addCase(updateInvestmentStatus.rejected, (state, action) => {
        state.updateLoading = false;
        state.error =
          action.payload?.message || "Failed to update investment status";
      })
      // Update rental payment
      .addCase(updateRentalPayment.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateRentalPayment.fulfilled, (state, action) => {
        state.updateLoading = false;
        if (state.currentInvestment?.id === action.payload.id) {
          state.currentInvestment = action.payload;
        }
      })
      .addCase(updateRentalPayment.rejected, (state, action) => {
        state.updateLoading = false;
        state.error =
          action.payload?.message || "Failed to update rental payment";
      })
      // Upload document
      .addCase(uploadInvestmentDocument.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
      })
      .addCase(uploadInvestmentDocument.fulfilled, (state, action) => {
        state.uploadLoading = false;
        if (state.currentInvestment?.id === action.payload.id) {
          state.currentInvestment = action.payload;
        }
      })
      .addCase(uploadInvestmentDocument.rejected, (state, action) => {
        state.uploadLoading = false;
        state.error = action.payload?.message || "Failed to upload document";
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setCurrentInvestment,
  clearError,
  updateInvestmentInList,
} = investmentSlice.actions;

export default investmentSlice.reducer;

// Selectors
export const selectInvestments = (state) => state.investments.list;
export const selectCurrentInvestment = (state) =>
  state.investments.currentInvestment;
export const selectInvestmentPagination = (state) =>
  state.investments.pagination;
export const selectInvestmentFilters = (state) => state.investments.filters;
export const selectInvestmentStatistics = (state) =>
  state.investments.statistics;
export const selectInvestmentLoading = (state) => state.investments.loading;
export const selectInvestmentError = (state) => state.investments.error;
