import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Linking,
  ScrollView,
  RefreshControl,
} from "react-native";
import globalStyles from "../../styles";
import RemixIcon from "react-native-remix-icon";
import { getOwnerName, getRestaurantName } from "../utils/getOwnerData";
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomHeader from "../../components/CustomHeader";
import MainToolBar from "../MainToolbar";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomTabBar from "../CustomTabBar";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import axiosInstance from "../../utils/axiosConfig";

const RestaurantProfile = () => {
  const navigation = useNavigation(); // Get navigation object
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [restaurantName, setRestaurantName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const fetchOwnerData = async () => {
        const restaurantName = await getRestaurantName();
        const ownerName = await getOwnerName();
        setRestaurantName(restaurantName || "Restaurant"); // Default value if null
        setOwnerName(ownerName || "Captain"); // Default value if null
      };

      fetchOwnerData();
    }, [])
  );

  // React.useEffect(() => {
  //     // Fetch owner and restaurant name asynchronously
  //     const fetchOwnerData = async () => {
  //         const restaurantName = await getRestaurantName();
  //         const ownerName = await getOwnerName();
  //         setRestaurantName(restaurantName || 'Restaurant');  // Default value if null
  //         setOwnerName(ownerName || 'Owner');  // Default value if null
  //     };
  //     fetchOwnerData();
  // }, []);

  const toggleTheme = () => {
    setIsDarkTheme((previousState) => !previousState);
    // Add logic to change the theme (e.g., applying light/dark theme styles)
  };

  // Handlers for each button action
  const handleEditProfile = () => {
    navigation.navigate("MyProfileView"); // Navigate to MyProfile page
  };

  const handleNotification = () => {
    // Logic for notifications
    console.log("Notification button pressed");
  };

  const handleReport = () => {
    // Logic for report
    console.log("Report button pressed");
  };

  const handlePrivacyPolicy = () => {
    // Logic for privacy policy
    const privacyPolicyUrl = "https://menumitra.com/privacy_policy"; // Replace with your actual privacy policy URL
    Linking.openURL(privacyPolicyUrl).catch((err) =>
      console.error("Failed to open URL:", err)
    );

    console.log("Privacy Policy button pressed");
  };

  const handleLogout = async () => {
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

      // 2. Fallback to legacy storage (backward compatibility)
      if (!userId) {
        userId = await AsyncStorage.getItem("user_id");
        if (!userId) {
          userId = await AsyncStorage.getItem("captain_id");
        }
        role = await AsyncStorage.getItem("role") || "captain";
        console.log("Using legacy storage:", { userId, role });
      }

      // 3. Final validation
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
          
          // Device related
          "expoPushToken",
          "sessionToken",
          "device_sessid",
          "push_token",
          "device_uuid"
        ];

        await AsyncStorage.multiRemove(keysToRemove);
        console.log("Storage cleared successfully");

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );

        Alert.alert("Success", "You have been logged out successfully");
      } catch (e) {
        console.error("Error clearing storage:", e);
        throw e;
      }
    } catch (error) {
      console.error("Logout error:", error);

      // If error is related to missing data, clear storage and redirect anyway
      if (error.message.includes("not found")) {
        try {
          await AsyncStorage.clear();
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Login" }],
            })
          );
        } catch (e) {
          console.error("Error during forced logout:", e);
        }
      }

      Alert.alert(
        "Error",
        "Failed to log out. Please try again.\n" + error.message
      );
    }
  };

  function handleEditRestaurantProfile() {
    navigation.navigate("RestaurantInfo");
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    const fetchOwnerData = async () => {
      try {
        const restaurantName = await getRestaurantName();
        const ownerName = await getOwnerName();
        setRestaurantName(restaurantName || "Restaurant");
        setOwnerName(ownerName || "Captain");
      } catch (error) {
        console.error("Error refreshing profile:", error);
      } finally {
        setRefreshing(false);
      }
    };
    fetchOwnerData();
  }, []);

  return (
    <>
      <CustomHeader title="Profile" />

      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007BFF"]} // Android - using your theme color
            tintColor="#007BFF" // iOS
          />
        }
      >
        <View style={styles.centerWrapper}>
          <View style={styles.profileSection}>
            {/* <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: `${onGetProductionUrl()}/media/Images/profile_CO6OYke.jpg`,
                }}
                style={styles.profileImage}
              />
            </View> */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{restaurantName}</Text>
              <Text style={styles.subtitle}>{ownerName}</Text>
            </View>
          </View>
        </View>

        {/* Buttons with Custom Image Icons */}
        <View style={styles.buttonContainer}>
          {[
            {
              icon: "ri-store-2-line",
              label: "Restaurant Profile",
              action: handleEditRestaurantProfile,
            },
            {
              icon: "ri-user-line",
              label: "My Profile",
              action: handleEditProfile,
            },
            {
              icon: "ri-settings-3-line",
              label: "Settings",
              action: () => navigation.navigate("Settings"),
            },
            {
              icon: "ri-customer-service-2-line",
              label: "Support",
              action: () => navigation.navigate("SupportScreen"),
            },
            {
              icon: "ri-history-line",
              label: "Activity Log",
              action: () => navigation.navigate("ActivityLog"),
            },
            {
              icon: "ri-git-repository-private-line",
              label: "Privacy Policy",
              action: handlePrivacyPolicy,
            },
            {
              icon: "ri-logout-circle-r-line",
              label: "Logout",
              action: handleLogout,
            },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.button}
              onPress={item.label === "Theme" ? null : item.action} // Handle press except for Theme
            >
              <View style={styles.buttonContent}>
                <RemixIcon
                  name={item.icon}
                  size={18}
                  color={item.label === "Logout" ? "red" : "#007BFF"}
                  style={styles.icon}
                />
                <Text style={styles.buttonText}>{item.label}</Text>
              </View>

              {/* Add switch for theme toggle, positioned to the right */}
              {item.label === "Theme" && (
                <Switch
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={isDarkTheme ? "#f5dd4b" : "#f4f3f4"}
                  onValueChange={toggleTheme}
                  value={isDarkTheme}
                  style={styles.switch}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>


        {/* Footer */}
        <View style={styles.footerContainer}>


          <View style={styles.logoRow}>
            <Image
              source={require("../../assets/icon-transparent.png")}
              style={styles.footerLogo}
            />
            <Text style={styles.footerTitle}>MenuMitra</Text>
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() =>
                Linking.openURL(
                  "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
                )
              }
            >
              <MaterialCommunityIcons
                name="facebook"
                size={28}
                color="#1877F2"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() =>
                Linking.openURL("https://www.instagram.com/menumitra/")
              }
            >
              <MaterialCommunityIcons
                name="instagram"
                size={28}
                color="#E4405F"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() =>
                Linking.openURL("https://www.youtube.com/@menumitra")
              }
            >
              <MaterialCommunityIcons
                name="youtube"
                size={28}
                color="#FF0000"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => Linking.openURL("https://x.com/MenuMitra")}
            >
              <MaterialCommunityIcons
                name="twitter"
                size={28}
                color="#000000"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.footerTextContainer}>
            <View style={styles.poweredByContainer}>
              <MaterialCommunityIcons name="flash" size={14} color="#666" />
              <Text style={styles.poweredByText}>Powered by</Text>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://www.shekruweb.com")}
            >
              <Text style={styles.companyText}>
                Shekru Labs India Pvt. Ltd.
              </Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>version 1.3</Text>
          </View>
        </View>
      </ScrollView>
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  contentContainer: {
    paddingHorizontal: 5,
    paddingTop: 30,
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "gray",
  },
  buttonContainer: {
    marginTop: 10,
    marginLeft: 10,
    marginEnd: 10,
    flex: 1,
    paddingHorizontal: 5,
  },
  button: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 5,
    marginVertical: 8,
    borderStyle: "solid",
    borderRadius: 13,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  buttonText: {
    fontWeight: "bold",
    color: "#434040",
    marginLeft: 10,
    fontSize: 16,
  },
  footer: {
    alignItems: "center",
    padding: 10,
  },
  footerText: {
    fontSize: 14,
    color: "gray",
  },
  footerTextContainer: {
    marginTop: 40,
    alignItems: "center",
    marginBottom: 200,
  },
  switch: {
    height: 30,
    // No need for margin, as it will be positioned on the right end
  },
  buttonContent: {
    flexDirection: "row", // Align icon and text horizontally
    alignItems: "center",
    flex: 1, // Take available space
  },
  centerWrapper: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 5,
    borderRadius: 13,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    width: "95%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 8,
    textAlign: "left",
  },
  subtitle: {
    fontSize: 16,
    color: "gray",
    marginBottom: 4,
    textAlign: "left",
  },
  footerContainer: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#f5f5f5",
    borderTopColor: "#e0e0e0",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  footerLogo: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151", // coolGray.700
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    marginBottom:   5,
  },
  socialIcon: {
    padding: 4,
    marginHorizontal: 8,
  },
  footerTextContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  poweredByContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: "#666666",
  },
  companyText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    textAlign: "center",
  },
  versionText: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
    textAlign: "center",
    paddingBottom: 4,
  },
});

export default RestaurantProfile;
