import { useContext, useState } from "react";
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
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar, Linking } from "react-native";
import { SupplierContext } from "../../../../context/SupplierContext";

export default function SupplierDetails() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const { suppliers, deleteSupplier } = useContext(SupplierContext);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const supplier = suppliers ? suppliers.find((s) => s.id === id) : null;

  if (!supplier) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>Supplier not found</Text>
      </Box>
    );
  }

  const handleDelete = () => {
    deleteSupplier(id);
    toast.show({
      description: "Supplier deleted successfully",
      status: "success",
    });
    router.back();
  };

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
          icon={<Icon as={Ionicons} name="arrow-back" size={6} />}
          onPress={() => router.back()}
        />
        <Heading textAlign="center">Supplier Details</Heading>
        <IconButton
          position="absolute"
          right={2}
          top={2}
          icon={
            <Icon as={Ionicons} name="trash-outline" size={6} color="red.500" />
          }
          onPress={() => setIsDeleteOpen(true)}
        />
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
                    <Icon
                      as={Ionicons}
                      name="call-outline"
                      size={5}
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
                    <Icon
                      as={Ionicons}
                      name="call-outline"
                      size={5}
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
                    <Icon
                      as={Ionicons}
                      name="globe-outline"
                      size={5}
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
                <Icon
                  as={Ionicons}
                  name="star-outline"
                  size={5}
                  color="coolGray.500"
                />
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
                <Icon
                  as={Ionicons}
                  name="wallet-outline"
                  size={5}
                  color="coolGray.500"
                />
                <Text fontWeight="medium">Credit Limit:</Text>
              </HStack>
              <Text>{supplier.creditLimit || "Not specified"}</Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <Icon
                  as={Ionicons}
                  name="person-outline"
                  size={5}
                  color="coolGray.500"
                />
                <Text fontWeight="medium">Owner Name:</Text>
              </HStack>
              <Text>{supplier.ownerName || "Not specified"}</Text>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center">
              <HStack space={2} alignItems="center">
                <Icon
                  as={Ionicons}
                  name="location-outline"
                  size={5}
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
            <Heading size="md">Address</Heading>
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
        icon={<Icon color="white" as={Ionicons} name="pencil" size="sm" />}
        onPress={() => router.push(`/staff/suppliers/edit/${id}`)}
        position="absolute"
        bottom={10}
        right={4}
      />

      {/* Delete Alert Dialog */}
      <AlertDialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)}>
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Supplier</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this supplier? This action cannot be
            undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant="unstyled"
                colorScheme="coolGray"
                onPress={() => setIsDeleteOpen(false)}
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
    </Box>
  );
}
