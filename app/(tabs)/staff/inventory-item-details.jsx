import React from "react";
import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  HStack,
  ScrollView,
  Divider,
  Badge,
  Spinner,
  Fab,
  AlertDialog,
  Button,
  useToast,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function InventoryItemDetailsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { itemId } = useLocalSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const cancelRef = React.useRef(null);

  // Simulated data fetch - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setItem({
      id: "INV001",
      supplierId: "SUP123",
      name: "Sample Item 1",
      description:
        "This is a sample inventory item with detailed description about the product specifications and other important information.",
      category: "Electronics",
      price: 1500,
      quantity: 10,
      serialNo: "SER001",
      status: "in",
      brandName: "Brand X",
      tax: 18,
      paymentStatus: "paid",
      orderId: "ORD123",
      inDateTime: "2024-03-15 10:30 AM",
      outDateTime: "2024-03-16 02:45 PM",
    });
    setLoading(false);
  }, [itemId]);

  const handleDelete = () => {
    // Add your delete API call here
    console.log("Deleting item:", itemId);
    setIsDeleteOpen(false);
    // Show success toast and navigate back
    toast.show({
      description: "Item deleted successfully",
      placement: "top",
      duration: 2000,
      backgroundColor: "success.500",
    });
    router.back();
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  const DetailRow = ({ label, value, badge, badgeColor }) => (
    <HStack space={2} justifyContent="space-between" alignItems="center">
      <Text fontSize="sm" color="coolGray.500" flex={1}>
        {label}
      </Text>
      {badge ? (
        <Badge colorScheme={badgeColor} rounded="md" variant="subtle">
          {value}
        </Badge>
      ) : (
        <Text fontSize="sm" fontWeight="medium" flex={1} textAlign="right">
          {value}
        </Text>
      )}
    </HStack>
  );

  const DetailSection = ({ title, children }) => (
    <VStack space={3}>
      <Text fontSize="md" fontWeight="bold" color="coolGray.700">
        {title}
      </Text>
      <VStack space={3} bg="white" p={4} rounded="lg" shadow={1}>
        {children}
      </VStack>
    </VStack>
  );

  return (
    <Box
      flex={1}
      bg="coolGray.50"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header */}
      <Box
        px={4}
        py={3}
        bg="white"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
          />
          <Heading size="md" flex={1} textAlign="center">
            Item Details
          </Heading>
          <IconButton
            icon={<MaterialIcons name="delete" size={24} color="red.600" />}
            onPress={() => setIsDeleteOpen(true)}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
          />
        </HStack>
      </Box>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Item</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this item? This action cannot be
            undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2} justifyContent="space-between" width="full">
              <Button
                variant="unstyled"
                colorScheme="coolGray"
                onPress={() => setIsDeleteOpen(false)}
                ref={cancelRef}
              >
                Cancel
              </Button>
              <Button colorScheme="danger" onPress={handleDelete}>
                Delete
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space={6} p={4}>
          {/* Basic Information */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={3}>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack>
                  <Text fontSize="xl" fontWeight="bold" color="coolGray.800">
                    {item.name}
                  </Text>
                  <Text fontSize="sm" color="coolGray.500">
                    ID: {item.id}
                  </Text>
                </VStack>
                <Badge
                  colorScheme={item.status === "in" ? "success" : "danger"}
                  variant="subtle"
                  rounded="md"
                  px={3}
                  py={1}
                >
                  {item.status.toUpperCase()}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="coolGray.600">
                {item.description}
              </Text>
            </VStack>
          </Box>

          {/* Product Details */}
          <DetailSection title="Product Information">
            <DetailRow label="Category" value={item.category} />
            <DetailRow label="Brand Name" value={item.brandName} />
            <DetailRow label="Serial Number" value={item.serialNo} />
            <DetailRow label="Quantity" value={item.quantity.toString()} />
          </DetailSection>

          {/* Financial Details */}
          <DetailSection title="Financial Information">
            <DetailRow label="Price" value={`₹${item.price}`} />
            <DetailRow label="Tax" value={`${item.tax}%`} />
            <DetailRow
              label="Payment Status"
              value={item.paymentStatus.toUpperCase()}
              badge
              badgeColor={item.paymentStatus === "paid" ? "success" : "warning"}
            />
          </DetailSection>

          {/* Order Information */}
          <DetailSection title="Order Information">
            <DetailRow label="Order ID" value={item.orderId} />
            <DetailRow label="Supplier ID" value={item.supplierId} />
          </DetailSection>

          {/* Timestamps */}
          <DetailSection title="Time Information">
            <DetailRow label="In Date & Time" value={item.inDateTime} />
            <DetailRow label="Out Date & Time" value={item.outDateTime} />
          </DetailSection>
        </VStack>
      </ScrollView>

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="edit" size={24} color="white" />}
        onPress={() =>
          router.push({
            pathname: "/staff/edit-inventory-item",
            params: { itemId: item.id },
          })
        }
        bg="#007AFF"
        _pressed={{
          bg: "#0056b3",
        }}
        bottom={85}
        right={6}
      />
    </Box>
  );
}
