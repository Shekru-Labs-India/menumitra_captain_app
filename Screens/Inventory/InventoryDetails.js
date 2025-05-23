import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import Icon from "react-native-vector-icons/MaterialIcons";
import MainToolBar from "../MainToolbar";
import CustomTabBar from "../CustomTabBar";
import RemixIcon from "react-native-remix-icon";
import * as ConstantValues from "../utils/ConstantValues";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";


export default function InventoryDetails({ route, navigation }) {
  const { inventory_id, refreshList } = route.params;
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const fetchInventoryDetails = async () => {
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "inventory_view",
        {
          outlet_id: restaurantId,
          inventory_id: inventory_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        setInventoryData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching inventory details:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchInventoryDetails();
    }, [inventory_id])
  );

  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");
      const userId = await getUserId();

      const response = await axiosInstance.post(
        `${onGetProductionUrl()}inventory_delete`,
        {
          outlet_id: restaurantId,
          inventory_id: inventory_id,
          user_id: userId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        setIsDeleteModalVisible(false);
        Alert.alert("Success", "Inventory item deleted successfully");
        navigation.goBack();
        if (refreshList) {
          refreshList();
        }
      } else {
        Alert.alert(
          "Error",
          response.data.msg || "Failed to delete inventory item"
        );
      }
    } catch (error) {
      console.error("Error deleting inventory:", error);
      Alert.alert("Error", "Failed to delete inventory item");
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchInventoryDetails().finally(() => setRefreshing(false));
  }, []);

  const CardRow = ({ leftData, rightData }) => {
    if (!leftData && !rightData) return null;
    return (
      <View style={styles.cardRow}>
        {leftData && (
          <View style={styles.cardColumn}>
            <Text style={styles.value}>
              {leftData.value || "Not Available"}
            </Text>
            <Text style={styles.label}>{leftData.label}</Text>
          </View>
        )}
        {rightData && (
          <View style={styles.cardColumn}>
            <Text
              style={[
                styles.value,
                rightData.highlight && styles.highlightText,
              ]}
            >
              {rightData.value || "Not Available"}
            </Text>
            <Text style={styles.label}>{rightData.label}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BCD4" />
        </View>
      </SafeAreaView>
    );
  }

  if (!inventoryData) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text>Failed to load inventory details</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory Details</Text>
        <TouchableOpacity onPress={handleDelete}>
          <RemixIcon name="delete-bin-line" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.sectionContent}>
            <CardRow
              leftData={{
                value: inventoryData?.name,
                label: "Item Name",
              }}
              rightData={{
                value: inventoryData?.category,
                label: "Category",
              }}
            />
            <CardRow
              leftData={{
                value: `${inventoryData?.quantity} ${inventoryData?.unit_of_measure}`,
                label: "Quantity",
              }}
              rightData={{
                value: `₹${inventoryData?.unit_price}`,
                label: "Unit Price",
              }}
            />
            <CardRow
              leftData={{
                value: inventoryData?.reorder_level,
                label: "Reorder Level",
              }}
              rightData={{
                value: inventoryData?.in_or_out?.toUpperCase(),
                label: "Status",
                highlight: true,
              }}
            />
          </View>
        </View>

        {/* Additional Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          <View style={styles.sectionContent}>
            <CardRow
              leftData={{
                value: `${inventoryData?.tax_rate}%`,
                label: "Tax Rate",
              }}
              rightData={{
                value: inventoryData?.brand_name,
                label: "Brand Name",
              }}
            />
            <CardRow
              leftData={{
                value: inventoryData?.supplier_name || "N/A",
                label: "Supplier Name",
              }}
              rightData={{
                value: inventoryData?.expiration_date,
                label: "Expiration Date",
              }}
            />
            <CardRow
              leftData={{
                value: inventoryData?.in_date,
                label: "In Date",
              }}
              rightData={{
                value: inventoryData?.out_date || "N/A",
                label: "Out Date",
              }}
            />
            <CardRow
              leftData={{
                value: inventoryData?.created_by || "N/A",
                label: "Created By",
              }}
              rightData={{
                value: inventoryData?.updated_by || "N/A",
                label: "Updated By",
              }}
            />
            <CardRow
              leftData={{
                value: inventoryData?.created_on || "N/A",
                label: "Created On",
              }}
              rightData={{
                value: inventoryData?.updated_on || "N/A",
                label: "Updated On",
              }}
            />
            <CardRow
              leftData={{
                value: inventoryData?.description,
                label: "Description",
              }}
            />
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() =>
          navigation.navigate("UpdateInventoryProduct", {
            inventoryId: inventory_id,
            onSuccess: async () => {
              await fetchInventoryDetails();
              if (refreshList) {
                refreshList();
              }
            },
          })
        }
      >
        <RemixIcon name="pencil-line" size={24} color="#fff" />
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
      <CustomTabBar />

      <Modal
        transparent={true}
        visible={isDeleteModalVisible}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setIsDeleteModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Inventory Item</Text>
              <TouchableOpacity
                onPress={() => setIsDeleteModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Are you sure you want to delete this inventory item?
            </Text>

            <View style={styles.modalButtons}>
              <View style={styles.leftButton}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsDeleteModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rightButton}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={confirmDelete}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 90,
  },
  detailsContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  category: {
    fontSize: 16,
    color: "#666",
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#00BCD4",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#219ebc",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  sectionContent: {
    gap: 12,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardColumn: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  highlightText: {
    color: "#219ebc",
  },
  editButton: {
    position: "absolute",
    right: 16,
    bottom: 80,
    backgroundColor: "#0dcaf0",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 25,
    elevation: 3,
    zIndex: 1,
  },
  editButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: ConstantValues.HEADER_FONT_SIZE,
    fontWeight: "600",
    color: "#000",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  leftButton: {
    flex: 1,
  },
  rightButton: {
    flex: 1,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  deleteButton: {
    backgroundColor: "#FF0000",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
});
