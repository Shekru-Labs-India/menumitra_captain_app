import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  Platform,
  StatusBar,
  Linking,
  Alert,
  Clipboard,
  RefreshControl,
} from "react-native";
import {
  Box,
  HStack,
  VStack,
  Text,
  Image,
  Icon,
  Pressable,
  ScrollView as NativeBaseScrollView,
  StatusBar as NativeBaseStatusBar,
  useToast,
  Button,
  Modal,
  Center,
  Heading,
  IconButton,
  Badge,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Sidebar from "../components/Sidebar";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendNotificationToWaiter,
  verifyCurrentDeviceTokens,
} from "../../services/NotificationService";
import {
  setupNotifications,
  addNotificationListener,
  addNotificationResponseListener,
} from "../../services/DeviceTokenService";
import { useFocusEffect } from "@react-navigation/native";
import { getBaseUrl } from "../../config/api.config";
import * as Updates from "expo-updates";
import Constants from 'expo-constants';
import { fetchWithAuth } from "../../utils/apiInterceptor";
import { useVersion } from "../../context/VersionContext";
import * as Notifications from "expo-notifications";

// Memoize static components
const MemoizedStatusBar = memo(() => (
  <NativeBaseStatusBar backgroundColor="white" barStyle="dark-content" />
));

// Memoize the management card component
const ManagementCard = memo(({ card, onPress }) => (
  <Pressable
    width="48%"
    bg={card.color}
    rounded="lg"
    p={4}
    mb={4}
    alignItems="center"
    justifyContent="center"
    onPress={onPress}
    position="relative"
    shadow={2}
    borderWidth={1}
    borderColor="coolGray.300"
  >
    {card.count !== undefined && (
      <Box position="absolute" top={2} right={2} bg="white" rounded="full" px={2}>
        <Text fontSize="sm" fontWeight="bold" color="coolGray.700">
          {card.count}
        </Text>
      </Box>
    )}
    <Icon as={MaterialIcons} name={card.icon} size={10} color="white" mb={2} />
    <Text color="white" fontWeight="bold" textAlign="center" fontSize="lg">
      {card.title}
    </Text>
  </Pressable>
));

// Memoize the sales summary component
const SalesSummary = memo(({ liveSales, todayTotalSales }) => (
  <HStack mx={4} my={4} bg="white" rounded="lg" shadow={2} p={3} justifyContent="space-between">
    <VStack alignItems="center" flex={1}>
      <Text fontSize="lg" fontWeight="bold">
        ₹{Number(liveSales).toFixed(2)}
      </Text>
      <Text mt={2} color="coolGray.500">
        Live Sales
      </Text>
    </VStack>
    <Box width={1} bg="coolGray.200" />
    <VStack alignItems="center" flex={1}>
      <Text fontSize="lg" fontWeight="bold">
        ₹{Number(todayTotalSales).toFixed(2)}
      </Text>
      <Text mt={2} color="coolGray.500">
        Today's Sales
      </Text>
    </VStack>
  </HStack>
));

export default function HomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [staffCount, setStaffCount] = useState(0);
  const [tableCount, setTableCount] = useState(0);
  const [apiVersion, setApiVersion] = useState("");
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const { version: appVersion } = useVersion();
  const [todaysSales, setTodaysSales] = useState({
    sales: 0,
    revenue: 0,
  });
  const [deviceToken, setDeviceToken] = useState(null);
  const [pushToken, setPushToken] = useState(null);
  const [salesData, setSalesData] = useState({
    liveSales: 0,
    todayTotalSales: 0,
  });
  const [restaurantName, setRestaurantName] = useState("");
  const router = useRouter();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const isExpoGo = Constants.executionEnvironment === "storeClient";

  // Get restaurant name from AsyncStorage
  const getRestaurantName = useCallback(async () => {
    try {
      const name = await AsyncStorage.getItem("outlet_name");
      if (name) {
        setRestaurantName(name);
      }
    } catch (error) {
      console.error("Error getting restaurant name:", error);
    }
  }, []);

  // Update the management cards array to match the reference
  const managementCards = [
    {
      title: "Staff",
      icon: "group",
      route: "/(tabs)/staff",
      color: "green.500",
      count: staffCount,
    },
    {
      title: "Orders",
      icon: "receipt",
      route: "/(tabs)/orders",
      color: "blue.500",
    },
    {
      title: "Tables",
      icon: "table-restaurant",
      route: "/(tabs)/tables/sections",
      color: "purple.500",
      count: tableCount,
    },
    {
      title: "Inventory",
      icon: "inventory",
      route: "/screens/inventory/inventory-items",
      color: "orange.500",
    },
    {
      title: "Suppliers",
      icon: "local-shipping",
      route: "/screens/suppliers",
      color: "pink.500",
    },
    {
      title: "Menus",
      icon: "restaurant",
      route: "/screens/menus/MenuListView",
      color: "blue.500",
    },
    {
      title: "Categories",
      icon: "category",
      route: "/screens/categories/CategoryListview",
      color: "red.500",
    },
  ];

  // Memoize handlers
  const handleCardPress = useCallback((route) => {
    router.push(route);
  }, [router]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Memoize fetch functions
  const fetchLatestSales = useCallback(async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const data = await fetchWithAuth(`${getBaseUrl()}/table_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_id: outletId }),
      });

      if (data.st === 1) {
        setSalesData({
          liveSales: data.live_sales || 0,
          todayTotalSales: data.today_total_sales || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching latest sales:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (!storedOutletId) {
        toast.show({
          description: "Please log in again",
          status: "error",
          duration: 3000,
        });
        return;

      }

      await getRestaurantName();

      const [staffData, tableData] = await Promise.all([
        fetchWithAuth(`${getBaseUrl()}/get_staff_list_with_role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: storedOutletId,
            staff_role: "all",
          }),
        }),
        fetchWithAuth(`${getBaseUrl()}/table_listview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: storedOutletId,
          }),
        }),
      ]);

      if (staffData.st === 1 && Array.isArray(staffData.lists)) {
        setStaffCount(staffData.lists.length);
      }
      if (tableData.st === 1) {
        setTableCount(tableData.total_tables);
      }

      await fetchLatestSales();
    } catch (error) {
      console.error("Error in fetchData:", error);
      toast.show({
        description: "Failed to fetch data",
        status: "error",
        duration: 3000,
      });
    }
  }, [toast, fetchLatestSales, getRestaurantName]);

  // Optimize refresh control
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchData(),
        !isExpoGo ? checkForUpdates() : Promise.resolve()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchData, isExpoGo]);

  // Optimize focus effect
  useFocusEffect(
    useCallback(() => {
      const initializeScreen = async () => {
        await fetchData();
        if (!isExpoGo) {
          await checkForUpdates();
        }
      };

      initializeScreen();
    }, [fetchData, isExpoGo])
  );

  const checkForUpdates = async () => {
    // Skip update check in Expo Go
    if (isExpoGo) {
      console.log("Update checking is not supported in Expo Go");
      return;
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          "Update Available",
          "A new version of the app is available. Would you like to update now?",
          [
            {
              text: "Update",
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    "Update Downloaded",
                    "The update has been downloaded. The app will now restart to apply the changes.",
                    [
                      {
                        text: "OK",
                        onPress: async () => {
                          await Updates.reloadAsync();
                        },
                      },
                    ]
                  );
                } catch (error) {
                  console.log("Error downloading update:", error);
                  Alert.alert(
                    "Error",
                    "Failed to download update. Please try again later."
                  );
                }
              },
            },
            {
              text: "Later",
              style: "cancel",
            },
          ]
        );
      }
    } catch (error) {
      console.log("Error checking for updates:", error);
    }
  };

  // Add Audio initialization
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };

    initAudio();
  }, []);

  // Update sound cleanup
  useEffect(() => {
    return () => {
      if (sound) {
        console.log("Unloading Sound");
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Update playSound function
  const playSound = async () => {
    try {
      console.log("Loading Sound");
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/notification.mp3"),
        { shouldPlay: true }
      );

      setSound(newSound);
      console.log("Playing Sound");

      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // Update initialization effect
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Setup notifications
        const token = await setupNotifications();
        console.log("Notification token:", token);

        // Save token for receiving notifications
        if (token) {
          await AsyncStorage.setItem("expoPushToken", token);
        }

        // Add notification listeners
        const notificationListener = addNotificationListener((notification) => {
          console.log("Received notification:", notification);
          playSound();

          // Show toast for received notification
          toast.show({
            description:
              notification.request.content.body || "New notification received",
            status: "info",
            duration: 3000,
          });
        });

        const responseListener = addNotificationResponseListener((response) => {
          console.log("Notification response:", response);
          // Handle notification tap
          if (response.notification.request.content.data?.screen) {
            router.push(response.notification.request.content.data.screen);
          }
        });

        return () => {
          notificationListener.remove();
          responseListener.remove();
        };
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initializeNotifications();
  }, []);

  const handleNotification = async () => {
    try {
      if (!pushToken || !deviceToken) {
        const activeSession = await AsyncStorage.getItem("activeSession");
        if (!activeSession) {
          throw new Error("No active session found. Please log in again.");
        }

        const session = JSON.parse(activeSession);
        setPushToken(session.expoPushToken);
        setDeviceToken(session.sessionToken);
      }

      const outletId = await AsyncStorage.getItem("outlet_id");

      const result = await NotificationService.sendNotification({
        to: pushToken,
        title: "Waiter Call",
        body: "Table 1 needs assistance",
        data: {
          type: "waiter_call",
          tableNumber: "1",
          outletId: outletId.toString(),
          token: deviceToken,
        },
      });

      if (result.success) {
        await playSound();
        toast.show({
          description: "Notification sent successfully!",
          status: "success",
          duration: 3000,
        });
      } else {
        throw new Error(result.message || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.show({
        description: error.message || "Error sending notification",
        status: "error",
        duration: 3000,
      });
    }
  };

  const checkStoredToken = async () => {
    try {
      const token = await AsyncStorage.getItem("devicePushToken");
      if (token) {
        toast.show({
          render: () => (
            <Box bg="info.500" px="4" py="2" rounded="sm" mb={5}>
              <VStack space={1}>
                <Text color="white" fontSize="md" fontWeight="bold">
                  Device Token
                </Text>
                <Text color="white" fontSize="sm" maxW="300">
                  {token}
                </Text>
              </VStack>
            </Box>
          ),
          placement: "top",
          duration: 5000,
        });
      } else {
        toast.show({
          description: "No device token found",
          status: "warning",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  };

  const showAndCopyTokens = async () => {
    try {
      const [expoPushToken, sessionToken] = await AsyncStorage.multiGet([
        "expoPushToken",
        "sessionToken",
      ]);

      // Add clear console logs for token
      console.log("======= EXPO PUSH TOKEN =======");
      console.log(expoPushToken[1]);
      console.log("================================");
      
      // Get token directly from Expo service as backup
      try {
        const directToken = await Notifications.getExpoPushTokenAsync({
          projectId: "c58bd2bc-2b46-4518-a238-6e981d88470a",
        });
        
        console.log("======= DIRECT EXPO TOKEN =======");
        console.log(directToken.data);
        console.log("=================================");
      } catch (err) {
        console.log("Error getting direct token:", err);
      }

      const tokenInfo = {
        pushToken: expoPushToken[1],
        uniqueToken: sessionToken[1],
      };

      // Verify if these are the current device's tokens
      const verification = await verifyCurrentDeviceTokens(
        sessionToken[1],
        expoPushToken[1]
      );

      const tokenString = JSON.stringify(
        {
          ...tokenInfo,
          isCurrentDevice: verification.isValid,
          deviceInfo: verification.deviceInfo,
        },
        null,
        2
      );

      Alert.alert(
        "Current Device Tokens",
        `${tokenString}\n\nStatus: ${verification.message}`,
        [
          {
            text: "Copy Tokens",
            onPress: () => {
              Clipboard.setString(JSON.stringify(tokenInfo));
              toast.show({
                description: "Tokens copied to clipboard!",
                status: "success",
                duration: 2000,
              });
            },
          },
          {
            text: "Close",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error("Error showing tokens:", error);
      toast.show({
        description: "Error retrieving tokens",
        status: "error",
        duration: 2000,
      });
    }
  };

  const handleCallWaiter = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const sessionToken = await AsyncStorage.getItem("session_token");

      const data = await fetchWithAuth(
        `${getBaseUrl().replace("common_api", "captain_api")}/send_notification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              type: "waiter_call",
              tableNumber: "1",
              outletId: outletId.toString(),
              token: sessionToken,
            },
          }),
        }
      );

      if (data.success) {
        await playSound();
        toast.show({
          description: "Waiter has been notified",
          status: "success",
          duration: 3000,
        });
      } else {
        throw new Error(data.message || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending waiter notification:", error);
      toast.show({
        description: "Failed to call waiter. Please try again.",
        status: "error",
        duration: 3000,
      });
    }
  };

  // Update version check function
  const checkVersion = useCallback(async () => {
    try {
      const response = await fetchWithAuth('https://men4u.xyz/common_api/check_version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_type: 'captain_app' })
      });
      
      if (response.st === 1) {
        setApiVersion(response.version || '');
        // Compare versions
        const apiVer = response.version ? response.version.split('.').map(Number) : [0, 0, 0];
        const appVer = appVersion.split('.').map(Number);
        
        // Compare version numbers
        for (let i = 0; i < 3; i++) {
          if (apiVer[i] > appVer[i]) {
            setNeedsUpdate(true);
            setShowUpdateModal(true);
            break;
          } else if (apiVer[i] < appVer[i]) {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error checking version:', error);
    }
  }, [appVersion]);

  // Add version check to initialization
  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  const handleUpdatePress = () => {
    // You can add logic here to direct users to the app store or download page
    Linking.openURL('https://play.google.com/store/apps/details?id=com.menumitra.captain');
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <Modal isOpen={showUpdateModal} closeOnOverlayClick={false} size="lg">
        <Modal.Content>
          <Modal.Header>Update Required</Modal.Header>
          <Modal.Body>
            <VStack space={3}>
              <Text>
                A new version of MenuMitra Captain (v{apiVersion}) is available. Your current version is v{appVersion}.
              </Text>
              <Text fontWeight="bold" color="orange.500">
                Please update the app to continue using all features.
              </Text>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
             
              <Button colorScheme="orange" onPress={handleUpdatePress}>
                Update Now
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      <MemoizedStatusBar />
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        bg="white"
      >
        <Box width={10} />
        <Heading size="md" flex={1} textAlign="center">
          Home
        </Heading>
        <IconButton
          icon={<Icon as={MaterialIcons} name="menu" size={6} color="gray.500" />}
          onPress={toggleSidebar}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
      </HStack>
      

      <Box px={4} pb={3}>
        <Pressable>
          <HStack 
            alignItems="center" 
            justifyContent="space-between" 
            bg="white"
            rounded="md" 
            p={2}
          >
            <HStack alignItems="center" space={2}>
              <Icon as={MaterialIcons} name="store" size={5} color="gray.600" />
              <Text fontWeight="medium" fontSize="md">{restaurantName || "Select Restaurant"}</Text>
            </HStack>
       
              <Badge colorScheme="warning" variant="solid" rounded="full" px={3} py={0.5}>
                <Text color="white" fontSize="xs" fontWeight="medium">TESTING</Text>
              </Badge>
          
          </HStack>
        </Pressable>
      </Box>

      <NativeBaseScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0891b2"]}
            tintColor="#0891b2"
          />
        }
      >
        {/* Add Expo Push Token Button at the top for easy access */}
        {/* <Box px={4} py={2} mb={2}>
          <Button 
            onPress={showAndCopyTokens}
            colorScheme="blue"
            leftIcon={<Icon as={MaterialIcons} name="notifications" size="sm" />}
            size="sm"
          >
            Get Expo Push Token
          </Button>
        </Box> */}

        <SalesSummary 
          liveSales={salesData.liveSales} 
          todayTotalSales={salesData.todayTotalSales} 
        />

        <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between" px={4}>
          {managementCards.map((card, index) => (
            <ManagementCard
              key={index}
              card={card}
              onPress={() => handleCardPress(card.route)}
            />
          ))}
        </Box>
      </NativeBaseScrollView>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={toggleSidebar}
      />
    </Box>
  );
}

