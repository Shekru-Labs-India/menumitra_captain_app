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

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [profileImage, setProfileImage] = useState(null); // State to hold the profile image
  const [userData, setUserData] = useState({
    captainName: "",
    role: "",
    outletId: "",
    captainId: "",
  });

  const [stats, setStats] = useState({
    todayOrders: 0,
    rating: "0%",
    monthsActive: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch data using the correct AsyncStorage keys
        const [[, captainName], [, role], [, captainId], [, outletId]] =
          await AsyncStorage.multiGet([
            "captain_name",
            "role",
            "captain_id",
            "outlet_id",
          ]);

        setUserData({
          captainName: captainName || "Captain",
          role: role || "Staff",
          captainId,
          outletId,
        });

        // You can fetch stats from API if needed
        setStats({
          todayOrders: 0,
          rating: "0%",
          monthsActive: 0,
        });
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const profileMenuItems = [
    // {
    //   icon: "person-outline",
    //   title: "Personal Information",
    //   subtitle: "Update your personal details",
    //   route: "/profile/personal-info",
    // },
    // {
    //   icon: "history",
    //   title: "Order History",
    //   subtitle: "View your past orders",
    //   route: "/profile/order-history",
    // },
    // {
    //   icon: "help-outline",
    //   title: "Help & Support",
    //   subtitle: "Get help and contact support",
    //   route: "/profile/support",
    // },
  ];

  const MenuItem = ({ item }) => (
    <Pressable
      onPress={() => router.push(item.route)}
      _pressed={{ bg: "coolGray.100" }}
    >
      <HStack space={4} py={4} px={6} alignItems="center">
        <Box p={2} rounded="full" bg="primary.100">
          <Icon
            as={MaterialIcons}
            name={item.icon}
            size={6}
            color="primary.600"
          />
        </Box>
        <VStack flex={1}>
          <Text fontSize="md" fontWeight="600" color="coolGray.800">
            {item.title}
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            {item.subtitle}
          </Text>
        </VStack>
        <Icon
          as={MaterialIcons}
          name="chevron-right"
          size={6}
          color="coolGray.400"
        />
      </HStack>
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
              // Clear all AsyncStorage data
              await AsyncStorage.clear(); // This will clear everything including tokens

              // Call the logout function from AuthContext
              await logout();

              // Navigate to login screen
              router.replace("/login");
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
    <Box flex={1} bg="white" safeArea>
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
          icon={<MaterialIcons name="logout" size={24} color="red.500" />}
          onPress={handleLogout}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        />
      </HStack>
      {/* Profile Header */}
      <Box px={6} pt={6} pb={8} bg="primary.500">
        <HStack space={4} alignItems="center">
          <TouchableOpacity onPress={pickImage}>
            {profileImage ? (
              <Avatar
                size="xl"
                source={{ uri: profileImage }}
                borderWidth={4}
                borderColor="white"
              />
            ) : (
              <Box
                size="80px"
                borderWidth={4}
                borderColor="white"
                bg="coolGray.200"
                alignItems="center"
                justifyContent="center"
                rounded="full"
              >
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="add-a-photo"
                    size={6}
                    color="primary.600"
                  />
                </HStack>
              </Box>
            )}
          </TouchableOpacity>
          <VStack flex={1}>
            <Text color="white" fontSize="2xl" fontWeight="bold">
              {userData.captainName}
            </Text>
            <Text color="white" fontSize="md">
              {userData.role}
            </Text>
            <HStack space={2} mt={1}>
              <Icon
                as={MaterialIcons}
                name="verified-user"
                size={4}
                color="white"
              />
              <Text color="white" fontSize="sm">
                Active
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </Box>

      {/* Stats Section */}
      <HStack
        bg="white"
        py={4}
        px={6}
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <VStack alignItems="center">
          <Text fontSize="xl" fontWeight="bold" color="primary.500">
            {stats.todayOrders}
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            Orders Today
          </Text>
        </VStack>
        <VStack alignItems="center">
          <Text fontSize="xl" fontWeight="bold" color="primary.500">
            {stats.rating}
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            Rating
          </Text>
        </VStack>
        <VStack alignItems="center">
          <Text fontSize="xl" fontWeight="bold" color="primary.500">
            {stats.monthsActive}
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            Months
          </Text>
        </VStack>
      </HStack>

      {/* Menu Items */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space={0} py={2}>
          {profileMenuItems.map((item, index) => (
            <Box key={index}>
              <MenuItem item={item} />
              {index < profileMenuItems.length - 1 && <Divider ml={20} />}
            </Box>
          ))}
          <Divider mt={2} />
        </VStack>

        {/* Logout Button */}

        {/* Footer Section */}
        <Box borderTopColor="coolGray.200" p={4} mt={10}>
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
