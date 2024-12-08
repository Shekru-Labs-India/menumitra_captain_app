import React, { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  Heading,
  HStack,
  VStack,
  Text,
  IconButton,
  useToast,
  Input,
  FormControl,
  Button,
  Badge,
  Modal,
  Spinner,
  Image,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function TableDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  console.log("Received params:", params);

  const tableId = params.id;
  const sectionId = params.sectionId;

  console.log("Table ID:", tableId, "Section ID:", sectionId);

  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tableDetails, setTableDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTableNumber, setEditedTableNumber] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    console.log("Table ID:", tableId);
    fetchTableDetails();
  }, []);

  const fetchTableDetails = async () => {
    try {
      setLoading(true);
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      console.log("Fetching details for table_id:", tableId);

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/table_view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(storedRestaurantId),
            table_id: parseInt(tableId),
          }),
        }
      );

      const data = await response.json();
      console.log("Table Details Response:", data);

      if (data.st === 1) {
        setTableDetails(data.data);
        setEditedTableNumber(data.data.table_number);
      } else {
        throw new Error(data.msg || "Failed to fetch table details");
      }
    } catch (error) {
      console.error("Fetch Table Details Error:", error);
      toast.show({
        description: error.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      const requestBody = {
        restaurant_id: storedRestaurantId,
        table_id: tableId.toString(),
      };

      console.log("Deleting table with data:", requestBody);

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/table_delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();
      console.log("Delete Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Table deleted successfully",
          status: "success",
          placement: "top",
        });
        router.replace(`/tables/sections/${sectionId}`);
      } else {
        throw new Error(data.msg || "Failed to delete table");
      }
    } catch (error) {
      console.error("Delete Table Error:", error);
      toast.show({
        description: error.message,
        status: "error",
        placement: "top",
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
      <Box px={4} py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
            }
            onPress={() => router.back()}
          />
          <Heading size="md">Table Details</Heading>
          <IconButton
            icon={<MaterialIcons name="delete" size={24} color="red.500" />}
            onPress={() => setShowDeleteModal(true)}
          />
        </HStack>
      </Box>

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      ) : (
        <ScrollView px={4} py={4}>
          <VStack space={6}>
            {/* Table Information Card */}
            <Box
              bg="coolGray.50"
              p={6}
              rounded="xl"
              borderWidth={1}
              borderColor="coolGray.200"
              shadow={2}
            >
              <VStack space={4}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="md" color="coolGray.600">
                    Table Number:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    {tableDetails?.table_number}
                  </Text>
                </HStack>

                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="md" color="coolGray.600">
                    Section:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    {tableDetails?.section_name}
                  </Text>
                </HStack>

                {/* QR Code Section */}
                {tableDetails?.qr_code_url && (
                  <VStack space={2} alignItems="center" mt={4}>
                    <Text fontSize="md" color="coolGray.600">
                      QR Code:
                    </Text>
                    <Box
                      bg="white"
                      p={4}
                      rounded="lg"
                      borderWidth={1}
                      borderColor="coolGray.200"
                    >
                      <Image
                        source={{ uri: tableDetails.qr_code_url }}
                        alt="QR Code"
                        size="xl"
                        resizeMode="contain"
                      />
                    </Box>
                  </VStack>
                )}
              </VStack>
            </Box>

            {/* Delete Button */}
            <Button
              colorScheme="red"
              size="lg"
              onPress={() => setShowDeleteModal(true)}
              leftIcon={<MaterialIcons name="delete" size={20} color="white" />}
            >
              Delete Table
            </Button>
          </VStack>
        </ScrollView>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Modal.Content maxWidth="400px">
          <Modal.Header>Delete Table</Modal.Header>
          <Modal.Body>
            <VStack space={3}>
              <Text>
                Are you sure you want to delete Table{" "}
                {tableDetails?.table_number} from {tableDetails?.section_name}?
              </Text>
              <Text fontSize="sm" color="coolGray.500">
                This action cannot be undone.
              </Text>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
              <Button variant="ghost" onPress={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onPress={handleDeleteTable}>
                Delete
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </Box>
  );
}
