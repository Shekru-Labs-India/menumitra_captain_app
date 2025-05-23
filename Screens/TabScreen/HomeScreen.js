import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  ImageBackground,
  Platform,
  RefreshControl,
  Alert,
  Clipboard,
  Modal,
  BackHandler,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from "react-native";

import { Card, Title, Paragraph, IconButton } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import MainToolBar from "../MainToolbar";
import MenuScreen from "../Menu/MenuScreen";
import {
  getActiveOrders,
  getCompletedOrders,
  getUserId,
  getUserName,
  getRestaurantId,
  getRestaurantName,
  getTodayTotalRevenue,
} from "../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import axios from "axios";
import { onGetProductionUrl, onGetOwnerUrl, isDevelopment } from "../utils/ConstantFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "../utils/WebService";

import CustomHeader from "../../components/CustomHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendNotificationToWaiter } from "../../services/notificationService";
import * as Notifications from "expo-notifications";
import Sidebar from "../../components/Sidebar";
import NotificationService from "../../services/notificationService";

import axiosInstance from "../../utils/axiosConfig";
import CustomTabBar from "../CustomTabBar";
import * as Updates from 'expo-updates';

const { width } = Dimensions.get("window");
const CURRENT_APP_VERSION = "1.3"; // Your app's current version

const STORAGE_KEYS = {
  UPDATE_NEEDED: 'update_needed',
  UPDATE_TYPE: 'update_type'
};

// Define icon colors at the top of your file
const ICON_COLORS = {
  inventory: "#005f73", // midnight-green
  staff: "#0a9396", // dark-cyan
  Order: "#94d2bd", // tiffany-blue
  menu: "#ee9b00", // gamboge
  manage_table: "#ca6702", // alloy-orange
  reports: "#bb3e03", // rust
  supplier: "#2a9d8f", // Add this new color for supplier
  waiter: "#ff6347", // tomato
  captain: "#4682b4", // steelblue
  manager: "#4a90e2", // Add this new color for managers
  chef: "#FF6B6B", // or any other color you prefer
};

// Add this helper function at the top of your file
const formatIndianNumber = (num) => {
  const number = Number(num).toFixed(2);
  const [wholePart, decimal] = number.split(".");
  const lastThree = wholePart.substring(wholePart.length - 3);
  const otherNumbers = wholePart.substring(0, wholePart.length - 3);
  const formatted =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") +
    (otherNumbers ? "," : "") +
    lastThree;
  return `₹ ${formatted}.${decimal}`;
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const [activeOrders, setActiveOrders] = useState("0");
  const [completedOrders, setCompletedOrders] = useState("0");
  const [todayTotalRevenue, setTodayTotalRevenue] = useState("0");
  const [occupiedTables, setOccupiedTables] = useState("0");
  const [availableTables, setAvailableTables] = useState("0");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [todaySalesFromTables, setTodaySalesFromTables] = useState(0);
  const [liveSalesFromTables, setLiveSalesFromTables] = useState(0);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateType, setUpdateType] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState('');
  const [availableVersion, setAvailableVersion] = useState(null);

  const updateRestaurantName = async () => {
    try {
      const userId = await getUserId();
      const currentRestaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "listview_outlet",
        {
          user_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1 && response.data.restaurant_data) {
        const matchingRestaurant = response.data.restaurant_data.find(
          (restaurant) =>
            restaurant.restaurant_id === Number(currentRestaurantId)
        );

        if (matchingRestaurant) {
          await AsyncStorage.setItem(
            WebService.OUTLET_NAME,
            matchingRestaurant.outlet_name
          );
        }
      }
    } catch (error) {
      console.error("Error updating restaurant name:", error);
    }
  };

  // Add this useFocusEffect to refresh data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Fetch data when screen comes into focus
      fetchOrdersCount();
      updateRestaurantName();
      checkUpdates(); // Add version check when screen comes into focus
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Function to fetch orders count
  const fetchOrdersCount = async () => {
    setLoading(true);
    try {
      // Get required data
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      // Log request details for debugging/Postman
      const requestPayload = {
        url: onGetProductionUrl() + "table_listview",
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          outlet_id: restaurantId
        }
      };
      console.log("Table Listview Request:", JSON.stringify(requestPayload, null, 2));

      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_listview",
        {
          outlet_id: restaurantId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Log response for debugging
      console.log("Table Listview Response:", JSON.stringify(response.data, null, 2));

      if (response.data.st === 1) {
        const data = response.data;
        
        // Update orders and tables data
        setCompletedOrders(data.today_paid_orders ?? 0);
        setActiveOrders(data.active_orders ?? 0);
        setOccupiedTables(data.total_occupied_table_count ?? 0);
        setAvailableTables(data.total_available_tables ?? 0);

        // Update sales data
        setTodaySalesFromTables(data.today_total_sales || 0);
        setLiveSalesFromTables(data.live_sales || 0);

        console.log("Data updated successfully:", {
          today_total_sales: data.today_total_sales,
          live_sales: data.live_sales,
          occupied_tables: data.total_occupied_table_count,
          available_tables: data.total_available_tables
        });
      } else {
        console.error("API Error Response:", {
          status: response.data.st,
          message: response.data.msg,
          fullResponse: response.data
        });
      }
    } catch (error) {
      // Enhanced error logging for debugging
      console.error("Error fetching table data:", {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        requestConfig: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this new function to fetch table data
  const fetchTableData = async () => {
    try {
      let restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_listview",
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
        setTodaySalesFromTables(response.data.today_total_sales || 0);
        setLiveSalesFromTables(response.data.live_sales || 0);
      } else {
        console.error("Failed to fetch table data:", response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
    }
  };

  // Add update checking functions
  const setUpdateStatus = async (type) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UPDATE_NEEDED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.UPDATE_TYPE, type);
    } catch (error) {
      console.error('Error saving update status:', error);
    }
  };

  const clearUpdateStatus = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.UPDATE_NEEDED);
      await AsyncStorage.removeItem(STORAGE_KEYS.UPDATE_TYPE);
    } catch (error) {
      console.error('Error clearing update status:', error);
    }
  };

  const checkExpoUpdates = async () => {
    if (!__DEV__) {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setIsUpdating(true);
          setUpdateProgress('A minor update is available. Updating automatically...');
          
          try {
            await Updates.fetchUpdateAsync();
            setUpdateProgress('Installing update...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await Updates.reloadAsync();
          } catch (error) {
            console.error("Error updating app:", error);
            setIsUpdating(false);
            Alert.alert(
              "Update Failed",
              "Failed to install the update. Please try again later.",
              [{ text: "OK" }]
            );
          }
        }
      } catch (error) {
        console.error("Error checking Expo updates:", error);
        setIsUpdating(false);
      }
    }
  };

  const checkAppVersion = async () => {
    try {
      const response = await axiosInstance.post(
        onGetProductionUrl() + "check_version",
        {
          app_type: "captain_app"
        }
      );

      if (response?.data?.st === 1 && response?.data?.version) {
        const serverVersion = response.data.version;
        console.log('Server Version:', serverVersion);
        console.log('Current Version:', CURRENT_APP_VERSION);

        // Convert versions to numbers for proper comparison
        const serverVersionNum = parseFloat(serverVersion);
        const currentVersionNum = parseFloat(CURRENT_APP_VERSION);

        if (serverVersionNum > currentVersionNum) {
          setAvailableVersion(serverVersion);
          await setUpdateStatus('store');
          setUpdateType('store');
          setShowUpdateModal(true);
        } else {
          // Clear any existing update status if versions are equal or current is higher
          await clearUpdateStatus();
          setShowUpdateModal(false);
        }
      } else {
        console.log('Invalid response format:', response?.data);
      }
    } catch (error) {
      console.error("Version check error:", error);
    }
  };

  const checkPendingUpdates = async () => {
    try {
      const updateNeeded = await AsyncStorage.getItem(STORAGE_KEYS.UPDATE_NEEDED);
      if (updateNeeded === 'true') {
        const type = await AsyncStorage.getItem(STORAGE_KEYS.UPDATE_TYPE);
        setUpdateType(type);
        setShowUpdateModal(true);
      }
    } catch (error) {
      console.error('Error checking pending updates:', error);
    }
  };

  // Function to check all updates
  const checkUpdates = async () => {
    await checkPendingUpdates();
    await checkAppVersion();
    await checkExpoUpdates();
  };

  const handleCardPress = (cardId) => {
    // Handle navigation or other logic here

    switch (cardId) {
      case "active_order":
        navigation.navigate("OrderList", { selectedOrderStatus: "ongoing" });
        break;
      case "completed_order":
        navigation.navigate("OrderList", { selectedOrderStatus: "completed" });
        break;

      case "staff":
        navigation.navigate("Staff", {});

        break;
      case "inventory":
        navigation.navigate("ManageInventory");
        break;
      case "menu":
        navigation.navigate("MenuScreen");
        break;
      case "Order":
        navigation.navigate("OrderList");
        // message = 'Your order has been cancelled.';
        break;
      case "Banners":
        navigation.navigate("Banners");
        // message = 'Your order has been cancelled.';
        break;
      case "manage_table":
        navigation.navigate("RestaurantTables");
        break;
      case "reports":
        navigation.navigate("Reports");
        break;
      case "occupied_tables":
      case "available_tables":
        navigation.navigate("RestaurantTables");
        break;
      case "category":
        navigation.navigate("Category");
        break;
      case "waiter":
        navigation.navigate("WaiterList");
        break;
      case "supplier":
        navigation.navigate("SupplierList");
        break;
      case "captain":
        navigation.navigate("CaptainList");
        break;
      case "manager":
        navigation.navigate("ManagerList");
        break;
      case "chef":
        navigation.navigate("ChefListView");
        break;
      case "demo":
        navigation.navigate("OrderCreateUIDemo");
        break;
      default:
      // message = 'Status is unknown.';
    }
  };

  // Sample card data
  const cardData = [
    {
      id: "1",
      title: activeOrders,
      card_id: "active_order",
      description: "Active Orders",
    },
    {
      id: "2",
      title: completedOrders,
      card_id: "completed_order",
      description: "Completed Orders",
    },
    {
      id: "3",
      title: occupiedTables,
      card_id: "occupied_tables",
      description: "Occupied Tables",
    },
    {
      id: "4",
      title: availableTables,
      card_id: "available_tables",
      description: "Available Tables",
    },
  ];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchOrdersCount(),
      checkUpdates() // Add version check to refresh
    ]).then(() => setRefreshing(false));
  }, []);

  const sendTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 New Order Alert!",
          body: "Table T1 needs your attention",
          data: { screen: "Orders" },
          sound: true,
        },
        trigger: null, // null means show immediately
      });
      console.log("Local notification sent successfully");
    } catch (error) {
      console.error("Error sending notification:", error);
      Alert.alert("Error", "Failed to send notification");
    }
  };

  // Add this function at the top level of the HomeScreen component
  const handleLogoutAndRedirect = async () => {
    try {
      // Get user_id before clearing storage
      const ownerData = await AsyncStorage.getItem("owner_data");
      const userData = JSON.parse(ownerData);
      const userId = userData?.user_id;

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Call logout API without authorization
      const response = await axiosInstance.post(
        onGetProductionUrl() + "logout",
        {
          user_id: userId,
          role: "captain",
          app: "captain",
        }
      );

      const data = response.data;

      if (data.st !== 1) {
        throw new Error(data.msg || "Logout failed");
      }

      // Clear all stored data
      try {
        const keys = [
          "owner_data",
          "access_token",
          "refresh_token",
          "restaurant_id",
          "user_id",
          "expoPushToken",
          "sessionToken",
          "device_token",
          "tokenTimestamp",
          "device_sessid",
          "push_token",
        ];

        await AsyncStorage.multiRemove(keys);
        console.log("All data cleared from storage");
      } catch (e) {
        console.error("Error clearing storage:", e);
      }

      // Navigate to Login screen and clear navigation stack
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
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

      console.error("Failed to logout:", error.message);
      // Still navigate to login in case of error
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  };

  // Update the StoreUpdateModal component
  const StoreUpdateModal = ({ visible }) => {
    const [countdown, setCountdown] = useState(10);
    
    // Memoize the handleLogoutAndRedirect reference
    const memoizedLogout = useCallback(() => {
      if (countdown === 0) {
        handleLogoutAndRedirect();
      }
    }, [countdown]);
    
    useEffect(() => {
      let timer;
      if (visible && countdown > 0) {
        timer = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      } else if (countdown === 0) {
        // Call logout API instead of directly clearing storage
        memoizedLogout();
      }
      return () => clearInterval(timer);
    }, [visible, countdown, memoizedLogout]);
  
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <RemixIcon name="refresh-line" size={50} color="#FF9A6C" />
              <Text style={styles.modalTitle}>Update Required</Text>
            </View>
  
            <View style={styles.versionInfoContainer}>
              <View style={styles.versionRow}>
                <View style={styles.versionLabelContainer}>
                  <RemixIcon name="smartphone-line" size={20} color="#666" />
                  <Text style={styles.versionLabel}>Current Version</Text>
                </View>
                <Text style={styles.versionNumber}>{CURRENT_APP_VERSION}</Text>
              </View>
              
              <View style={styles.versionDivider} />
              
              <View style={styles.versionRow}>
                <View style={styles.versionLabelContainer}>
                  <RemixIcon name="arrow-up-circle-line" size={20} color="#FF9A6C" />
                  <Text style={styles.versionLabel}>Available Version</Text>
                </View>
                <Text style={[styles.versionNumber, { color: '#FF9A6C' }]}>{availableVersion}</Text>
              </View>
            </View>
  
            <Text style={styles.modalText}>
              A new version is available in the store. You must update the app to continue using it.
            </Text>

            <View style={styles.supportContainer}>
              <Text style={styles.supportText}>Need help? Contact support:</Text>
              <TouchableOpacity 
                style={styles.supportLink}
                onPress={() => Linking.openURL('tel:9527279639')}
              >
                <RemixIcon name="phone-line" size={16} color="#666" />
                <Text style={styles.supportLinkText}>+91 9527279639</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.supportLink}
                onPress={() => Linking.openURL('mailto:menumitra.info@gmail.com')}
              >
                <RemixIcon name="mail-line" size={16} color="#666" />
                <Text style={styles.supportLinkText}>menumitra.info@gmail.com</Text>
              </TouchableOpacity>
            </View>
  
            <View style={styles.updateButtonsContainer}>
              <TouchableOpacity 
                style={styles.updateButton}
                onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.menumitra.ownerapp')}
              >
                <RemixIcon name="google-play-line" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.updateButtonText}>Update Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.updateButton, { backgroundColor: '#dc3545' }]}
                disabled={true}
              >
                <RemixIcon name="logout-circle-line" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.updateButtonText}>Logging out in {countdown}s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const UpdateLoadingOverlay = () => (
    <Modal
      visible={isUpdating}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color="#FF9A6C" />
          </View>
          <Text style={styles.loadingTitle}>Updating App</Text>
          <Text style={styles.loadingText}>{updateProgress}</Text>
          <View style={styles.progressDots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <CustomHeader
        title="Home"
        isHome={true}
        rightComponent={
          <View style={{ flexDirection: "row", alignItems: 'center' }}>
           
            <TouchableOpacity
              onPress={() => setIsSidebarOpen(true)}
              style={{ padding: 10 }}
            >
              <RemixIcon name="menu-line" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
        }
      />
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#000000"]}
              tintColor="#000000"
            />
          }
        >
          {/* Existing Cards */}

          <View style={styles.toolbarContainer}>
            <MainToolBar />
          </View>

          
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={styles.salesButton}
              onPress={() => navigation.navigate("OrderList")}
            >
              <View style={styles.todaysSalesBadge}>
                <Text style={styles.salesText}>Today's Sales</Text>
                <View style={styles.salesValueContainer}>
                  <Text style={styles.salesValue}>{todaySalesFromTables}</Text>
                  <RemixIcon name="arrow-right-s-line" size={20} color="#1976d2" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.salesButton}
              onPress={() => handleCardPress("reports")}
            >
              <View style={styles.liveSalesBadge}>
                <Text style={styles.salesText}>Live Sales</Text>
                <View style={styles.salesValueContainer}>
                  <Text style={styles.salesValue}>{liveSalesFromTables}</Text>
                  <RemixIcon name="arrow-right-s-line" size={20} color="#f4511e" />
                </View>
              </View>
            </TouchableOpacity>

          </View>

          {/* New Cards with Icon and Text */}
          <View style={styles.iconCardContainer}>
            {[
              {
                imageUrl: "ri-grid-fill",
                text: "Create Order",
                card_id: "manage_table",
                iconColor: ICON_COLORS.manage_table,
              },
              {
                imageUrl: "ri-list-unordered",
                text: "Orders",
                card_id: "Order",
                iconColor: ICON_COLORS.Order,
              },
              {
                imageUrl: "ri-dropbox-fill",
                text: "Inventory",
                card_id: "inventory",
                iconColor: ICON_COLORS.inventory,
              },
              {
                imageUrl: "ri-truck-line",
                text: "Supplier",
                card_id: "supplier",
                iconColor: ICON_COLORS.supplier,
              },
              {
                imageUrl: "ri-group-line",
                text: "Staff",
                card_id: "staff",
                iconColor: ICON_COLORS.staff,
              },
              {
                imageUrl: "ri-restaurant-2-line",
                text: "Menu",
                card_id: "menu",
                iconColor: ICON_COLORS.menu,
              },
              {
                imageUrl: "ri-price-tag-3-line",
                text: "Category",
                card_id: "category",
                iconColor: ICON_COLORS.menu,
              },
              {
                imageUrl: "ri-folder-chart-line",
                text: "Reports",
                card_id: "reports",
                iconColor: ICON_COLORS.reports,
                hidden: true,
              },
              {
                imageUrl: "ri-group-line",
                text: "Waiters",
                card_id: "waiter",
                iconColor: ICON_COLORS.waiter,
                hidden: true,
              },
              {
                imageUrl: "ri-user-star-line",
                text: "Captains",
                card_id: "captain",
                iconColor: ICON_COLORS.captain,
                hidden: true,
              },
              {
                imageUrl: "ri-user-settings-line",
                text: "Managers",
                card_id: "manager",
                iconColor: ICON_COLORS.manager,
                hidden: true,
              },
              {
                imageUrl: "ri-user-star-line",
                text: "Chefs",
                card_id: "chef",
                iconColor: ICON_COLORS.chef,
                hidden: true,
              },
            ].filter(item => !item.hidden).map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.iconCard}
                onPress={() => handleCardPress(item.card_id)}
              >
                <View style={styles.iconCardContent}>
                  <RemixIcon
                    name={item.imageUrl}
                    size={35}
                    color={item.iconColor}
                  />
                  <Paragraph style={styles.iconCardText}>{item.text}</Paragraph>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
     
      <CustomTabBar />
      <StoreUpdateModal visible={showUpdateModal && updateType === 'store'} />
      <UpdateLoadingOverlay />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 5,
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f6f6f6",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "black",
  },
  cardContainer: {
    marginTop: 10,
    width: '100%',
  },
  card: {
    height: 70,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    elevation: 2,
  },
  availableTableCard: {
    borderWidth: 1.5,
    borderColor: "#28a745",
    borderStyle: "dashed",
  },
  occupiedTableCard: {
    borderWidth: 1.5,
    borderColor: "#dc3545",
    borderStyle: "dashed",
  },
  backgroundImage: {
    width: "100%",
    justifyContent: "center",
    borderRadius: 13,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  leftContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  rightContent: {
    alignItems: "flex-end",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    lineHeight: 18,
  },
  infoCard: {
    marginTop: 5,

    width: "100%",
    borderRadius: 13,
    elevation: 2,
  },
  infoCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(233,243,251,0.8)",
    borderRadius: 13,
    borderWidth: 1,
  },
  leftTextView: {
    flex: 1,
  },
  rightTextView: {
    flexDirection: "row",
    alignItems: "center",
  },
  revenueText: {
    fontSize: 15,
    fontWeight: "900",
  },
  infoText: {
    fontSize: 18,
  },
  icon: {
    marginLeft: 8,
  },
  iconCardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 100,
  },
  iconCard: {
    backgroundColor: "#ffffff",
    width: Platform.select({
      web: width / 2 - 24,
      default: width / 2 - 24,
    }),
    marginBottom: 16,
    padding: 16,
    borderRadius: 13,
    elevation: 2,
  },
  iconCardContent: {
    alignItems: "center",
  },
  iconCardText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
  },

  availableTableText: {
    color: "#28a745",
  },
  occupiedTableText: {
    color: "#dc3545",
  },
  cardWrapper: {
    width: Platform.select({
      web: width / 2 - 20,
      default: width / 2 - 20,
    }),
    marginBottom: 12,
  },
  notificationTestButton: {
    position: 'absolute',
    right: 16,
    bottom: 80, // Position above the CustomTabBar
    backgroundColor: '#219ebc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  notificationTestText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  testBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  testBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  versionInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    width: '100%',
    padding: 20,
    marginBottom: 20,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  versionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionLabel: {
    fontSize: 16,
    color: '#666',
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  versionDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    width: '100%',
    marginVertical: 8,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 22,
  },
  updateButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  updateButton: {
    backgroundColor: '#FF9A6C',
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exitButton: {
    backgroundColor: '#dc3545',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    elevation: 5,
  },
  loaderWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 154, 108, 0.1)',
    borderRadius: 30,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FF9A6C',
    width: 16,
    height: 8,
    borderRadius: 4,
  },
  supportContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    width: '100%',
  },
  supportLinkText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  salesButton: {
    width: '100%',
    marginBottom: 12,
  },
  todaysSalesBadge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  liveSalesBadge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(253,237,232,0.8)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ffccbc',
  },
  salesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  salesValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
  },
  salesValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
});

export default HomeScreen;