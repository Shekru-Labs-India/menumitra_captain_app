import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  Alert,
  RefreshControl,
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
import { useVersion } from "../../context/VersionContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../config/api.config";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { version } = useVersion();
  const [profileImage, setProfileImage] = useState(null); // State to hold the profile image
  const [userData, setUserData] = useState({
    captainName: "",
    role: "",
    outletId: "",
    captainId: "",
  });

  const [stats, setStats] = useState({
    todayOrders: 0,
    liveSales: 0,
    monthsActive: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        [, role],
        [, outlet_name],
      ] = await AsyncStorage.multiGet([
        "captain_name",
        "user_id",
        "mobile",
        "captain_id",
        "outlet_id",
        "access",
        "role",
        "outlet_name",
      ]);

      setUserData({
        captainName: captainName || "",
        role: role || "",
        mobile: mobile || "",
        captainId: captainId || "",
        outletId: outletId || "",
        userId: userId || "",
      });
      
      // Set outlet name from AsyncStorage
      setOutletName(outlet_name || "Restaurant");

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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const profileMenuItems = [
    {
      icon: "storefront",
      title: "Restaurant Profile", 
      route: "/profile/restaurant-profile",
    },
    {
      icon: "person-outline",
      title: "My Profile", 
      route: "/profile/personal-info",
    },
    {
      icon: "settings",
      title: "Settings",
      route: "/profile/settings",
    },
    {
      icon: "support-agent",
      title: "Support",
      route: "/profile/support",
    },
    {
      icon: "history",
      title: "Activity Log",
      route: "/profile/activity-log",
    },
    {
      icon: "lock-outline",
      title: "Privacy Policy",
      route: null,
      onPress: () => Linking.openURL("https://menumitra.com/privacy"),
    },
    {
      icon: "logout",
      title: "Logout",
      route: null,
      onPress: () => {
        console.log("Logout button pressed");
        handleLogout();
      },
      color: "red.500",
    },
  ];

  const MenuItem = ({ item }) => (
    <Pressable
      onPress={() => {
        console.log("Menu item pressed:", item.title);
        if (item.route) {
          router.push(item.route);
        } else if (item.onPress) {
          console.log("Calling onPress function for:", item.title);
          item.onPress();
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
    console.log("handleLogout function called");
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => console.log("Cancel Pressed"),
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            console.log("Logout confirmed");
            try {
              // Get device token from AsyncStorage
              const deviceToken = await AsyncStorage.getItem("device_token");
              console.log("Device token:", deviceToken);
              
              // Call logout API
              console.log("Calling logout API with user ID:", userData.captainId);
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
              console.log("Logout API response:", data);

              if (data.st == 1) {
                console.log("Logout successful, clearing AsyncStorage");
                // Clear all AsyncStorage data
                await AsyncStorage.clear();

                // Call the logout function from AuthContext
                console.log("Calling logout from AuthContext");
                await logout();

                // Navigate to login screen
                console.log("Navigating to login screen");
                router.replace("/login");
              } else {
                throw new Error(data.msg || "Logout failed");
              }
            } catch (error) {
              console.error("Logout Error:", error);
              Alert.alert("Logout Failed", "Failed to logout. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const [outletName, setOutletName] = useState("");

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      {/* Header with title and edit button */}
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
        {/* <IconButton
          icon={<MaterialIcons name="edit" size={24} color="#007BFF" />}
          onPress={() => router.push("/profile/personal-info")}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        /> */}
      </HStack>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007BFF"]}
            tintColor="#007BFF"
          />
        }
      >
        {/* Profile Card */}
        <Box bg="white" p={4} rounded="lg" shadow={1} mx={4} mt={4} mb={4}>
          <VStack>
            <Text fontSize="xl" fontWeight="bold" color="coolGray.800">
              {outletName}
            </Text>
            <Text fontSize="sm" color="coolGray.500">
              {userData.role}
            </Text>
          </VStack>
        </Box>

        {/* Menu Items */}
        <VStack space={0} py={2}>
          {profileMenuItems.map((item, index) => (
            <MenuItem key={index} item={item} />
          ))}
        </VStack>

        {/* Footer Section */}
        <Box p={4} mt={4} bg="coolGray.100" borderTopWidth={1} borderTopColor="coolGray.200">
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
              <Pressable>
                <Text fontSize="2xs" color="black.500" mt={1} textAlign="center">
                  (version {version})
                </Text>
              </Pressable>
            </VStack>
          </VStack>
        </Box>
      </ScrollView>
    </Box>
  );
}
