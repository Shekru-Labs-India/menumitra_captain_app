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
  const [outletId, setOutletId] = useState(null);
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
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  const handleSelectChange = (value) => {
    if (value === "availableTables") {
      setActiveFilter("AVAILABLE");
    } else if (value === "occupiedTables") {
      setActiveFilter("ENGAGED");
    } else {
      setActiveFilter(""); // Reset the filter when other options are selected
    }

    setSortBy(value); // Update the sort criteria
  };

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
          const storedOutletId = await AsyncStorage.getItem("outlet_id");
          const response = await fetch(
            `${API_BASE_URL}/captain_manage/table_listview`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                outlet_id: storedOutletId,
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
          const storedOutletId = await AsyncStorage.getItem("outlet_id");
          if (!storedOutletId) {
            toast.show({
              description: "Please login again",
              status: "error",
            });
            router.replace("/login");
            return;
          }

          await fetchSections(storedOutletId);
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
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (storedOutletId) {
        setOutletId(parseInt(storedOutletId));
        await fetchSections(storedOutletId);
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

  const fetchSections = async (outletId) => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://men4u.xyz/captain_api/captain_manage/table_listview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: outletId.toString(),
          }),
        }
      );

      const data = await response.json();
      console.log("API Response:", data);

      if (data.st === 1) {
        // Process sections data while maintaining existing structure
        const processedSections = data.data.map((section) => ({
          id: section.section_id,
          name: section.section_name,
          tables: section.tables.map((table) => ({
            table_id: table.table_id,
            table_number: table.table_number,
            is_occupied: table.is_occupied,
            occupied_time: table.occupied_time,
            grandTotal: table.grand_total,
            order_id: table.order_id,
            order_number: table.order_number,
            menu_items: table.menu_items || [],
          })),
          totalTables: section.tables.length,
          engagedTables: section.tables.filter(
            (table) => table.is_occupied === 1
          ).length,
        }));

        setSections(processedSections);

        // Keep existing functionality for active section
        if (processedSections.length > 0 && !activeSection) {
          setActiveSection(processedSections[0]);
        }
      } else {
        throw new Error(data.msg || "Failed to fetch sections");
      }
    } catch (error) {
      console.error("Fetch Sections Error:", error);
      toast.show({
        description: error.message || "Failed to load sections",
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
            outlet_id: outletId.toString(),
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
        await fetchSections(outletId);
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
    try {
      console.log("Table pressed:", table);
      console.log("Section:", section);

      // Validate table and section data
      if (
        !table?.table_id ||
        !table?.table_number ||
        !section?.id ||
        !section?.name
      ) {
        console.error("Missing table/section data:", { table, section });
        toast.show({
          description: "Invalid table information",
          status: "error",
        });
        return;
      }

      const navigationParams = {
        tableId: table.table_id.toString(),
        tableNumber: table.table_number.toString(),
        sectionId: section.id.toString(),
        sectionName: section.name,
        isOccupied: table.is_occupied === 1 ? "1" : "0",
      };

      // Add order details for occupied tables
      if (table.is_occupied === 1) {
        navigationParams.orderId = table.order_id?.toString();
        navigationParams.orderNumber = table.order_number;
        navigationParams.orderDetails = JSON.stringify({
          order_id: table.order_id,
          menu_items: table.menu_items,
          grand_total: table.grandTotal,
        });
      }

      console.log("Navigation params:", navigationParams);

      router.push({
        pathname: "/(tabs)/orders/create-order",
        params: navigationParams,
      });
    } catch (error) {
      console.error("Navigation error:", error);
      toast.show({
        description: "Failed to open order screen",
        status: "error",
      });
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

  // Update the getTablesByRow function
  const getTablesByRow = (sectionTables) => {
    if (!sectionTables) return { 0: {} }; // For sections with no tables

    const filteredTables = getFilteredTables(sectionTables);
    const grouped = {};

    // Fill in the existing tables
    filteredTables.forEach((table, index) => {
      const row = Math.floor(index / 4);
      if (!grouped[row]) {
        grouped[row] = {};
      }
      grouped[row][index % 4] = table;
    });

    // Add an empty slot for the "Add Table" button
    const lastRow = Math.floor(filteredTables.length / 4);
    const lastCol = filteredTables.length % 4;

    if (!grouped[lastRow]) {
      grouped[lastRow] = {};
    }

    return grouped;
  };

  // Add handleDeleteTable function
  const handleDeleteTable = async (sectionId, tableId) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/table_delete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: outletId?.toString() || "",
            section_id: (sectionId || "").toString(),
            table_id: (tableId || "").toString(),
          }),
        }
      );

      const data = await response.json();
      console.log("Delete Table Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Table deleted successfully",
          status: "success",
        });
        await fetchSections(outletId.toString());
      } else {
        throw new Error(data.msg || "Failed to delete table");
      }
    } catch (error) {
      console.error("Delete Table Error:", error);
      toast.show({
        description: error.message || "Failed to delete table",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get the last table from the section's tables
  const getLastTable = (sectionTables) => {
    if (!sectionTables || sectionTables.length === 0) return null;
    return sectionTables[sectionTables.length - 1];
  };

  // Add this helper function to format time
  const formatTime = (timeString) => {
    if (!timeString) return "";
    // Check if timeString includes AM/PM
    if (timeString.includes("AM") || timeString.includes("PM")) {
      // Split the time string and remove seconds
      const [time, meridiem] = timeString.split(" ");
      const [hours, minutes] = time.split(":");
      return `${hours}:${minutes} ${meridiem}`;
    }
    return timeString;
  };

  // Update the renderGridView function's table rendering logic
  const renderGridView = (sections) => (
    <ScrollView px={2} py={2}>
      {sections.map((section) => {
        const tablesByRow = getTablesByRow(section.tables);
        const hasNoTables = !section.tables || section.tables.length === 0;

        return (
          <Box key={section.id}>
            <Box mb={2}>
              <Box bg="white" p={4} rounded="lg" shadow={1}>
                <VStack space={4}>
                  {/* Section Header */}
                  <VStack space={1}>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Heading size="md" color="black">
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

                  {/* Add this condition for no tables message */}
                  {section.tables.length === 0 && !showEditIcons ? (
                    <Center py={4}>
                      <Text color="coolGray.500" fontSize="sm">
                        No tables available in this section.
                      </Text>
                    </Center>
                  ) : (
                    <VStack space={0}>
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
                            {Array.from({ length: 4 }).map((_, colIndex) => {
                              const isAddTableSlot =
                                showEditIcons &&
                                ((hasNoTables &&
                                  rowIndex === "0" &&
                                  colIndex === 0) ||
                                  (!hasNoTables &&
                                    rowIndex ===
                                      Math.floor(
                                        section.tables.length / 4
                                      ).toString() &&
                                    colIndex === section.tables.length % 4));

                              return (
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
                                        {/* Show delete icon for last table when settings is active */}
                                        {showEditIcons &&
                                          row[colIndex].table_id ===
                                            getLastTable(section.tables)
                                              ?.table_id &&
                                          row[colIndex].is_occupied !== 1 && (
                                            <IconButton
                                              position="absolute"
                                              top={-2}
                                              right={-2}
                                              zIndex={2}
                                              size="sm"
                                              rounded="full"
                                              colorScheme="red"
                                              icon={
                                                <MaterialIcons
                                                  name="delete"
                                                  size={16}
                                                  color="red"
                                                />
                                              }
                                              onPress={() =>
                                                handleDeleteTable(
                                                  section.id,
                                                  row[colIndex].table_id
                                                )
                                              }
                                            />
                                          )}
                                        {row[colIndex].is_occupied === 1 && (
                                          <Box
                                            position="absolute"
                                            top={-2}
                                            left={-2}
                                            right={-2}
                                            setActiveFilter
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
                                        <VStack
                                          space={2}
                                          alignItems="center"
                                          mt={5}
                                        >
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
                                          <Text
                                            fontSize={12}
                                            color="coolGray.600"
                                          >
                                            {row[colIndex].is_occupied === 1 &&
                                              formatTime(
                                                row[colIndex].occupied_time
                                              )}
                                          </Text>
                                        </VStack>
                                      </Box>
                                    </Pressable>
                                  ) : isAddTableSlot ? (
                                    <Pressable
                                      onPress={() => {
                                        setSelectedSection(section.id);
                                        setShowCreateTableModal(true);
                                      }}
                                    >
                                      <Box
                                        p={2}
                                        rounded="lg"
                                        width={20}
                                        height={20}
                                        borderWidth={1}
                                        borderStyle="dashed"
                                        borderColor="green.500"
                                        justifyContent="center"
                                        alignItems="center"
                                        opacity={0.8}
                                      >
                                        <MaterialIcons
                                          name="add-circle-outline"
                                          size={24}
                                          color="green"
                                        />
                                      </Box>
                                    </Pressable>
                                  ) : (
                                    <Box
                                      p={2}
                                      rounded="lg"
                                      width={20}
                                      height={20}
                                      opacity={0}
                                    />
                                  )}
                                </Box>
                              );
                            })}
                          </HStack>
                        ))}
                      </VStack>
                    </VStack>
                  )}
                </VStack>
              </Box>
            </Box>
          </Box>
        );
      })}

      {/* Add the CreateTableModal component */}
      <CreateTableModal />
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
            outlet_id: outletId.toString(),
            section_id: editSection.id.toString(),
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
        await fetchSections(outletId);
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
            outlet_id: outletId.toString(),
            section_id: activeSection.id.toString(),
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
        await fetchSections(outletId.toString());
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

  const handleCreateTable = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/table_create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: outletId.toString(),
            section_id: selectedSection.toString(),
          }),
        }
      );

      const data = await response.json();
      console.log("Create Table Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Table created successfully",
          status: "success",
        });
        await fetchSections(outletId);
        setShowCreateTableModal(false);
      } else {
        throw new Error(data.msg || "Failed to create table");
      }
    } catch (error) {
      console.error("Create Table Error:", error);
      toast.show({
        description: error.message || "Failed to create table",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const CreateTableModal = () => (
    <Modal
      isOpen={showCreateTableModal}
      onClose={() => setShowCreateTableModal(false)}
    >
      <Modal.Content maxWidth="400px">
        <Modal.Header>Create New Table</Modal.Header>
        <Modal.CloseButton />
        <Modal.Body>
          <Text>Are you sure you want to create a new table?</Text>
        </Modal.Body>
        <Modal.Footer>
          <Button.Group space={2}>
            <Button
              variant="ghost"
              onPress={() => setShowCreateTableModal(false)}
            >
              Cancel
            </Button>
            <Button onPress={handleCreateTable} isLoading={loading}>
              Create
            </Button>
          </Button.Group>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );

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

          <Select
            w="110"
            selectedValue={sortBy}
            onValueChange={handleSelectChange}
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
            <Select.Item label="Available Tables" value="availableTables" />
            <Select.Item label="Occupied Tables" value="occupiedTables" />
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
              : renderGridView(sortedSections)}

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

      {/* Create Table Modal */}
      <CreateTableModal />
    </Box>
  );
}
