import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Box,
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
import { Platform, StatusBar, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../../../../app/components/Header";
import { getBaseUrl } from "../../../../config/api.config";
import { fetchWithAuth } from "../../../../utils/apiInterceptor";
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { QR_STYLES } from "../../../../app/styles/qrcode.styles";
import * as MediaLibrary from 'expo-media-library';

// Add this helper function at the top level
const calculateTimeDifference = (occupiedTime) => {
  try {
    if (!occupiedTime) return "";

    // Parse the occupied time string (format: "30 Jan 2025 12:23:55 PM")
    const [day, month, year, time, period] = occupiedTime.split(" ");
    const [hours, minutes, seconds] = time.split(":");

    // Convert month abbreviation to month number (0-11)
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    // Create date object for the occupied time
    const occupiedDate = new Date(
      parseInt(year),
      months[month],
      parseInt(day),
      period === "PM" && hours !== "12"
        ? parseInt(hours) + 12
        : period === "AM" && hours === "12"
        ? 0
        : parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );

    // Get current time
    const now = new Date();

    // Calculate difference in minutes
    const diffInMinutes = Math.floor((now - occupiedDate) / (1000 * 60));

    // Format the relative time
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 180) {
      // Less than 3 hours
      const hours = Math.floor(diffInMinutes / 60);
      const mins = diffInMinutes % 60;
      return `${hours}h ${mins}m ago`;
    } else {
      return "3h+";
    }
  } catch (error) {
    console.error("Time calculation error:", error);
    return ""; // Return empty string if calculation fails
  }
};

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
  const [refreshing, setRefreshing] = useState(false);
  const refreshInterval = useRef(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState(null);
  const qrRef = useRef(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrData, setQrData] = useState(null);

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
          const data = await fetchWithAuth(`${getBaseUrl()}/table_listview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              outlet_id: storedOutletId,
            }),
          });

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

          await fetchSections(parseInt(storedOutletId));
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
        await fetchSections(parseInt(storedOutletId));
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
      
      const data = await fetchWithAuth(`${getBaseUrl()}/table_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
        }),
      });

      console.log("API Response:", data);

      if (data.st === 1) {
        const processedSections = data.data.map((section) => ({
          id: section.section_id,
          name: section.section_name,
          tables: section.tables.map((table) => ({
            ...table,
            timeSinceOccupied: calculateTimeDifference(table.occupied_time),
          })),
          totalTables: section.tables.length,
          engagedTables: section.tables.filter(
            (table) => table.is_occupied === 1
          ).length,
        }));

        setSections(processedSections);
        if (processedSections.length > 0 && !activeSection) {
          setActiveSection(processedSections[0]);
        }
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

      const data = await fetchWithAuth(`${getBaseUrl()}/section_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_name: newSectionName.trim(),
        }),
      });

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
      console.error("Add Section Error:", error);
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

      if (!table || !section) {
        console.error("Missing table or section data");
        return;
      }

      const outlet_id = table.outlet_id;

      if (!outlet_id) {
        throw new Error("Outlet ID not found in table data");
      }

      const baseParams = {
        tableId: table.table_id.toString(),
        tableNumber: table.table_number.toString(),
        sectionId: section.id.toString(),
        sectionName: section.name,
        outletId: outlet_id.toString(),
        isOccupied: table.is_occupied === 1 ? "1" : "0",
      };

      // Handle occupied table with order
      if (table.is_occupied === 1 && table.order_id) {
        try {
          const result = await fetchWithAuth(`${getBaseUrl()}/order_view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_number: table.order_number,
              outlet_id: outlet_id.toString(),
              order_id: table.order_id.toString()
            }),
          });

          console.log("Order view response:", result);

          if (result.st === 1 && result.lists) {
            const orderDetails = result.lists;
            // Transform menu items from order details
            const menuItems = orderDetails.menu_details.map((item) => ({
              menu_id: item.menu_id.toString(),
              menu_name: item.menu_name,
              price: parseFloat(item.price),
              quantity: parseInt(item.quantity),
              total_price: parseFloat(item.menu_sub_total),
              portionSize: item.half_or_full === "half" ? "Half" : "Full",
              offer: parseFloat(item.offer || 0),
              specialInstructions: item.comment || "",
            }));

            router.push({
              pathname: "/screens/orders/create-order",
              params: {
                ...baseParams,
                orderId: table.order_id.toString(),
                orderNumber: table.order_number,
                orderType: "dine-in",
                orderDetails: JSON.stringify({
                  order_id: table.order_id,
                  menu_items: menuItems,
                  grand_total: orderDetails.order_details.grand_total || 0,
                  table_id: table.table_id,
                  table_number: table.table_number,
                  section_id: section.id,
                  section_name: section.name,
                  outlet_id: outlet_id,
                }),
              },
            });
          }
        } catch (error) {
          console.error("Error fetching order details:", error);
          toast.show({
            description: "Error loading order details",
            status: "error",
          });
        }
      } else {
        // For new orders
        router.push({
          pathname: "/screens/orders/create-order",
          params: {
            ...baseParams,
            orderType: "dine-in",
            orderDetails: JSON.stringify({
              menu_items: [],
              grand_total: 0,
              table_id: table.table_id,
              table_number: table.table_number,
              section_id: section.id,
              section_name: section.name,
              outlet_id: outlet_id,
            }),
          },
        });
      }
    } catch (error) {
      console.error("Error in handleTablePress:", error);
      toast.show({
        description: error.message || "Error loading table details",
        status: "error",
      });
    }
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
      const data = await fetchWithAuth(`${getBaseUrl()}/table_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId?.toString() || "",
          section_id: (sectionId || "").toString(),
        }),
      });

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

  // Add this function for pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (storedOutletId) {
        await fetchSections(parseInt(storedOutletId));
      }
    } catch (error) {
      console.error("Refresh Error:", error);
      toast.show({
        description: "Failed to refresh",
        status: "error",
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Add automatic refresh every minute
  useEffect(() => {
    refreshInterval.current = setInterval(async () => {
      try {
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          await fetchSections(parseInt(storedOutletId));
        }
      } catch (error) {
        console.error("Auto Refresh Error:", error);
      }
    }, 60000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  // Update the section name change handler
  const handleEditSectionNameChange = async (text, section) => {
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    
    if (!sanitizedText.trim()) {
      toast.show({
        description: "Section name is required",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await fetchWithAuth(`${getBaseUrl()}/section_update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: section.id.toString(),
          section_name: sanitizedText.trim(),
        }),
      });

      if (data.st === 1) {
        toast.show({
          description: "Section updated successfully",
          status: "success",
        });
        await fetchSections(outletId);
        setEditingSectionId(null);
      } else {
        throw new Error(data.msg || "Failed to update section");
      }
    } catch (error) {
      console.error("Edit Section Error:", error);
      toast.show({
        description: error.message || "Failed to update section",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update the renderGridView function's table rendering logic
  const renderGridView = (sections) => (
    <ScrollView
      contentContainerStyle={{ padding: 8 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#0891b2"]}
          tintColor="#0891b2"
          progressBackgroundColor="#ffffff"
        />
      }
    >
      <VStack space={4}>
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
                      <HStack
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        {editingSectionId === section.id && showEditIcons ? (
                          <Input
                            w="70%"
                            value={section.name}
                            onChangeText={(text) => {
                              const updatedSections = sections.map((s) =>
                                s.id === section.id ? { ...s, name: text } : s
                              );
                              setSections(updatedSections);
                            }}
                            onBlur={() => {
                              handleEditSectionNameChange(section.name, section);
                            }}
                            onSubmitEditing={() => {
                              handleEditSectionNameChange(section.name, section);
                            }}
                            autoFocus
                            blurOnSubmit={false}
                            returnKeyType="done"
                            size="md"
                            borderColor="primary.500"
                            _focus={{
                              borderColor: "primary.600",
                              backgroundColor: "white",
                            }}
                          />
                        ) : (
                          <Text fontSize="lg" fontWeight="bold">
                            {section.name}
                          </Text>
                        )}
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
                              onPress={() => setEditingSectionId(section.id)}
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
                          Available:{" "}
                          {section.totalTables - section.engagedTables}
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
                        <VStack space={0}>
                          {Object.entries(tablesByRow).map(
                            ([rowIndex, row]) => (
                              <HStack
                                key={rowIndex}
                                px={0}
                                py={2}
                                alignItems="center"
                                justifyContent="space-between"
                              >
                                {Array.from({ length: 4 }).map(
                                  (_, colIndex) => {
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
                                          colIndex ===
                                            section.tables.length % 4));

                                    const table = row[colIndex];
                                    const isOccupied = table?.is_occupied === 1;

                                    return (
                                      <Box key={`${rowIndex}-${colIndex}`}>
                                        {table ? (
                                          <Pressable
                                            onPress={() =>
                                              handleTablePress(table, section)
                                            }
                                          >
                                            <Box
                                              p={2}
                                              rounded="lg"
                                              width={20}
                                              height={20}
                                              bg={
                                                isOccupied
                                                  ? "red.100"
                                                  : "green.100"
                                              }
                                              borderWidth={1}
                                              borderStyle="dashed"
                                              borderColor={
                                                isOccupied
                                                  ? "red.600"
                                                  : "green.600"
                                              }
                                              position="relative"
                                            >
                                              {/* Show QR icon when settings is active */}
                                              {showEditIcons && (
                                                <IconButton
                                                  position="absolute"
                                                  top={-2}
                                                  right={-2}
                                                  zIndex={2}
                                                  size="sm"
                                                  rounded="full"
                                                  bg="white"
                                                  shadow={2}
                                                  _pressed={{ bg: "gray.100" }}
                                                  _hover={{ bg: "gray.50" }}
                                                  icon={
                                                    <MaterialIcons
                                                      name="qr-code"
                                                      size={16}
                                                      color="gray"
                                                    />
                                                  }
                                                  onPress={() => handleQRIconPress(table, section)}
                                                />
                                              )}

                                              {/* Show price banner for occupied tables */}
                                              {isOccupied && (
                                                <Box
                                                  position="absolute"
                                                  top={-2}
                                                  left={-2}
                                                  right={-2}
                                                  bg="red.500"
                                                  py={0.5}
                                                  rounded="md"
                                                  shadow={1}
                                                  zIndex={1}
                                                  alignItems="center"
                                                >
                                                  <Text
                                                    color="white"
                                                    fontSize="sm"
                                                    fontWeight="bold"
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                  >
                                                    ₹
                                                    {(
                                                      table.grand_total || 0
                                                    ).toFixed(2)}
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
                                                    isOccupied
                                                      ? "red.500"
                                                      : "green.500"
                                                  }
                                                >
                                                  {table.table_number}
                                                </Text>
                                                {isOccupied && (
                                                  <Text
                                                    fontSize={12}
                                                    mt={-2}
                                                    color="coolGray.600"
                                                  >
                                                    {table.timeSinceOccupied}
                                                  </Text>
                                                )}
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
                                  }
                                )}
                              </HStack>
                            )
                          )}
                        </VStack>
                      </VStack>
                    )}
                  </VStack>
                </Box>
              </Box>
            </Box>
          );
        })}
      </VStack>
    </ScrollView>
  );

  const FilterButtons = () => (
    <Box>
      <Box py={4} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 80,
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

      <Box py={4} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
          }}
        >
          <HStack space={3} alignItems="center">
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: "/screens/orders/create-order",
                  params: {
                    isSpecialOrder: "true",
                    orderType: "parcel",
                    clearPrevious: "true",
                  },
                })
              }
            >
              <Box
                px={4}
                py={1.5}
                bg="orange.500"
                borderWidth={1}
                borderColor="orange.500"
                rounded="md"
                flexDirection="row"
                alignItems="center"
              >
                <MaterialIcons
                  name="local-shipping"
                  size={16}
                  color="white"
                  style={{ marginRight: 4 }}
                />
                <Text color="white" fontSize="sm" fontWeight="medium">
                  Parcel
                </Text>
              </Box>
            </Pressable>

            <Pressable
              onPress={() =>
                router.replace({
                  pathname: "/screens/orders/create-order",
                  params: {
                    isSpecialOrder: "true",
                    orderType: "drive-through",
                    clearPrevious: "true",
                  },
                })
              }
            >
              <Box
                px={4}
                py={1.5}
                bg="blue.500"
                borderWidth={1}
                borderColor="blue.500"
                rounded="md"
                flexDirection="row"
                alignItems="center"
              >
                <MaterialIcons
                  name="drive-eta"
                  size={16}
                  color="white"
                  style={{ marginRight: 4 }}
                />
                <Text color="white" fontSize="sm" fontWeight="medium">
                  Drive Through
                </Text>
              </Box>
            </Pressable>

            <Pressable
              onPress={() =>
                router.replace({
                  pathname: "/screens/orders/create-order",
                  params: {
                    isSpecialOrder: "true",
                    orderType: "counter",
                    clearPrevious: "true",
                  },
                })
              }
            >
              <Box
                px={4}
                py={1.5}
                bg="purple.500"
                borderWidth={1}
                borderColor="purple.500"
                rounded="md"
                flexDirection="row"
                alignItems="center"
              >
                <MaterialIcons
                  name="point-of-sale"
                  size={16}
                  color="white"
                  style={{ marginRight: 4 }}
                />
                <Text color="white" fontSize="sm" fontWeight="medium">
                  Counter
                </Text>
              </Box>
            </Pressable>
          </HStack>
        </ScrollView>
      </Box>
    </Box>
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
      const data = await fetchWithAuth(`${getBaseUrl()}/section_update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: editSection.id.toString(),
          section_name: editSection.name.trim(),
        }),
      });

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
      console.error("Edit Section Error:", error);
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
      const data = await fetchWithAuth(`${getBaseUrl()}/section_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: activeSection.id.toString(),
        }),
      });

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
      const data = await fetchWithAuth(`${getBaseUrl()}/table_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: selectedSection.toString(),
        }),
      });

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

  // Add this handler function at component level
  const handleSectionNameChange = (text) => {
    // Only allow letters and spaces
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setNewSectionName(sanitizedText);
  };

  // Add useEffect to reset editing state when gear icon is disabled
  useEffect(() => {
    if (!showEditIcons) {
      setEditingSectionId(null);
    }
  }, [showEditIcons]);

  // Replace the generateQRCodeURL function
  const generateQRCodeURL = (outletId, sectionId, tableId, tableNumber) => {
    // Use a simple static URL for testing to eliminate any potential issues
    return `https://menumitra.com/order?o=${outletId}&s=${sectionId}&t=${tableId}&n=${tableNumber}`;
  };

  // Replace the handleShareQRCode function
  const handleShareQRCode = async () => {
    if (!qrRef.current) return;

    try {
      // Get the QR code as PNG data URL
      const pngData = await qrRef.current.toDataURL();
      
      // Convert base64 to file
      const filePath = `${FileSystem.cacheDirectory}table-${selectedTableForQR?.table_number}-qr.png`;
      await FileSystem.writeAsStringAsync(filePath, pngData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file
      await Sharing.shareAsync(filePath, {
        mimeType: 'image/png',
        dialogTitle: `Share Table ${selectedTableForQR?.table_number} QR Code`,
      });

    } catch (error) {
      console.error('Error sharing QR code:', error);
      toast.show({
        description: "Failed to share QR code",
        status: "error"
      });
    }
  };

  // Add this function before the QRCodeModal component
  const saveToGallery = async (qrRef) => {
    try {
      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        toast.show({
          description: "Need permission to save QR code",
          status: "error"
        });
        return;
      }

      // Get the QR code as PNG data URL
      const pngData = await qrRef.current.toDataURL();
      
      // Convert base64 to file
      const filePath = `${FileSystem.cacheDirectory}table-qr.png`;
      await FileSystem.writeAsStringAsync(filePath, pngData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Save to gallery
      const asset = await MediaLibrary.createAssetAsync(filePath);
      await MediaLibrary.createAlbumAsync('MenuMitra QR Codes', asset, false);

      toast.show({
        description: "QR code saved to gallery",
        status: "success"
      });
    } catch (error) {
      console.error('Error saving QR code:', error);
      toast.show({
        description: "Failed to save QR code",
        status: "error"
      });
    }
  };

  // Update the QRCodeModal component
  const QRCodeModal = () => {
    if (!selectedTableForQR) return null;

    const qrValue = qrData?.qr_code_url || "";
    console.log("QR Value:", qrValue);

    return (
      <Modal 
        isOpen={showQRModal} 
        onClose={() => {
          setShowQRModal(false);
          setQrData(null);
        }} 
        size="md"
      >
        <Modal.Content 
          borderRadius="xl" 
          p={4}
          width="90%"
          maxWidth="350px"
        >
          <Modal.CloseButton />
          <Modal.Header borderBottomWidth={0} alignItems="center">
            <Text fontSize="lg" fontWeight="bold">
              Table {qrData?.table_number || selectedTableForQR?.table_number} QR Code
            </Text>
          </Modal.Header>
          <Modal.Body alignItems="center">
            {isLoadingQr ? (
              <Center h={280} w={280}>
                <Spinner size="lg" color="primary.500" />
              </Center>
            ) : qrValue ? (
              <Box 
                alignItems="center" 
                bg="white" 
                p={4}
                borderRadius="2xl"
                borderWidth={1}
                borderColor="gray.300"
                shadow={1}
              >
                <QRCode
                  value={qrValue}
                  size={QR_STYLES.DEFAULT.size}
                  logo={require('../../../../assets/images/mm-logo.png')}
                  logoSize={QR_STYLES.DEFAULT.logoSize}
                  logoBackgroundColor="white"
                  logoMargin={QR_STYLES.DEFAULT.logoMargin}
                  logoBorderRadius={QR_STYLES.DEFAULT.logoBorderRadius}
                  backgroundColor={QR_STYLES.DEFAULT.backgroundColor}
                  color={QR_STYLES.DEFAULT.color}
                  enableLinearGradient={false}
                  ecl="H"
                  quietZone={16}
                  dots={{
                    type: QR_STYLES.DEFAULT.dotStyle,
                    color: QR_STYLES.DEFAULT.color,
                  }}
                  cornersDots={{
                    type: QR_STYLES.DEFAULT.cornersDotStyle,
                    color: "#f48347",
                  }}
                  cornersSquareOptions={{
                    type: QR_STYLES.DEFAULT.cornersSquareStyle,
                    color: "#f48347",
                  }}
                  style={{
                    backgroundColor: 'white',
                    padding: 20,
                    borderRadius: 16,
                  }}
                  getRef={(ref) => { qrRef.current = ref; }}
                />
                <VStack space={2} mt={4} w="100%">
                  <Button 
                    leftIcon={<Icon as={MaterialIcons} name="save" size="sm" />}
                    onPress={() => saveToGallery(qrRef)}
                    size="md"
                    borderRadius="full"
                    bg="primary.500"
                    _pressed={{ bg: "primary.600" }}
                    shadow={1}
                  >
                    Save to Gallery
                  </Button>
                  <Button 
                    leftIcon={<Icon as={MaterialIcons} name="share" size="sm" />}
                    onPress={handleShareQRCode}
                    size="md"
                    borderRadius="full"
                    variant="outline"
                    borderColor="primary.500"
                    _text={{ color: "primary.500" }}
                    _pressed={{ bg: "primary.50" }}
                  >
                    Share QR Code
                  </Button>
                </VStack>
              </Box>
            ) : (
              <Text color="red.500">Failed to generate QR code</Text>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
  };

  // Update the table QR icon press handler
  const handleQRIconPress = async (table, section) => {
    setIsLoadingQr(true);
    setShowQRModal(true);
    setSelectedTableForQR({
      ...table,
      section_id: section.id
    });

    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/send_qr_link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          table_id: table.table_id.toString(),
        }),
      });

      console.log("QR Response:", data);

      // Check if we have all required fields instead of checking st
      if (!data.user_app_url || !data.outlet_code || !data.table_number || !data.section_id) {
        throw new Error("Invalid QR code data received");
      }

      // Construct the QR code URL using the exact format from the API response
      const qrUrl = `${data.user_app_url}${data.outlet_code}/${data.table_number}/${data.section_id}`;
      console.log("Generated QR URL:", qrUrl);

      // Update state with QR data
      setQrData({
        ...data,
        qr_code_url: qrUrl,
        table_number: data.table_number,
      });

    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.show({
        description: error.message || "Failed to generate QR code",
        status: "error",
        duration: 3000,
      });
      setShowQRModal(false);
    } finally {
      setIsLoadingQr(false);
    }
  };

  return (
    <Box flex={1} bg="coolGray.100" safeAreaTop>
      {/* Header Component */}
      <Header 
        title="Tables" 
        rightComponent={
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
        }
      />
      {/* Search and Filters */}

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
                onChangeText={handleSectionNameChange}
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal />

      {/* Create Table Modal */}
      <CreateTableModal />

      {/* Add QR Code Modal */}
      <QRCodeModal />
    </Box>
  );
}
