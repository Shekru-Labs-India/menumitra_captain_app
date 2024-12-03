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
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { SupplierContext } from "../../../../context/SupplierContext";

export default function SupplierDetails() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const { suppliers, deleteSupplier } = useContext(SupplierContext);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const supplier = suppliers.find((s) => s.id === id);

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

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
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
        <VStack space={4} p={4}>
          <HStack space={3} alignItems="center">
            <Avatar size="xl" bg="cyan.500">
              {supplier.name.charAt(0)}
            </Avatar>
            <VStack>
              <Text fontSize="2xl" fontWeight="bold">
                {supplier.name}
              </Text>
              <Text fontSize="md" color="coolGray.600">
                {supplier.status}
              </Text>
            </VStack>
          </HStack>

          <Box bg="coolGray.50" p={4} rounded="md">
            <VStack space={3}>
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">Credit Rating:</Text>
                <Text>{supplier.creditRating}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">Credit Limit:</Text>
                <Text>{supplier.creditLimit}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">Location:</Text>
                <Text>{supplier.location}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">Owner Name:</Text>
                <Text>{supplier.ownerName}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">Supplier Code:</Text>
                <Text>{supplier.supplierCode}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">Website:</Text>
                <Text>{supplier.website}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">Primary Contact:</Text>
                <Text>{supplier.mobileNumber1}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontWeight="bold">Secondary Contact:</Text>
                <Text>{supplier.mobileNumber2}</Text>
              </HStack>
            </VStack>
          </Box>

          <Box bg="coolGray.50" p={4} rounded="md">
            <Text fontWeight="bold" mb={2}>
              Address:
            </Text>
            <Text>{supplier.address}</Text>
          </Box>
        </VStack>
      </ScrollView>

      <Fab
        renderInPortal={false}
        shadow={3}
        size="md"
        icon={<Icon color="white" as={Ionicons} name="pencil" size="md" />}
        onPress={() => router.push(`/staff/suppliers/edit/${id}`)}
        position="absolute"
        bottom={10}
        right={4}
      />

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
