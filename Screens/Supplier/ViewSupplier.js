import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RemixIcon from "react-native-remix-icon";
import CustomHeader from "../../components/CustomHeader";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import WebService from "../utils/WebService";
import CustomTabBar from "../CustomTabBar";
import MainToolBar from "../MainToolbar";
import Icon from "react-native-vector-icons/Ionicons";
import axiosInstance from "../../utils/axiosConfig";
import { getUserId } from "../utils/getOwnerData";

const ViewSupplier = ({ route, navigation }) => {
  const { supplierId } = route.params;
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  useEffect(() => {
    fetchSupplierDetails();

    // Add listener for when screen comes into focus
    const unsubscribe = navigation.addListener("focus", () => {
      fetchSupplierDetails();
    });

    return unsubscribe;
  }, [navigation, supplierId]);

  const fetchSupplierDetails = async () => {
    try {
      const [outletId, accessToken] = await Promise.all([
        AsyncStorage.getItem(WebService.OUTLET_ID),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "supplier_view",
        {
          supplier_id: supplierId,
          outlet_id: outletId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        setSupplier(response.data.data);
      } else {
        Alert.alert("Error", response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching supplier details:", error);
      Alert.alert("Error", "Failed to fetch supplier details");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate("EditSupplier", { supplier });
  };

  const handleDelete = async () => {
    try {
      const [outletId, accessToken , userId] = await Promise.all([
        AsyncStorage.getItem(WebService.OUTLET_ID),
        AsyncStorage.getItem("access_token"),
        getUserId()
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "supplier_delete",
        {
          supplier_id: supplierId,
          outlet_id: outletId,
          user_id: userId

        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Supplier deleted successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", response.data.msg || "Failed to delete supplier");
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      Alert.alert("Error", "Failed to delete supplier");
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  const toTitleCase = (str) => {
    if (!str) return ""; // return empty string if null/undefined
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Add this helper function for rendering card rows with null handling
  const CardRow = ({ leftData, rightData }) => (
    <View style={styles.cardRow}>
      <View style={[styles.cardColumn, { flex: rightData ? 1 : 2 }]}>
        <Text style={styles.cardValue}>{leftData.value}</Text>
        <Text style={styles.cardLabel}>{leftData.label}</Text>
      </View>
      {rightData && (
        <View style={styles.cardColumn}>
          <Text style={styles.cardValue}>{rightData.value}</Text>
          <Text style={styles.cardLabel}>{rightData.label}</Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <CustomHeader
        title="Supplier Details"
        showBackButton={true}
        rightComponent={
          <TouchableOpacity onPress={() => setIsDeleteModalVisible(true)}>
            <RemixIcon name="delete-bin-line" size={24} color="#000" />
          </TouchableOpacity>
        }
      />
      <View style={styles.container}>
        <View style={styles.toolbarContainer}>
          <MainToolBar />
        </View>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Personal Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <View style={styles.sectionContent}>
              <CardRow
                leftData={{
                  value: toTitleCase(supplier?.name),
                  label: "Full Name",
                }}
                rightData={{
                  value: toTitleCase(supplier?.owner_name),
                  label: "Owner Name",
                }}
              />
              <CardRow
                leftData={{
                  value: supplier?.mobile_number1 || "Not Available",
                  label: "Primary Contact",
                }}
                rightData={{
                  value: supplier?.mobille_number2 || "Not Available",
                  label: "Secondary Contact",
                }}
              />
              <CardRow
                leftData={{
                  value: toTitleCase(supplier?.address) || "Not Available",
                  label: "Address",
                }}
              />
            </View>
          </View>

          {/* Business Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Details</Text>
            <View style={styles.sectionContent}>
              <CardRow
                leftData={{
                  value:
                    toTitleCase(supplier?.supplier_code) || "Not Available",
                  label: "Supplier Code",
                }}
                rightData={{
                  value:
                    supplier?.supplier_status?.toUpperCase() || "Not Available",
                  label: "Status",
                  isStatus: true,
                }}
              />
              <CardRow
                leftData={{
                  value:
                    toTitleCase(supplier?.credit_rating) || "Not Available",
                  label: "Credit Rating",
                }}
                rightData={{
                  value: `₹ ${supplier?.credit_limit || "0"}`,
                  label: "Credit Limit",
                }}
              />
              <CardRow
                leftData={{
                  value: toTitleCase(supplier?.location) || "Not Available",
                  label: "Location",
                }}
                rightData={{
                  value: supplier?.website || "Not Available",
                  label: "Website",
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
                  value: supplier?.website || "N/A",
                  label: "Website",
                }}
                rightData={{
                  value: supplier?.owner_name || "N/A",
                  label: "Owner Name",
                }}
              />
              <CardRow
                leftData={{
                  value: supplier?.created_by || "N/A",
                  label: "Created By",
                }}
                rightData={{
                  value: supplier?.created_on || "N/A",
                  label: "Created On",
                }}
              />
              <CardRow
                leftData={{
                  value: supplier?.updated_by || "N/A",
                  label: "Updated By",
                }}
                rightData={{
                  value: supplier?.updated_on || "N/A",
                  label: "Updated On",
                }}
              />
              <CardRow
                leftData={{
                  value: supplier?.address || "N/A",
                  label: "Address",
                }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
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
              <Text style={styles.modalTitle}>Delete Supplier</Text>
              <TouchableOpacity
                onPress={() => setIsDeleteModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Are you sure you want to delete this supplier?
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
                  onPress={() => {
                    handleDelete();
                    setIsDeleteModalVisible(false);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  toolbarContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  card: {
    padding: 12,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  contentContainer: {
    paddingBottom: 90, // Add padding to prevent content from being hidden behind TabBar
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
  statusText: {
    textTransform: "capitalize",
    fontWeight: "500",
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
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  cardColumn: {
    flex: 1,
  },
  cardValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  leftButton: {
    flex: 1,
    marginRight: 8,
  },
  rightButton: {
    flex: 1,
    marginLeft: 8,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
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
});

export default ViewSupplier;
