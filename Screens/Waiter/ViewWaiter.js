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
  StatusBar,
} from "react-native";
import { Text, FAB, Appbar, ActivityIndicator, Card } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions"; // Import your production URL function
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import RemixIcon from "react-native-remix-icon";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import { getRestaurantId, getUserId } from  "../utils/getOwnerData";

const toTitleCase = (str) => {
  if (!str) return "N/A"; // Return "N/A" if the string is null or empty
  
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const ViewWaiter = ({ route }) => {
  const { waiter } = route.params;
  const navigation = useNavigation();
  const [waiterDetails, setWaiterDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // Fetch waiter details from API
  const fetchWaiterDetails = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      console.log("Fetching waiter details with params:", {
        outlet_id: waiter.outlet_id,
        user_id: waiter.user_id,
      });

      const response = await axiosInstance.post(
        onGetProductionUrl() + "waiter_view",
        {
          outlet_id: waiter.outlet_id,
          user_id: waiter.user_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "Waiter API Response:",
        JSON.stringify(response.data, null, 2)
      );

      if (response.data.st === 1) {
        console.log(
          "Waiter Details:",
          JSON.stringify(response.data.data, null, 2)
        );
        setWaiterDetails(response.data.data);
      } else {
        console.log("API Error:", response.data.msg);
        Alert.alert("Error", "An error occurred while fetching waiter details");
      }
    } catch (error) {
      console.error("Error fetching waiter details:", error);
      console.error("Error response:", error.response?.data);
      Alert.alert("Error", "An error occurred while fetching waiter details");
    } finally {
      setLoading(false);
    }
  };

  // Refresh the page when pull-to-refresh is triggered
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWaiterDetails(); // Fetch updated waiter details
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
      let restaurantId = await getRestaurantId();
      let userId = await getUserId();

      const response = await axiosInstance.post(
        onGetProductionUrl() + "waiter_delete",
        {
          outlet_id: waiter.outlet_id,
          user_id: waiter.user_id,
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
        Alert.alert("Success", "Waiter deleted successfully");
        navigation.goBack();
      } else if (response.data.st === 2) {
        Alert.alert("Cannot Delete", response.data.msg || "Cannot delete waiter as they have associated orders");
      } else {
        Alert.alert("Error", response.data.msg || "Failed to delete waiter");
      }
    } catch (error) {
      console.error("Error deleting waiter:", error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", error.response.data);
        Alert.alert(
          "Error",
          error.response.data.msg || "Failed to delete waiter"
        );
      } else if (error.request) {
        // The request was made but no response was received
        Alert.alert(
          "Network Error",
          "Unable to connect to the server. Please check your internet connection."
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        Alert.alert("Error", "An error occurred while deleting waiter");
      }
      setIsDeleteModalVisible(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchWaiterDetails();
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Appbar.Action icon="delete" color="#dc3545" onPress={handleDelete} />
      ),
    });
  }, [navigation]);

  // Add refreshing function
  const refreshWaiterDetails = async () => {
    await fetchWaiterDetails();
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          backgroundColor="#fff"
          barStyle="dark-content"
          translucent={true}
        />
        <CustomHeader
          title="Waiter Details"
          showBackButton={true}
          rightComponent={
            <TouchableOpacity onPress={handleDelete}>
              <RemixIcon name="delete-bin-line" size={24} color="#000" />
            </TouchableOpacity>
          }
        />
        <View style={styles.container}>
          <ScrollView
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
              waiterDetails && (
                <Card style={styles.card}>
                  <Card.Content>
                    <Text style={styles.cardHeader}>Personal Information</Text>

                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>
                        {waiterDetails?.name
                          ? toTitleCase(waiterDetails.name)
                          : "N/A"}
                      </Text>
                      <Text style={styles.label}>Name</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>{waiterDetails?.mobile || "N/A"}</Text>
                      <Text style={styles.label}>Mobile Number</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>{waiterDetails?.aadhar_number || "N/A"}</Text>
                      <Text style={styles.label}>Aadhar Number</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>{waiterDetails?.address || "N/A"}</Text>
                      <Text style={styles.label}>Address</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>{waiterDetails?.email || "N/A"}</Text>
                      <Text style={styles.label}>Email</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>{waiterDetails?.dob || "N/A"}</Text>
                      <Text style={styles.label}>Date of Birth</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>
                        {waiterDetails?.created_on || "N/A"}
                      </Text>
                      <Text style={styles.label}>Created On</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>
                        {waiterDetails?.created_by ? toTitleCase(waiterDetails.created_by) : "N/A"}
                      </Text>
                      <Text style={styles.label}>Created By</Text>
                    </View>
                    <View style={styles.detailsContainer}>
                      <Text style={styles.value}>
                        {waiterDetails?.is_active ? "Active" : "Inactive"}
                      </Text>
                      <Text style={styles.label}>Status</Text>
                    </View>
                    {waiterDetails.updated_on && (
                      <>
                        <View style={styles.detailsContainer}>
                          <Text style={styles.label}>Updated On</Text>
                          <Text style={styles.value}>{waiterDetails.updated_on}</Text>
                        </View>
                        <View style={styles.detailsContainer}>
                          <Text style={styles.label}>Updated By</Text>
                          <Text style={styles.value}>{toTitleCase(waiterDetails.updated_by)}</Text>
                        </View>
                      </>
                    )}
                  </Card.Content>
                </Card>
              )
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate("EditWaiter", {
                waiter: waiterDetails,
                onUpdate: refreshWaiterDetails,
                refreshList: route.params?.refreshList,
              })
            }
          >
            <RemixIcon name="pencil-line" size={24} color="#fff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
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
                <Text style={styles.modalTitle}>Delete Waiter</Text>
                <TouchableOpacity
                  onPress={() => setIsDeleteModalVisible(false)}
                >
                  <Icon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalText}>
                Are you sure you want to delete this waiter?
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
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  card: {
    margin: 16,
    backgroundColor: "#ffffff",
    elevation: 6, // Shadow effect
    borderRadius: 12, // Rounded corners
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
});

export default ViewWaiter;
