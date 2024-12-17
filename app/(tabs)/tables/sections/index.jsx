import React, { useState, useMemo, useEffect } from "react";
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
  Input,
  Menu,
  Select,
  CheckIcon,
  FormControl,
  Modal,
  Button,
  Spinner,
  Fab,
  Center,
  Icon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import Header from "../../../components/Header";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function TableSectionsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [viewType, setViewType] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [isAscending, setIsAscending] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [showTableActionModal, setShowTableActionModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [tables, setTables] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [showEditIcons, setShowEditIcons] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await getStoredData();
      if (sections.length > 0) {
        setActiveSection(sections[0]);
      }
    };

    initializeData();
  }, [sections.length]);

  useEffect(() => {
    if (activeSection) {
      const fetchTablesForSection = async () => {
        try {
          const storedRestaurantId = await AsyncStorage.getItem(
            "restaurant_id"
          );
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
          if (data.st === 1 && data.data) {
            let sectionTables = [];
            Object.entries(data.data).forEach(([key, tables]) => {
              if (key.toLowerCase() === activeSection.name.toLowerCase()) {
                sectionTables = tables;
              }
            });

            setTables(sectionTables);
          }
        } catch (error) {
          console.error("Fetch Tables Error:", error);
          toast.show({
            description: "Failed to fetch tables",
            status: "error",
          });
        }
      };

      fetchTablesForSection();
    }
  }, [activeSection]);

  // Update the useFocusEffect to use the same fetchSections function
  useFocusEffect(
    useCallback(() => {
      const refreshSections = async () => {
        try {
          const storedRestaurantId = await AsyncStorage.getItem(
            "restaurant_id"
          );
          if (!storedRestaurantId) {
            toast.show({
              description: "Please login again",
              status: "error",
            });
            router.replace("/login");
            return;
          }

          await fetchSections(parseInt(storedRestaurantId));
        } catch (error) {
          console.error("Refresh Sections Error:", error);
          toast.show({
            description: "Failed to refresh sections",
            status: "error",
          });
        }
      };

      refreshSections();
    }, [])
  );

  const getStoredData = async () => {
    try {
      setLoading(true);
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (storedRestaurantId) {
        setRestaurantId(parseInt(storedRestaurantId));
        await fetchSections(parseInt(storedRestaurantId));
      } else {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error getting stored data:", error);
      toast.show({
        description: "Failed to load data",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (restId) => {
    try {
      setLoading(true);

      // Get sections
      const sectionListResponse = await fetch(
        `${API_BASE_URL}/captain_manage/section_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restId,
          }),
        }
      );

      const sectionListData = await sectionListResponse.json();

      // Get tables for each section
      const tablesResponse = await fetch(
        `${API_BASE_URL}/captain_manage/table_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restId,
          }),
        }
      );

      const tablesData = await tablesResponse.json();
      console.log("Tables Data:", tablesData);

      if (sectionListData.st === 1) {
        const formattedSections = await Promise.all(
          sectionListData.data.map(async (section) => {
            // Get tables for this section
            let sectionTables = [];
            if (tablesData.st === 1 && tablesData.data) {
              Object.entries(tablesData.data).forEach(([key, tables]) => {
                if (key.toLowerCase() === section.section_name.toLowerCase()) {
                  sectionTables = tables;
                }
              });
            }

            return {
              id: section.section_id.toString(),
              name: section.section_name,
              totalTables: sectionTables.length,
              engagedTables: sectionTables.filter(
                (table) => table.is_occupied === 1
              ).length,
              color: getRandomColor(),
              tables: sectionTables.map((table) => ({
                table_id: table.table_id,
                table_number: table.table_number,
                is_occupied: table.is_occupied,
                order_number: table.order_number || null,
                grandTotal: table.grand_total || 0,
                occupiedTime: table.occupied_time || "00:00",
              })),
            };
          })
        );

        console.log("Formatted Sections:", formattedSections);
        setSections(formattedSections);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: error.message || "Failed to fetch sections",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate random colors for sections
  const getRandomColor = () => {
    const colors = [
      "#4CAF50",
      "#2196F3",
      "#9C27B0",
      "#FF9800",
      "#F44336",
      "#009688",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Memoized sorting and filtering logic
  const sortedSections = useMemo(() => {
    let filtered = [...sections];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((section) =>
        section.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "totalTables":
          comparison = a.totalTables - b.totalTables;
          break;
        case "engagedTables":
          comparison = a.engagedTables - b.engagedTables;
          break;
      }
      return isAscending ? comparison : -comparison;
    });

    return filtered;
  }, [sections, searchQuery, sortBy, isAscending]);

  const handleSectionPress = (section) => {
    router.push({
      pathname: `/tables/sections/${section.id}`,
      params: { sectionName: section.name },
    });
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      toast.show({
        description: "Section name is required",
        placement: "top",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/section_create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            section_name: newSectionName.trim(),
          }),
        }
      );

      const data = await response.json();
      console.log("Create Section Response:", data);

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Section added successfully",
          placement: "top",
          status: "success",
        });

        // Clear form and close modal
        setNewSectionName("");
        setShowAddModal(false);

        // Refresh sections list
        await fetchSections(restaurantId);
      } else {
        throw new Error(data.msg || "Failed to create section");
      }
    } catch (error) {
      console.error("Create Section Error:", error);
      toast.show({
        description: error.message || "Failed to create section",
        placement: "top",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTablePress = async (table, section) => {
    if (table.is_occupied === 0) {
      router.push({
        pathname: "/(tabs)/orders/create-order",
        params: {
          tableId: table.table_id,
          tableNumber: table.table_number,
          sectionId: section.id,
          sectionName: section.name,
          isOccupied: "0",
        },
      });
    } else {
      try {
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

        // Format date as "DD MMM YYYY"
        const today = new Date();
        const formattedDate = today.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        console.log("Fetching orders for date:", formattedDate);
        console.log("Restaurant ID:", storedRestaurantId);
        console.log("Table Info:", {
          tableNumber: table.table_number,
          sectionId: section.id,
          sectionName: section.name,
        });

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
              date: formattedDate,
            }),
          }
        );

        const listData = await listResponse.json();
        console.log("List Response:", listData);

        if (listData.st === 1 && listData.lists && listData.lists.length > 0) {
          // Format table number to match API response format
          // Check if table.table_number already starts with 'T'
          const formattedTableNumber = table.table_number.startsWith("T")
            ? table.table_number
            : `T${table.table_number}`;

          console.log("Looking for table:", formattedTableNumber);
          console.log(
            "Available tables in response:",
            listData.lists.map((o) => o.table_number)
          );

          // Find the order for this table
          const tableOrder = listData.lists.find(
            (order) =>
              order.table_number.toLowerCase() ===
              formattedTableNumber.toLowerCase()
          );

          console.log("Found Table Order:", tableOrder);

          if (tableOrder) {
            // Get detailed order info
            const response = await fetch(`${API_BASE_URL}/captain_order/view`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                restaurant_id: parseInt(storedRestaurantId),
                order_number: tableOrder.order_number,
              }),
            });

            const data = await response.json();
            console.log("Order Details Response:", data);

            if (data.st === 1 && data.lists) {
              const { order_details, menu_details } = data.lists;

              router.push({
                pathname: "/(tabs)/orders/create-order",
                params: {
                  tableId: table.table_id.toString(),
                  tableNumber: table.table_number.toString(),
                  sectionId: section.id.toString(),
                  sectionName: section.name,
                  orderNumber: order_details.order_number.toString(),
                  orderType: tableOrder.order_type,
                  existingItems: JSON.stringify(menu_details),
                  isOccupied: "1",
                  grandTotal: order_details.total_bill.toString(),
                  serviceCharges:
                    order_details.service_charges_amount.toString(),
                  gstAmount: order_details.gst_amount.toString(),
                  discountAmount: order_details.discount_amount.toString(),
                  discountPercent: order_details.discount_percent.toString(),
                  orderDateTime: order_details.datetime,
                  // Pass both order details
                  orderDetails: JSON.stringify(order_details),
                  listOrderDetails: JSON.stringify(tableOrder),
                },
              });
            }
          } else {
            console.log(
              "Table number comparison failed. Available tables:",
              listData.lists.map((o) => ({
                table: o.table_number,
                matches: o.table_number === formattedTableNumber,
                lowerMatches:
                  o.table_number.toLowerCase() ===
                  formattedTableNumber.toLowerCase(),
              }))
            );
            throw new Error("No active order found for this table");
          }
        } else {
          throw new Error("No ongoing orders found");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.show({
          description: error.message || "Failed to fetch order details",
          status: "error",
        });
      }
    }
  };

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

  const chunk = (array, size) => {
    if (!Array.isArray(array)) return [];
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
      chunked.push(array.slice(i, i + size));
    }
    return chunked;
  };

  const getFilteredTables = (sectionTables) => {
    if (!sectionTables || sectionTables.length === 0) return [];

    switch (activeFilter) {
      case "AVAILABLE":
        return sectionTables.filter((table) => table.is_occupied === 0);
      case "ENGAGED":
        return sectionTables.filter((table) => table.is_occupied === 1);
      default:
        return sectionTables;
    }
  };

  // Add tablesByRow calculation
  const getTablesByRow = (sectionTables) => {
    const filteredTables = getFilteredTables(sectionTables);
    const grouped = {};

    filteredTables.forEach((table, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;

      if (!grouped[row]) {
        grouped[row] = {};
      }
      grouped[row][col] = table;
    });

    return grouped;
  };

  const renderGridView = (sections) => (
    <ScrollView px={2} py={2}>
      {sections.map((section, index) => {
        const tablesByRow = getTablesByRow(section.tables);

        return (
          <Box key={section.id}>
            <Box mb={2}>
              <Box bg="white" p={4} rounded="lg" shadow={1}>
                <VStack space={4}>
                  {/* Section Header */}
                  <VStack space={1}>
                    {/* Section Name and Actions */}
                    <HStack justifyContent="space-between" alignItems="center">
                      <Heading size="md" color={section.color}>
                        {section.name}
                      </Heading>
                      {showEditIcons && (
                        <HStack space={2}>
                          <IconButton
                            icon={
                              <MaterialIcons
                                name="edit"
                                size={18}
                                color="gray"
                              />
                            }
                            bg="coolGray.100"
                            rounded="full"
                            _pressed={{ bg: "coolGray.200" }}
                            onPress={() => {
                              setEditSection({
                                id: section.id,
                                name: section.name,
                              });
                              setShowEditModal(true);
                            }}
                          />
                          <IconButton
                            icon={
                              <MaterialIcons
                                name="delete"
                                size={18}
                                color="gray"
                              />
                            }
                            bg="coolGray.100"
                            rounded="full"
                            _pressed={{ bg: "coolGray.200" }}
                            onPress={() => {
                              setActiveSection(section);
                              setShowDeleteModal(true);
                            }}
                          />
                        </HStack>
                      )}
                    </HStack>

                    {/* Stats Row */}
                    <HStack space={20} mt={1}>
                      <Text fontSize="sm" color="coolGray.500">
                        Total: {section.totalTables}
                      </Text>
                      <Text fontSize="sm" color="red.500">
                        Occupied: {section.engagedTables}
                      </Text>
                      <Text fontSize="sm" color="green.500">
                        Available: {section.totalTables - section.engagedTables}
                      </Text>
                    </HStack>
                  </VStack>

                  {/* Divider */}
                  <Box height={0.5} bg="coolGray.200" />

                  {/* Tables Grid */}
                  <VStack space={0}>
                    {Object.entries(tablesByRow).map(([rowIndex, row]) => (
                      <HStack
                        key={rowIndex}
                        px={0}
                        py={2}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        {Array.from({ length: 4 }).map((_, colIndex) => (
                          <Box key={`${rowIndex}-${colIndex}`}>
                            {row[colIndex] ? (
                              <Pressable
                                onPress={() =>
                                  handleTablePress(row[colIndex], section)
                                }
                              >
                                <Box
                                  p={2}
                                  rounded="lg"
                                  width={20}
                                  height={20}
                                  bg={
                                    row[colIndex].is_occupied === 1
                                      ? "red.100"
                                      : "green.100"
                                  }
                                  borderWidth={1}
                                  borderStyle="dashed"
                                  borderColor={
                                    row[colIndex].is_occupied === 1
                                      ? "red.600"
                                      : "green.600"
                                  }
                                  position="relative"
                                >
                                  {row[colIndex].is_occupied === 1 && (
                                    <Box
                                      position="absolute"
                                      top={-2}
                                      left={-2}
                                      right={-2}
                                      bg="red.500"
                                      py={1}
                                      rounded="md"
                                      shadow={1}
                                      zIndex={1}
                                      alignItems="center"
                                    >
                                      <Text
                                        color="white"
                                        fontSize="2xs"
                                        fontWeight="bold"
                                      >
                                        ₹{row[colIndex].grandTotal || 0}
                                      </Text>
                                    </Box>
                                  )}
                                  <VStack space={2} alignItems="center" mt={5}>
                                    <Text
                                      fontSize={18}
                                      fontWeight="bold"
                                      color={
                                        row[colIndex].is_occupied === 1
                                          ? "red.500"
                                          : "green.500"
                                      }
                                    >
                                      {row[colIndex].table_number}
                                    </Text>
                                    <Text fontSize={12} color="coolGray.600">
                                      <Text fontSize={12} color="coolGray.600">
                                        {row[colIndex].is_occupied === 1 &&
                                          (row[colIndex].occupiedTime ||
                                            "00:00")}
                                      </Text>
                                    </Text>
                                  </VStack>
                                </Box>
                              </Pressable>
                            ) : (
                              <Box
                                p={2}
                                rounded="lg"
                                width={16}
                                height={16}
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
                </VStack>
              </Box>
            </Box>

            {/* Horizontal Line after each section except the last one */}
            {index < sections.length - 1 && (
              <Box height={0.5} bg="coolGray.200" mx={-2} mb={2} />
            )}
          </Box>
        );
      })}
    </ScrollView>
  );

  const renderListView = (sections) => (
    <ScrollView>
      {sections.map((section) => (
        <Pressable
          key={section.id}
          onPress={() => handleSectionPress(section)}
          p={4}
          borderBottomWidth={1}
          borderBottomColor="coolGray.200"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <VStack>
              <Text fontSize="sm" fontWeight="bold">
                {section.name}
              </Text>
              <HStack space={4} mt={1}>
                <Text fontSize="sm" color="coolGray.500">
                  Total: {section.totalTables}
                </Text>
                <Text fontSize="sm" color="red.500">
                  Occupied: {section.engagedTables}
                </Text>
                <Text fontSize="sm" color="green.500">
                  Available: {section.totalTables - section.engagedTables}
                </Text>
              </HStack>
            </VStack>
            <IconButton
              icon={
                <MaterialIcons name="chevron-right" size={24} color="gray" />
              }
            />
          </HStack>
        </Pressable>
      ))}
    </ScrollView>
  );

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

  // Add EditModal component
  const EditModal = () => (
    <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
      <Modal.Content maxWidth="400px">
        <Modal.Header>Edit Section</Modal.Header>
        <Modal.CloseButton />
        <Modal.Body>
          <FormControl isRequired>
            <FormControl.Label>Section Name</FormControl.Label>
            <Input
              value={editSection?.name || ""}
              onChangeText={(text) =>
                setEditSection((prev) => ({ ...prev, name: text }))
              }
              placeholder="Enter section name"
            />
          </FormControl>
        </Modal.Body>
        <Modal.Footer>
          <HStack space={2} width="100%" justifyContent="space-between">
            <Button
              variant="ghost"
              onPress={() => {
                setEditSection(null);
                setShowEditModal(false);
              }}
            >
              Cancel
            </Button>
            <Button onPress={handleEditSection} isLoading={loading}>
              Save Changes
            </Button>
          </HStack>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );

  // Add DeleteConfirmationModal component
  const DeleteConfirmationModal = () => {
    const hasOccupiedTables =
      activeSection?.tables?.some((table) => table.is_occupied === 1) || false;

    return (
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <Modal.Content maxWidth="400px">
          <Modal.CloseButton />
          <Modal.Header>
            {hasOccupiedTables ? "Cannot Delete Section" : "Delete Section"}
          </Modal.Header>
          <Modal.Body>
            {hasOccupiedTables ? (
              <VStack space={3}>
                <Box bg="orange.100" p={3} rounded="md">
                  <Text color="orange.800">
                    This section has occupied tables and cannot be deleted.
                    Please ensure all tables are available before deleting the
                    section.
                  </Text>
                </Box>
              </VStack>
            ) : (
              <Text>
                Are you sure you want to delete "{activeSection?.name}"? This
                action cannot be undone.
              </Text>
            )}
          </Modal.Body>
          <Modal.Footer>
            {hasOccupiedTables ? (
              <Button
                variant="outline"
                onPress={() => setShowDeleteModal(false)}
                width="100%"
              >
                Close
              </Button>
            ) : (
              <HStack space={2} width="100%" justifyContent="space-between">
                <Button
                  variant="outline"
                  colorScheme="coolGray"
                  onPress={() => setShowDeleteModal(false)}
                >
                  Cancel
                </Button>
                <Button colorScheme="red" onPress={handleDeleteSection}>
                  Delete
                </Button>
              </HStack>
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    );
  };

  const handleEditSection = async () => {
    if (!editSection?.name?.trim()) {
      toast.show({
        description: "Section name is required",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/section_update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            section_id: parseInt(editSection.id),
            section_name: editSection.name.trim(),
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        toast.show({
          description: "Section updated successfully",
          status: "success",
        });
        setShowEditModal(false);
        setEditSection(null);
        await fetchSections(restaurantId);
      } else {
        throw new Error(data.msg || "Failed to update section");
      }
    } catch (error) {
      console.error("Update Section Error:", error);
      toast.show({
        description: error.message || "Failed to update section",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSection = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/section_delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            section_id: parseInt(activeSection.id),
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        toast.show({
          description: "Section deleted successfully",
          status: "success",
        });
        setShowDeleteModal(false);
        setActiveSection(null);
        await fetchSections(restaurantId);
      } else {
        throw new Error(data.msg || "Failed to delete section");
      }
    } catch (error) {
      console.error("Delete Section Error:", error);
      toast.show({
        description: error.message || "Failed to delete section",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flex={1} bg="coolGray.100" safeAreaTop>
      {/* Header Component */}
      {/* Custom Header */}
      <Box
        bg="white"
        px={4}
        py={3}
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        safeAreaTop
        shadow={1}
      >
        <IconButton
          icon={
            <MaterialIcons name="arrow-back" size={24} color="coolGray.500" />
          }
          onPress={() => router.back()}
        />

        <Heading
          size="lg"
          position="absolute"
          left={0}
          right={0}
          textAlign="center"
        >
          Sections
        </Heading>

        <IconButton
          icon={
            <MaterialIcons
              name="settings"
              size={24}
              color={showEditIcons ? "white" : "coolGray.600"}
            />
          }
          onPress={() => setShowEditIcons(!showEditIcons)}
          bg={showEditIcons ? "primary.500" : "transparent"}
          _pressed={{
            bg: showEditIcons ? "primary.600" : "coolGray.100",
          }}
          rounded="full"
        />
      </Box>
      {/* Search and Filters */}
      <Box bg="white" px={4} py={2} shadow={1}>
        <HStack space={2} alignItems="center">
          <Input
            flex={1}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            bg="coolGray.50"
            borderRadius="lg"
            py={2}
            InputLeftElement={
              <Box pl={2}>
                <MaterialIcons name="search" size={20} color="coolGray.400" />
              </Box>
            }
          />
          <IconButton
            icon={
              <MaterialIcons
                name={viewType === "grid" ? "view-list" : "grid-view"}
                size={24}
                color="coolGray.600"
              />
            }
            onPress={() => setViewType(viewType === "grid" ? "list" : "grid")}
            variant="ghost"
          />
          <Select
            w="110"
            selectedValue={sortBy}
            onValueChange={setSortBy}
            bg="coolGray.50"
            borderRadius="lg"
            _selectedItem={{
              bg: "coolGray.100",
              endIcon: (
                <MaterialIcons name="check" size={16} color="coolGray.600" />
              ),
            }}
          >
            <Select.Item label="Name" value="name" />
            <Select.Item label="Total Tables" value="totalTables" />
            <Select.Item label="Engaged Tables" value="engagedTables" />
          </Select>
          <IconButton
            icon={
              <MaterialIcons
                name={isAscending ? "arrow-upward" : "arrow-downward"}
                size={24}
                color="coolGray.600"
              />
            }
            onPress={() => setIsAscending(!isAscending)}
            variant="ghost"
          />
        </HStack>
      </Box>

      {/* Filter Buttons */}
      <FilterButtons />

      {/* Content */}
      <Box flex={1} bg="coolGray.100">
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Spinner size="lg" />
          </Box>
        ) : (
          <>
            {viewType === "grid"
              ? renderGridView(sortedSections)
              : renderListView(sortedSections)}

            {/* FAB */}
            <Fab
              renderInPortal={false}
              shadow={2}
              size="sm"
              colorScheme="green"
              icon={<MaterialIcons name="add" size={24} color="white" />}
              onPress={() => setShowAddModal(true)}
              position="absolute"
              bottom={4}
              right={4}
            />
          </>
        )}
      </Box>

      {/* Add Section Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <Modal.Content maxWidth="400px">
          <HStack
            alignItems="center"
            justifyContent="space-between"
            px={1}
            py={2}
          >
            <Modal.Header flex={1} textAlign="center">
              Add New Section
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
                value={newSectionName}
                onChangeText={setNewSectionName}
                placeholder="Enter section name"
                autoFocus
              />
            </FormControl>
          </Modal.Body>
          <Modal.Footer>
            <HStack space={2} width="100%" justifyContent="space-between">
              <Button
                variant="ghost"
                colorScheme="blueGray"
                onPress={() => {
                  setNewSectionName("");
                  setShowAddModal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onPress={handleAddSection}
                isLoading={loading}
                isLoadingText="Adding..."
              >
                Add Section
              </Button>
            </HStack>
          </Modal.Footer>
        </Modal.Content>
      </Modal>

      {/* Edit Section Modal */}
      <EditModal />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal />
    </Box>
  );
}
