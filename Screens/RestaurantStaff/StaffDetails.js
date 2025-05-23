import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import axios from "axios";
import CustomTabBar from "../CustomTabBar";
import { useFocusEffect } from "@react-navigation/native";
import RemixIcon from "react-native-remix-icon";
import CustomHeader from "../../components/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import { getUserId } from "../utils/getOwnerData";

const formatDateForUI = (dateString) => {
  if (!dateString) return "";

  // Check if the date is already in "DD Mon YYYY" format
  const isCorrectFormat =
    /^\d{2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}$/.test(
      dateString
    );

  if (isCorrectFormat) {
    return dateString; // Return as is if already in correct format
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error("Invalid date:", dateString);
      return dateString;
    }

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString; // Return original string if parsing fails
  }
};

const titleCase = (str) => {
  if (!str) return ""; // Handle null or undefined inputs
  return str
    .toLowerCase() // Ensure the string is in lowercase
    .split(" ") // Split the string into words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
    .join(" "); // Rejoin the words with spaces
};

const StaffDetails = ({ route, navigation }) => {
  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { staffId, restaurantId } = route.params || {};
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (!staffId || !restaurantId) {
        console.error("Missing required params:", { staffId, restaurantId });
        navigation.goBack();
        return;
      }

      fetchStaffDetails();

      return () => {
        // Any cleanup if needed
      };
    }, [staffId, restaurantId])
  );

  const fetchStaffDetails = async () => {
    setLoading(true);
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "staff_view",
        {
          outlet_id: restaurantId,
          staff_id: staffId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        // Format the dates to remove hyphens
        const data = response.data.data;
        const formattedData = {
          ...data,
          created_on: data.created_on?.replace(/-/g, " ") || "N/A",
          updated_on: data.updated_on?.replace(/-/g, " ") || "N/A",
        };
        setStaffData(formattedData);
      } else {
        console.log("API Error:", response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching staff details:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log("Current staffData:", staffData);

  const handleEditPress = () => {
    console.log("Staff Data being passed:", staffData); // Debug log
    navigation.navigate("EditStaffDetails", {
      staffData: staffData, // Pass the entire staffData object
      staffId: staffData.staff_id,
      restaurantId: restaurantId,
      refreshTimestamp: Date.now(),
    });
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const accessToken = await AsyncStorage.getItem("access_token");
      const userId = await getUserId();
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "staff_delete",
        {
          outlet_id: restaurantId,
          staff_id: staffData.staff_id,
          user_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        setDeleteModalVisible(false);
        Alert.alert("Success", "Staff member deleted successfully", [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
              if (route.params?.onUpdate) {
                route.params.onUpdate();
              }
            },
          },
        ]);
      } else {
        Alert.alert("Error", "Failed to delete staff member");
      }
    } catch (error) {
      console.error("Delete error:", error);
      
      if (error.response && error.response.status === 500) {
        setDeleteModalVisible(false);
        Alert.alert("Success", "Staff member deleted successfully", [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
              if (route.params?.onUpdate) {
                route.params.onUpdate();
              }
            },
          },
        ]);
      } else {
        Alert.alert("Error", "Something went wrong while deleting staff member");
      }
    } finally {
      setDeleting(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStaffDetails().finally(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00bcd4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <CustomHeader
        title="Staff Details"
        showBackButton={true}
        rightComponent={
          <TouchableOpacity onPress={() => setDeleteModalVisible(true)}>
            <RemixIcon name="delete-bin-line" size={24} color="#000" />
          </TouchableOpacity>
        }
      />
      <View style={styles.mainContainer}>
        {/* Header */}

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#00bcd4"]} // Android
              tintColor="#00bcd4" // iOS
            />
          }
        >
          {staffData ? (
            <>
              {/* Profile Section */}
              <View style={styles.profileSection}>
                {staffData.photo ? (
                  <Image
                    source={{ uri: staffData.photo }}
                    style={[
                      styles.avatarContainer,
                      { backgroundColor: "transparent" },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarContainer,
                      { backgroundColor: "#E3F2FD" },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {staffData.name?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.name}>{titleCase(staffData.name)} </Text>
                <View style={styles.roleContainer}>
                  <Text style={[styles.role, { paddingHorizontal: 12 }]}>
                    {staffData.role?.charAt(0).toUpperCase() +
                      staffData.role?.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>

              {/* Contact Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Details</Text>
                <View style={styles.contactItem}>
                  <View style={styles.iconContainer}>
                    <Icon name="phone" size={24} color="#000" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactValue}>{staffData.mobile}</Text>
                    <Text style={styles.contactLabel}>Mobile Number</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => {
                      if (staffData.mobile) {
                        Linking.openURL(`tel:${staffData.mobile}`);
                      }
                    }}
                  >
                    <Icon name="phone" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.contactItem}>
                  <View style={styles.iconContainer}>
                    <Icon name="location-on" size={24} color="#000" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactValue}>
                      {titleCase(staffData.address)}
                    </Text>
                    <Text style={styles.contactLabel}>Address</Text>
                  </View>
                </View>
              </View>

              {/* Employment Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Employment Details</Text>
                <View style={styles.employmentItem}>
                  <Text style={styles.value}>{staffData.dob}</Text>
                  <Text style={styles.label}>Date of Birth</Text>
                </View>
                <View style={styles.employmentItem}>
                  <Text style={styles.value}>{staffData.aadhar_number}</Text>
                  <Text style={styles.label}>Aadhar Number</Text>
                </View>
              </View>

              {/* Additional Information */}
              <View style={[styles.section, styles.lastSection]}>
                <Text style={styles.sectionTitle}>Additional Information</Text>
                <View style={styles.employmentItem}>
                  <Text style={styles.value}>
                    {staffData?.created_by || "N/A"}
                  </Text>
                  <Text style={styles.label}>Created By</Text>
                </View>
                <View style={styles.employmentItem}>
                  <Text style={styles.value}>
                    {staffData?.created_on || "N/A"}
                  </Text>
                  <Text style={styles.label}>Created On</Text>
                </View>
                <View style={styles.employmentItem}>
                  <Text style={styles.value}>
                    {staffData?.updated_by || "N/A"}
                  </Text>
                  <Text style={styles.label}>Updated By</Text>
                </View>
                <View style={styles.employmentItem}>
                  <Text style={styles.value}>
                    {staffData?.updated_on || "N/A"}
                  </Text>
                  <Text style={styles.label}>Updated On</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <Text>No staff data available</Text>
            </View>
          )}
        </ScrollView>

        {/* Edit Button */}
        <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
          <RemixIcon name="pencil-line" size={24} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Staff Member</Text>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Are you sure you want to delete this staff member?
            </Text>

            <View style={styles.modalButtons}>
              <View style={styles.leftButton}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDeleteModalVisible(false)}
                  disabled={deleting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rightButton}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingBottom: 60,
  },
  scrollView: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#00bcd4",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 48,
    color: "#fff",
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontWeight: "500",
    marginTop: 16,
  },
  roleContainer: {
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    paddingVertical: 4,
    marginTop: 4,
    minWidth: 80, // Ensure minimum width
  },
  role: {
    color: "#1976D2",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 8,
    textTransform: "capitalize",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    color: "#666",
    fontSize: 14,
  },
  contactValue: {
    fontSize: 16,
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  employmentItem: {
    marginBottom: 16,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  label: {
    color: "#888888",
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    marginBottom: 4,
  },
  editButton: {
    position: "absolute",
    right: 16,
    bottom: 90,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    width: "85%",
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
    width: "100%",
    marginTop: 10,
  },
  leftButton: {
    flex: 1,
    alignItems: "flex-start",
  },
  rightButton: {
    flex: 1,
    alignItems: "flex-end",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "500",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
});

export default StaffDetails;
