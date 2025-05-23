import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { TextInput } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import RemixIcon from "react-native-remix-icon";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomTabBar from "../CustomTabBar";
import MainToolBar from "../MainToolbar";
import CustomHeader from "../../components/CustomHeader";
import globalStyles from "../../styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import { getUserId } from "../utils/getOwnerData";

// Add this validation function at the top level
const isValidCategoryName = (name) => {
  return /^[a-zA-Z\s]+$/.test(name);
};

const InventoryItems = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // Add searchQuery state
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchInventoryItems();
    }, [])
  );

  // Update the handleSaveCategory function to include validation
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    if (!isValidCategoryName(categoryName)) {
      Alert.alert("Error", "Category name can only contain letters and spaces");
      return;
    }

    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      
      const userId = await getUserId();
      const response = await axiosInstance.post(
        onGetProductionUrl() + "inventory_category_create",
        { name: categoryName,
          
          user_id: userId,
        }, // Send data directly as object
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Check response.data instead of response.ok
      if (response.data.st === 1) {
        setModalVisible(false);
        setCategoryName("");
        Alert.alert("Success", "Category created successfully");
        fetchInventoryItems();
      } else {
        Alert.alert("Error", response.data.msg || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      if (error.response?.status === 401) {
        Alert.alert("Error", "Session expired. Please login again.");
        // Optionally handle token refresh or logout here
      } else {
        Alert.alert("Error", "Failed to create category. Please try again.");
      }
    }
  };

  const fetchInventoryItems = async () => {
    setLoading(true);
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        `${onGetProductionUrl()}inventory_listview`,
        {
          outlet_id: restaurantId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        setInventoryData(response.data.lists);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const handleEditPress = (item) => {
    navigation.navigate("InventoryDetails", {
      inventory_id: item.inventory_id,
      refreshList: fetchInventoryItems, // Pass the refresh function
    });
  };

  const handleDeletePress = async (item) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const restaurantId = await getRestaurantId();
            const accessToken = await AsyncStorage.getItem("access_token");

            const response = await axiosInstance.post(
              `${onGetProductionUrl()}inventory_delete`,
              {
                inventory_id: item.inventory_id,
                restaurant_id: restaurantId,
              },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (response.data.st === 1) {
              Alert.alert("Success", "Item deleted successfully");
              fetchInventoryItems();
            }
          } catch (error) {
            console.error("Error deleting item:", error);
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  // Add navigation to AddInventoryProduct with refresh callback
  const handleAddInventory = () => {
    navigation.navigate("AddInventoryProduct", {
      onSuccess: fetchInventoryItems,
    });
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setCategoryName(""); // Reset category name when modal is closed
  };

  const renderItem = ({ item }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => handleEditPress(item)}
      >
        <View style={styles.mainContent}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemRole}>
            Quantity: {item.quantity} {item.unit_of_measure || ""}
          </Text>
          {item.brand_name && (
            <Text style={styles.itemRole}>Brand: {item.brand_name}</Text>
          )}
        </View>
        {/* <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeletePress(item)}
        >
          <RemixIcon name="delete-bin-line" size={20} color="#FF5252" />
        </TouchableOpacity> */}
      </TouchableOpacity>
    </View>
  );

  // Filter inventory data based on search query
  const filteredInventoryData = inventoryData.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <CustomHeader title="Inventory" />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>

      <View style={styles.container}>
        <View style={globalStyles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Inventory"
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            left={<TextInput.Icon icon="magnify" />}
          />
        </View>
        <FlatList
          data={filteredInventoryData}
          renderItem={renderItem}
          keyExtractor={(item) => item.inventory_id.toString()}
          refreshing={loading}
          onRefresh={fetchInventoryItems}
        />
        <TouchableOpacity
          style={styles.floatingButtonCategory}
          onPress={handleAddInventory}
        >
          <RemixIcon name="add-circle-line" size={20} color="#fff" />
          <Text style={styles.floatingButtonTextCategory}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setModalVisible(true)}
        >
          <RemixIcon name="add-circle-line" size={20} color="#fff" />
          <Text style={styles.floatingButtonText}>Create Category</Text>
        </TouchableOpacity>
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleCloseModal}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={handleCloseModal}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enter Category Name</Text>
                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <TextInput
                mode="outlined"
                style={styles.input}
                label={
                  <Text>
                    <Text style={styles.required}>*</Text> Category Name
                  </Text>
                }
                value={categoryName}
                onChangeText={(text) => {
                  // Only allow letters and spaces
                  const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
                  setCategoryName(formattedText);
                }}
                error={
                  categoryName.length > 0 && !isValidCategoryName(categoryName)
                }
                helperText={
                  categoryName.length > 0 && !isValidCategoryName(categoryName)
                    ? "Only letters and spaces allowed"
                    : ""
                }
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveCategory}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>

      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#fff",
    padding: "8",
    marginBottom: "80",
  },
  searchInput: {
    height: 40,
    backgroundColor: "white",
    borderRadius: 5,
    flex: 1,
  },
  required: {
    color: "red",
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  searchBar: {
    margin: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  cardContainer: {
    backgroundColor: "#fff",
    margin: 8,
    borderRadius: 8,
    elevation: 2,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  mainContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#212121",
    marginBottom: 4,
  },
  itemRole: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 2,
  },
  deleteButton: {
    padding: 8,
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#00BCD4",
    borderRadius: 30,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
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
  floatingButtonCategory: {
    position: "absolute",
    right: 20,
    bottom: 80,
    backgroundColor: "#00BCD4",
    borderRadius: 30,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingButtonTextCategory: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "white",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#ccc", // Grey color for cancel
  },
  saveButton: {
    backgroundColor: "#28a745", // Green color for save
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
});

export default InventoryItems;
