# Global Caching and Session Management Implementation Guide

This document explains how to use our global caching system and the automatic device session ID management.

## Overview

Our system provides two key features:

1. **Automatic Device Session ID Management** - Automatically adds the device session ID to all API requests
2. **Global Caching System** - Shows cached data immediately while fetching fresh data in the background

## Automatic Device Session ID

The system automatically adds the device session ID to all API requests, so you don't need to include it manually in each API call.

### How It Works

1. A request interceptor in `axiosConfig.js` automatically adds the device session ID to every request
2. Works with both POST and GET requests
3. Handles different types of request data (JSON objects, FormData, etc.)

### When You Receive the Session ID (e.g., after OTP verification)

When you receive the device session ID from the API (typically in the OTP or login response), save it like this:

```javascript
import { saveDeviceSessionId } from "../../../utils/sessionManager";

// Inside your login/OTP success handler
const handleLoginSuccess = (response) => {
  // Assuming response.data.device_sessid contains the session ID
  if (response.data.device_sessid) {
    saveDeviceSessionId(response.data.device_sessid);
  }
  
  // Rest of your login success code
};
```

That's it! Once saved, the session ID will automatically be included in all subsequent API requests.

## Global Caching System

Our caching system provides two ways to implement caching in your screens:

1. **Higher-Order Component (HOC) Approach** - Recommended for most screens
2. **Direct API Approach** - For more complex scenarios with custom logic

Both approaches automatically:
- Show cached data immediately (no loading delay)
- Fetch fresh data in the background
- Update the UI when fresh data arrives

### 1. Using the HOC Approach (Recommended)

The HOC approach is the simplest way to add caching to any component. The `withCaching` HOC adds a `fetchWithCache` method to your component's props.

#### Step 1: Import the HOC

```javascript
import withCaching from "../../../utils/withCaching";
```

#### Step 2: Update your component to receive the fetchWithCache prop

```javascript
const YourScreen = ({ fetchWithCache }) => {
  // Component code
};
```

#### Step 3: Replace your axios call with fetchWithCache

```javascript
const fetchData = async () => {
  try {
    const endpoint = "your-api-endpoint";
    const requestData = { your: "data" };
    const options = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };
    
    // Create a function to update your state
    const updateState = (responseData) => {
      if (responseData.status === "success") {
        setYourData(responseData.data);
      }
    };
    
    // Use fetchWithCache
    await fetchWithCache(endpoint, requestData, options, updateState);
  } catch (error) {
    // Handle error
  }
};
```

#### Step 4: Wrap your component with the HOC

```javascript
export default withCaching(YourScreen);
```

### 2. Direct API Approach

For more complex scenarios, you can use the `cachedRequest` function directly.

#### Step 1: Import cachedRequest

```javascript
import { cachedRequest } from "../../../utils/cachedAxios";
```

#### Step 2: Use cachedRequest in your component

```javascript
const fetchData = async () => {
  try {
    const endpoint = "your-api-endpoint";
    const requestData = { your: "data" };
    const options = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };
    
    // Create a function to update your state
    const updateState = (responseData) => {
      if (responseData.status === "success") {
        setYourData(responseData.data);
      }
    };
    
    // Use cachedRequest directly
    await cachedRequest(endpoint, requestData, options, updateState);
  } catch (error) {
    // Handle error
  }
};
```

## Cache Clearing

To clear the cache for specific endpoints or all cached data:

```javascript
import { clearCache, clearAllCache } from "../../../utils/cachedAxios";

// Clear specific cache
const clearSpecificCache = async () => {
  await clearCache("your-api-endpoint", { your: "data" });
};

// Clear all caches for the current session
const clearAllCaches = async () => {
  await clearAllCache();
};
```

## Best Practices

1. **Save the device session ID immediately** after receiving it in the OTP/login response
2. **Don't manually add the device_sessid parameter** to your API calls - it's automatically handled
3. **Use withCaching HOC** for most screens to keep the implementation simple
4. **Don't show loading indicators** for initial data fetch
5. **Use refreshing indicators** for user-initiated refreshes (pull-to-refresh)
6. **Clear relevant caches** when data is modified (create, update, delete)

## Example Implementation

Here's a complete example of a screen that uses both the session ID and caching features:

```javascript
import React, { useState, useEffect } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import withCaching from "../../../utils/withCaching";
import { saveDeviceSessionId } from "../../../utils/sessionManager";

// Login component example
const Login = ({ navigation }) => {
  const handleLogin = async (phone, otp) => {
    try {
      const response = await axiosInstance.post("auth/verify", { 
        phone, 
        otp 
      });
      
      if (response.data.success) {
        // Save the device session ID from the response
        if (response.data.device_sessid) {
          saveDeviceSessionId(response.data.device_sessid);
        }
        
        // Navigate to home screen
        navigation.navigate("Home");
      }
    } catch (error) {
      // Handle error
    }
  };
  
  // Rest of the login component...
};

// Products list component example with caching
const ProductsList = ({ fetchWithCache }) => {
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchProducts = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const endpoint = "api/products";
      const requestData = { category: "all" };
      const options = { headers: { /* your headers */ } };
      
      const updateProducts = (response) => {
        if (response.success) {
          setProducts(response.products);
        }
      };
      
      // The device_sessid is automatically added by the request interceptor
      await fetchWithCache(endpoint, requestData, options, updateProducts);
    } catch (error) {
      // Handle error
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchProducts();
  }, []);
  
  return (
    <View>
      <FlatList
        data={products}
        renderItem={/* your render logic */}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={() => fetchProducts(true)}
          />
        }
      />
    </View>
  );
};

export default withCaching(ProductsList);
``` 