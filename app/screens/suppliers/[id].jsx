import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  HStack,
  ScrollView,
  useToast,
  AlertDialog,
  Button,
  Fab,
  Badge,
  Divider,
  Spinner,
  Pressable,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

export default function SupplierDetails() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [outletId, setOutletId] = useState(null);

  useEffect(() => {
    fetchSupplierDetails();
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      fetchSupplierDetails();
    }, [])
  );

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          setOutletId(storedOutletId);
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
  }, []);

  const fetchSupplierDetails = async () => {
    setLoading(true);
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      console.log("Fetching supplier details with:", {
        outlet_id: storedOutletId.toString(),
        supplier_id: id.toString(),
      });

      const data = await fetchWithAuth(`${getBaseUrl()}/supplier_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId.toString(),
          supplier_id: id.toString(),
        }),
      });
      console.log("Supplier View API Response:", data);

      if (data.st === 1 && data.data) {
        const supplierData = {
          id: data.data.supplier_id,
          name: data.data.name,
          status: data.data.supplier_status,
          supplierCode: data.data.supplier_code,
          mobileNumber1: data.data.mobile_number1,
          mobilleNumber2:
            data.data.mobille_number2 === null ? "" : data.data.mobille_number2,
          website: data.data.website,
          creditRating: data.data.credit_rating,
          creditLimit: data.data.credit_limit,
          ownerName: data.data.owner_name,
          location: data.data.location,
          address: data.data.address,
          createdOn: data.data.created_on,
          updatedOn: data.data.updated_on,
          createdBy: data.data.created_by,
          updatedBy: data.data.updated_by,
        };

        console.log("Processed Supplier Data:", supplierData);
        setSupplier(supplierData);
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
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        toast.show({
          description: "User ID not found. Please login again.",
          status: "error",
        });
        return;
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/supplier_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId.toString(),
          supplier_id: id.toString(),
          user_id: userId.toString(),
        }),
      });
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
      pathname: "/screens/suppliers/suppliers-inventory",
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
    <Box flex={1} bg="white" safeArea>
      {/* Header */}
      <Box
        px={4}
        py={4}
        bg="white"
        borderBottomWidth={1}
        borderBottomColor="gray.200"
      >
        <HStack alignItems="center" justifyContent="space-between">
          <Pressable
            onPress={() => router.back()}
            p={2}
            rounded="full"
            _pressed={{ bg: "coolGray.100" }}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              style={{ color: "#6b7280" }}
            />
          </Pressable>
          <Heading size="md">Supplier Details</Heading>
          <Pressable
            onPress={() => setIsDeleteOpen(true)}
            p={2}
            rounded="full"
            _pressed={{ bg: "coolGray.100" }}
          >
            <MaterialIcons
              name="delete-outline"
              size={24}
              style={{ color: "#ef4444" }}
            />
          </Pressable>
        </HStack>
      </Box>

      <ScrollView bg="coolGray.100">
        {/* Personal Details Section */}
        <Box bg="white" mx={4} mt={4} mb={4}>
          <VStack space={2} p={4}>
            <Text color="cyan.500" fontSize="md" fontWeight="bold">Personal Details</Text>
            <VStack space={4}>
              <HStack justifyContent="space-between">
                <VStack flex={1}>
                  <Text color="coolGray.500">Full Name</Text>
                  <Text fontSize="md" fontWeight="medium">{supplier.name}</Text>
                </VStack>
                <VStack flex={1}>
                  <Text color="coolGray.500">Owner Name</Text>
                  <Text fontSize="md">{supplier.ownerName || "Not Available"}</Text>
                </VStack>
              </HStack>

              <HStack justifyContent="space-between">
                <VStack flex={1}>
                  <Text color="coolGray.500">Primary Contact</Text>
                  <Text fontSize="md">{supplier.mobileNumber1 || "Not Available"}</Text>
                </VStack>
                <VStack flex={1}>
                  <Text color="coolGray.500">Secondary Contact</Text>
                  <Text fontSize="md">{supplier.mobilleNumber2 || "Not Available"}</Text>
                </VStack>
              </HStack>

              <VStack>
                <Text color="coolGray.500">Address</Text>
                <Text fontSize="md">{supplier.address || "Not Available"}</Text>
              </VStack>
            </VStack>
          </VStack>
        </Box>

        {/* Business Details Section */}
        <Box bg="white" mx={4} mb={4}>
          <VStack space={2} p={4}>
            <Text color="cyan.500" fontSize="md" fontWeight="bold">Business Details</Text>
            <VStack space={4}>
              <HStack justifyContent="space-between">
                <VStack flex={1}>
                  <Text color="coolGray.500">Supplier Code</Text>
                  <Text fontSize="md">{supplier.supplierCode}</Text>
                </VStack>
                <VStack flex={1}>
                  <Text color="coolGray.500">Status</Text>
                  <Text fontSize="md" color={supplier.status === "active" ? "green.500" : "red.500"}>
                    {supplier.status?.toUpperCase()}
                  </Text>
                </VStack>
              </HStack>

              <HStack justifyContent="space-between">
                <VStack flex={1}>
                  <Text color="coolGray.500">Credit Rating</Text>
                  <Text fontSize="md">{supplier.creditRating || "Not Available"}</Text>
                </VStack>
                <VStack flex={1}>
                  <Text color="coolGray.500">Credit Limit</Text>
                  <Text fontSize="md">₹ {supplier.creditLimit || "0"}</Text>
                </VStack>
              </HStack>

              <HStack justifyContent="space-between">
                <VStack flex={1}>
                  <Text color="coolGray.500">Location</Text>
                  <Text fontSize="md">{supplier.location || "Not Available"}</Text>
                </VStack>
                <VStack flex={1}>
                  <Text color="coolGray.500">Website</Text>
                  <Text fontSize="md">{supplier.website || "Not Available"}</Text>
                </VStack>
              </HStack>
            </VStack>
          </VStack>
        </Box>

        {/* Additional Details Section */}
        <Box bg="white" mx={4} mb={4}>
          <VStack space={2} p={4}>
            <Text color="cyan.500" fontSize="md" fontWeight="bold">Additional Details</Text>
            <VStack space={4}>
              <HStack justifyContent="space-between">
                <VStack flex={1}>
                  <Text color="coolGray.500">Website</Text>
                  <Text fontSize="md">{supplier.website || "N/A"}</Text>
                </VStack>
                <VStack flex={1}>
                  <Text color="coolGray.500">Owner Name</Text>
                  <Text fontSize="md">{supplier.ownerName || "N/A"}</Text>
                </VStack>
              </HStack>

              <HStack justifyContent="space-between">
                <VStack flex={1}>
                  <Text color="coolGray.500">Created By</Text>
                  <Text fontSize="md">{supplier.createdBy || "N/A"}</Text>
                </VStack>
                <VStack flex={1}>
                  <Text color="coolGray.500">Created On</Text>
                  <Text fontSize="md">{supplier.createdOn || "N/A"}</Text>
                </VStack>
              </HStack>

              <HStack justifyContent="space-between">
                <VStack flex={1}>
                  <Text color="coolGray.500">Updated By</Text>
                  <Text fontSize="md">{supplier.updatedBy || "N/A"}</Text>
                </VStack>
                <VStack flex={1}>
                  <Text color="coolGray.500">Updated On</Text>
                  <Text fontSize="md">{supplier.updatedOn || "N/A"}</Text>
                </VStack>
              </HStack>

              <VStack>
                <Text color="coolGray.500">Address</Text>
                <Text fontSize="md">{supplier.address || "N/A"}</Text>
              </VStack>
            </VStack>
          </VStack>
        </Box>
      </ScrollView>

      {/* Edit FAB */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="edit" size={24} color="white" />}
        onPress={() => router.push(`/screens/suppliers/edit/${id}`)}
        bg="cyan.500"
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
            Are you sure you want to delete this supplier? This action cannot be undone.
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
