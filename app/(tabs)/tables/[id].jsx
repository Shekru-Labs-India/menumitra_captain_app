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
import Header from "../../components/Header";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

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

  const downloadQRCode = async () => {
    try {
      // Request permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        toast.show({
          description: "Permission to access media library was denied",
          status: "error",
        });
        return;
      }

      // Download the image
      const fileUri =
        FileSystem.documentDirectory +
        `table_${tableDetails.table_number}_qr.png`;
      const downloadResult = await FileSystem.downloadAsync(
        tableDetails.qr_code_url,
        fileUri
      );

      if (downloadResult.status === 200) {
        // Save to device
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync("MenuMitra QR Codes", asset, false);

        toast.show({
          description: "QR Code saved to gallery",
          status: "success",
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.show({
        description: "Failed to download QR Code",
        status: "error",
      });
    }
  };

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 1}
    >
      {/* Header */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        p={1}
        bg="white"
        borderBottomWidth={1}
        borderColor="coolGray.200"
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => router.back()}
        />
        <Text fontSize="20" fontWeight="bold">
          Table Details
        </Text>
        {/* Show delete icon only when table is available (not occupied) */}
        {!loading && tableDetails?.is_occupied === 0 ? (
          <IconButton
            icon={<MaterialIcons name="delete" size={24} color="black" />}
            onPress={() => setShowDeleteModal(true)}
          />
        ) : (
          <Box width={10} height={10} />
        )}
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

                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="md" color="coolGray.600">
                    Status:
                  </Text>
                  <Badge
                    colorScheme={
                      tableDetails?.is_occupied === 1 ? "red" : "green"
                    }
                    rounded="md"
                    variant="solid"
                  >
                    <Text color="white" fontSize="sm" fontWeight="medium">
                      {tableDetails?.is_occupied === 1
                        ? "Occupied"
                        : "Available"}
                    </Text>
                  </Badge>
                </HStack>

                {/* QR Code Section with Download Button */}
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
                    <Button
                      mt={4}
                      onPress={downloadQRCode}
                      colorScheme="primary"
                    >
                      Download
                    </Button>
                  </VStack>
                )}
              </VStack>
            </Box>

            {/* Delete Button */}
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
