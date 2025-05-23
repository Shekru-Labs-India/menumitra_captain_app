import React from 'react';
import { cachedRequest } from './cachedAxios';

/**
 * Higher-Order Component that adds caching capability to any component
 * 
 * This HOC provides a fetchWithCache method that automatically handles:
 * 1. Immediate display of cached data
 * 2. Background fetch of fresh data
 * 3. UI updates when fresh data arrives
 * 
 * @param {React.Component} WrappedComponent - The component to enhance with caching
 * @returns {React.Component} - Enhanced component with caching capability
 */
const withCaching = (WrappedComponent) => {
  return (props) => {
    /**
     * Fetch data with automatic caching
     * 
     * @param {string} endpoint - API endpoint
     * @param {object} requestData - Request payload
     * @param {object} options - Additional axios options (headers, etc.)
     * @param {function} updateStateFn - Function to handle the response data
     * @param {boolean} showLoader - Whether to show loading state
     * @returns {Promise} - Promise that resolves with the API response
     */
    const fetchWithCache = async (endpoint, requestData, options, updateStateFn, showLoader = false) => {
      return cachedRequest(endpoint, requestData, options, updateStateFn);
    };

    // Pass the fetchWithCache method as a prop to the wrapped component
    return <WrappedComponent {...props} fetchWithCache={fetchWithCache} />;
  };
};

export default withCaching; 