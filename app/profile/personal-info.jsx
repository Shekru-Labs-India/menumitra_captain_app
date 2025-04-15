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
  const [deviceLogins, setDeviceLogins] = useState([
    {
      id: "1",
      deviceName: "REDMI NOTE 12 5G",
      lastLogin: "03:00PM"
    },
    {
      id: "2",
      deviceName: "Samsung A35 5G",
      lastLogin: "05:00PM"
    }
  ]);

  const handleLogout = (deviceId) => {
    // Handle device logout logic here
    toast.show({
      description: `Logging out device ${deviceId}`,
      status: "info",
      duration: 3000,
    });
    // In a real implementation, you would call an API to logout the device
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
        {/* Profile Avatar */}
        <Box alignItems="center" my={6}>
          <Avatar
            size="xl"
            source={{ uri: "https://via.placeholder.com/150" }}
            bg="blue.500"
          >
            {userData?.name?.charAt(0)}
          </Avatar>
          <Text mt={2} fontSize="lg" fontWeight="bold">
            {userData?.name}
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            {userData?.role}
          </Text>
        </Box>

        {/* Profile Information */}
        <Box bg="white" rounded="lg" shadow={1} mx={4} mb={4}>
          <VStack space={4} p={4}>
            <Heading size="sm" mb={2}>
              Personal Information
            </Heading>
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="email" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Email
                </Text>
                <Text>{userData?.email || 'Not provided'}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="phone" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Phone
                </Text>
                <Text>{userData?.mobile_number || 'Not provided'}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="cake" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Date of Birth
                </Text>
                <Text>{userData?.dob || 'Not provided'}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="badge" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Aadhar Number
                </Text>
                <Text>{userData?.aadhar_number || 'Not provided'}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="access-time" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Last Login
                </Text>
                <Text>{userData?.last_login || 'Not available'}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="date-range" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Member Since
                </Text>
                <Text>{userData?.created_on || 'Not available'}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="person" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Created By
                </Text>
                <Text>{userData?.created_by || 'Not available'}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="update" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Last Updated
                </Text>
                <Text>
                  {userData?.updated_on ? 
                    `${userData.updated_on} by ${userData.updated_by || 'Unknown'}` : 
                    'Not available'}
                </Text>
              </VStack>
            </HStack>
          </VStack>
        </Box>

        {/* Device Login Management */}
        <Box bg="white" rounded="lg" shadow={1} mx={4} mb={4}>
          <VStack space={4} p={4}>
            <Heading size="sm" mb={2}>
              Device Login Management
            </Heading>

            {deviceLogins.map((device, index) => (
              <Box 
                key={device.id}
                borderWidth={1} 
                borderColor="coolGray.200" 
                borderRadius="md" 
                p={4} 
                mb={index === deviceLogins.length - 1 ? 10 : 0}
              >
                <HStack justifyContent="space-between" alignItems="center">
                  <VStack>
                    <Text fontWeight="bold">{device.deviceName}</Text>
                    <HStack space={1} alignItems="center">
                      <Text fontSize="xs" color="coolGray.500">Last Login - </Text>
                      <Text fontSize="xs" fontWeight="medium" color="coolGray.700">{device.lastLogin}</Text>
                    </HStack>
                  </VStack>
                  <Button 
                    bg="rose.500" 
                    _pressed={{ bg: "rose.600" }}
                    size="sm"
                    zIndex={2}
                    onPress={() => handleLogout(device.id)}
                  >
                    LOGOUT
                  </Button>
                </HStack>
              </Box>
            ))}
          </VStack>
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