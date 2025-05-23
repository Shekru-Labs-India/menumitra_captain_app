import AsyncStorage from '@react-native-async-storage/async-storage';
import WebService from "./WebService";


export const getValueFromStorage = async (key) => {
    try {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
            return JSON.parse(value); // Return the value if it exists
        } else {
            console.log(`No value found for key: ${key}`);
            return null; // Return null if no value exists
        }
    } catch (error) {
        console.error(`Error retrieving value for key "${key}":`, error);
        throw error; // Optionally rethrow the error for further handling
    }
};
// Retrieve the whole owner data object
export const getOwnerData = async () => {
    try {
        const storedOwnerData = await AsyncStorage.getItem('owner_data');
        if (storedOwnerData !== null) {
            return JSON.parse(storedOwnerData);
        }
        
        // Fallback to individual fields if complete data not found
        const userId = await AsyncStorage.getItem(WebService.USER_ID);
        const outletId = await AsyncStorage.getItem(WebService.OUTLET_ID);
        const ownerName = await AsyncStorage.getItem(WebService.OWNER_NAME);
        const outletName = await AsyncStorage.getItem(WebService.OUTLET_NAME);

        if (userId && outletId) {
            return {
                user_id: userId,
                outlet_id: outletId,
                name: ownerName,
                outlet_name: outletName,
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error retrieving owner data:', error);
        return null;
    }
};

// Retrieve owner name
export const getOwnerName = async () => {
    try {
        const ownerData = await getOwnerData();
        if (ownerData?.name) {
            return ownerData.name;
        }
        return await AsyncStorage.getItem(WebService.OWNER_NAME);
    } catch (error) {
        console.error('Error getting owner name:', error);
        return '';
    }
};

// Retrieve user ID
export const getUserId = async () => {
    try {
        const ownerData = await getOwnerData();
        if (ownerData?.user_id) {
            return ownerData.user_id.toString();
        }
        return await AsyncStorage.getItem(WebService.USER_ID);
    } catch (error) {
        console.error('Error getting user ID:', error);
        return null;
    }
};

// Retrieve restaurant name
export const getRestaurantName = async () => {
    try {
        const ownerData = await getOwnerData();
        if (ownerData?.outlet_name) {
            return ownerData.outlet_name;
        }
        return await AsyncStorage.getItem(WebService.OUTLET_NAME);
    } catch (error) {
        console.error('Error getting restaurant name:', error);
        return '';
    }
};



export const getRestaurantId = async () => {
    try {
        // IMPORTANT CHANGE: Check AsyncStorage first, then cached data
        const directOutletId = await AsyncStorage.getItem(WebService.OUTLET_ID);
        if (directOutletId) {
            return directOutletId;
        }
        
        // Fall back to cached owner data
        const ownerData = await getOwnerData();
        if (ownerData?.outlet_id) {
            return ownerData.outlet_id.toString();
        }
        
        return null;
    } catch (error) {
        console.error('Error getting restaurant ID:', error);
        return null;
    }
};

// Retrieve completed orders
export const getCompletedOrders = async () => {
    const data = await getOwnerData();
    return data ? data.today_paid_orders : null;
};

// Retrieve active orders
export const getActiveOrders = async () => {
    const data = await getOwnerData();
    return data ? data.active_orders : null;
};

// Retrieve today's total revenue
export const getTodayTotalRevenue = async () => {
    const data = await getOwnerData();
    return data ? data.today_total_revenue : null;
};

// Add this function to getOwnerData.js
export const clearUserData = async () => {
    try {
        // Clear all stored data
        await AsyncStorage.multiRemove([
            'owner_data',
            WebService.USER_ID,
            WebService.OUTLET_ID,
            WebService.OWNER_NAME,
            WebService.OUTLET_NAME
        ]);
        return true;
    } catch (error) {
        console.error('Error clearing user data:', error);
        return false;
    }
};
