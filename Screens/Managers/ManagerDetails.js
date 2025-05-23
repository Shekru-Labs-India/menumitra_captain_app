import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Text, ActivityIndicator, Card } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { onGetOwnerUrl } from "../utils/ConstantFunctions";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import RemixIcon from "react-native-remix-icon";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const toTitleCase = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const ManagerDetails = ({ route }) => {
  const { managerId } = route.params;
  const navigation = useNavigation();
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const fetchManagerDetails = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      console.log("Fetching manager details with params:", {
        outlet_id: restaurantId,
        user_id: managerId,
      });

      const response = await axiosInstance.post(
        onGetOwnerUrl() + "manager/view",
        {
          outlet_id: restaurantId,
          user_id: managerId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Manager API Response:",
        JSON.stringify(response.data, null, 2)
      );

      if (response.data.st === 1) {
        console.log(
          "Manager Details:",
          JSON.stringify(response.data.data, null, 2)
        );
        setManager(response.data.data);
      } else {
        console.log("API Error:", response.data.msg);
        Alert.alert(
          "Error",
          response.data.msg || "Failed to fetch manager details"
        );
      }
    } catch (error) {
      console.error("Error fetching manager details:", error);
      console.error("Error response:", error.response?.data);
      Alert.alert(
        "Error",
        "Unable to fetch manager details. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchManagerDetails();
  };

  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetOwnerUrl() + "manager/delete",
        {
          outlet_id: restaurantId,
          user_id: managerId,
            update_user_id: userId, 
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setIsDeleteModalVisible(false);
        Alert.alert("Success", "Manager deleted successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", response.data.msg || "Failed to delete manager");
      }
    } catch (error) {
      console.error("Error deleting manager:", error);
      Alert.alert("Error", "Unable to delete manager. Please try again.");
    }
  };

  useEffect(() => {
    fetchManagerDetails();
  }, []);

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <RemixIcon name="arrow-left-line" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manager Details</Text>
          <TouchableOpacity onPress={handleDelete}>
            <RemixIcon name="delete-bin-6-line" size={24} color="#dc3545" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#0dcaf0"
              style={styles.loadingIndicator}
            />
          ) : (
            manager && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.cardHeader}>Personal Information</Text>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {toTitleCase(manager.name)}
                    </Text>
                    <Text style={styles.label}>Name</Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>{manager.mobile}</Text>
                    <Text style={styles.label}>Mobile Number</Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {manager.email || "Not provided"}
                    </Text>
                    <Text style={styles.label}>Email</Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {manager.dob || "Not provided"}
                    </Text>
                    <Text style={styles.label}>Date of Birth</Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>{manager.aadhar_number}</Text>
                    <Text style={styles.label}>Aadhar Number</Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {toTitleCase(manager.address) || "Not provided"}
                    </Text>
                    <Text style={styles.label}>Address</Text>
                  </View>

                  <Text style={[styles.cardHeader, styles.sectionDivider]}>
                    Account Information
                  </Text>

                  <View style={styles.detailsContainer}>
                    <View style={styles.statusContainer}>
                      <Text style={[
                        styles.statusText,
                        manager.is_active ? styles.activeStatus : styles.inactiveStatus
                      ]}>
                        {manager.is_active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                    <Text style={styles.label}>Status</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>{manager.created_by}</Text>
                    <Text style={styles.label}>Created By</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>{manager.created_on}</Text>
                    <Text style={styles.label}>Created On</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>{manager.updated_by}</Text>
                    <Text style={styles.label}>Last Updated By</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>{manager.updated_on}</Text>
                    <Text style={styles.label}>Last Updated On</Text>
                  </View>
                </Card.Content>
              </Card>
            )
          )}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            navigation.navigate("EditManager", {
              manager,
              onUpdate: fetchManagerDetails,
            })
          }
        >
          <RemixIcon name="edit-line" size={24} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <CustomTabBar />

      <Modal
        animationType="fade"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsDeleteModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Delete Manager</Text>
                <TouchableOpacity
                  onPress={() => setIsDeleteModalVisible(false)}
                >
                  <Icon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalText}>
                Are you sure you want to delete this manager?
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsDeleteModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={confirmDelete}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  bottomSpacing: {
    height: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  card: {
    margin: 16,
    backgroundColor: "#ffffff",
    elevation: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0dcaf0",
    marginBottom: 12,
  },
  detailsContainer: {
    paddingVertical: 10,
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 18,
    color: "#333",
    marginBottom: 5,
    fontWeight: "600",
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
  loadingIndicator: {
    marginTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
    marginTop: 30,
  },
  headerButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    width: "90%",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalText: {
    fontSize: 16,
    color: "#666",
    marginVertical: 20,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  sectionDivider: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
    overflow: 'hidden',
  },
  activeStatus: {
    backgroundColor: '#e8f7f3',
    color: '#0dcaf0',
  },
  inactiveStatus: {
    backgroundColor: '#ffebee',
    color: '#dc3545',
  },
});

export default ManagerDetails;
