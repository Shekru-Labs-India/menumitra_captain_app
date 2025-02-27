import React, { useState, useEffect, useRef } from "react";
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
import { useCallback } from "react";
import { getBaseUrl } from "../../config/api.config";
import * as Updates from "expo-updates";

export default function HomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [staffCount, setStaffCount] = useState(0);
  const [tableCount, setTableCount] = useState(0);
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
  const router = useRouter();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

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

  const fetchData = async () => {
    try {
      console.log("Starting fetchData function");
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const accessToken = await AsyncStorage.getItem("access");

      if (!storedOutletId) {
        console.log("No outlet ID found");
        toast.show({
          description: "Please log in again",
          status: "error",
          duration: 3000,
        });
        return;
      }

      // Fetch staff list
      const staffResponse = await fetch(
        `${getBaseUrl()}/get_staff_list_with_role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            outlet_id: storedOutletId,
            staff_role: "all",
          }),
        }
      );

      const staffData = await staffResponse.json();
      if (staffData.st === 1 && Array.isArray(staffData.lists)) {
        setStaffCount(staffData.lists.length);
      }

      // Fetch table list using new API
      console.log("Fetching table list...");
      const tableResponse = await fetch(`${getBaseUrl()}/table_listview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: storedOutletId,
        }),
      });

      const tableData = await tableResponse.json();
      console.log("Raw Table Response:", tableData);

      if (tableData.st === 1) {
        setTableCount(tableData.total_tables);
      }

      // Fetch latest sales
      await fetchLatestSales();
    } catch (error) {
      console.error("Error in fetchData:", error);
      toast.show({
        description: "Failed to fetch data",
        status: "error",
        duration: 3000,
      });
    }
  };

  const checkForUpdates = async () => {
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
                  Alert.alert(
                    "Error",
                    "Failed to download update. Please try again later."
                  );
                  console.log("Error downloading update:", error);
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

  useEffect(() => {
    fetchData();
    checkForUpdates();
  }, []);

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
        require("../../assets/sounds/simple-notification.mp3"),
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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

      const result = await fetch(
        `${getBaseUrl().replace(
          "common_api",
          "captain_api"
        )}/send_notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

      const responseData = await result.json();

      if (responseData.success) {
        await playSound();
        toast.show({
          description: "Waiter has been notified",
          status: "success",
          duration: 3000,
        });
      } else {
        throw new Error(responseData.message || "Failed to send notification");
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

  const fetchLatestSales = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(`${getBaseUrl()}/table_listview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: outletId,
        }),
      });

      const data = await response.json();
      console.log("Latest sales data:", data);

      if (data.st === 1) {
        setSalesData({
          liveSales: data.live_sales || 0,
          todayTotalSales: data.today_total_sales || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching latest sales:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchData(), checkForUpdates()]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Handle screen focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  return (
    <Box flex={1} bg="white" safeArea>
      <NativeBaseStatusBar backgroundColor="white" barStyle="dark-content" />
      <HStack
        px={4}
        py={2}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <Text fontSize="xl" fontWeight="bold">
          MenuMitra Captain
        </Text>
        <Pressable
          onPress={() => setIsSidebarOpen(true)}
          p={2}
          rounded="full"
          _pressed={{ bg: "coolGray.100" }}
        >
          <Icon as={MaterialIcons} name="menu" size={6} color="gray.600" />
        </Pressable>
      </HStack>

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
        <HStack
          mx={4}
          my={4}
          bg="white"
          rounded="lg"
          shadow={2}
          p={3}
          justifyContent="space-between"
        >
          <VStack alignItems="center" flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              ₹{Number(salesData.liveSales).toFixed(2)}
            </Text>
            <Text mt={2} color="coolGray.500">
              Live Sales
            </Text>
          </VStack>

          <Box width={1} bg="coolGray.200" />

          <VStack alignItems="center" flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              ₹{Number(salesData.todayTotalSales).toFixed(2)}
            </Text>
            <Text mt={2} color="coolGray.500">
              Today's Revenue
            </Text>
          </VStack>
        </HStack>

        <Box
          flexDirection="row"
          flexWrap="wrap"
          justifyContent="space-between"
          px={4}
        >
          {managementCards.map((card, index) => (
            <Pressable
              key={index}
              width="48%"
              bg={card.color}
              rounded="lg"
              p={4}
              mb={4}
              alignItems="center"
              justifyContent="center"
              onPress={() => router.push(card.route)}
              position="relative"
              shadow={2}
              borderWidth={1}
              borderColor="coolGray.300"
            >
              {card.count !== undefined && (
                <Box
                  position="absolute"
                  top={2}
                  right={2}
                  bg="white"
                  rounded="full"
                  px={2}
                >
                  <Text fontSize="sm" fontWeight="bold" color="coolGray.700">
                    {card.count}
                  </Text>
                </Box>
              )}
              <Icon
                as={MaterialIcons}
                name={card.icon}
                size={10}
                color="white"
                mb={2}
              />
              <Text
                color="white"
                fontWeight="bold"
                textAlign="center"
                fontSize="lg"
              >
                {card.title}
              </Text>
            </Pressable>
          ))}
        </Box>
      </NativeBaseScrollView>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        // onCallWaiter={handleCallWaiter}
      />
    </Box>
  );
}
