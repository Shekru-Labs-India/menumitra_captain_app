import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Box,
  ScrollView,
  Heading,
  HStack,
  VStack,
  Text,
  Pressable,
  IconButton,
  Badge,
  useToast,
  Center,
  Modal,
  Button,
  Divider,
  Icon,
  FormControl,
  Input,
  Spinner,
  Fab,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../../components/Header";

const API_BASE_URL = "https://men4u.xyz/common_api";

export default function SectionTablesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const scrollViewRef = useRef(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeSection, setActiveSection] = useState(id);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSection, setEditSection] = useState({
    name: "",
    totalTables: "",
    engagedTables: "",
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [isAddingTable, setIsAddingTable] = useState(false);

  // Initialize currentSection with a default value
  const [currentSection, setCurrentSection] = useState({
    id: id,
    name: "",
    totalTables: 0,
    engagedTables: 0,
    color: "#4CAF50",
  });

  // Initialize tables with empty array
  const [tables, setTables] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Sample section data with correct counts

  useEffect(() => {
    const initializeSection = async () => {
      try {
        setLoading(true);
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

        if (!storedRestaurantId) {
          toast.show({
            description: "Please login again",
            status: "error",
          });
          router.replace("/login");
          return;
        }

        // Fetch sections first
        await fetchSections();

        // Then fetch section details
        const sectionResponse = await fetch(
          `${API_BASE_URL}/captain_manage/section_view`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: parseInt(storedRestaurantId),
              section_id: parseInt(id),
            }),
          }
        );

        const sectionData = await sectionResponse.json();
        console.log("Section Data:", sectionData);

        if (sectionData.st === 1) {
          setCurrentSection((prev) => ({
            ...prev,
            id: id,
            name: sectionData.data.section_name,
          }));

          await fetchTables(sectionData.data.section_name);
        }
      } catch (error) {
        console.error("Initialize Error:", error);
        toast.show({
          description: "Failed to load section details",
          status: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeSection();
  }, [id]);

  // Update fetchTables to accept sectionName parameter
  const fetchTables = async (sectionName) => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/table_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(storedRestaurantId),
          }),
        }
      );

      const data = await response.json();
      console.log("Tables Response:", data);

      if (data.st === 1 && data.data) {
        let sectionTables = [];

        Object.entries(data.data).forEach(([key, tables]) => {
          if (key.toLowerCase() === sectionName.toLowerCase()) {
            sectionTables = tables;
          }
        });

        if (sectionTables.length > 0) {
          const formattedTables = sectionTables.map((table, index) => ({
            table_id: table.table_id,
            table_number: table.table_number,
            status: table.is_occupied === 1 ? "ENGAGED" : "AVAILABLE",
            row: Math.floor(index / 3),
            col: index % 3,
            is_occupied: table.is_occupied,
            order_number: table.order_number,
            grandTotal: table.grand_total || 0,
          }));

          console.log("Formatted Tables:", formattedTables);
          setTables(formattedTables);

          setCurrentSection((prev) => ({
            ...prev,
            totalTables: formattedTables.length,
            engagedTables: formattedTables.filter((t) => t.is_occupied === 1)
              .length,
          }));
        } else {
          setTables([]);
          setCurrentSection((prev) => ({
            ...prev,
            totalTables: 0,
            engagedTables: 0,
          }));
        }
      }
    } catch (error) {
      console.error("Fetch Tables Error:", error);
      toast.show({
        description: "Failed to fetch tables",
        status: "error",
        placement: "top",
      });
      setTables([]);
    }
  };

  // Update handleSectionChange
  const handleSectionChange = async (sectionId) => {
    setActiveSection(sectionId);
    router.push(`/tables/sections/${sectionId}`);
  };

  // Update section list rendering
  const renderSections = () => (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
      }}
    >
      <HStack space={3} alignItems="center">
        {sections.map((section) => (
          <Pressable
            key={section.id}
            onPress={() => handleSectionChange(section.id)}
          >
            <Box
              px={4}
              py={1.5}
              bg={section.id === id ? "primary.500" : "white"}
              borderWidth={1}
              borderColor="primary.500"
              rounded="md"
              minW="120px"
              alignItems="center"
            >
              <Text
                color={section.id === id ? "white" : "primary.500"}
                fontSize="sm"
                fontWeight="medium"
              >
                {section.name}
              </Text>
            </Box>
          </Pressable>
        ))}
      </HStack>
    </ScrollView>
  );

  // Update getFilteredTables function
  const getFilteredTables = () => {
    if (!tables || tables.length === 0) return [];

    switch (activeFilter) {
      case "AVAILABLE":
        return tables.filter((table) => table.is_occupied === 0);
      case "ENGAGED":
        return tables.filter((table) => table.is_occupied === 1);
      default:
        return tables;
    }
  };

  // Update tablesByRow calculation with filtered tables
  const tablesByRow = useMemo(() => {
    const filteredTables = getFilteredTables();
    const grouped = {};

    filteredTables.forEach((table, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;

      if (!grouped[row]) {
        grouped[row] = {};
      }
      grouped[row][col] = table;
    });

    return grouped;
  }, [tables, activeFilter]);

  // Add filter buttons component
  const FilterButtons = () => (
    <Box py={4} borderBottomWidth={1} borderBottomColor="coolGray.200">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
        }}
      >
        <HStack space={3} alignItems="center">
          <Pressable onPress={() => setActiveFilter("ALL")}>
            <Box
              px={4}
              py={1.5}
              bg={activeFilter === "ALL" ? "primary.500" : "white"}
              borderWidth={1}
              borderColor="primary.500"
              rounded="md"
            >
              <Text
                color={activeFilter === "ALL" ? "white" : "primary.500"}
                fontSize="sm"
                fontWeight="medium"
              >
                All
              </Text>
            </Box>
          </Pressable>
          <Pressable onPress={() => setActiveFilter("AVAILABLE")}>
            <Box
              px={4}
              py={1.5}
              bg={activeFilter === "AVAILABLE" ? "green.500" : "white"}
              borderWidth={1}
              borderColor="green.500"
              rounded="md"
            >
              <Text
                color={activeFilter === "AVAILABLE" ? "white" : "green.500"}
                fontSize="sm"
                fontWeight="medium"
              >
                Available
              </Text>
            </Box>
          </Pressable>
          <Pressable onPress={() => setActiveFilter("ENGAGED")}>
            <Box
              px={4}
              py={1.5}
              bg={activeFilter === "ENGAGED" ? "red.500" : "white"}
              borderWidth={1}
              borderColor="red.500"
              rounded="md"
            >
              <Text
                color={activeFilter === "ENGAGED" ? "white" : "red.500"}
                fontSize="sm"
                fontWeight="medium"
              >
                Occupied
              </Text>
            </Box>
          </Pressable>
        </HStack>
      </ScrollView>
    </Box>
  );

  // Add handleTablePress function
  const handleTablePress = async (table) => {
    console.log("Pressed table:", table);

    // If table is available, navigate to create order screen
    if (table.is_occupied === 0) {
      router.push({
        pathname: "/(tabs)/orders/create-order",
        params: {
          tableId: table.table_id,
          tableNumber: table.table_number,
          sectionId: id,
          sectionName: currentSection.name,
        },
      });
    }
    // If table is occupied, fetch order details first
    else {
      try {
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

        // First get the ongoing orders list to find the correct order number
        const listResponse = await fetch(
          `${API_BASE_URL}/captain_order/listview`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: parseInt(storedRestaurantId),
              order_status: "ongoing",
              date: getCurrentDate(),
            }),
          }
        );

        const listData = await listResponse.json();
        if (listData.st === 1 && listData.lists) {
          // Find the order for this table
          const tableOrder = listData.lists.find(
            (order) => order.table_number === table.table_number
          );

          if (tableOrder) {
            // Now fetch specific order details
            const response = await fetch(`${API_BASE_URL}/captain_order/view`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                restaurant_id: parseInt(storedRestaurantId),
                order_number: tableOrder.order_number,
              }),
            });

            const data = await response.json();
            console.log("Order Details Response:", data);

            if (data.st === 1 && data.lists) {
              // Navigate to order details with the order number
              router.push({
                pathname: "/(tabs)/orders/order-details",
                params: {
                  id: tableOrder.order_number,
                },
              });
            } else {
              throw new Error(data.msg || "Failed to fetch order details");
            }
          } else {
            throw new Error("No active order found for this table");
          }
        } else {
          throw new Error(listData.msg || "Failed to fetch orders list");
        }
      } catch (error) {
        console.error("Fetch Order Details Error:", error);
        toast.show({
          description: error.message || "Failed to fetch order details",
          status: "error",
          placement: "top",
        });
      }
    }
  };

  // Update renderTable function to match the exact design
  const renderTable = (table) => (
    <Pressable onPress={() => handleTablePress(table)}>
      <Box
        p={3}
        rounded="lg"
        width={20}
        height={20}
        bg={table.is_occupied === 1 ? "red.100" : "green.100"}
        borderWidth={1}
        borderColor={table.is_occupied === 1 ? "red.200" : "green.200"}
        position="relative"
      >
        {/* Price Overlay for Occupied Tables */}
        {table.is_occupied === 1 && (
          <Box
            position="absolute"
            top={-2}
            left={-2} // Changed from right to left
            right={-2} // Added right to stretch horizontally
            bg="red.500"
            py={1}
            rounded="md"
            shadow={1}
            zIndex={1}
            alignItems="center" // Center the price text
          >
            <Text color="white" fontSize="xs" fontWeight="bold">
              ₹{table.grandTotal || 0}
            </Text>
          </Box>
        )}

        {/* Table Content */}
        <VStack space={3} alignItems="center" mt={0}>
          {" "}
          {/* Increased space and added top margin */}
          <Text
            fontSize="md"
            fontWeight="bold"
            color={table.is_occupied === 1 ? "red.500" : "green.500"}
          >
            {table.table_number}
          </Text>
          {/* Time Display */}
          <Text fontSize="2xs" color="coolGray.600">
            {table.is_occupied === 1 ? table.occupiedTime || "00:00" : "--:--"}
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );

  // Updated Modal Component with only engaged functionality
  const TableActionModal = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleTableAction = async (action) => {
      setIsLoading(true);
      try {
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
        const response = await fetch(
          `${API_BASE_URL}/captain_manage/table_${action}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: parseInt(storedRestaurantId),
              table_id: selectedTable?.id,
            }),
          }
        );

        const data = await response.json();
        if (data.st === 1) {
          toast.show({
            description: `Table ${action} successful`,
            status: "success",
          });
          setShowModal(false);
          fetchTableDetails(); // Refresh tables
        } else {
          throw new Error(data.msg || `Failed to ${action} table`);
        }
      } catch (error) {
        console.error(`${action} Error:`, error);
        toast.show({
          description: error.message,
          status: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <Modal.Content>
          <Modal.CloseButton />
          <Modal.Header>
            <HStack space={2} alignItems="center">
              <Text fontSize="lg" fontWeight="bold">
                Table {selectedTable?.number}
              </Text>
              <Badge colorScheme="red" variant="solid" rounded="md">
                OCCUPIED
              </Badge>
            </HStack>
          </Modal.Header>
          <Modal.Body>
            <VStack space={4}>
              {/* Order Details */}
              <Box
                bg="coolGray.50"
                p={4}
                rounded="md"
                borderWidth={1}
                borderColor="coolGray.200"
              >
                <VStack space={3}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="bold" color="coolGray.600">
                      Customer Name:
                    </Text>
                    <Text>{selectedTable?.customerName || "N/A"}</Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="bold" color="coolGray.600">
                      Menu Count:
                    </Text>
                    <Text>{selectedTable?.menuCount || "0"} items</Text>
                  </HStack>
                  <Divider my={1} />
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="bold" color="coolGray.800" fontSize="md">
                      Grand Total:
                    </Text>
                    <Text fontWeight="bold" color="coolGray.800" fontSize="md">
                      ₹{selectedTable?.grandTotal || "0"}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Quick Actions */}
              <VStack space={3}>
                <Text fontWeight="bold" color="coolGray.700">
                  Quick Actions
                </Text>
                <HStack space={3} justifyContent="space-between">
                  <Button
                    flex={1}
                    isLoading={isLoading}
                    onPress={() => handleTableAction("cancel")}
                    colorScheme="red"
                  >
                    Cancel Order
                  </Button>
                  <Button
                    flex={1}
                    isLoading={isLoading}
                    onPress={() => handleTableAction("complete")}
                    colorScheme="green"
                  >
                    Complete Order
                  </Button>
                </HStack>
              </VStack>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
  };

  // Updated table rendering style
  const getTableStyle = (status) => ({
    p: 3,
    rounded: "lg",
    width: 20, // Changed from 20 to 30
    height: 20, // Changed from 20 to 30
    justifyContent: "center",
    alignItems: "center",
    bg: "white",
    borderWidth: 2,
    borderColor: status === "AVAILABLE" ? "green.500" : "red.500",
  });

  // Simplified text color function
  const getTextColor = (status) => {
    return status === "AVAILABLE" ? "green.500" : "red.500";
  };

  // Add this function to handle section update
  const handleEditSection = async () => {
    if (!editSection.name.trim()) {
      toast.show({
        description: "Section name is required",
        placement: "top",
        status: "warning",
      });
      return;
    }

    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (!storedRestaurantId) {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/section_update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(storedRestaurantId),
            section_id: parseInt(id), // from useLocalSearchParams
            section_name: editSection.name.trim(),
          }),
        }
      );

      const data = await response.json();
      console.log("Update Section Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Section updated successfully",
          placement: "top",
          status: "success",
        });

        // Update local state
        setCurrentSection((prev) => ({
          ...prev,
          name: editSection.name.trim(),
        }));

        // Close modal
        setShowEditModal(false);

        // Optionally refresh the sections list
        // You might want to add a fetchSections function here
      } else {
        throw new Error(data.msg || "Failed to update section");
      }
    } catch (error) {
      console.error("Update Section Error:", error);
      toast.show({
        description: error.message || "Failed to update section",
        placement: "top",
        status: "error",
      });
    }
  };

  // Update handleDeleteSection function to make the API call
  const handleDeleteSection = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (!storedRestaurantId) {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/section_delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(storedRestaurantId),
            section_id: parseInt(id),
          }),
        }
      );

      const data = await response.json();
      console.log("Delete Section Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Section deleted successfully",
          placement: "top",
          status: "success",
        });

        // Close the modal
        setShowDeleteModal(false);

        // Navigate back to the sections list
        // Using replace instead of back() to ensure the screen refreshes
        router.replace("/tables/sections");
      } else {
        throw new Error(data.msg || "Failed to delete section");
      }
    } catch (error) {
      console.error("Delete Section Error:", error);
      toast.show({
        description: error.message || "Failed to delete section",
        placement: "top",
        status: "error",
      });
    }
  };

  // Update DeleteConfirmationModal to handle loading state
  const DeleteConfirmationModal = () => {
    const [isDeleting, setIsDeleting] = useState(false);
    const hasOccupiedTables = tables.some((table) => table.is_occupied === 1);

    const handleDelete = async () => {
      setIsDeleting(true);
      await handleDeleteSection();
      setIsDeleting(false);
    };

    // If there are occupied tables, don't show delete option
    if (hasOccupiedTables) {
      return (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        >
          <Modal.Content maxWidth="400px">
            <Modal.CloseButton />
            <Modal.Header>Cannot Delete Section</Modal.Header>
            <Modal.Body>
              <VStack space={3}>
                <Box bg="orange.100" p={3} rounded="md">
                  <Text color="orange.800">
                    This section has occupied tables and cannot be deleted.
                    Please ensure all tables are available before deleting the
                    section.
                  </Text>
                </Box>
              </VStack>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="outline"
                onPress={() => setShowDeleteModal(false)}
                width="100%"
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      );
    }

    // Original delete confirmation dialog for sections without occupied tables
    return (
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Modal.Content maxWidth="400px">
          <Modal.CloseButton />
          <Modal.Header>Delete Section</Modal.Header>
          <Modal.Body>
            <VStack space={3}>
              <Text>
                Are you sure you want to delete "{currentSection?.name || ""}"?
                This action cannot be undone.
              </Text>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <HStack space={2} width="100%" justifyContent="space-between">
              <Button
                variant="outline"
                colorScheme="coolGray"
                onPress={() => setShowDeleteModal(false)}
                leftIcon={<Icon as={MaterialIcons} name="close" size="sm" />}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onPress={handleDelete}
                rightIcon={
                  isDeleting ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <Icon as={MaterialIcons} name="delete" size="sm" />
                  )
                }
                isDisabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </HStack>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    );
  };

  // Add getRandomColor function that was missing

  // Update the handleAddTable function
  const handleAddTable = async () => {
    setIsAddingTable(true);
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      const requestBody = {
        restaurant_id: parseInt(storedRestaurantId),
        section_id: parseInt(id),
      };

      console.log("Creating table with data:", requestBody);

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/table_create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();
      console.log("Create Table Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Table created successfully",
          status: "success",
          placement: "top",
        });
        setShowAddTableModal(false);

        // Refresh tables list
        await fetchTables(currentSection.name);
      } else {
        throw new Error(data.msg || "Failed to create table");
      }
    } catch (error) {
      console.error("Add Table Error:", error);
      toast.show({
        description: error.message,
        status: "error",
        placement: "top",
      });
    } finally {
      setIsAddingTable(false);
    }
  };

  // Update the AddTableModal component to remove any table number validation
  const AddTableModal = () => (
    <Modal
      isOpen={showAddTableModal}
      onClose={() => setShowAddTableModal(false)}
    >
      <Modal.Content maxWidth="400px">
        <Modal.CloseButton />
        <Modal.Header>Create New Table</Modal.Header>
        <Modal.Body>
          <Text>
            Do you want to create a new table in {currentSection.name}?
          </Text>
        </Modal.Body>
        <Modal.Footer>
          <HStack space={3} width="100%" justifyContent="space-between">
            <Button
              variant="outline"
              flex={1}
              onPress={() => setShowAddTableModal(false)}
              isDisabled={isAddingTable}
            >
              No
            </Button>
            <Button
              flex={1}
              colorScheme="primary"
              onPress={handleAddTable}
              isLoading={isAddingTable}
              isLoadingText="Creating..."
            >
              Yes
            </Button>
          </HStack>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );

  // Add the floating action buttons
  const FloatingButtons = () => (
    <HStack position="absolute" bottom={8} right={8} space={3}>
      <Pressable onPress={() => setShowAddTableModal(true)}>
        <Box
          bg="primary.500"
          p={3}
          rounded="full"
          shadow={3}
          _pressed={{
            bg: "primary.600",
          }}
        >
          <Icon as={MaterialIcons} name="add" size={6} color="white" />
        </Box>
      </Pressable>
      <Pressable
        onPress={() => {
          if (currentSection) {
            setEditSection({
              name: currentSection.name || "",
              totalTables: (currentSection.totalTables || 0).toString(),
              engagedTables: (currentSection.engagedTables || 0).toString(),
            });
            setShowEditModal(true);
          }
        }}
      >
        <Box
          bg="primary.500"
          p={3}
          rounded="full"
          shadow={3}
          _pressed={{
            bg: "primary.600",
          }}
        >
          <Icon as={MaterialIcons} name="edit" size={6} color="white" />
        </Box>
      </Pressable>
    </HStack>
  );

  // Add this function near your other API calls
  const fetchSections = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/section_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(storedRestaurantId),
          }),
        }
      );

      const data = await response.json();
      console.log("Sections Response:", data);

      if (data.st === 1 && Array.isArray(data.data)) {
        const formattedSections = data.data.map((section) => ({
          id: section.section_id.toString(),
          name: section.section_name,
        }));
        console.log("Formatted Sections:", formattedSections);
        setSections(formattedSections);
      }
    } catch (error) {
      console.error("Fetch Sections Error:", error);
      toast.show({
        description: "Failed to fetch sections",
        status: "error",
      });
    }
  };

  const fetchTableDetails = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      // Get section tables
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/table_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(storedRestaurantId),
            section_id: parseInt(id),
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        const formattedTables = data.data.map((table, index) => ({
          id: table.table_id,
          number: table.table_number,
          status: table.status || "AVAILABLE",
          row: Math.floor(index / 3),
          col: index % 3,
          customerName: table.customer_name,
          menuCount: table.menu_count,
          grandTotal: table.grand_total,
        }));

        setTables(formattedTables);
        setCurrentSection((prev) => ({
          ...prev,
          totalTables: formattedTables.length,
          engagedTables: formattedTables.filter((t) => t.status === "ENGAGED")
            .length,
        }));
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: "Failed to fetch tables",
        status: "error",
      });
    }
  };

  const handleTableDelete = async (tableId) => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/table_delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: storedRestaurantId,
            table_id: tableId,
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        toast.show({
          description: "Table deleted successfully",
          status: "success",
        });
        fetchTableDetails(); // Refresh tables
      } else {
        throw new Error(data.msg || "Failed to delete table");
      }
    } catch (error) {
      console.error("Delete Error:", error);
      toast.show({
        description: error.message,
        status: "error",
      });
    }
  };

  // Add this function at the top of your component
  const getCurrentDate = () => {
    const date = new Date();
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, " ");
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <HStack
        px={4}
        py={3}
        alignItems="center"
        justifyContent="space-between"
        bg="white"
        shadow={2}
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
        />
        <Heading size="md">{currentSection?.name || "Loading..."}</Heading>
        <IconButton
          icon={<MaterialIcons name="delete" size={24} color="red.500" />}
          onPress={() => setShowDeleteModal(true)}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
        />
      </HStack>
      {/* Section Tabs */}
      <Box py={4} borderBottomWidth={1} borderBottomColor="coolGray.200">
        {loading ? (
          <Center>
            <Spinner size="lg" />
          </Center>
        ) : (
          renderSections()
        )}
      </Box>
      {/* Filter Buttons */}
      <FilterButtons />l{/* Main Content */}
      <ScrollView>
        <Box px={4} py={2}>
          <Center>
            {/* Section Statistics */}
            <Box
              mb={4}
              p={4}
              bg="coolGray.50"
              rounded="xl"
              width="100%"
              borderWidth={1}
              borderColor="coolGray.200"
              shadow={2}
            >
              <VStack space={3}>
                <HStack justifyContent="space-around">
                  <VStack alignItems="center" space={1}>
                    <Text color="coolGray.600" fontSize="sm">
                      Total
                    </Text>
                    <Heading size="lg" color="coolGray.700">
                      {tables.length}
                    </Heading>
                  </VStack>
                  <VStack alignItems="center" space={1}>
                    <Text color="red.500" fontSize="sm">
                      Occupied
                    </Text>
                    <Heading size="lg" color="red.500">
                      {tables.filter((t) => t.is_occupied === 1).length}
                    </Heading>
                  </VStack>
                  <VStack alignItems="center" space={1}>
                    <Text color="green.500" fontSize="sm">
                      Available
                    </Text>
                    <Heading size="lg" color="green.500">
                      {tables.filter((t) => t.is_occupied === 0).length}
                    </Heading>
                  </VStack>
                </HStack>
              </VStack>
            </Box>

            {/* Tables Grid */}
            <VStack space={1}>
              {Object.entries(tablesByRow).map(([rowIndex, row]) => (
                <HStack
                  key={rowIndex}
                  space={10}
                  px={0}
                  py={3}
                  alignItems="center"
                  justifyContent="flex-start"
                >
                  {Array.from({ length: 3 }).map((_, colIndex) => (
                    <Box key={`${rowIndex}-${colIndex}`} width={20} height={20}>
                      {row[colIndex] ? (
                        renderTable(row[colIndex])
                      ) : (
                        <Box
                          p={3}
                          rounded="lg"
                          width={20}
                          height={20}
                          borderWidth={1}
                          borderStyle="dashed"
                          borderColor="gray.200"
                          opacity={0.5}
                        />
                      )}
                    </Box>
                  ))}
                </HStack>
              ))}
            </VStack>
          </Center>
        </Box>
      </ScrollView>
      {/* Floating Action Button with consistent styling */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        colorScheme="green"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => setShowAddTableModal(true)}
        position="absolute"
        bottom={4}
        right={4}
      />
      {/* Modals */}
      <TableActionModal />
      <AddTableModal />
      <DeleteConfirmationModal />
    </Box>
  );
}
