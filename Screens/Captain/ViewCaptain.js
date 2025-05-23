import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl, // Import RefreshControl
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Text, FAB, Appbar, ActivityIndicator, Card } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions"; // Import your production URL function
import { getUserId } from "../utils/getOwnerData";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import RemixIcon from "react-native-remix-icon";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const toTitleCase = (str) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const ViewCaptain = ({ route }) => {
  const { captain } = route.params;
  const navigation = useNavigation();
  const [captainDetails, setCaptainDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // Fetch captain details from API
  const fetchCaptainDetails = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      console.log("Fetching captain details with params:", {
        outlet_id: captain.outlet_id,
        user_id: captain.user_id,
      });

      const response = await axiosInstance.post(
        onGetProductionUrl() + "captain_view",
        {
          outlet_id: captain.outlet_id,
          user_id: captain.user_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Captain API Response:",
        JSON.stringify(response.data, null, 2)
      );

      if (response.data.st === 1) {
        console.log(
          "Captain Details:",
          JSON.stringify(response.data.data, null, 2)
        );
        setCaptainDetails(response.data.data);
      } else {
        console.log("API Error:", response.data.msg);
        Alert.alert("Error", "Failed to fetch captain details");
      }
    } catch (error) {
      console.error("Error fetching captain details:", error);
      console.error("Error response:", error.response?.data);
      Alert.alert("Error", "An error occurred while fetching captain details");
    } finally {
      setLoading(false);
    }
  };

  // Refresh the page when pull-to-refresh is triggered
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCaptainDetails(); // Fetch updated captain details
    setRefreshing(false); // Set refreshing to false after the data is fetched
  };

  // Handle delete action
  const handleDelete = () => {
    setIsDeleteModalVisible(true);
  };

  // Add the delete confirmation function
  const confirmDelete = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const loggedInUserId = await getUserId();

      const response = await axiosInstance.post(
        onGetProductionUrl() + "captain_delete",
        {
          outlet_id: captain.outlet_id,
          user_id: captain.user_id,
          update_user_id: loggedInUserId,
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
        Alert.alert("Success", "Captain deleted successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to delete captain");
      }
    } catch (error) {
      console.error("Error deleting captain:", error);
      Alert.alert("Error", "An error occurred while deleting captain");
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchCaptainDetails();
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Appbar.Action icon="delete" color="#dc3545" onPress={handleDelete} />
      ),
    });
  }, [navigation]);

  // Add refresh function to pass to EditCaptain
  const refreshCaptainDetails = async () => {
    await fetchCaptainDetails();
  };

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
          <Text style={styles.headerTitle}>Captain Details</Text>
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
            captainDetails && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.cardHeader}>Personal Information</Text>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {toTitleCase(captainDetails?.name || "")}
                    </Text>
                    <Text style={styles.label}>Name</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>{captainDetails?.mobile || ""}</Text>
                    <Text style={styles.label}>Mobile Number</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {captainDetails?.aadhar_number || ""}
                    </Text>
                    <Text style={styles.label}>Aadhar Number</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {toTitleCase(captainDetails?.address || "Not provided")}
                    </Text>
                    <Text style={styles.label}>Address</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {captainDetails?.email || "Not provided"}
                    </Text>
                    <Text style={styles.label}>Email</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {captainDetails?.dob || "Not provided"}
                    </Text>
                    <Text style={styles.label}>Date of Birth</Text>
                  </View>

                  {/* Add Account Information section */}
                  <Text style={[styles.cardHeader, styles.sectionDivider]}>
                    Account Information
                  </Text>

                  <View style={styles.detailsContainer}>
                    <Text style={[styles.value, 
                      { color: captainDetails?.is_active ? '#28a745' : '#dc3545' }]}>
                      {captainDetails?.is_active ? "Active" : "Inactive"}
                    </Text>
                    <Text style={styles.label}>Status</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {captainDetails?.created_by || "N/A"}
                    </Text>
                    <Text style={styles.label}>Created By</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {captainDetails?.created_on || "N/A"}
                    </Text>
                    <Text style={styles.label}>Created On</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {captainDetails?.updated_by || "N/A"}
                    </Text>
                    <Text style={styles.label}>Updated By</Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.value}>
                      {captainDetails?.updated_on || "N/A"}
                    </Text>
                    <Text style={styles.label}>Updated On</Text>
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
            navigation.navigate("EditCaptain", {
              captain: captainDetails,
              onUpdate: refreshCaptainDetails,
              refreshList: route.params?.refreshList,
            })
          }
        >
          <RemixIcon name="pencil-line" size={24} color="#fff" />
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
                <Text style={styles.modalTitle}>Delete Captain</Text>
                <TouchableOpacity
                  onPress={() => setIsDeleteModalVisible(false)}
                >
                  <Icon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalText}>
                Are you sure you want to delete this captain?
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
    paddingBottom: 80, // Add padding for edit button
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  bottomSpacing: {
    height: 20, // Add some space at the bottom
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000",
    flex: 1,
    textAlign: "center",
    marginLeft: -24, // Offset the back button width
  },
});

export default ViewCaptain;
