import { useState, useEffect, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Heading,
  IconButton,
  ScrollView,
  Divider,
  Avatar,
  Spinner,
  Center,
  Alert,
  useToast,
  Fab,
  Button,
  Badge,
} from "native-base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";

export default function PersonalInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Device login data
  const [deviceLogins, setDeviceLogins] = useState([]);
  const [currentDeviceToken, setCurrentDeviceToken] = useState(null);

  const handleLogout = async (deviceToken) => {
    try {
      setIsLoading(true);
      
      // Get the user ID from AsyncStorage or use from userData
      const userId = userData?.user_id;
      
      if (!userId) {
        throw new Error("User ID not found");
      }

      // Removed the block preventing logout of current device
      
      // Call logout API
      const response = await fetch(`${getBaseUrl()}/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId, 
          role: "captain",
          app: "captain",
          device_token: deviceToken,
        }),
      });

      const data = await response.json();

      if (data.st === 1) {
        // Success - Remove the device from the list
        setDeviceLogins(prevDevices => 
          prevDevices.filter(device => device.deviceToken !== deviceToken)
        );
        
        toast.show({
          description: "Device logged out successfully",
          status: "success",
          duration: 3000,
        });
        
        // If current device was logged out, need to log out completely
        if (deviceToken === currentDeviceToken) {
          // Navigate back to login screen
          router.replace("/login");
          return;
        }
        
        // Refresh profile data to get updated device list
        fetchProfileData();
      } else {
        throw new Error(data.msg || "Logout failed");
      }
    } catch (err) {
      const errorMsg = 'Error logging out device: ' + err.message;
      toast.show({
        description: errorMsg,
        status: "error",
        duration: 3000,
      });
      console.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userId = await AsyncStorage.getItem("user_id");
      
      if (!userId) {
        setError("User ID not found. Please log in again.");
        return;
      }
      
      // Get current device token
      const deviceToken = await AsyncStorage.getItem("device_token");
      setCurrentDeviceToken(deviceToken);
      
      const data = await fetchWithAuth(`${getBaseUrl()}/view_profile_detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId
        })
      });
      
      if (data.st === 1 && data.Data?.user_details) {
        setUserData(data.Data.user_details);
        
        // Process active sessions if available
        if (data.Data?.user_active_sessions && Array.isArray(data.Data.user_active_sessions)) {
          const formattedDeviceLogins = data.Data.user_active_sessions.map((session, index) => ({
            id: index.toString(),
            deviceToken: session.device_token,
            deviceName: session.device_model || "Unknown Device",
            lastLogin: session.last_activity || "Unknown",
            isCurrentDevice: session.device_token === deviceToken
          }));
          
          setDeviceLogins(formattedDeviceLogins);
        } else {
          setDeviceLogins([]);
        }
      } else {
        const errorMsg = data.msg || 'Failed to fetch profile data';
        setError(errorMsg);
        toast.show({
          description: errorMsg,
          status: "error",
          duration: 3000,
        });
      }
    } catch (err) {
      const errorMsg = 'Error fetching profile: ' + err.message;
      setError(errorMsg);
      toast.show({
        description: errorMsg,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchProfileData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Always fetch fresh data when the screen comes into focus
      fetchProfileData();
    }, [])
  );

  // Loading state
  if (isLoading) {
    return (
      <Box flex={1} bg="coolGray.100" safeArea>
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
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
            borderRadius="full"
          />
          <Heading size="md" flex={1} textAlign="center">
            My Profile
          </Heading>
          <Box w={10} />
        </HStack>
        <Center flex={1}>
          <Spinner size="lg" color="blue.500" />
          <Text mt={2}>Loading profile...</Text>
        </Center>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flex={1} bg="coolGray.100" safeArea>
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
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
            borderRadius="full"
          />
          <Heading size="md" flex={1} textAlign="center">
            My Profile
          </Heading>
          <Box w={10} />
        </HStack>
        <Center flex={1} p={4}>
          <Alert status="error" mb={4}>
            <Text>{error}</Text>
          </Alert>
          <IconButton
            icon={<MaterialIcons name="refresh" size={24} color="white" />}
            onPress={fetchProfileData}
            variant="solid"
            bg="blue.500"
            _pressed={{ bg: "blue.600" }}
            borderRadius="full"
          />
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      {/* Header */}
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
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          My Profile
        </Heading>
        <Box w={10} />
      </HStack>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }} // Add significant bottom padding to prevent FAB overlap
      >
        {/* Profile Information Cards */}
        <Box mx={4} mt={4}>
          {/* Personal Information Card */}
          <Box bg="white" rounded="lg" shadow={1} mb={4} p={4}>
            <HStack alignItems="center" mb={4}>
              <Icon as={MaterialIcons} name="person" size={5} color="primary.500" mr={2} />
              <Text fontSize="md" fontWeight="medium" color="primary.600">Personal Information</Text>
            </HStack>

            {/* Two column layout */}
            <VStack space={4}>
              {/* Name and Role */}
              <HStack justifyContent="space-between">
                <VStack flex={1} mr={2}>
                  <Text fontWeight="medium">{userData?.name || '-'}</Text>
                  <Text fontSize="xs" color="coolGray.500">Name</Text>
                </VStack>
                <VStack flex={1}>
                  <Text fontWeight="medium">{userData?.role || '-'}</Text>
                  <Text fontSize="xs" color="coolGray.500">Role</Text>
                </VStack>
              </HStack>

              {/* Date of Birth and Email */}
              <HStack justifyContent="space-between">
                <VStack flex={1} mr={2}>
                  <Text fontWeight="medium">{userData?.dob || '-'}</Text>
                  <Text fontSize="xs" color="coolGray.500">Date of Birth</Text>
                </VStack>
                <VStack flex={1}>
                  <Text fontWeight="medium">{userData?.email || '-'}</Text>
                  <Text fontSize="xs" color="coolGray.500">Email</Text>
                </VStack>
              </HStack>

              {/* Mobile and Aadhar */}
              <HStack justifyContent="space-between">
                <VStack flex={1} mr={2}>
                  <Text fontWeight="medium">{userData?.mobile_number || '-'}</Text>
                  <Text fontSize="xs" color="coolGray.500">Mobile Number</Text>
                </VStack>
                <VStack flex={1}>
                  <Text fontWeight="medium">{userData?.aadhar_number || '-'}</Text>
                  <Text fontSize="xs" color="coolGray.500">Aadhar Number</Text>
                </VStack>
              </HStack>
            </VStack>
          </Box>

          {/* Account Information Card */}
          <Box bg="white" rounded="lg" shadow={1} mb={4} p={4}>
            <HStack alignItems="center" mb={4}>
              <Icon as={MaterialIcons} name="account-circle" size={5} color="primary.500" mr={2} />
              <Text fontSize="md" fontWeight="medium" color="primary.600">Account Information</Text>
            </HStack>

            <VStack space={4}>
              {/* Last Login */}
              <VStack>
                <Text fontWeight="medium">{userData?.last_login || "-"}</Text>
                <Text fontSize="xs" color="coolGray.500">Last Login</Text>
              </VStack>

              {/* Created By */}
              <VStack>
                <Text fontWeight="medium">{userData?.created_by || "-"}</Text>
                <Text fontSize="xs" color="coolGray.500">Created By</Text>
              </VStack>

              {/* Created On */}
              <VStack>
                <Text fontWeight="medium">{userData?.created_on || "-"}</Text>
                <Text fontSize="xs" color="coolGray.500">Created On</Text>
              </VStack>

              {/* Updated By */}
              <VStack>
                <Text fontWeight="medium">{userData?.updated_by || "-"}</Text>
                <Text fontSize="xs" color="coolGray.500">Updated By</Text>
              </VStack>

              {/* Updated On */}
              <VStack>
                <Text fontWeight="medium">{userData?.updated_on}</Text>
                <Text fontSize="xs" color="coolGray.500">Updated On</Text>
              </VStack>
            </VStack>
          </Box>

          {/* Device Login Management */}
          <Box bg="white" rounded="lg" shadow={1} mb={4} p={4}>
            <HStack alignItems="center" mb={4}>
              <Icon as={MaterialIcons} name="devices" size={5} color="primary.500" mr={2} />
              <Text fontSize="md" fontWeight="medium" color="primary.600">My Active Sessions</Text>
            </HStack>

            {deviceLogins.length > 0 ? (
              deviceLogins.map((device, index) => (
                <Box 
                  key={device.id}
                  borderWidth={1} 
                  borderColor={device.isCurrentDevice ? "green.500" : "coolGray.200"} 
                  borderRadius="md" 
                  p={4} 
                  mb={index === deviceLogins.length - 1 ? 10 : 3}
                >
                  <HStack justifyContent="space-between" alignItems="center">
                    <VStack>
                      <HStack space={2} alignItems="center">
                        <Text fontWeight="bold">{device.deviceName}</Text>
                        {device.isCurrentDevice && (
                          <Text fontSize="xs" color="green.500">(Current)</Text>
                        )}
                      </HStack>
                      <HStack space={1} alignItems="center">
                        <Text fontSize="xs" color="coolGray.500">Last Activity - </Text>
                        <Text fontSize="xs" fontWeight="medium" color="coolGray.700">{device.lastLogin}</Text>
                      </HStack>
                    </VStack>
                    <Button 
                      bg="rose.500" 
                      _pressed={{ bg: "rose.600" }}
                      size="sm"
                      zIndex={2}
                      onPress={() => handleLogout(device.deviceToken)}
                    >
                      LOGOUT
                    </Button>
                  </HStack>
                </Box>
              ))
            ) : (
              <Box p={4} alignItems="center">
                <Text color="coolGray.500">No active device sessions found</Text>
              </Box>
            )}
          </Box>
        </Box>
      </ScrollView>
      
      {/* Floating Edit Button */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="lg"
        icon={<Icon color="white" as={MaterialIcons} name="edit" size="lg" />}
        bg="blue.500"
        _pressed={{ bg: "blue.600" }}
        onPress={() => router.push("/profile/edit-profile")}
        placement="bottom-right"
        mb={4}
        mr={4}
        zIndex={1}
      />
    </Box>
  );
} 