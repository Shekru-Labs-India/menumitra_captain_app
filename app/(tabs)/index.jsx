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
  NotificationService,
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

const API_BASE_URL = "https://men4u.xyz/common_api";

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

  // Fix the route paths in management cards
  const managementCards = [
    {
      title: "Staff",
      icon: "people",
      route: "/(tabs)/staff",
      color: "cyan.500",
      count: staffCount,
    },
    {
      title: "Tables",
      icon: "table-restaurant",
      route: "/(tabs)/tables",
      color: "purple.500",
      count: tableCount,
    },
    {
      title: "Orders",
      icon: "receipt-long",
      route: "/(tabs)/orders",
      color: "orange.500",
    },
    {
      title: "Menu",
      icon: "restaurant-menu",
      route: "/(tabs)/menu/menu-items", // Fixed route path
      color: "emerald.500",
    },
  ];

  const fetchData = async () => {
    try {
      console.log("Starting fetchData function");
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

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
      console.log("Fetching staff list...");
      const staffResponse = await fetch(
        `${API_BASE_URL}/get_staff_list_with_role`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: storedOutletId,
            staff_role: "all",
          }),
        }
      );

      const staffData = await staffResponse.json();
      console.log("Raw Staff Response:", staffData);

      if (staffData.st === 1 && Array.isArray(staffData.lists)) {
        console.log("Setting staff count to:", staffData.lists.length);
        setStaffCount(staffData.lists.length);
      }

      // Fetch table sections
      console.log("Fetching table sections...");
      const tableSectionsResponse = await fetch(
        `${API_BASE_URL}/table_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: storedOutletId,
          }),
        }
      );

      const tableSectionsData = await tableSectionsResponse.json();
      console.log("Raw Table Sections Response:", tableSectionsData);

      if (tableSectionsData.st === 1 && tableSectionsData.data) {
        console.log("Processing table sections data...");
        let totalTables = 0;
        tableSectionsData.data.forEach((section, index) => {
          const tableCount = section.tables ? section.tables.length : 0;
          console.log(`Section "${index}": ${tableCount} tables`);
          totalTables += tableCount;
        });
        console.log("Final Total Tables:", totalTables);
        setTableCount(totalTables);
      }

      // Fetch latest sales
      await fetchLatestSales();
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // Single effect for data fetching
  useEffect(() => {
    console.log("useEffect triggered for data fetching");
    fetchData();
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

  // Add useEffect to load tokens when screen mounts
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await NotificationService.initialize();

        // Load tokens
        const activeSession = await AsyncStorage.getItem("activeSession");
        if (activeSession) {
          const session = JSON.parse(activeSession);
          setPushToken(session.expoPushToken);
          setDeviceToken(session.sessionToken);
        }
      } catch (error) {
        console.error("Error initializing:", error);
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

      const result = await sendNotificationToWaiter({
        order_number: Date.now().toString(),
        order_id: Date.now().toString(),
        tableNumber: "1",
        outletId,
        token: deviceToken,
        to: pushToken,
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

  // Add this effect to setup notifications and listeners
  useEffect(() => {
    // Setup notifications
    setupNotifications();

    // Add notification listeners
    const notificationListener = addNotificationListener((notification) => {
      console.log("Received notification:", notification);
      playSound(); // Play sound when notification is received
    });

    const responseListener = addNotificationResponseListener((response) => {
      console.log("Notification response:", response);
      // Handle notification tap
      if (response.notification.request.content.data.screen) {
        router.push(response.notification.request.content.data.screen);
      }
    });

    // Cleanup
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

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
      const result = await NotificationService.callWaiter({
        tableNumber: "1", // Or get this from state/props
      });

      if (result.success) {
        toast.show({
          description: "Waiter has been notified",
          status: "success",
        });
      } else {
        toast.show({
          description: result.message,
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast.show({
        description: "Failed to call waiter",
        status: "error",
      });
    }
  };

  const fetchLatestSales = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");

      const response = await fetch(
        "https://men4u.xyz/common_api/table_listview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: outletId,
          }),
        }
      );

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
      await fetchData();
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
    <Box flex={1} bg="gray.50" safeArea>
      <NativeBaseStatusBar />
      <NativeBaseScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Sales Card */}
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

        {/* Management Cards */}
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
        onCallWaiter={handleCallWaiter}
      />
    </Box>
  );
}
