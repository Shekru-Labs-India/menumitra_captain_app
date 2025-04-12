import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  VStack,
  HStack,
  Avatar,
  Text,
  Divider,
  ScrollView,
  Pressable,
  Icon,
  Image,
  Heading,
  IconButton,
} from "native-base";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { useState, useEffect } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { version } from "../../context/VersionContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../config/api.config";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profileImage, setProfileImage] = useState(null); // State to hold the profile image
  const [userData, setUserData] = useState({
    captainName: "Cafe HashTag",
    role: "Cafe Hashtag Owner",
    outletId: "",
    captainId: "",
  });

  const [stats, setStats] = useState({
    todayOrders: 0,
    liveSales: 0,
    monthsActive: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all relevant data stored during OTP verification
        const [
          [, captainName],
          [, userId],
          [, mobile],
          [, captainId],
          [, outletId],
          [, access],
        ] = await AsyncStorage.multiGet([
          "captain_name",
          "user_id",
          "mobile",
          "captain_id",
          "outlet_id",
          "access",
        ]);

        setUserData({
          captainName: captainName || "Cafe HashTag",
          role: "Cafe Hashtag Owner",
          mobile: mobile || "",
          captainId: captainId || "",
          outletId: outletId || "",
          userId: userId || "",
        });

        // Fetch sales data if stored
        const salesDataString = await AsyncStorage.getItem("salesData");
        if (salesDataString) {
          const salesData = JSON.parse(salesDataString);
          setStats({
            todayOrders: salesData.todayTotalSales || 0,
            liveSales: salesData.liveSales || 0,
            monthsActive: 0, // You can calculate this if you have a joining date
          });
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const profileMenuItems = [
    {
      icon: "settings",
      title: "Settings",
      route: "/profile/settings",
    },
    {
      icon: "person-outline",
      title: "My Profile", 
      route: "/profile/personal-info",
    },
    
    {
      icon:"history",
      title:"My Activity",
      route:"/profile/activity-log",
    },
    {
      icon: "lock-outline",
      title: "Privacy Policy",
      route: "/profile/privacy-policy",
    },
   
  ];

  const MenuItem = ({ item }) => (
    <Pressable
      onPress={() => {
        if (item.route) {
          router.push(item.route);
        }
      }}
      _pressed={{ opacity: 0.8 }}
      mb={4}
    >
      <Box 
        bg="white" 
        rounded="lg" 
        shadow={1}
        px={4}
        py={4}
        mx={4}
      >
        <HStack space={4} alignItems="center">
          <Icon
            as={MaterialIcons}
            name={item.icon}
            size={6}
            color={item.color || "blue.500"}
          />
          <Text fontSize="md" fontWeight="medium" color="coolGray.800">
            {item.title}
          </Text>
          <Box flex={1} />
          <Icon
            as={MaterialIcons}
            name="chevron-right"
            size={6}
            color="coolGray.400"
          />
        </HStack>
      </Box>
    </Pressable>
  );

  const pickImage = async () => {
    // Request permission to access the media library
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }

    // Launch the image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setProfileImage(result.uri); // Set the selected image URI
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
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
              // Get device token from AsyncStorage
              const deviceToken = await AsyncStorage.getItem("device_token");
              
              // Call logout API
              const response = await fetch(`${getBaseUrl()}/logout`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  user_id: userData.captainId, // Using captain ID as user ID
                  role: "captain",
                  app: "captain",
                  device_token: deviceToken || "",
                }),
              });

              const data = await response.json();

              if (data.st == 1) {
                // Clear all AsyncStorage data
                await AsyncStorage.clear();

                // Call the logout function from AuthContext
                await logout();

                // Navigate to login screen
                router.replace("/login");
              } else {
                throw new Error(data.msg || "Logout failed");
              }
            } catch (error) {
              console.error("Logout Error:", error);
              toast.show({
                description: "Failed to logout. Please try again.",
                status: "error",
                duration: 3000,
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      {/* Restored Header with title and logout button */}
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        bg="white"
        shadow={2}
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          Profile
        </Heading>
        <IconButton
          icon={<MaterialIcons name="logout" size={24} color="red" />}
          onPress={handleLogout}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        />
      </HStack>

      {/* Header Card */}
      <Box bg="white" p={4} rounded="lg" shadow={1} mx={4} mt={4} mb={4}>
        <VStack>
          <Text fontSize="xl" fontWeight="bold" color="coolGray.800">
            {userData.captainName}
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            {userData.role}
          </Text>
        </VStack>
      </Box>

      {/* Menu Items */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space={0} py={2}>
          {profileMenuItems.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </VStack>

        {/* Footer Section - keeping the existing footer */}
        <Box p={4} mt={4}>
          <VStack space={3} alignItems="center">
            <HStack space={2} alignItems="center">
              <Image
                source={require("../../assets/images/mm-logo.png")}
                alt="MenuMitra Logo"
                style={{
                  width: 35,
                  height: 35,
                }}
                resizeMode="contain"
              />
              <Text fontSize="md" fontWeight="semibold" color="coolGray.700">
                MenuMitra
              </Text>
            </HStack>

            <HStack space={8} justifyContent="center" mt={2}>
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
                  )
                }
              >
                <Icon
                  as={MaterialCommunityIcons}
                  name="facebook"
                  size={7}
                  color="#1877F2"
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  Linking.openURL("https://www.instagram.com/menumitra/")
                }
              >
                <Icon
                  as={MaterialCommunityIcons}
                  name="instagram"
                  size={7}
                  color="#E4405F"
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  Linking.openURL("https://www.youtube.com/@menumitra")
                }
              >
                <Icon
                  as={MaterialCommunityIcons}
                  name="youtube"
                  size={7}
                  color="#FF0000"
                />
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL("https://x.com/MenuMitra")}
              >
                <Icon
                  as={MaterialCommunityIcons}
                  name="twitter"
                  size={7}
                  color="#000000"
                />
              </Pressable>
            </HStack>

            <VStack space={1} alignItems="center" mt={2} mb={2}>
              <HStack space={1} alignItems="center">
                <Icon
                  as={MaterialCommunityIcons}
                  name="flash"
                  size={3}
                  color="gray.500"
                />
                <Text fontSize="xs" color="gray.500">
                  Powered by
                </Text>
              </HStack>
              <Pressable
                onPress={() => Linking.openURL("https://www.shekruweb.com")}
              >
                <Text
                  fontSize="xs"
                  color="#4CAF50"
                  fontWeight="medium"
                  textAlign="center"
                >
                  Shekru Labs India Pvt. Ltd.
                </Text>
              </Pressable>
              <Text fontSize="2xs" color="gray.500" mt={1} textAlign="center">
                version {version || "1.0.0"}
              </Text>
            </VStack>
          </VStack>
        </Box>
      </ScrollView>
    </Box>
  );
}
