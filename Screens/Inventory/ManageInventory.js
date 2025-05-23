import React, { useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import axios from "axios";
import InventoryTabContent from "./InventoryTabContent";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "../utils/WebService";
import axiosInstance from "../../utils/axiosConfig";

const ManageInventory = () => {
  const [tabData, setTabData] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // State to keep track of the active tab
  const [restaurantId, setRestaurantId] = useState(0); // State to keep track of the active tab

  // const restaurantId = 9; // Set your restaurant ID here

  // Fetch inventory types from API
  const fetchInventoryItems = async () => {
    try {
      let restId = await getRestaurantId();
      setRestaurantId(restId);
      const response = await axiosInstance.post(
        onGetProductionUrl() + "inventory_listview",
        { outlet_id: restId }
      );

      if (response.data.st === 1) {
        setTabData(response.data.lists);
      } else {
        console.error("Error fetching data:", response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching inventory items:", error);
    }
  };

  // Replace useEffect with useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        await fetchInventoryItems();
      };
      fetchData();
    }, [])
  );

  return (
    <View style={styles.container}>
      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        {tabData.map((tab, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.tabButton,
              activeTab === index && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab(index)} // Update active tab
          >
            <Text
              style={[
                styles.tabText,
                activeTab === index && styles.activeTabText,
              ]}
            >
              {tab.type.toUpperCase()} ({tab.inventory_count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scrollable Content Area */}
      {tabData.length > 0 && (
        <InventoryTabContent
          restaurantId={restaurantId}
          tabType={tabData[activeTab].type}
          refreshParent={fetchInventoryItems} // Pass the refresh function
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: "#ffffff",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderColor: "#000",
  },
  tabText: {
    fontSize: 16,
    color: "#000",
  },
  activeTabText: {
    color: "#000",
    fontWeight: "bold",
  },
  contentContainer: {
    margin: 0,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    elevation: 2,
  },
  contentText: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

// Export the ManageInventory component
export default ManageInventory;
