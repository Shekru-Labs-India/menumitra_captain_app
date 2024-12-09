import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Icon,
  Text,
  HStack,
  Avatar,
  ScrollView,
  useToast,
  AlertDialog,
  Button,
  Fab,
  Badge,
  Divider,
  Spinner,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function SupplierDetails() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchSupplierDetails();
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      fetchSupplierDetails();
    }, [])
  );

  const fetchSupplierDetails = async () => {
    setLoading(true);
    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier/view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier_id: parseInt(id),
            restaurant_id: parseInt(restaurantId),
          }),
        }
      );

      const data = await response.json();

      if (data.st === 1 && data.data) {
        setSupplier({
          id: data.data.supplier_id,
          name: data.data.name,
          status: data.data.supplier_status,
          supplierCode: data.data.supplier_code,
          mobileNumber1: data.data.mobile_number1,
          mobileNumber2: data.data.mobile_number2,
          website: data.data.website,
          creditRating: data.data.credit_rating,
          creditLimit: data.data.credit_limit,
          ownerName: data.data.owner_name,
          location: data.data.location,
          address: data.data.address,
        });
      } else {
        throw new Error(data.msg || "Failed to fetch supplier details");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: error.message || "Failed to fetch supplier details",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier/delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier_id: parseInt(id),
            restaurant_id: parseInt(restaurantId),
          }),
        }
      );

      const data = await response.json();
      console.log("Delete Response:", data);

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Supplier deleted successfully",
          status: "success",
        });

        // Close the delete dialog
        setIsDeleteOpen(false);

        // Navigate back with refresh parameter
        router.back({
          params: {
            isDeleted: true,
            deletedSupplierId: id,
          },
        });
      } else {
        throw new Error(data.msg || "Failed to delete supplier");
      }
    } catch (error) {
      console.error("Delete Error:", error);
      toast.show({
        description: error.message || "Failed to delete supplier",
        status: "error",
      });
      setIsDeleteOpen(false);
    }
  };

  const handleInventoryPress = () => {
    router.push({
      pathname: "/staff/suppliers/suppliers-inventory",
      params: { supplierId: id },
    });
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (!supplier) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>Supplier not found</Text>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "success";
      case "inactive":
        return "danger";
      default:
        return "warning";
    }
  };

  const getCreditRatingColor = (rating) => {
    switch (rating?.toLowerCase()) {
      case "excellent":
        return "success";
      case "good":
        return "info";
      case "bad":
        return "warning";
      case "very_bad":
        return "danger";
      default:
        return "coolGray";
    }
  };

  const handleCall = async (phoneNumber) => {
    if (!phoneNumber) return;

    const url = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    } else {
      toast.show({
        description: "Unable to open phone app",
        status: "error",
      });
    }
  };

  const handleWebsite = async (website) => {
    if (!website) return;

    // Add https if not present
    const url = website.startsWith("http") ? website : `https://${website}`;
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    } else {
      toast.show({
        description: "Unable to open website",
        status: "error",
      });
    }
  };

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header */}
      <Box
        px={4}
        py={3}
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <IconButton
          position="absolute"
          left={2}
          top={2}
          icon={
            <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
          }
          onPress={() => router.back()}
        />
        <Heading textAlign="center">Supplier Details</Heading>
        <HStack position="absolute" right={2} top={2} space={2}>
          <IconButton
            icon={
              <MaterialIcons name="inventory" size={24} color="coolGray.600" />
            }
            onPress={handleInventoryPress}
          />
          <IconButton
            icon={
              <MaterialIcons name="delete-outline" size={24} color="red.500" />
            }
            onPress={() => setIsDeleteOpen(true)}
          />
        </HStack>
      </Box>

      <ScrollView>
        {/* Profile Section */}
        <Box p={4} bg="white">
          <HStack space={4} alignItems="center">
            <Avatar size="2xl" bg="cyan.500">
              {supplier.name.charAt(0)}
            </Avatar>
            <VStack flex={1} space={2}>
              <Text fontSize="2xl" fontWeight="bold">
                {supplier.name}
              </Text>
              <Badge
                colorScheme={getStatusColor(supplier.status)}
                variant="subtle"
                rounded="full"
                _text={{ fontSize: "sm" }}
              >
                {supplier.status || "Not Specified"}
              </Badge>
              <Text fontSize="md" color="coolGray.600">
                Code: {supplier.supplierCode}
              </Text>
            </VStack>
          </HStack>
        </Box>

        <Divider />

        {/* Contact Information */}
        <Box p={3} bg="white">
          <VStack space={3}>
            <Heading size="md">Contact Information</Heading>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={1} alignItems="center">
                <IconButton
                  size="sm"
                  icon={
                    <MaterialIcons
                      name="phone"
                      size={20}
                      color="coolGray.500"
                    />
                  }
                  onPress={() => handleCall(supplier.mobileNumber1)}
                />
                <Text fontWeight="medium">Primary Contact:</Text>
              </HStack>
              <Text onPress={() => handleCall(supplier.mobileNumber1)}>
                {supplier.mobileNumber1}
              </Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={1} alignItems="center">
                <IconButton
                  size="sm"
                  icon={
                    <MaterialIcons
                      name="phone"
                      size={20}
                      color="coolGray.500"
                    />
                  }
                  onPress={() => handleCall(supplier.mobileNumber2)}
                />
                <Text fontWeight="medium">Secondary Contact:</Text>
              </HStack>
              <Text onPress={() => handleCall(supplier.mobileNumber2)}>
                {supplier.mobileNumber2}
              </Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={1} alignItems="center">
                <IconButton
                  size="sm"
                  icon={
                    <MaterialIcons
                      name="language"
                      size={20}
                      color="coolGray.500"
                    />
                  }
                  onPress={() => handleWebsite(supplier.website)}
                />
                <Text fontWeight="medium">Website:</Text>
              </HStack>
              <Text
                color="blue.500"
                underline
                onPress={() => handleWebsite(supplier.website)}
              >
                {supplier.website || "Not specified"}
              </Text>
            </HStack>
          </VStack>
        </Box>

        <Divider />

        {/* Business Information */}
        <Box p={4} bg="white">
          <VStack space={4}>
            <Heading size="md" mb={2}>
              Business Information
            </Heading>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <MaterialIcons name="star" size={20} color="coolGray.500" />
                <Text fontWeight="medium">Credit Rating:</Text>
              </HStack>
              <Badge
                colorScheme={getCreditRatingColor(supplier.creditRating)}
                variant="subtle"
                rounded="full"
              >
                {supplier.creditRating || "Not Rated"}
              </Badge>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <MaterialIcons
                  name="account-balance-wallet"
                  size={20}
                  color="coolGray.500"
                />
                <Text fontWeight="medium">Credit Limit:</Text>
              </HStack>
              <Text>{supplier.creditLimit || "Not specified"}</Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <MaterialIcons name="person" size={20} color="coolGray.500" />
                <Text fontWeight="medium">Owner Name:</Text>
              </HStack>
              <Text>{supplier.ownerName || "Not specified"}</Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <MaterialIcons
                  name="location-on"
                  size={20}
                  color="coolGray.500"
                />
                <Text fontWeight="medium">Location:</Text>
              </HStack>
              <Text>{supplier.location || "Not specified"}</Text>
            </HStack>
          </VStack>
        </Box>

        <Divider />

        {/* Address */}
        <Box p={4} bg="white">
          <VStack space={2}>
            <HStack space={2} alignItems="center">
              <MaterialIcons name="home" size={20} color="coolGray.600" />
              <Heading size="md">Address</Heading>
            </HStack>
            <Text color="coolGray.600">
              {supplier.address || "Address not specified"}
            </Text>
          </VStack>
        </Box>
      </ScrollView>

      {/* Edit FAB */}
      <Fab
        renderInPortal={false}
        shadow={3}
        size="md"
        icon={<MaterialIcons name="edit" size={24} color="white" />}
        onPress={() => router.push(`/staff/suppliers/edit/${id}`)}
        position="absolute"
        bottom={10}
        right={4}
      />

      {/* Delete Alert Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        closeOnOverlayClick={true}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Supplier</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this supplier? This action cannot be
            undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <HStack space={2} width="full" justifyContent="space-between">
              <Button
                variant="outline"
                colorScheme="coolGray"
                onPress={() => setIsDeleteOpen(false)}
                flex={1}
              >
                Cancel
              </Button>
              <Button colorScheme="danger" onPress={handleDelete} flex={1}>
                Delete
              </Button>
            </HStack>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Box>
  );
}
