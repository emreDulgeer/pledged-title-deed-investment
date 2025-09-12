// src/store/slices/propertySlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import bridge from "../../controllers/bridge";

// Async thunks
export const fetchProperties = createAsyncThunk(
  "properties/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await bridge.properties.adminGetAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchPropertyById = createAsyncThunk(
  "properties/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await bridge.properties.getById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const createProperty = createAsyncThunk(
  "properties/create",
  async (propertyData, { rejectWithValue }) => {
    try {
      const response = await bridge.properties.create(propertyData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updateProperty = createAsyncThunk(
  "properties/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await bridge.properties.update(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const deleteProperty = createAsyncThunk(
  "properties/delete",
  async (id, { rejectWithValue }) => {
    try {
      await bridge.properties.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updatePropertyStatus = createAsyncThunk(
  "properties/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await bridge.properties.updateStatus(id, status);
      return { id, property: response.data };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  list: [],
  currentProperty: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  },
  filters: {
    country: "",
    city: "",
    propertyType: "",
    status: "",
    minValue: "",
    maxValue: "",
    search: "",
  },
  loading: false,
  error: null,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
};

const propertySlice = createSlice({
  name: "properties",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentProperty: (state, action) => {
      state.currentProperty = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all properties
      .addCase(fetchProperties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination || initialState.pagination;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch properties";
      })
      // Fetch property by ID
      .addCase(fetchPropertyById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProperty = action.payload;
      })
      .addCase(fetchPropertyById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch property";
      })
      // Create property
      .addCase(createProperty.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createProperty.fulfilled, (state, action) => {
        state.createLoading = false;
        state.list.unshift(action.payload);
      })
      .addCase(createProperty.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload?.message || "Failed to create property";
      })
      // Update property
      .addCase(updateProperty.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateProperty.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.currentProperty?.id === action.payload.id) {
          state.currentProperty = action.payload;
        }
      })
      .addCase(updateProperty.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload?.message || "Failed to update property";
      })
      // Delete property
      .addCase(deleteProperty.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteProperty.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.list = state.list.filter((p) => p.id !== action.payload);
      })
      .addCase(deleteProperty.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload?.message || "Failed to delete property";
      })
      // Update status
      .addCase(updatePropertyStatus.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updatePropertyStatus.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload.property;
        }
        if (state.currentProperty?.id === action.payload.id) {
          state.currentProperty = action.payload.property;
        }
      })
      .addCase(updatePropertyStatus.rejected, (state, action) => {
        state.updateLoading = false;
        state.error =
          action.payload?.message || "Failed to update property status";
      });
  },
});

export const { setFilters, clearFilters, setCurrentProperty, clearError } =
  propertySlice.actions;
export default propertySlice.reducer;

// Selectors
export const selectProperties = (state) => state.properties.list;
export const selectCurrentProperty = (state) =>
  state.properties.currentProperty;
export const selectPropertyPagination = (state) => state.properties.pagination;
export const selectPropertyFilters = (state) => state.properties.filters;
export const selectPropertyLoading = (state) => state.properties.loading;
export const selectPropertyError = (state) => state.properties.error;
