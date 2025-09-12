// src/components/auth/RoleBasedRoute.jsx
import React from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../store/slices/authSlice";
import PropTypes from "prop-types";

const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
  const user = useSelector(selectUser);

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <h2 className="mt-2 text-lg font-medium text-gray-900">
              Access Denied
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You don't have permission to access this page.
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

RoleBasedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};

export default RoleBasedRoute;
