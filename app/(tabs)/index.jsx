import React, { useState, useEffect, useRef } from "react";
import { Platform, StatusBar, Linking } from "react-native";
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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Sidebar from "../components/Sidebar";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const router = useRouter();
  const toast = useToast();

  // Fetch staff count and sales data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch restaurant ID from AsyncStorage
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

        if (!storedRestaurantId) {
          toast.show({
            description: "Restaurant ID not found. Please log in again.",
            status: "error",
          });
          return;
        }

        // Fetch staff list from API
        const staffResponse = await fetch(
          "https://men4u.xyz/captain_api/captain_manage/staff_listview",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: parseInt(storedRestaurantId),
            }),
          }
        );

        const staffData = await staffResponse.json();

        // Fetch table list from API
        const tableResponse = await fetch(
          "https://men4u.xyz/captain_api/captain_manage/get_table_list",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: parseInt(storedRestaurantId),
            }),
          }
        );

        const tableData = await tableResponse.json();

        if (staffData.st === 1) {
          const staffList = staffData.lists || [];
          setStaffCount(staffList.length);
        }

        if (tableData.st === 1) {
          const tableList = tableData.data || [];
          setTableCount(tableList.length);
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
        });
      }
    };

    fetchData();
  }, []);

  // Cleanup sound on component unmount
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  async function playSound() {
    if (isPlaying) {
      // If sound is playing, stop it
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(undefined);
      setIsPlaying(false);
    } else {
      // Load and play the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/simple-notification.mp3"),
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
    }
  }

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
      title: "Table Section",
      icon: "table-restaurant",
      route: "/(tabs)/tables/sections",
      color: "purple.500",
      count: tableCount,
    },
    {
      title: "Inventory",
      icon: "inventory",
      route: "/(tabs)/staff/inventory",
      color: "orange.500",
    },
    {
      title: "Suppliers",
      icon: "local-shipping",
      route: "/(tabs)/staff/suppliers",
      color: "pink.500",
    },
    {
      title: "Reports",
      icon: "assessment",
      route: "/(tabs)",
      color: "blueGray.500",
    },
  ];

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
            onPress={() => {
              playSound();
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
            onPress={toggleSidebar}
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
