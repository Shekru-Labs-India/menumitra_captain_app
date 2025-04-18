import React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  Heading,
  HStack,
  VStack,
  Text,
  IconButton,
  Button,
  useToast,
  AlertDialog,
  Divider,
  Badge,
  Avatar,
  Fab,
  Spinner,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import { useAuth } from "../../../context/AuthContext";

export default function StaffDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();

  const [staff, setStaff] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [outletId, setOutletId] = useState(null);
  const cancelRef = React.useRef(null);
  const { logout } = useAuth();

  const fetchStaffDetails = async (storedOutletId) => {
    setIsLoading(true);
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/staff_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: parseInt(id),
          outlet_id: storedOutletId,
        }),
      });

      console.log("Staff Details Response:", data);

      if (data.st === 1 && data.data) {
        setStaff(data.data);
      } else {
        toast.show({
          description: data.msg || "Staff member not found",
          status: "error",
        });
        router.back();
      }
    } catch (error) {
      console.error("Fetch Staff Details Error:", error);
      toast.show({
        description: "Failed to fetch staff details",
        status: "error",
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          const parsedOutletId = parseInt(storedOutletId);
          setOutletId(parsedOutletId);
          fetchStaffDetails(parsedOutletId);
        } else {
          toast.show({
            description: "Please login again",
            status: "error",
          });
          logout();
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
  }, [id]);

  const handleDelete = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      
      if (!userId) {
        toast.show({
          description: "User ID not found. Please login again.",
          status: "error",
        });
        return;
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/staff_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: id.toString(),
          outlet_id: outletId.toString(),
          user_id: userId.toString(),
        }),
      });

      console.log("Delete Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Staff member deleted successfully",
          status: "success",
        });
        setIsAlertOpen(false);
        router.replace({
          pathname: "/(tabs)/staff",
          params: { refresh: Date.now() },
        });
      } else {
        toast.show({
          description: data.msg || "Failed to delete staff member",
          status: "error",
        });
        setIsAlertOpen(false);
      }
    } catch (error) {
      console.error("Delete Staff Error:", error);
      toast.show({
        description: "Failed to delete staff member",
        status: "error",
      });
      setIsAlertOpen(false);
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: `/(tabs)/staff/edit/${id}`,
      params: {
        restaurant_id: staff.restaurant_id,
      },
    });
  };

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not available";

    // Handle date format like "31 Jan 2025 05:55:56 PM"
    const fullDateRegex =
      /(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}:\d{2}:\d{2}\s+[AP]M)/;
    const match = dateString.match(fullDateRegex);

    if (match) {
      const [_, day, month, year, time] = match;
      return `${day} ${month} ${year}, ${time}`;
    }

    // Handle date format like "31 Jan 2025"
    const shortDateRegex =
      /(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/;
    const shortMatch = dateString.match(shortDateRegex);

    if (shortMatch) {
      const [_, day, month, year] = shortMatch;
      return `${day} ${month} ${year}`;
    }

    return "Invalid Date";
  };

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading staff details...</Text>
      </Box>
    );
  }

  if (!staff) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>Staff member not found</Text>
      </Box>
    );
  }

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
          icon={
            <MaterialIcons name="arrow-back" size={24} color="gray" /> // Changed color to gray
          }
          onPress={() => router.back()}
        />
        <Heading size="md" flex={1} textAlign="center">
          Staff Details
        </Heading>
        <IconButton
          icon={<MaterialIcons name="delete" size={24} color="red.500" />}
          onPress={() => setIsAlertOpen(true)}
        />
      </HStack>

      <ScrollView>
        <VStack space={6} p={4}>
          {/* Profile Section */}
          <VStack space={4} alignItems="center">
            <Avatar
              size="2xl"
              bg="cyan.500"
              source={staff.photo ? { uri: staff.photo } : null}
            >
              {staff.name?.charAt(0)}
            </Avatar>
            <VStack space={2} alignItems="center">
              <Heading size="xl">{staff.name}</Heading>
              <Badge colorScheme="blue" rounded="full" px={3} py={1}>
                {staff.role?.charAt(0).toUpperCase() + staff.role?.slice(1)}
              </Badge>
            </VStack>
          </VStack>

          <Divider />

          {/* Contact Information */}
          <VStack space={4}>
            <Heading size="md">Contact Details</Heading>
            <VStack space={4} bg="coolGray.50" p={4} rounded="lg">
              <HStack space={3} alignItems="center">
                <Box p={2} bg="blue.100" rounded="full">
                  <MaterialIcons name="phone" size={20} color="blue.500" />
                </Box>
                <VStack flex={1}>
                  <Text color="coolGray.500" fontSize="sm">
                    Mobile Number
                  </Text>
                  <Text fontSize="md">{staff.mobile}</Text>
                </VStack>
                <IconButton
                  icon={
                    <MaterialIcons name="call" size={20} color="green.500" />
                  }
                  onPress={() => handleCall(staff.mobile)}
                  bg="green.100"
                  rounded="full"
                />
              </HStack>

              <HStack space={3} alignItems="center">
                <Box p={2} bg="blue.100" rounded="full">
                  <MaterialIcons
                    name="location-on"
                    size={20}
                    color="blue.500"
                  />
                </Box>
                <VStack flex={1}>
                  <Text color="coolGray.500" fontSize="sm">
                    Address
                  </Text>
                  <Text fontSize="md">
                    {/* {staff.address || "Address not provided"} */}
                    {staff.address?.charAt(0).toUpperCase() +
                      staff.address?.slice(1) || "Address not provided"}
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </VStack>

          <Divider />

          {/* Employment Details */}
          <VStack space={4}>
            <Heading size="md">Employment Details</Heading>
            <VStack space={4} bg="coolGray.50" p={4} rounded="lg">
              <VStack space={3}>
                {staff.dob && (
                  <HStack justifyContent="space-between">
                    <Text color="coolGray.500">Date of Birth</Text>
                    <Text>{formatDate(staff.dob)}</Text>
                  </HStack>
                )}

                {staff.aadhar_number && (
                  <HStack justifyContent="space-between">
                    <Text color="coolGray.500">Aadhar Number</Text>
                    <Text>{staff.aadhar_number}</Text>
                  </HStack>
                )}

                <Divider />

                <HStack justifyContent="space-between">
                  <Text color="coolGray.500">Created By</Text>
                  <Text>
                    {staff.created_by
                      ? staff.created_by.charAt(0).toUpperCase() +
                        staff.created_by.slice(1)
                      : "Not available"}
                  </Text>
                </HStack>

                <HStack justifyContent="space-between">
                  <Text color="coolGray.500">Created On</Text>
                  <Text>{formatDate(staff.created_on)}</Text>
                </HStack>

                <HStack justifyContent="space-between">
                  <Text color="coolGray.500">Updated By</Text>
                  <Text>
                    {staff.updated_by
                      ? staff.updated_by.charAt(0).toUpperCase() +
                        staff.updated_by.slice(1)
                      : "Not available"}
                  </Text>
                </HStack>

                <HStack justifyContent="space-between">
                  <Text color="coolGray.500">Updated On</Text>
                  <Text>
                    {staff.updated_on
                      ? formatDate(staff.updated_on)
                      : "Not available"}
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Delete Confirmation */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        closeOnOverlayClick={true}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Staff</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this staff member? This action
            cannot be undone.
          </AlertDialog.Body>
          <AlertDialog.Footer justifyContent="space-between">
            <Button ref={cancelRef} onPress={() => setIsAlertOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="red" onPress={handleDelete}>
              Delete
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      {/* Floating Edit Button */}
      <Fab
        renderInPortal={false}
        shadow={3}
        size="sm"
        icon={<MaterialIcons name="edit" size={24} color="white" />}
        onPress={handleEdit}
        position="absolute"
        bottom={10}
        right={4}
      />
    </Box>
  );
}
