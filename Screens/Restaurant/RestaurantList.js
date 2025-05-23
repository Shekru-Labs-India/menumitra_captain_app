import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import WebService from "../utils/WebService";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { getUserId } from "../utils/getOwnerData";
import { useNavigation } from "@react-navigation/native";
import globalStyles from "../../styles";
import RemixIcon from "react-native-remix-icon";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import axiosInstance from "../../utils/axiosConfig";
import { useRestaurant } from '../../context/RestaurantContext';

const RestaurantList = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation(); // For navigation
  const { switchRestaurant } = useRestaurant();

  // Fetch `restaurantId` from AsyncStorage
  const getStoredRestaurantId = async () => {
    try {
      const id = await AsyncStorage.getItem(WebService.OUTLET_ID);
      if (id) {
        setSelectedRestaurantId(parseInt(id, 10));
      }
    } catch (error) {
      console.error("Error retrieving restaurant ID:", error);
    }
  };

  // Fetch restaurant data
  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const [userId, accessToken] = await Promise.all([
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_outlet_list",
        {
          owner_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setRestaurants(response.data.outlet_list);
      } else {
        console.log("API Response:", response.data);
        Alert.alert(
          "Error",
          response.data.msg || "Failed to fetch restaurant data."
        );
      }
    } catch (error) {
      console.error(
        "Error fetching restaurants:",
        error.response?.data || error
      );
      Alert.alert(
        "Error",
        "Unable to fetch restaurant list. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([getStoredRestaurantId(), fetchRestaurants()]);
    };
    init();
  }, []);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRestaurants();
    setRefreshing(false);
  };

  // Enhance handleRestaurantSelection function with improved error handling
  const handleRestaurantSelection = async (restaurantId, restaurantName) => {
    try {
      const userId = await getUserId();
      const accessToken = await AsyncStorage.getItem("access_token");
      
      console.log(`Attempting to select restaurant: ${restaurantName} (ID: ${restaurantId})`);
      
      // Call the select outlet API
      const response = await axiosInstance.post(
        onGetProductionUrl() + "select_outlet",
        {
          outlet_id: restaurantId,
          owner_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Restaurant selection response:", response.data);

      // Handle different response status codes
      if (response.data.st === 1) {
        // Success case
        setSelectedRestaurantId(restaurantId);
        await switchRestaurant(restaurantId, restaurantName);
        console.log(`Selected: ${restaurantName} (ID: ${restaurantId})`);
        navigation.goBack();
      } else if (response.data.st === 2) {
        // Special error case (st=2)
        console.warn("Restaurant selection returned status 2:", response.data.msg);
        Alert.alert(
          "Access Restricted", 
          response.data.msg || "You don't have permission to access this restaurant."
        );
      } else {
        // General error case
        console.error("Restaurant selection failed:", response.data);
        Alert.alert(
          "Selection Failed", 
          response.data.msg || "Unable to select this restaurant. Please try again."
        );
      }
    } catch (error) {
      // Network or other errors
      console.error("Error selecting restaurant:", error);
      
      // Check if there's a response with error details from server
      if (error.response && error.response.data && error.response.data.msg) {
        Alert.alert("Error", error.response.data.msg);
      } else if (error.message && error.message.includes("Network")) {
        Alert.alert("Network Error", "Please check your internet connection and try again.");
      } else {
        Alert.alert(
          "Error", 
          "Unable to select restaurant. Please try again later."
        );
      }
    }
  };

  // Render a single restaurant item
  const renderItem = ({ item }) => {
    // Adjust the item properties to match the new API response format
    const isSelected = item.outlet_id === selectedRestaurantId;
    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            backgroundColor: isSelected ? "#d4edda" : "#fff",
            borderColor: isSelected ? "#28a745" : "#ddd",
            borderWidth: 1.5,
            elevation: isSelected ? 5 : 2,
          },
        ]}
        onPress={() =>
          handleRestaurantSelection(item.outlet_id, item.name)
        }
      >
        <View style={styles.restaurantItemContainer}>
          <Text
            style={[
              styles.restaurantName,
              { color: isSelected ? "#28a745" : "#333" },
            ]}
          >
            {item.name}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: item.is_open ? "#28a745" : "#dc3545",
              },
            ]}
          >
            <Text style={styles.statusText}>
              {item.is_open ? "Open" : "Closed"}
            </Text>
          </View>
          <View style={styles.checkboxContainer}>
            {isSelected ? (
              <RemixIcon
                name="ri-checkbox-circle-line"
                size={25}
                color="#28a745"
              />
            ) : (
              <View style={{ width: 25 }} />
            )}
          </View>
        </View>
        <Text style={styles.addressText}>{item.address}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <CustomHeader title="Restaurant List" />
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <FlatList
            data={restaurants}
            renderItem={renderItem}
            keyExtractor={(item) => item.outlet_id.toString()}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
      </View>
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  item: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  restaurantId: {
    fontSize: 14,
    color: "#999",
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 30, // Positioned above the bottom navigation
    backgroundColor: "#0dcaf0",
    borderRadius: 30,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  restaurantItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
    width: 70,
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  checkboxContainer: {
    width: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  addressText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
});

export default RestaurantList;
