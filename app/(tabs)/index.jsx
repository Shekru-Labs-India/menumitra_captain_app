import React, { useState, useEffect, useRef } from "react";
import { Platform, StatusBar, Linking, Alert, Clipboard } from "react-native";
import {
  Box,
  HStack,
  VStack,
  Text,
  Image,
  Icon,
  Pressable,
  ScrollView,
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
  const router = useRouter();
  const toast = useToast();

  // Fetch staff count and sales data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch outlet ID from AsyncStorage
        const storedOutletId = await AsyncStorage.getItem("outlet_id");

        if (!storedOutletId) {
          toast.show({
            description: "Please log in again",
            status: "error",
            duration: 3000,
          });
          return;
        }

        // Fetch staff list from API
        const staffResponse = await fetch(
          "https://men4u.xyz/common_api/staff_listview",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              outlet_id: storedOutletId.toString(),
            }),
          }
        );

        const staffData = await staffResponse.json();
        console.log("Staff Data Response:", staffData);

        // Fetch table list from API
        const tableResponse = await fetch(
          "https://men4u.xyz/common_api/get_table_list",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              outlet_id: storedOutletId.toString(),
            }),
          }
        );

        const tableData = await tableResponse.json();
        console.log("Table Data Response:", tableData);

        if (staffData.st === 1) {
          const staffList = staffData.lists || [];
          setStaffCount(staffList.length);
        } else {
          console.log("Staff Data Error:", staffData.msg);
        }

        if (tableData.st === 1) {
          const tableList = tableData.data || [];
          setTableCount(tableList.length);
        } else {
          console.log("Table Data Error:", tableData.msg);
        }

        // TODO: Replace with actual API call for sales data
        setTodaysSales({
          sales: 45,
          revenue: 25750,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.show({
          description: "Failed to fetch data",
          status: "error",
          duration: 3000,
        });
      }
    };

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
    const loadTokens = async () => {
      try {
        const activeSession = await AsyncStorage.getItem("activeSession");
        if (activeSession) {
          const session = JSON.parse(activeSession);
          setPushToken(session.expoPushToken);
          setDeviceToken(session.sessionToken);
          console.log("Loaded tokens from active session:", {
            pushToken: session.expoPushToken,
            sessionToken: session.sessionToken,
          });
        } else {
          console.log("No active session found");
        }
      } catch (error) {
        console.error("Error loading tokens:", error);
      }
    };

    loadTokens();
  }, []);

  // Update handleNotification function
  const handleNotification = async () => {
    try {
      if (!pushToken || !deviceToken) {
        // Try to load tokens again
        const activeSession = await AsyncStorage.getItem("activeSession");
        if (!activeSession) {
          throw new Error("No active session found. Please log in again.");
        }

        const session = JSON.parse(activeSession);
        setPushToken(session.expoPushToken);
        setDeviceToken(session.sessionToken);
      }

      console.log("Sending notification with tokens:", {
        pushToken,
        deviceToken,
      });

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
        throw new Error(result.message);
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

  // Optional: Add a function to refresh tokens
  const refreshTokens = async () => {
    try {
      const activeSession = await AsyncStorage.getItem("activeSession");
      if (activeSession) {
        const session = JSON.parse(activeSession);
        setPushToken(session.expoPushToken);
        setDeviceToken(session.sessionToken);
        console.log("Tokens refreshed:", {
          pushToken: session.expoPushToken,
          sessionToken: session.sessionToken,
        });
      } else {
        console.log("No active session found during refresh");
      }
    } catch (error) {
      console.error("Error refreshing tokens:", error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
    // {
    //   title: "Reports",
    //   icon: "assessment",
    //   route: "/(tabs)",
    //   color: "blueGray.500",
    // },
  ];

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

  return (
    <Box flex={1} bg="white" safeArea>
      <NativeBaseStatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Header */}
      <HStack
        px={4}
        py={2}
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <HStack alignItems="center" space={2}>
          <Image
            source={require("../../assets/images/mm-logo-bg-fill-hat.png")}
            alt="MenuMitra Logo"
            size={8}
            resizeMode="contain"
          />
          <Text fontSize="xl" fontWeight="bold" color="coolGray.800">
            MenuMitra Captain
          </Text>
        </HStack>

        <HStack space={2}>
          <Pressable
            onPress={async () => {
              await refreshTokens(); // Refresh tokens before sending notification
              handleNotification();
            }}
            p={2}
            rounded="full"
            _pressed={{ bg: "coolGray.100" }}
          >
            <Icon
              as={MaterialIcons}
              name="notifications"
              size={6}
              color="coolGray.600"
            />
          </Pressable>

          <Pressable
            onPress={showAndCopyTokens}
            p={2}
            rounded="full"
            _pressed={{ bg: "coolGray.100" }}
          >
            <Icon
              as={MaterialIcons}
              name="vpn-key"
              size={6}
              color="coolGray.600"
            />
          </Pressable>

          <Pressable
            onPress={() => setIsSidebarOpen(true)}
            p={2}
            rounded="full"
            _pressed={{ bg: "coolGray.100" }}
          >
            <Icon
              as={MaterialIcons}
              name="menu"
              size={6}
              color="coolGray.600"
            />
          </Pressable>
        </HStack>
      </HStack>

      <ScrollView>
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
              {todaysSales.sales}
            </Text>
            <Text mt={2} color="coolGray.500">
              Today's Sales
            </Text>
          </VStack>

          <Box width={1} bg="coolGray.200" />

          <VStack alignItems="center" flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              ₹{todaysSales.revenue.toLocaleString()}
            </Text>
            <Text mt={2} color="coolGray.500">
              Today's Revenue
            </Text>
          </VStack>
        </HStack>

        {/* Add this card after the sales card in your JSX */}
        {/* <Box mx={4} my={4} bg="white" rounded="lg" shadow={2} p={4}>
          <HStack alignItems="center" space={2} mb={2}>
            <Icon
              as={MaterialIcons}
              name="vpn-key"
              size="sm"
              color="coolGray.600"
            />
            <Text fontSize="md" fontWeight="bold" color="coolGray.800">
              Device Token
            </Text>
          </HStack>
          <Box
            bg="coolGray.50"
            p={3}
            rounded="md"
            borderWidth={1}
            borderColor="coolGray.200"
          >
            <Text fontSize="sm" color="coolGray.600" flexWrap="wrap">
              {deviceToken || "No token found"}
            </Text>
          </Box>
        </Box> */}

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
      </ScrollView>

      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </Box>
  );
}
