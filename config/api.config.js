const ENV = {
  dev: "development",
  prod: "production",
};

// Set this to change environments
const CURRENT_ENV = ENV.dev;

// Base URLs
const DEVELOPMENT_API = "https://men4u.xyz/1.3/common_api";
const PRODUCTION_API = "https://menusmitra.xyz/1.3/common_api";

// API Configuration
const API_CONFIG = {
  [ENV.dev]: {
    BASE_URL: DEVELOPMENT_API,
  },
  [ENV.prod]: {
    BASE_URL: PRODUCTION_API,
  },
};

// Helper function to get base API URL
export const getBaseUrl = () => {
  return API_CONFIG[CURRENT_ENV].BASE_URL;
};

// Export current environment
export const getCurrentEnv = () => CURRENT_ENV;

// Example usage:
// import { getBaseUrl } from '../config/api.config';
// const apiUrl = getBaseUrl() + '/menu_view';

// Add this to your existing config

export const STABILITY_API_KEY = "sk-bWI6e3m25rIxbHN4B37GgCW0g45OJdtCA9TkLrfUJHROVWH3";

