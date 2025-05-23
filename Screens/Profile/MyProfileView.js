import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Text } from "react-native-paper";
import axios from "axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomTabBar from "../CustomTabBar";
import CustomHeader from "../../components/CustomHeader";
import { getUserId, clearUserData } from "../utils/getOwnerData";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import * as Device from "expo-device";

export default function MyProfileView({ navigation }) {
  const [profileData, setProfileData] = useState({
    name: "",
    dob: "",
    email: "",
    mobile_number: "",
    aadhar_number: "",
    created_on: "",
    created_by: "",
    updated_on: "",
    updated_by: "",
    last_login: "",
    role: "",
    subscription_outlet: [],
    active_sessions: [],
  });
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentDeviceModel, setCurrentDeviceModel] = useState("");
  const [currentDeviceToken, setCurrentDeviceToken] = useState("");

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "";

    // First check if the date is already in "DD MMM YYYY" format
    const dateFormatRegex =
      /^\d{2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}$/;
    if (dateFormatRegex.test(dateString)) {
      return dateString; // Return as is if already in correct format
    }

    // Try parsing the date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If invalid date, try parsing from "DD MMM YYYY" format
      const [day, month, year] = dateString.split(" ");
      return `${day} ${month} ${year}`;
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
  };
  useFocusEffect(
    useCallback(() => {
      fetchProfile(); // Fetch data when the screen is focused
    }, [])
  );
  const fetchProfile = async () => {
    try {
      const [userId, accessToken] = await Promise.all([
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "view_profile_detail",
        {
          user_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Profile Response:", response.data); // For debugging

      if (response.data.st === 1 && response.data.Data) {
        const userData = response.data.Data.user_details;
        const subscriptionData = response.data.Data.subscription_outlet || [];
        const activeSessions = response.data.Data.user_active_sessions || [];

        console.log("Active Sessions:", activeSessions); // Debug active sessions
        
        // Add debug log for subscription data
        console.log("Subscription Data:", subscriptionData);
        subscriptionData.forEach((sub, index) => {
          console.log(`Subscription ${index} functionalities:`, sub.functionalities);
        });

        setProfileData({
          // User Details
          name: formatTitleCase(userData.name),
          dob: formatDisplayDate(userData.dob),
          email: userData.email,
          mobile_number: userData.mobile_number,
          aadhar_number: userData.aadhar_number,
          created_on: userData.created_on,
          created_by: userData.created_by,
          updated_on: userData.updated_on,
          updated_by: userData.updated_by,
          last_login: userData.last_login,
          role: userData.role,

          // Active Sessions
          active_sessions: activeSessions,

          // Subscription Details
          subscription_outlet: subscriptionData.map((subscription) => ({
            outlet_name: subscription.outlet_name,
            outlet_id: subscription.outlet_id,
            subscription_id: subscription.subscription_id,
            subscription_name: subscription.subscription_name,
            subscription_description: subscription.subscription_description,
            tenure: subscription.tenure,
            price: subscription.price,
            subscription_date: subscription.subscription_date,
            expiry_date: subscription.expiry_date,
            days_until_expiry: subscription.days_until_expiry,
            functionalities: subscription.functionalities || [],
          })),
        });
      } else {
        Alert.alert(
          "Error",
          response.data.msg || "Failed to fetch profile details."
        );
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTitleCase = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            let userId;
            let role;

            // 1. Try structured data first (forward compatibility)
            try {
              const userDataStr = await AsyncStorage.getItem("user_data");
              if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                userId = userData.primary_id || userData.user_id;
                role = userData.role;
                console.log("Using structured user data:", { userId, role });
              }
            } catch (e) {
              console.log("No structured data found or parse error");
            }

            // 2. Try owner_data (existing implementation)
            if (!userId) {
              try {
                const ownerData = await AsyncStorage.getItem("owner_data");
                if (ownerData) {
                  const userData = JSON.parse(ownerData);
                  userId = userData?.user_id;
                  console.log("Using owner_data:", { userId });
                }
              } catch (e) {
                console.log("No owner_data found or parse error");
              }
            }

            // 3. Fallback to legacy storage (backward compatibility)
            if (!userId) {
              userId = await AsyncStorage.getItem("user_id");
              if (!userId) {
                userId = await AsyncStorage.getItem("captain_id");
              }
              role = await AsyncStorage.getItem("role") || "captain";
              console.log("Using legacy storage:", { userId, role });
            }

            // 4. Final validation
            if (!userId) {
              throw new Error("No valid user identification found");
            }

            console.log("Proceeding with logout:", { userId, role });

            // Call logout API
            const response = await axiosInstance.post(
              onGetProductionUrl() + "logout",
              {
                user_id: userId,
                role: role || "captain",
                app: "captain",
              }
            );

            const data = response.data;

            if (data.st !== 1) {
              throw new Error(data.msg || "Logout failed");
            }

            // Clear storage with both old and new keys
            try {
              const keysToRemove = [
                // New structured storage
                "user_data",
                "outlet_data",
                "owner_data",
                
                // Legacy user identification
                "user_id",
                "captain_id",
                "role",
                
                // Other data
                "access_token",
                "refresh_token",
                "device_token",
                "captain_name",
                "mobile",
                "outlet_id",
                "outlet_name",
                "outlet_config",
                "sales_data",
                "app_settings",
                "restaurant_id",
                
                // Device related
                "expoPushToken",
                "sessionToken",
                "device_sessid",
                "push_token",
                "device_uuid",
                "tokenTimestamp"
              ];

              await AsyncStorage.multiRemove(keysToRemove);
              console.log("Storage cleared successfully");

              // Navigate to Login screen and clear navigation stack
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });

              Alert.alert("Success", "You have been logged out successfully");
            } catch (e) {
              console.error("Error clearing storage:", e);
              throw e;
            }
          } catch (error) {
            console.error("Error during logout:", error);

            // If error is related to missing data, clear storage and redirect anyway
            if (error.message.includes("not found")) {
              try {
                await AsyncStorage.clear();
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Login" }],
                });
              } catch (e) {
                console.error("Error during forced logout:", e);
              }
            }

            Alert.alert(
              "Error",
              "Failed to logout. Please try again.\n" + error.message
            );
          }
        },
      },
    ]);
  };

  const handleSessionLogout = async (session) => {
    if (!session || !session.device_token) {
      console.error("Invalid session or missing device token");
      Alert.alert("Error", "Cannot logout this device due to missing information.");
      return;
    }

    // Prevent multiple logout attempts
    if (isLoggingOut) {
      console.log("Logout already in progress, ignoring duplicate request");
      return;
    }

    // Get the specific device token from the session object
    const sessionDeviceToken = session.device_token;
    console.log("Attempting to log out session with token:", sessionDeviceToken);
    console.log("Full session object:", JSON.stringify(session));

    try {
      const userId = await getUserId();

      Alert.alert(
        "Confirm Logout",
        `Are you sure you want to log out this device?${session.device_model ? ' (' + session.device_model + ')' : ''}`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Logout",
            style: "destructive",
            onPress: async () => {
              try {
                setIsLoggingOut(true);
                
                // Create the logout data with ONLY the session's specific device token
                const logoutData = {
                  user_id: userId,
                  role: "captain",
                  app: "captain",
                  device_token: sessionDeviceToken,  // Use ONLY the specific device token from the session
                };

                console.log("About to send logout request with data:", JSON.stringify(logoutData));

                // Create a fresh axios instance without the interceptors that would override the token
                const freshAxios = axios.create();
                
                // Make the API call with ONLY the session's device token
                const response = await freshAxios.post(
                  onGetProductionUrl() + "logout",
                  logoutData,
                  {
                    headers: {
                      "Content-Type": "application/json",
                    },
                  }
                );

                console.log("Logout response:", response.data);

                if (response.data.st === 1) {
                  // Success - remove the session from the list
                  setProfileData((prevData) => ({
                    ...prevData,
                    active_sessions: prevData.active_sessions.filter(
                      (s) => s.device_token !== sessionDeviceToken
                    ),
                  }));
                  Alert.alert("Success", "Device logged out successfully");
                  
                  // Refresh the profile
                  fetchProfile();
                } else {
                  Alert.alert("Error", response.data.msg || "Logout failed");
                }
              } catch (error) {
                console.error("Session logout error:", error);
                Alert.alert("Error", "Failed to logout device. Please try again.");
              } finally {
                setIsLoggingOut(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Session logout error:", error);
      Alert.alert("Error", "Failed to logout device. Please try again.");
    }
  };

  useEffect(() => {
    // Get current device token when component mounts
    const getCurrentDeviceToken = async () => {
      try {
        // Get the current device token from AsyncStorage
        const pushToken = await AsyncStorage.getItem("push_token");
        const deviceToken = await AsyncStorage.getItem("device_token");
        const token = deviceToken || pushToken;
        
        console.log("Current device token:", token);
        setCurrentDeviceToken(token || "");
        
        // Also set current device model for fallback comparison
        const deviceBrand = Device.brand || "";
        const deviceModelName = Device.modelName || "";
        const deviceModelString = `${deviceBrand} ${deviceModelName}`.trim();
        setCurrentDeviceModel(deviceModelString);
      } catch (error) {
        console.error("Error getting current device token:", error);
      }
    };
    
    getCurrentDeviceToken();
  }, []);

  // Helper function to extract device name from device_model
  const extractDeviceName = (deviceModel) => {
    if (!deviceModel) return "Unknown Device";
    
    // Common patterns for model numbers at the end of device names
    // Example: "Redmi K50i 22041216I" -> Return "Redmi K50i"
    // Example: "Redmi 22041216I" -> Return "Redmi"
    
    // First try to find and remove model numbers that are purely numeric or have specific formats
    let cleanName = deviceModel;
    
    // Remove model numbers that are at the end and follow specific patterns
    // Pattern 1: Spaces followed by numbers/letters that look like model codes
    cleanName = cleanName.replace(/\s+[A-Z0-9]{5,}$/i, '');
    
    // If we still have what looks like a model number at the end (all digits)
    // This catches cases like "Redmi 9" where 9 is actually part of the name
    if (cleanName.match(/\s+\d{5,}$/)) {
      cleanName = cleanName.replace(/\s+\d{5,}$/, '');
    }
    
    // For cases where the name may end up empty or just whitespace
    if (!cleanName.trim()) {
      // Extract the brand name if we can
      const brandMatch = deviceModel.match(/^([A-Za-z]+)/);
      return brandMatch ? brandMatch[1] : "Unknown Device";
    }
    
    return cleanName.trim();
  };
  
  // Helper function to check if a session is the current device
  const isCurrentDevice = (session) => {
    // First try to match by device token (most reliable)
    if (currentDeviceToken && session.device_token === currentDeviceToken) {
      return true;
    }
    
    // Fallback to model comparison if token matching fails
    if (session.device_model === currentDeviceModel) {
      return true;
    }
    
    return false;
  };

  return (
    <>
      <CustomHeader title="My Profile" />
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#0dcaf0" />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Personal Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <RemixIcon name="user-3-line" size={24} color="#0dcaf0" />
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>

              <View style={styles.cardContent}>
                {/* Row 1: Name and Role */}
                <View style={styles.profileRow}>
                  <View style={styles.profileItemHalf}>
                    <Text style={styles.value}>{profileData.name || "N/A"}</Text>
                    <Text style={styles.label}>Name</Text>
                  </View>
                  
                  <View style={styles.profileItemHalf}>
                    <Text style={styles.value}>{profileData.role || "N/A"}</Text>
                    <Text style={styles.label}>Role</Text>
                  </View>
                </View>

                {/* Row 2: Date of Birth and Email */}
                <View style={styles.profileRow}>
                  <View style={styles.profileItemHalf}>
                    <Text style={styles.value}>{profileData.dob || "N/A"}</Text>
                    <Text style={styles.label}>Date of Birth</Text>
                  </View>
                  
                  <View style={styles.profileItemHalf}>
                    <Text style={styles.value}>{profileData.email || "N/A"}</Text>
                    <Text style={styles.label}>Email</Text>
                  </View>
                </View>

                {/* Row 3: Mobile Number and Aadhar Number */}
                <View style={styles.profileRow}>
                  <View style={styles.profileItemHalf}>
                    <Text style={styles.value}>{profileData.mobile_number || "N/A"}</Text>
                    <Text style={styles.label}>Mobile Number</Text>
                  </View>
                  
                  <View style={styles.profileItemHalf}>
                    <Text style={styles.value}>{profileData.aadhar_number || "N/A"}</Text>
                    <Text style={styles.label}>Aadhar Number</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Account Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <RemixIcon name="information-line" size={24} color="#0dcaf0" />
                <Text style={styles.cardTitle}>Account Information</Text>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.profileItem}>
                  <Text style={styles.value}>{profileData.last_login || "N/A"}</Text>
                  <Text style={styles.label}>Last Login</Text>
                </View>

                <View style={styles.profileItem}>
                  <Text style={styles.value}>{profileData.created_by || "N/A"}</Text>
                  <Text style={styles.label}>Created By</Text>
                </View>

                <View style={styles.profileItem}>
                  <Text style={styles.value}>{profileData.created_on || "N/A"}</Text>
                  <Text style={styles.label}>Created On</Text>
                </View>

                <View style={styles.profileItem}>
                  <Text style={styles.value}>{profileData.updated_by || "N/A"}</Text>
                  <Text style={styles.label}>Updated By</Text>
                </View>

                <View style={styles.profileItem}>
                  <Text style={styles.value}>{profileData.updated_on || "N/A"}</Text>
                  <Text style={styles.label}>Updated On</Text>
                </View>
              </View>
            </View>

            {/* Active Sessions Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <RemixIcon name="smartphone-line" size={24} color="#0dcaf0" />
                <Text style={styles.cardTitle}>Active Sessions</Text>
              </View>

              <View style={styles.cardContent}>
                {/* Table Header */}
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionHeaderText}>Device</Text>
                  <Text style={styles.sessionHeaderText}>Last Activity</Text>
                  <Text style={[styles.sessionHeaderText, styles.logoutHeader]}>Logout</Text>
                </View>

                {profileData.active_sessions.length > 0 ? (
                  profileData.active_sessions.map((session, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.sessionItem, 
                        isCurrentDevice(session) && styles.currentDeviceSession
                      ]}
                    >
                      <Text style={styles.sessionDevice}>
                        {extractDeviceName(session.device_model)}
                        {isCurrentDevice(session) && (
                          <Text style={styles.currentDeviceText}> (This device)</Text>
                        )}
                      </Text>
                      
                      <Text style={styles.sessionTime}>
                        {session.last_activity || "N/A"}
                      </Text>
                      
                      <TouchableOpacity
                        style={styles.sessionLogoutButton}
                        onPress={() => handleSessionLogout(session)}
                        disabled={isCurrentDevice(session)}
                      >
                        <RemixIcon 
                          name="logout-box-r-line" 
                          size={22} 
                          color={isCurrentDevice(session) ? "#aaa" : "#dc3545"} 
                        />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noSessions}>No active sessions found</Text>
                )}
              </View>
            </View>

            {/* Subscription Information Card */}
            {/* <View style={styles.card}>
              <View style={styles.cardHeader}>
                <RemixIcon name="vip-crown-2-line" size={24} color="#0dcaf0" />
                <Text style={styles.cardTitle}>Subscription Information</Text>
              </View>

              <View style={styles.cardContent}>
                {profileData.subscription_outlet.length > 0 ? (
                  profileData.subscription_outlet.map((subscription, index) => (
                    <View key={index} style={styles.subscriptionContainer}>
                      <View style={styles.subscriptionHeader}>
                        <View style={styles.outletInfo}>
                          <Text style={styles.outletName}>{subscription.outlet_name}</Text>
                          <Text style={styles.subscriptionName}>{subscription.subscription_name}</Text>
                        </View>
                       
                      </View>

                      <View style={styles.subscriptionDetails}>
                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailValue}>{subscription.tenure} Months</Text>
                            <Text style={styles.detailLabel}>Tenure</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={[
                              styles.detailValue,
                              subscription.days_until_expiry <= 30 && styles.expiringText
                            ]}>
                              {subscription.days_until_expiry} Days
                            </Text>
                            <Text style={styles.detailLabel}>Days Until Expiry</Text>
                          </View>
                        </View>

                        
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBarContainer}>
                            <View 
                              style={[
                                styles.progressBar,
                                { 
                                  width: `${(subscription.days_until_expiry / 365) * 100}%`,
                                  backgroundColor: subscription.days_until_expiry <= 30 ? '#dc3545' : '#0dcaf0'
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {subscription.days_until_expiry} of 365 Days
                          </Text>
                          <Text style={styles.progressSubText}>
                            {subscription.days_until_expiry <= 30 
                              ? 'Your plan requires update soon!'
                              : `${subscription.days_until_expiry} days remaining until your plan requires update`
                            }
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailValue}>{subscription.subscription_date}</Text>
                            <Text style={styles.detailLabel}>Start Date</Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={styles.detailValue}>{subscription.expiry_date}</Text>
                            <Text style={styles.detailLabel}>Expiry Date</Text>
                          </View>
                        </View>

                        
                        <Text style={{display: 'none'}}>
                          {JSON.stringify(subscription.functionalities)}
                        </Text>

                        {console.log("Rendering subscription:", subscription)}
                        {console.log("Has functionalities:", subscription.functionalities && subscription.functionalities.length > 0)}
                        
                        {Array.isArray(subscription.functionalities) && subscription.functionalities.length > 0 ? (
                          <View style={styles.functionalitiesContainer}>
                            <Text style={styles.functionalitiesTitle}>Functionalities</Text>
                            
                            {subscription.functionalities.map((func, funcIndex) => (
                              <View key={funcIndex} style={styles.functionalityRow}>
                                <Text style={styles.funcLabel}>{func.functionality_name}</Text>
                                <Text style={styles.funcValue}>
                                 {func.max_cap}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.functionalitiesContainer}>
                            <Text style={styles.functionalitiesTitle}>Features</Text>
                            <Text style={styles.noFunctionalities}>No feature details available</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noSubscription}>No active subscriptions found</Text>
                )}
              </View>
            </View> */}

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <RemixIcon name="logout-box-r-line" size={24} color="#dc3545" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate("MyProfile")}
        >
          <RemixIcon name="pencil-line" size={24} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <CustomTabBar />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  cardContent: {
    padding: 16,
  },
  profileItem: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
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
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  logoutText: {
    color: "#dc3545",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  profileItemHalf: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 8,
  },
  sessionHeaderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
    flex: 1,
  },
  logoutHeader: {
    textAlign: "center",
    flex: 0.4,
  },
  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sessionDevice: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    paddingRight: 8,
  },
  sessionTime: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    paddingHorizontal: 8,
  },
  sessionLogoutButton: {
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    flex: 0.3,
  },
  noSessions: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    padding: 12,
  },
  currentDeviceSession: {
    borderWidth: 2,
    borderColor: '#28a745',
    borderRadius: 8,
    backgroundColor: 'rgba(40, 167, 69, 0.05)',
    marginVertical: 4,
    paddingHorizontal: 10,
  },
  currentDeviceText: {
    fontSize: 12,
    color: '#28a745',
    fontStyle: 'italic',
  },
  subscriptionContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  outletInfo: {
    flex: 1,
  },
  outletName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subscriptionName: {
    fontSize: 16,
    color: '#666',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#28a745',
  },
  subscriptionDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  expiringText: {
    color: '#dc3545',
  },
  functionalitiesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  functionalitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  functionalityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  funcLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  funcValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0dcaf0',
  },
  noFunctionalities: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 12,
    fontStyle: 'italic',
  },
  noSubscription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 12,
  },
  progressContainer: {
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  progressSubText: {
    fontSize: 12,
    color: '#888',
  },
});