// src/store/slices/userSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import bridge from "../../controllers/bridge";

// Async thunks
export const fetchUsers = createAsyncThunk(
  "users/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await bridge.users.getAllUsers(params);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchUserById = createAsyncThunk(
  "users/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await bridge.users.getUserById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await bridge.users.updateUser(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id, { rejectWithValue }) => {
    try {
      await bridge.users.deleteUser(id);
      return id;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchInvestors = createAsyncThunk(
  "users/fetchInvestors",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await bridge.investors.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchPropertyOwners = createAsyncThunk(
  "users/fetchPropertyOwners",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await bridge.propertyOwners.getAll(params);
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updateInvestorKYC = createAsyncThunk(
  "users/updateInvestorKYC",
  async ({ id, kycData }, { rejectWithValue }) => {
    try {
      const response = await bridge.investors.updateKYC(id, kycData);
      return { id, data: response.data };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const updatePropertyOwnerVerification = createAsyncThunk(
  "users/updatePropertyOwnerVerification",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await bridge.propertyOwners.updateVerificationStatus(
        id,
        status
      );
      return { id, data: response.data };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  users: {
    list: [],
    current: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      hasNext: false,
      hasPrev: false,
    },
  },
  investors: {
    list: [],
    current: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      hasNext: false,
      hasPrev: false,
    },
  },
  propertyOwners: {
    list: [],
    current: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 10,
      hasNext: false,
      hasPrev: false,
    },
  },
  filters: {
    role: "",
    status: "",
    country: "",
    search: "",
    kycStatus: "",
    verificationStatus: "",
  },
  loading: false,
  error: null,
  updateLoading: false,
};

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setCurrentUser: (state, action) => {
      state.users.current = action.payload;
    },
    setCurrentInvestor: (state, action) => {
      state.investors.current = action.payload;
    },
    setCurrentPropertyOwner: (state, action) => {
      state.propertyOwners.current = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all users
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users.list = action.payload.data;
        state.users.pagination =
          action.payload.pagination || initialState.users.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch users";
      })
      // Fetch user by ID
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.users.current = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch user";
      })
      // Update user
      .addCase(updateUser.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.users.list.findIndex(
          (u) => u.id === action.payload.id
        );
        if (index !== -1) {
          state.users.list[index] = action.payload;
        }
        if (state.users.current?.id === action.payload.id) {
          state.users.current = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload?.message || "Failed to update user";
      })
      // Delete user
      .addCase(deleteUser.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.users.list = state.users.list.filter(
          (u) => u.id !== action.payload
        );
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload?.message || "Failed to delete user";
      })
      // Fetch investors
      .addCase(fetchInvestors.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvestors.fulfilled, (state, action) => {
        state.loading = false;
        state.investors.list = action.payload.data;
        state.investors.pagination =
          action.payload.pagination || initialState.investors.pagination;
      })
      .addCase(fetchInvestors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch investors";
      })
      // Fetch property owners
      .addCase(fetchPropertyOwners.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPropertyOwners.fulfilled, (state, action) => {
        state.loading = false;
        state.propertyOwners.list = action.payload.data;
        state.propertyOwners.pagination =
          action.payload.pagination || initialState.propertyOwners.pagination;
      })
      .addCase(fetchPropertyOwners.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.message || "Failed to fetch property owners";
      })
      // Update investor KYC
      .addCase(updateInvestorKYC.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateInvestorKYC.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.investors.list.findIndex(
          (i) => i.id === action.payload.id
        );
        if (index !== -1) {
          state.investors.list[index] = action.payload.data;
        }
      })
      .addCase(updateInvestorKYC.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload?.message || "Failed to update KYC";
      })
      // Update property owner verification
      .addCase(updatePropertyOwnerVerification.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updatePropertyOwnerVerification.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.propertyOwners.list.findIndex(
          (po) => po.id === action.payload.id
        );
        if (index !== -1) {
          state.propertyOwners.list[index] = action.payload.data;
        }
      })
      .addCase(updatePropertyOwnerVerification.rejected, (state, action) => {
        state.updateLoading = false;
        state.error =
          action.payload?.message || "Failed to update verification status";
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setCurrentUser,
  setCurrentInvestor,
  setCurrentPropertyOwner,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;

// Selectors
export const selectAllUsers = (state) => state.users.users.list;
export const selectCurrentUser = (state) => state.users.users.current;
export const selectUsersPagination = (state) => state.users.users.pagination;

export const selectAllInvestors = (state) => state.users.investors.list;
export const selectCurrentInvestor = (state) => state.users.investors.current;
export const selectInvestorsPagination = (state) =>
  state.users.investors.pagination;

export const selectAllPropertyOwners = (state) =>
  state.users.propertyOwners.list;
export const selectCurrentPropertyOwner = (state) =>
  state.users.propertyOwners.current;
export const selectPropertyOwnersPagination = (state) =>
  state.users.propertyOwners.pagination;

export const selectUserFilters = (state) => state.users.filters;
export const selectUserLoading = (state) => state.users.loading;
export const selectUserError = (state) => state.users.error;
