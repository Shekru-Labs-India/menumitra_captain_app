// InventoryTabContent.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import Icon from "react-native-vector-icons/Ionicons";
import globalStyles from "../../styles";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../utils/ConstantFunctions"; // Import Ionicons
import axiosInstance from "../../utils/axiosConfig";

const InventoryTabContent = ({ restaurantId, tabType, refreshParent }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation(); // Access the navigation prop

  const fetchInventoryProducts = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_inventory_list_with_type",
        {
          restaurant_id: restaurantId,
          type: tabType,
        }
      );

      if (response.data.st === 1) {
        setProducts(response.data.lists); // Assuming the API returns products in `lists`
      } else {
        console.error("Error fetching products:", response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching inventory products:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchInventoryProducts();
      return () => {
        // Cleanup if needed
      };
    }, [restaurantId, tabType])
  );

  const handleEditPress = (item) => {
    navigation.navigate("UpdateInventoryProduct", {
      inventoryId: item.inventory_id,
      onSuccess: fetchInventoryProducts, // Pass the refresh function
    });
  };

  if (loading) {
    return <Text>Loading...</Text>;
  }

  const handleAddNewPress = () => {
    navigation.navigate("AddInventoryProduct", {
      type: "all", // Specify the type if needed
      onSuccess: fetchInventoryProducts(), // Pass the fetch function
    });
  };

  const handleItemPress = (inventoryId) => {
    navigation.navigate("InventoryDetails", {
      inventory_id: inventoryId,
      refreshList: fetchInventoryProducts, // Pass the direct refresh function
    });
  };

  return (
    <View style={styles.contentContainer}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.inventory_id.toString()} // Using inventory_id for uniqueness
        renderItem={({ item }) => (
          <View style={styles.productItem}>
            <View style={styles.itemContainer}>
              {/* Start Icon */}
              <Icon
                name="cube-outline"
                size={25}
                color="#007BFF"
                style={styles.startIcon}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productCount}>
                  Quantity : {item.quantity} Type : {item.type}
                </Text>
              </View>
              {/* Edit Icon */}
              <TouchableOpacity onPress={() => handleEditPress(item)}>
                <RemixIcon name="ri-edit-box-line" size={25} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>No products available</Text>}
      />

      <TouchableOpacity
        style={globalStyles.addButton}
        onPress={handleAddNewPress}
      >
        <RemixIcon name="ri-add-circle-line" size={24} color="#fff" />
        <Text style={globalStyles.addButtonText}>create</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    elevation: 2,
  },

  productItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  startIcon: {
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  productCount: {
    fontSize: 14,
    color: "#555",
  },
});

export default InventoryTabContent;
