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
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

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

      console.log("Fetching tables for section:", sectionName);

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

      if (data.st === 1 && data.data && data.data[sectionName]) {
        const sectionTables = data.data[sectionName];
        console.log("Section Tables for", sectionName, ":", sectionTables);

        if (Array.isArray(sectionTables) && sectionTables.length > 0) {
          const formattedTables = sectionTables.map((table, index) => ({
            table_id: table.table_id,
            table_number: table.table_number,
            status: table.is_occupied === 1 ? "ENGAGED" : "AVAILABLE",
            row: Math.floor(index / 3),
            col: index % 3,
            is_occupied: table.is_occupied,
          }));

          console.log("Formatted Tables:", formattedTables);
          setTables(formattedTables);

          // Update section statistics
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
      } else {
        console.log("No data found for section:", sectionName);
        setTables([]);
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
  const handleTablePress = (table) => {
    console.log("Pressed table:", table); // Debug log
    router.push({
      pathname: `/tables/${table.table_id}`, // Change from table.id to table.table_id
      params: {
        sectionId: id,
        tableNumber: table.table_number, // Change from table.number to table.table_number
        status: table.status,
      },
    });
  };

  // Update renderTable function to include the edit icon
  const renderTable = (table) => {
    if (!table) return null;

    return (
      <Pressable
        key={table.table_id} // Change from table.id to table.table_id
        onPress={() => handleTablePress(table)}
        opacity={1}
        _pressed={{
          opacity: 0.7,
        }}
      >
        <Box {...getTableStyle(table.status)} position="relative">
          <VStack alignItems="center" space={0.5}>
            <Text
              color={getTextColor(table.status)}
              fontSize="10px"
              fontWeight="bold"
            >
              {table.table_number}{" "}
              {/* Change from table.number to table.table_number */}
            </Text>

            {table.status === "ENGAGED" && (
              <Text
                fontSize="12px"
                bottom={-4}
                color={getTextColor(table.status)}
                numberOfLines={1}
                style={{ letterSpacing: -0.3 }}
              >
                {new Date(table.engaged_time).toLocaleTimeString("en-US", {
                  // Change from engagedTime to engaged_time
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })}
              </Text>
            )}
          </VStack>
        </Box>
      </Pressable>
    );
  };

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

    const handleDelete = async () => {
      setIsDeleting(true);
      await handleDeleteSection();
      setIsDeleting(false);
    };

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
              {currentSection?.engagedTables > 0 && (
                <Box bg="orange.100" p={3} rounded="md">
                  <Text color="orange.800">
                    Warning: This section has {currentSection.engagedTables}{" "}
                    occupied tables.
                  </Text>
                </Box>
              )}
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
  const getRandomColor = () => {
    const colors = ["#4CAF50", "#2196F3", "#9C27B0", "#FF9800", "#E91E63"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Update the handleAddTable function
  const handleAddTable = async () => {
    if (!newTableNumber.trim()) {
      toast.show({
        description: "Table number is required",
        placement: "top",
        status: "warning",
      });
      return;
    }

    setIsAddingTable(true);
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      // Simplified request body with just the essential fields
      const requestBody = {
        restaurant_id: parseInt(storedRestaurantId),
        section_id: parseInt(id),
        table_number: newTableNumber.trim(), // Send as string as per API requirement
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
          description: `Table ${newTableNumber} added successfully`,
          status: "success",
          placement: "top",
        });
        setShowAddTableModal(false);
        setNewTableNumber("");

        // Refresh tables list
        await fetchTables(currentSection.name);
      } else {
        throw new Error(data.msg || "Failed to add table");
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
      onClose={() => {
        setNewTableNumber("");
        setShowAddTableModal(false);
      }}
    >
      <Modal.Content maxWidth="400px">
        <Modal.CloseButton />
        <Modal.Header>Add Table to {currentSection.name}</Modal.Header>
        <Modal.Body>
          <FormControl isRequired>
            <FormControl.Label>Table Number</FormControl.Label>
            <Input
              value={newTableNumber}
              onChangeText={(value) => {
                // Only allow numbers
                if (/^\d*$/.test(value)) {
                  setNewTableNumber(value);
                }
              }}
              placeholder="Enter table number"
              keyboardType="numeric"
              returnKeyType="done"
            />
            <FormControl.HelperText>
              Enter any table number - duplicate numbers are allowed across
              different sections
            </FormControl.HelperText>
          </FormControl>
        </Modal.Body>
        <Modal.Footer>
          <HStack space={2} width="100%" justifyContent="space-between">
            <Button
              variant="ghost"
              colorScheme="blueGray"
              onPress={() => {
                setNewTableNumber("");
                setShowAddTableModal(false);
              }}
              isDisabled={isAddingTable}
            >
              Cancel
            </Button>
            <Button
              onPress={handleAddTable}
              isLoading={isAddingTable}
              isLoadingText="Adding..."
              isDisabled={!newTableNumber.trim()}
            >
              Add Table
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

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Modified Header */}
      <Box px={4} py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <HStack alignItems="center" justifyContent="center" position="relative">
          <IconButton
            position="absolute"
            left={-9}
            icon={<MaterialIcons name="arrow-back" size={24} color="#64748B" />}
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
            rounded="full"
          />
          <Heading size="md" textAlign="center">
            {currentSection?.name || "Loading..."}
          </Heading>
          <IconButton
            position="absolute"
            right={-9}
            icon={<MaterialIcons name="delete" size={24} color="red.500" />}
            onPress={() => setShowDeleteModal(true)}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
            rounded="full"
          />
        </HStack>
      </Box>

      <Box py={8} borderBottomWidth={1} borderBottomColor="coolGray.200">
        {loading ? (
          <Center>
            <Spinner size="lg" />
          </Center>
        ) : (
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
                  onPress={() => router.push(`/tables/sections/${section.id}`)}
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
        )}
      </Box>

      {/* Filter Buttons */}
      <FilterButtons />

      {/* Main Content */}
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

      <TableActionModal />
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <Modal.Content maxWidth="400px">
          <HStack
            alignItems="center"
            justifyContent="space-between"
            px={1}
            py={2}
          >
            <Modal.Header flex={1} textAlign="center">
              <Text numberOfLines={1} ellipsizeMode="tail">
                Edit {currentSection.name}
              </Text>
            </Modal.Header>
            <Modal.CloseButton position="absolute" right={2} />
          </HStack>
          <Modal.Body>
            <FormControl isRequired>
              <FormControl.Label>
                <HStack space={1} alignItems="center">
                  <Text>Section Name </Text>
                </HStack>
              </FormControl.Label>
              <Input
                value={editSection.name}
                onChangeText={(value) =>
                  setEditSection((prev) => ({ ...prev, name: value }))
                }
                placeholder="Enter section name"
              />
            </FormControl>
          </Modal.Body>
          <Modal.Footer>
            <HStack space={2} width="100%" justifyContent="space-between">
              <Button
                variant="ghost"
                colorScheme="blueGray"
                onPress={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button onPress={handleEditSection}>Save Changes</Button>
            </HStack>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      <AddTableModal />
      <FloatingButtons />
      <DeleteConfirmationModal />
    </Box>
  );
}
