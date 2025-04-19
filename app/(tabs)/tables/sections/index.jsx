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
import { Platform, StatusBar, ScrollView, RefreshControl, AppState, Animated } from "react-native";
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
import * as Print from 'expo-print';
import ViewShot from "react-native-view-shot";
import { Alert } from "react-native";
import Image from "react-native/Libraries/Image/Image";
import { TouchableOpacity, TouchableWithoutFeedback } from "react-native";
import { useIsFocused } from "@react-navigation/native";

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [tables, setTables] = useState([]);
  
  // Replace activeFilter with filterStatus for consistency with owner app
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [showEditIcons, setShowEditIcons] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const refreshInterval = useRef(null);
  const qrStableTimeout = useRef(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState(null);
  const qrRef = useRef(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  // Add missing state variables
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isPaid, setIsPaid] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Keep other existing states
  const appState = useRef(AppState.currentState);
  const [restaurantName, setRestaurantName] = useState("");
  const [editedSectionName, setEditedSectionName] = useState("");
  const [blinkAnimation] = useState(new Animated.Value(1));
  const [qrReady, setQrReady] = useState(false);
  const [qrRenderAttempt, setQrRenderAttempt] = useState(0);
  const qrContainerRef = useRef(null);
  const [printerDevice, setPrinterDevice] = useState(null);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [creatingTableSectionId, setCreatingTableSectionId] = useState(null);
  
  const handleSelectChange = (value) => {
    if (value === "availableTables") {
      setFilterStatus("available");
    } else if (value === "occupiedTables") {
      setFilterStatus("occupied");
    } else {
      setFilterStatus("all"); // Reset the filter when other options are selected
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
        // Skip refresh if QR modal is open
        if (isQRModalOpen || showQRModal) {
          console.log("Skipping refresh because QR modal is open");
          return;
        }

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
    }, [isQRModalOpen, showQRModal])
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
      filtered = filtered.filter((section) => {
        // Check if section name matches
        const sectionNameMatch = section.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Check if any table number matches
        const tableNumberMatch = section.tables.some(table => 
          table.table_number.toString().includes(searchQuery)
        );
        
        return sectionNameMatch || tableNumberMatch;
      });
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
      
      // Get the user_id from AsyncStorage
      const storedUserId = await AsyncStorage.getItem("user_id");
      
      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/section_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_name: newSectionName.trim(),
          user_id: storedUserId.toString()
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

            // Navigate to the new menu-selection screen instead
            router.push({
              pathname: "/screens/orders/menu-selection",
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
        // For new orders, also navigate to menu-selection
        router.push({
          pathname: "/screens/orders/menu-selection",
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

    // Filter by search query first
    let filteredBySearch = sectionTables;
    if (searchQuery.trim()) {
      filteredBySearch = sectionTables.filter(
        table => table.table_number.toString().includes(searchQuery)
      );
    }

    // Then filter by status
    switch (filterStatus) {
      case "occupied":
        return filteredBySearch.filter(table => table.is_occupied === 1);
      case "available":
        return filteredBySearch.filter(table => table.is_occupied === 0 && !table.is_reserved);
      case "reserved":
        return filteredBySearch.filter(table => table.is_reserved === true);
      default:
        return filteredBySearch;
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
      const storedUserId = await AsyncStorage.getItem("user_id");
      
      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/table_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId?.toString() || "",
          section_id: (sectionId || "").toString(),
          user_id: storedUserId.toString(),
          table_id: (tableId || "").toString()
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
  const handleEditSectionNameChange = async (section) => {
    const sanitizedText = editedSectionName.replace(/[^a-zA-Z\s]/g, "");
    
    if (!sanitizedText.trim()) {
      toast.show({
        description: "Section name is required",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem("user_id");
      
      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/section_update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: section.id.toString(),
          section_name: sanitizedText.trim(),
          user_id: storedUserId.toString()
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
    <VStack space={4} p={2} pb={24}>
      {sections.map((section) => {
        // Filter tables based on current criteria (search and status filter)
        const filteredTables = getFilteredTables(section.tables);
        
        // Skip this section entirely if no tables match the filter criteria
        if (filteredTables.length === 0 && filterStatus !== "all") {
          return null;
        }
        
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
                      <HStack space={2} alignItems="center" flex={1}>
                        {editingSectionId === section.id ? (
                          <Input
                            defaultValue={section.name}
                            onChangeText={(text) => setEditedSectionName(text)}
                            autoFocus
                            size="lg"
                            variant="unstyled"
                            px={2}
                            py={1}
                            bg="coolGray.100"
                            rounded="md"
                            onBlur={() => {
                              if (editedSectionName) {
                                handleEditSectionNameChange(section);
                              } else {
                                setEditingSectionId(null);
                              }
                            }}
                            onSubmitEditing={() => {
                              if (editedSectionName) {
                                handleEditSectionNameChange(section);
                              } else {
                                setEditingSectionId(null);
                              }
                            }}
                          />
                        ) : (
                          <Text fontSize="lg" fontWeight="bold">
                            {section.name}
                          </Text>
                        )}
                      </HStack>
                      
                      {showEditIcons && (
                        <HStack space={2} alignItems="center">
                          <IconButton
                            size="sm"
                            variant="ghost"
                            colorScheme="blue"
                            icon={<MaterialIcons name="edit" size={20} color="blue.500" />}
                            onPress={() => {
                              setEditingSectionId(section.id);
                              setEditedSectionName(section.name);
                            }}
                          />
                          <IconButton
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            icon={<MaterialIcons name="delete" size={20} color="red.500" />}
                            onPress={() => {
                              setActiveSection(section);
                              setShowDeleteModal(true);
                            }}
                          />
                        </HStack>
                      )}
                    </HStack>
                    
                    {/* Section Stats */}
                    <HStack space={3} alignItems="center">
                      <HStack space={1} alignItems="center">
                        <Box w={3} h={3} bg="gray.400" rounded="full" />
                        <Text fontSize="xs" color="coolGray.600">
                          Total: {section.totalTables}
                        </Text>
                      </HStack>
                      <HStack space={1} alignItems="center">
                        <Box w={3} h={3} bg="red.400" rounded="full" />
                        <Text fontSize="xs" color="coolGray.600">
                          Occupied: {section.engagedTables}
                        </Text>
                      </HStack>
                      <HStack space={1} alignItems="center">
                        <Box w={3} h={3} bg="green.400" rounded="full" />
                        <Text fontSize="xs" color="coolGray.600">
                          Available: {section.totalTables - section.engagedTables}
                        </Text>
                      </HStack>
                    </HStack>
                  </VStack>

                  {/* Divider */}
                  <Box height={0.5} bg="coolGray.200" />

                  {/* Show tables or no tables message */}
                  {filteredTables.length === 0 ? (
                    <Center py={4}>
                      <Text color="coolGray.500" fontSize="sm">
                        No tables match the current filter.
                      </Text>
                    </Center>
                  ) : (
                    <VStack space={0}>
                      <VStack space={4}>
                        {Object.entries(tablesByRow).map(
                          ([rowIndex, row]) => (
                            <HStack
                              key={rowIndex}
                              px={0}
                              py={4}
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
                                                ? table.order_id ? "orange.100" : "red.100"
                                                : table.is_reserved ? "gray.100" : "green.100"
                                            }
                                            borderWidth={1}
                                            borderStyle="dashed"
                                            borderColor={
                                              isOccupied
                                                ? table.order_id ? "orange.600" : "red.600"
                                                : table.is_reserved ? "gray.600" : "green.600"
                                            }
                                            position="relative"
                                          >
                                            {/* Price banner for occupied tables */}
                                            {isOccupied && (
                                              <Box
                                                position="absolute"
                                                top={-10}
                                                left={-2}
                                                right={-2}
                                                bg={table.order_id ? "orange.500" : "red.500"}
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
                                                  ₹{(table.grand_total || 0).toFixed(2)}
                                                </Text>
                                              </Box>
                                            )}

                                            {/* Reserved label */}
                                            {table.is_reserved && (
                                              <Box
                                                position="absolute"
                                                top={-10}
                                                left="95%"
                                                style={{ transform: [{ translateX: -50 }] }}
                                                bg="gray.500"
                                                px={0.5}
                                                py={1}
                                                rounded="10px"
                                                zIndex={1}
                                              >
                                                <Text
                                                  fontSize={12}
                                                  color="white"
                                                  fontWeight="medium"
                                                >
                                                  Reserved
                                                </Text>
                                              </Box>
                                            )}

                                            {/* QR icon when settings is active */}
                                            {showEditIcons && (
                                              <IconButton
                                                position="absolute"
                                                bottom={-2}
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

                                            {/* Payment icon for occupied tables with orders */}
                                            {isOccupied && table.order_id && (
                                              <Box
                                                position="absolute"
                                                bottom={-13}
                                                left="50%"
                                                style={{ transform: [{ translateX: -16 }] }}
                                                zIndex={2}
                                              >
                                                <Pressable
                                                  onPress={() => handlePaymentIconPress(table, section)}
                                                  bg="white"
                                                  rounded="full"
                                                  size={8}
                                                  shadow={3}
                                                  alignItems="center"
                                                  justifyContent="center"
                                                >
                                                  <MaterialIcons
                                                    name="print"
                                                    size={20}
                                                    color="#f97316"
                                                  />
                                                </Pressable>
                                              </Box>
                                            )}

                                            {/* Delete icon for last table */}
                                            {showEditIcons && 
                                              table.table_id === getLastTable(section.tables)?.table_id && 
                                              table.is_occupied === 0 && (
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
                                                    name="delete"
                                                    size={16}
                                                    color="red"
                                                  />
                                                }
                                                onPress={() => handleDeleteTable(section.id, table.table_id)}
                                              />
                                            )}

                                            <VStack
                                              space={2}
                                              alignItems="center"
                                              justifyContent="center"
                                              height="100%"
                                            >
                                              <Text
                                                fontSize={24}
                                                fontWeight="bold"
                                                textAlign="center"
                                                color={
                                                  isOccupied
                                                    ? table.order_id ? "orange.500" : "red.500"
                                                    : table.is_reserved ? "gray.500" : "green.500"
                                                }
                                              >
                                                {table.table_number}
                                              </Text>
                                              {isOccupied && (
                                                <Text
                                                  fontSize={12}
                                                  mt={-2}
                                                  color="coolGray.600"
                                                  textAlign="center"
                                                >
                                                  {table.timeSinceOccupied || "3h+"}
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
  );

  const FilterButtons = () => (
    <Box bg="white" py={2} borderBottomWidth={1} borderBottomColor="coolGray.200">
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
                pathname: "/screens/orders/menu-selection",
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
              py={2}
              bg="white"
              borderWidth={1}
              borderColor="#0891b2"
              rounded="lg"
              flexDirection="row"
              alignItems="center"
            >
              <MaterialIcons
                name="point-of-sale"
                size={20}
                color="#0891b2"
                style={{ marginRight: 8 }}
              />
              <Text color="#0891b2" fontSize="sm" fontWeight="medium">
                Counter
              </Text>
            </Box>
          </Pressable>

          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/screens/orders/menu-selection",
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
              py={2}
              bg="white"
              borderWidth={1}
              borderColor="#0891b2"
              rounded="lg"
              flexDirection="row"
              alignItems="center"
            >
              <MaterialIcons
                name="local-shipping"
                size={20}
                color="#0891b2"
                style={{ marginRight: 8 }}
              />
              <Text color="#0891b2" fontSize="sm" fontWeight="medium">
                Parcel
              </Text>
            </Box>
          </Pressable>

          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/screens/orders/menu-selection",
                params: {
                  isSpecialOrder: "true",
                  orderType: "delivery",
                  clearPrevious: "true",
                },
              })
            }
          >
            <Box
              px={4}
              py={2}
              bg="white"
              borderWidth={1}
              borderColor="#0891b2"
              rounded="lg"
              flexDirection="row"
              alignItems="center"
            >
              <MaterialIcons
                name="delivery-dining"
                size={20}
                color="#0891b2"
                style={{ marginRight: 8 }}
              />
              <Text color="#0891b2" fontSize="sm" fontWeight="medium">
                Delivery
              </Text>
            </Box>
          </Pressable>

          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/screens/orders/menu-selection",
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
              py={2}
              bg="white"
              borderWidth={1}
              borderColor="#0891b2"
              rounded="lg"
              flexDirection="row"
              alignItems="center"
            >
              <MaterialIcons
                name="drive-eta"
                size={20}
                color="#0891b2"
                style={{ marginRight: 8 }}
              />
              <Text color="#0891b2" fontSize="sm" fontWeight="medium">
                Drive
              </Text>
            </Box>
          </Pressable>
        </HStack>
      </ScrollView>
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

  

  const handleDeleteSection = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem("user_id");
      
      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/section_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: activeSection.id.toString(),
          user_id: storedUserId.toString()
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
      const storedUserId = await AsyncStorage.getItem("user_id");
      
      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/table_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: selectedSection.toString(),
          user_id: storedUserId.toString()
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
    // Update to the correct URL format
    return `https://menumitra-testing.netlify.app/user_app/o${outletId}/s${sectionId}/t${tableNumber}`;
  };

  // Update the QRCodeModal component to match RestaurantTables.js
  const QRCodeModal = () => {
    if (!selectedTableForQR) return null;

    const qrValue = qrData?.qr_code_url || "";
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    
    // Close modal function
    const closeModal = () => {
      if (qrStableTimeout.current) {
        clearTimeout(qrStableTimeout.current);
      }
      setShowQRModal(false);
      setQrData(null);
      setIsQRModalOpen(false);
    };

    // Show download options
    const showDownloadOptions = () => {
      if (isDownloading || isSharing) return;
      
      Alert.alert(
        "Download QR Code",
        "Choose format to download",
        [
          {
            text: "PNG",
            onPress: downloadAsPNG
          },
          {
            text: "PDF",
            onPress: handlePDFDownload
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    };

    // Download as PNG
    const downloadAsPNG = async () => {
      try {
        setIsDownloading(true);
        
        // Show loading toast
        toast.show({
          description: "Saving QR code...",
          status: "info",
          duration: 2000
        });
        
        // Request permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          toast.show({
            description: "Permission denied to save to gallery",
            status: "error"
          });
          return;
        }
        
        let uri = null;
        
        // Get QR code as data URL
        if (global.nativeQRRef) {
          try {
            uri = await new Promise((resolve, reject) => {
              const options = {
                width: 400,
                height: 400,
                quality: 0.9,
                includeECLevel: true,
                includeLogo: true,
                color: true
              };
              
              global.nativeQRRef.toDataURL((data) => {
                if (data) {
                  console.log("QR data URL generated successfully");
                  resolve(data);
                } else {
                  reject(new Error("Failed to generate QR code data URL"));
                }
              }, options);
            });
          } catch (error) {
            console.error("QR ref method failed:", error);
          }
        }
        
        // Fallback to API method
        if (!uri) {
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          const fileUri = `${FileSystem.cacheDirectory}${filename}`;
          
          await FileSystem.downloadAsync(qrApiUrl, fileUri);
          uri = fileUri;
        }
        
        // Save to gallery
        if (uri) {
          // Create a unique filename
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          let fileUri = uri;
          
          // Only process data URLs, file URLs are already handled
          if (uri.startsWith('data:')) {
            fileUri = `${FileSystem.cacheDirectory}${filename}`;
            const base64Data = uri.split(',')[1];
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64
            });
          }
          
          // Save to media library
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          
          // Create album if it doesn't exist
          try {
            await MediaLibrary.createAlbumAsync("MenuMitra QR Codes", asset, false);
          } catch (error) {
            console.log("Album already exists or error creating album:", error);
          }
          
          toast.show({
            description: "QR code saved to gallery",
            status: "success",
            duration: 2000
          });
        } else {
          throw new Error("Failed to generate QR code");
        }
      } catch (error) {
        console.error("Download Error:", error);
        toast.show({
          description: "Failed to save QR code: " + error.message,
          status: "error",
        });
      } finally {
        setIsDownloading(false);
      }
    };

    // Add handlePDFDownload function
    const handlePDFDownload = async () => {
      try {
        setIsDownloading(true);
        toast.show({
          description: "Generating PDF...",
          status: "info",
          duration: 2000
        });
        
        // Get QR code as data URL
        let qrDataUrl = null;
        
        if (global.nativeQRRef) {
          try {
            qrDataUrl = await new Promise((resolve, reject) => {
              const options = {
                width: 400,
                height: 400,
                quality: 0.9,
                includeECLevel: true,
                includeLogo: true,
                color: true
              };
              
              global.nativeQRRef.toDataURL((data) => {
                if (data) {
                  console.log("QR data URL generated for PDF");
                  resolve(data);
                } else {
                  reject(new Error("Failed to generate QR code data for PDF"));
                }
              }, options);
            });
          } catch (error) {
            console.error("Failed to generate QR code image:", error);
            qrDataUrl = null;
          }
        }
        
        if (!qrDataUrl) {
          // Fallback to API method
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          const fileUri = `${FileSystem.cacheDirectory}${filename}`;
          
          await FileSystem.downloadAsync(qrApiUrl, fileUri);
          
          // Convert to base64
          const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          qrDataUrl = `data:image/png;base64,${base64}`;
        }
        
        // Get restaurant name for the PDF
        const outlet = await AsyncStorage.getItem("outlet_name") || "MenuMitra";
        
        // Create HTML content with embedded QR code
        const tableInfo = `Table ${selectedTableForQR?.table_number || "Unknown"}`;
        const htmlContent = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; }
                h1 { color: #333; }
                .outlet-name { font-weight: bold; color: #0891b2; font-size: 22px; margin-bottom: 10px; }
                .table-info { margin: 20px 0; font-size: 24px; font-weight: bold; color: #333; }
                .qr-container { margin: 30px 0; position: relative; }
                .qr-container img { max-width: 100%; height: auto; }
                .corner { position: absolute; width: 20px; height: 20px; }
                .top-left { top: 2px; left: 2px; border-top: 5px solid #FF7043; border-left: 5px solid #FF7043; border-top-left-radius: 6px; }
                .top-right { top: 2px; right: 2px; border-top: 5px solid #FF7043; border-right: 5px solid #FF7043; border-top-right-radius: 6px; }
                .bottom-left { bottom: 2px; left: 2px; border-bottom: 5px solid #FF7043; border-left: 5px solid #FF7043; border-bottom-left-radius: 6px; }
                .bottom-right { bottom: 2px; right: 2px; border-bottom: 5px solid #FF7043; border-right: 5px solid #FF7043; border-bottom-right-radius: 6px; }
                .instructions { margin: 20px 0; font-size: 16px; color: #555; }
                .footer { margin-top: 40px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="outlet-name">${outlet}</div>
                <h1>Menu QR Code</h1>
                <div class="table-info">${tableInfo}</div>
                <div class="qr-container">
                  <img src="${qrDataUrl}" width="350" height="350" />
                  <div class="corner top-left"></div>
                  <div class="corner top-right"></div>
                  <div class="corner bottom-left"></div>
                  <div class="corner bottom-right"></div>
                </div>
                <div class="instructions">
                  Scan this QR code with your smartphone camera to access the digital menu
                </div>
                <div class="footer">
                  &copy; MenuMitra - Digital Menu Solutions
                </div>
              </div>
            </body>
          </html>
        `;
        
        // Create and share PDF
        const { uri: pdfUri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false
        });
        
        // Share the PDF
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `Table ${selectedTableForQR?.table_number} QR Code PDF`
        });
        
        toast.show({
          description: "QR code PDF created successfully",
          status: "success",
          duration: 2000
        });
        
      } catch (error) {
        console.error("PDF Generation Error:", error);
        toast.show({
          description: "Failed to generate PDF: " + error.message,
          status: "error",
          duration: 3000
        });
      } finally {
        setIsDownloading(false);
      }
    };

    // Share QR code
    const shareQRCode = async () => {
      try {
        setIsSharing(true);
        
        let uri = null;
        
        // Get QR code as data URL
        if (global.nativeQRRef) {
          try {
            uri = await new Promise((resolve, reject) => {
              const options = {
                width: 400,
                height: 400,
                quality: 0.9,
                includeECLevel: true,
                includeLogo: true,
                color: true
              };
              
              global.nativeQRRef.toDataURL((data) => {
                if (data) {
                  resolve(data);
                } else {
                  reject(new Error("Failed to generate QR code data URL"));
                }
              }, options);
            });
          } catch (error) {
            console.error("QR ref method failed:", error);
          }
        }
        
        // Fallback to API method
        if (!uri) {
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          const fileUri = `${FileSystem.cacheDirectory}${filename}`;
          
          await FileSystem.downloadAsync(qrApiUrl, fileUri);
          uri = fileUri;
        }
        
        if (uri) {
          // Create a unique filename
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          let fileUri = uri;
          
          // Only process data URLs, file URLs are already handled
          if (uri.startsWith('data:')) {
            fileUri = `${FileSystem.cacheDirectory}${filename}`;
            const base64Data = uri.split(',')[1];
            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64
            });
          }
          
          // Share the file
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: `Table ${selectedTableForQR?.table_number} QR Code`
          });
        } else {
          throw new Error("Failed to generate QR code for sharing");
        }
      } catch (error) {
        console.error("Share Error:", error);
        toast.show({
          description: "Failed to share QR code: " + error.message,
          status: "error",
        });
      } finally {
        setIsSharing(false);
      }
    };
    
    return (
      <Modal
        isOpen={showQRModal}
        onClose={closeModal}
        closeOnOverlayClick={!isDownloading && !isSharing}
      >
        <Box 
          position="absolute" 
          top={0} 
          bottom={0} 
          left={0} 
          right={0} 
          bg="rgba(0,0,0,0.6)"
          alignItems="center"
          justifyContent="center"
        >
          <Box 
            bg="white" 
            width="90%" 
            maxWidth="400px" 
            rounded="lg" 
            p={5} 
            shadow={5}
            position="relative"
          >
            {/* Close Button */}
            <Pressable 
              position="absolute" 
              right={3} 
              top={3}
              zIndex={2}
              onPress={closeModal}
              disabled={isDownloading || isSharing}
            >
              <Icon as={MaterialIcons} name="close" size="md" color="coolGray.500" />
            </Pressable>

            {/* Header */}
            <Text 
              fontSize="lg" 
              fontWeight="bold" 
              mb={4} 
              color="coolGray.800"
              textAlign="center"
            >
              Table {selectedTableForQR?.table_number} QR Code
            </Text>

            {qrValue ? (
              <VStack space={4} alignItems="center">
                {/* QR Code with ViewShot wrapper */}
                <Box 
                  ref={qrContainerRef}
                  collapsable={false}
                  key={"qrbox-" + qrRenderAttempt}
                  bg="white"
                  p={4}
                  borderRadius="lg"
                  position="relative"
                >
                  {/* QR Code */}
                  <Box position="relative">
                    <QRCode
                      value={qrValue}
                      size={260}
                      logo={require('../../../../assets/images/mm-logo.png')}
                      logoSize={60}
                      logoBackgroundColor="white"
                      logoMargin={2}
                      logoBorderRadius={8}
                      backgroundColor="white"
                      color="#000000"
                      enableLinearGradient={false}
                      ecl="H"
                      quietZone={16}
                      logoHasBackground={false}
                      getRef={(c) => {
                        global.nativeQRRef = c;
                      }}
                    />
                    
                    {/* Corner Markers */}
                    <Box 
                      position="absolute" 
                      top={2} 
                      left={2} 
                      width={20} 
                      height={20} 
                      borderTopWidth={5} 
                      borderLeftWidth={5} 
                      borderTopColor="#FF7043" 
                      borderLeftColor="#FF7043" 
                      borderTopLeftRadius={6}
                    />
                    <Box 
                      position="absolute" 
                      top={2} 
                      right={2} 
                      width={20} 
                      height={20} 
                      borderTopWidth={5} 
                      borderRightWidth={5} 
                      borderTopColor="#FF7043" 
                      borderRightColor="#FF7043" 
                      borderTopRightRadius={6}
                    />
                    <Box 
                      position="absolute" 
                      bottom={2} 
                      left={2} 
                      width={20} 
                      height={20} 
                      borderBottomWidth={5} 
                      borderLeftWidth={5} 
                      borderBottomColor="#FF7043" 
                      borderLeftColor="#FF7043" 
                      borderBottomLeftRadius={6}
                    />
                    <Box 
                      position="absolute" 
                      bottom={2} 
                      right={2} 
                      width={20} 
                      height={20} 
                      borderBottomWidth={5} 
                      borderRightWidth={5} 
                      borderBottomColor="#FF7043" 
                      borderRightColor="#FF7043" 
                      borderBottomRightRadius={6}
                    />
                  </Box>
                </Box>
                
                <Text fontSize="md" color="coolGray.600" textAlign="center">
                  Scan to place your order
                </Text>
                
                {/* Download and Share Buttons */}
                <HStack space={4} width="100%" px={2}>
                  <Pressable
                    flex={1}
                    bg="#0dcaf0"
                    py={3}
                    rounded="md"
                    flexDirection="row"
                    justifyContent="center"
                    alignItems="center"
                    onPress={showDownloadOptions}
                    disabled={isDownloading || isSharing || !qrReady}
                    opacity={isDownloading || isSharing || !qrReady ? 0.7 : 1}
                  >
                    {isDownloading ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <HStack space={2} alignItems="center">
                        <Icon as={MaterialIcons} name="download" size="sm" color="white" />
                        <Text color="white" fontWeight="medium">
                          Download
                        </Text>
                      </HStack>
                    )}
                  </Pressable>
                  
                  <Pressable
                    flex={1}
                    bg="#198754"
                    py={3}
                    rounded="md"
                    flexDirection="row"
                    justifyContent="center"
                    alignItems="center"
                    onPress={shareQRCode}
                    disabled={isDownloading || isSharing || !qrReady}
                    opacity={isDownloading || isSharing || !qrReady ? 0.7 : 1}
                  >
                    {isSharing ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <HStack space={2} alignItems="center">
                        <Icon as={MaterialIcons} name="share" size="sm" color="white" />
                        <Text color="white" fontWeight="medium">
                          Share
                        </Text>
                      </HStack>
                    )}
                  </Pressable>
                </HStack>
              </VStack>
            ) : (
              <Center py={10}>
                <Spinner size="lg" color="#0891b2" />
              </Center>
            )}
          </Box>
        </Box>
      </Modal>
    );
  };

  // Update handleQRIconPress for simplicity - no need for complex ref handling
  const handleQRIconPress = async (table, section) => {
    setIsLoadingQr(true);
    setIsQRModalOpen(true);
    setShowQRModal(true);
    setQrReady(false);
    setQrRenderAttempt(prev => prev + 1);
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

      if (!data.user_app_url || !data.outlet_code || !data.table_number || !data.section_id) {
        throw new Error("Invalid QR code data received");
      }

      // Override the user_app_url with our testing URL using the correct format
      const testingUrl = "https://menumitra-testing.netlify.app";
      const qrUrl = `${testingUrl}/user_app/o${data.outlet_code}/s${data.section_id}/t${data.table_number}`;
      console.log("Generated QR URL:", qrUrl);

      // Set QR data immediately - no need for complex timing as we're using ViewShot
      setQrData({
        ...data,
        qr_code_url: qrUrl,
        table_number: data.table_number,
      });

      // Add a stability timeout to ensure QR code is stable before user interactions
      if (qrStableTimeout.current) {
        clearTimeout(qrStableTimeout.current);
      }
      
      qrStableTimeout.current = setTimeout(() => {
        setQrReady(true);
      }, 500);

    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.show({
        description: error.message || "Failed to generate QR code",
        status: "error",
        duration: 3000,
      });
      setShowQRModal(false);
      setIsQRModalOpen(false);
    } finally {
      setIsLoadingQr(false);
    }
  };

  // Add this useEffect to prevent refreshing when QR modal is open
  useEffect(() => {
    return () => {
      // Clear any timeouts when component unmounts
      if (qrStableTimeout.current) {
        clearTimeout(qrStableTimeout.current);
      }
    };
  }, []);

  // Add this effect to handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // If app comes back to foreground and QR modal is open, we might need to re-render
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && isQRModalOpen) {
        // Force QR code re-render by incrementing the counter
        setQrRenderAttempt(prev => prev + 1);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isQRModalOpen]);

  // Update the getRestaurantName function to use AsyncStorage
  const getRestaurantName = async () => {
    try {
      const outletName = await AsyncStorage.getItem("outlet_name");
      if (outletName) {
        setRestaurantName(outletName);
      }
    } catch (error) {
      console.error("Error getting outlet name:", error);
      toast.show({
        description: "Failed to get outlet name",
        status: "error",
        duration: 3000
      });
    }
  };

  // Call getRestaurantName when component mounts
  useEffect(() => {
    getRestaurantName();
  }, []);

  useEffect(() => {
    const startBlinking = () => {
      Animated.sequence([
        Animated.timing(blinkAnimation, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => startBlinking());
    };

    startBlinking();
  }, []);

  // Updated payment icon press handler to match RestaurantTables.js pattern
  const handlePaymentIconPress = (table, section) => {
    // Reset states
    setPaymentSuccess(false);
    setPaymentLoading(false);
    
    // Store table and section info
    setSelectedTable({
      ...table,
      section_name: section.name,
      section_id: section.id
    });
    
    // Set default payment method
    if (table.payment_method) {
      setSelectedPaymentMethod(table.payment_method.toLowerCase());
    } else {
      setSelectedPaymentMethod('cash'); // Default to cash in our case
    }
    
    // Set paid to true by default
    setIsPaid(true);
    
    // Open modal
    setIsPaymentModalVisible(true);
  };

  // Updated handler to match RestaurantTables.js behavior
  const handleSettlePayment = async () => {
    // Validate payment method selection
    if (!selectedPaymentMethod) {
      toast.show({
        description: "Please select a payment method",
        status: "warning",
        duration: 2000
      });
      return;
    }
    
    // Make sure table has all required properties
    if (!selectedTable || !selectedTable.order_id) {
      toast.show({
        description: "Order information is incomplete",
        status: "error",
        duration: 2000
      });
      return;
    }

    try {
      // Start loading
      setPaymentLoading(true);
      
      // Get user ID from storage
      const storedUserId = await AsyncStorage.getItem("user_id");
      
      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }
      
      // Prepare request payload
      const settleRequestBody = {
        outlet_id: outletId.toString(),
        order_id: selectedTable.order_id.toString(),
        order_status: "paid", // Changed from "completed" to "paid" to match API requirements
        user_id: storedUserId.toString(),
        is_paid: isPaid ? "paid" : "0", // Changed from "1" to "paid" to match RestaurantTables.js
        order_type: "dine-in",
        tables: [{ table_no: selectedTable.table_number.toString() }],
        section_id: selectedTable.section_id.toString(),
        payment_method: selectedPaymentMethod.toLowerCase() // Ensure lowercase for API
      };
      
      console.log("Payment payload:", settleRequestBody);
      
      // Make API request
      const data = await fetchWithAuth(`${getBaseUrl()}/update_order_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settleRequestBody),
      });

      // Handle response
      if (data.st === 1) {
        setPaymentSuccess(true);
        
        toast.show({
          description: "Payment settled successfully",
          status: "success",
          duration: 2000,
        });
        
        // Close modal after a delay to show success state
        setTimeout(() => {
          setIsPaymentModalVisible(false);
          fetchSections(outletId); // Refresh tables
        }, 1500);
      } else {
        throw new Error(data.msg || "Failed to settle payment");
      }
    } catch (error) {
      console.error("Payment Error:", error);
      toast.show({
        description: error.message || "Failed to settle payment",
        status: "error",
        duration: 3000,
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Updated PaymentModal to match RestaurantTables.js UI - clean, simple design
  const PaymentModal = () => {
    return (
      <Modal 
        isOpen={isPaymentModalVisible} 
        onClose={() => setIsPaymentModalVisible(false)}
        closeOnOverlayClick={!paymentLoading}
      >
        <Modal.Content 
          maxWidth="350px" 
          p={4} 
          borderRadius="md"
          bg="white"
        >
          {/* Close button */}
          <Pressable 
            position="absolute" 
            right={3} 
            top={2}
            zIndex={2}
            onPress={() => setIsPaymentModalVisible(false)}
          >
            <Icon as={MaterialIcons} name="close" size="sm" color="coolGray.500" />
          </Pressable>

          {/* Header */}
          <Box mb={5} mt={2}>
            <Text 
              fontSize="md" 
              fontWeight="medium" 
              color="coolGray.800"
            >
              Table {selectedTable?.table_number} | Order No {selectedTable?.order_number} | ₹{selectedTable?.grand_total?.toFixed(2)}
            </Text>
          </Box>

          {/* Success State */}
          {paymentSuccess ? (
            <VStack space={4} alignItems="center" py={3}>
              <Icon 
                as={MaterialIcons} 
                name="check-circle" 
                size="6xl" 
                color="green.500" 
              />
              <Text 
                fontSize="lg" 
                fontWeight="bold" 
                color="green.500" 
                textAlign="center"
              >
                Payment Settled Successfully
              </Text>
            </VStack>
          ) : (
            <>
              {/* Payment Method Selection */}
              <Box mb={4}>
                <Text 
                  fontSize="sm" 
                  fontWeight="medium" 
                  color="coolGray.700" 
                  mb={3}
                >
                  Select Payment Method
                </Text>

                <HStack space={3} alignItems="center">
                  {/* CASH Option */}
                  <HStack alignItems="center" space={1}>
                    <Pressable 
                      onPress={() => setSelectedPaymentMethod('cash')}
                      disabled={paymentLoading}
                    >
                      <Box 
                        width={5} 
                        height={5} 
                        rounded="full" 
                        borderWidth={1}
                        borderColor="#0891b2"
                        justifyContent="center"
                        alignItems="center"
                      >
                        {selectedPaymentMethod === 'cash' && (
                          <Box 
                            width={3} 
                            height={3} 
                            rounded="full" 
                            bg="#0891b2" 
                          />
                        )}
                      </Box>
                    </Pressable>
                    <Text fontSize="sm" color="coolGray.700">CASH</Text>
                  </HStack>

                  {/* UPI Option */}
                  <HStack alignItems="center" space={1}>
                    <Pressable 
                      onPress={() => setSelectedPaymentMethod('upi')}
                      disabled={paymentLoading}
                    >
                      <Box 
                        width={5} 
                        height={5} 
                        rounded="full" 
                        borderWidth={1}
                        borderColor="#0891b2"
                        justifyContent="center"
                        alignItems="center"
                      >
                        {selectedPaymentMethod === 'upi' && (
                          <Box 
                            width={3} 
                            height={3} 
                            rounded="full" 
                            bg="#0891b2" 
                          />
                        )}
                      </Box>
                    </Pressable>
                    <Text fontSize="sm" color="coolGray.700">UPI</Text>
                  </HStack>

                  {/* CARD Option */}
                  <HStack alignItems="center" space={1}>
                    <Pressable 
                      onPress={() => setSelectedPaymentMethod('card')}
                      disabled={paymentLoading}
                    >
                      <Box 
                        width={5} 
                        height={5} 
                        rounded="full" 
                        borderWidth={1}
                        borderColor="#0891b2"
                        justifyContent="center"
                        alignItems="center"
                      >
                        {selectedPaymentMethod === 'card' && (
                          <Box 
                            width={3} 
                            height={3} 
                            rounded="full" 
                            bg="#0891b2" 
                          />
                        )}
                      </Box>
                    </Pressable>
                    <Text fontSize="sm" color="coolGray.700">CARD</Text>
                  </HStack>

                  {/* Paid Checkbox - aligned to the right */}
                  <Pressable 
                    onPress={() => setIsPaid(!isPaid)}
                    disabled={paymentLoading}
                    ml="auto"
                    flexDirection="row"
                    alignItems="center"
                  >
                    <HStack space={1} alignItems="center">
                      <Box
                        width={5}
                        height={5}
                        rounded="sm"
                        borderWidth={1}
                        borderColor="#0891b2"
                        justifyContent="center"
                        alignItems="center"
                        bg={isPaid ? "#0891b2" : "transparent"}
                      >
                        {isPaid && (
                          <Icon 
                            as={MaterialIcons} 
                            name="check" 
                            size="xs" 
                            color="white" 
                          />
                        )}
                      </Box>
                      <Text fontSize="sm" color="coolGray.700">Paid</Text>
                    </HStack>
                  </Pressable>
                </HStack>
              </Box>

              {/* Settle Button */}
              <Button
                width="100%"
                height="45px"
                bg="#0891b2"
                _pressed={{ bg: "#0891b2" }}
                rounded="md"
                onPress={handleSettlePayment}
                isLoading={paymentLoading}
                isLoadingText="Settling..."
                _text={{ fontWeight: "medium" }}
                startIcon={<Icon as={MaterialIcons} name="check" size="sm" color="white" />}
                disabled={paymentLoading || !selectedPaymentMethod}
                opacity={!selectedPaymentMethod ? 0.7 : 1}
              >
                Settle
              </Button>
            </>
          )}
        </Modal.Content>
      </Modal>
    );
  };

  return (
    <Box safeArea flex={1} bg="coolGray.100">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <VStack flex={1}>
          <HStack
            alignItems="center"
            justifyContent="space-between"
            bg="white"
            px={4}
            py={2}
            shadow={1}
          >
            <HStack alignItems="center" space={2}>
              <Text fontSize="lg" fontWeight="bold">
                Tables
              </Text>
            </HStack>
            <HStack space={2}>
              <IconButton
                variant="ghost"
                colorScheme="coolGray"
                icon={<Icon as={MaterialIcons} name="settings" />}
                onPress={() => setShowEditIcons(!showEditIcons)}
                bg={showEditIcons ? "primary.500" : "transparent"}
                _pressed={{
                  bg: showEditIcons ? "primary.600" : "coolGray.100",
                }}
                rounded="full"
              />
            </HStack>
          </HStack>

          {/* Search and Filters */}
          <Box px={4} py={2} bg="white">
            <Input
              placeholder="Search section"
              value={searchQuery}
              onChangeText={setSearchQuery}
              variant="filled"
              bg="coolGray.100"
              borderRadius="10"
              py="2"
              px="1"
              fontSize="md"
              borderWidth={1}
              borderColor="black"
              _focus={{
                borderColor: "primary.500",
                bg: "coolGray.100",
              }}
              InputLeftElement={
                <Icon
                  as={<MaterialIcons name="search" />}
                  size={5}
                  ml="2"
                  color="coolGray.400"
                />
              }
              InputRightElement={
                searchQuery ? (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Icon
                      as={<MaterialIcons name="close" />}
                      size={5}
                      mr="2"
                      color="coolGray.400"
                    />
                  </Pressable>
                ) : null
              }
            />
          </Box>

          {/* Status Filter Buttons (Similar to owner app) */}
          <Box px={4} py={2} bg="white" borderBottomWidth={1} borderBottomColor="coolGray.200">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 2,
              }}
            >
              <HStack space={2} alignItems="center">
                <Pressable
                  onPress={() => setFilterStatus("all")}
                  bg={filterStatus === "all" ? "blue.100" : "coolGray.100"}
                  px={4}
                  py={2}
                  rounded="md"
                  borderWidth={1}
                  borderColor={filterStatus === "all" ? "blue.500" : "coolGray.300"}
                >
                  <Text
                    color={filterStatus === "all" ? "blue.700" : "coolGray.700"}
                    fontWeight={filterStatus === "all" ? "bold" : "medium"}
                  >
                    All
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setFilterStatus("occupied")}
                  bg={filterStatus === "occupied" ? "red.100" : "coolGray.100"}
                  px={4}
                  py={2}
                  rounded="md"
                  borderWidth={1}
                  borderColor={filterStatus === "occupied" ? "red.500" : "coolGray.300"}
                >
                  <Text
                    color={filterStatus === "occupied" ? "red.700" : "coolGray.700"}
                    fontWeight={filterStatus === "occupied" ? "bold" : "medium"}
                  >
                    Occupied
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setFilterStatus("reserved")}
                  bg={filterStatus === "reserved" ? "gray.100" : "coolGray.100"}
                  px={4}
                  py={2}
                  rounded="md"
                  borderWidth={1}
                  borderColor={filterStatus === "reserved" ? "gray.500" : "coolGray.300"}
                >
                  <Text
                    color={filterStatus === "reserved" ? "gray.700" : "coolGray.700"}
                    fontWeight={filterStatus === "reserved" ? "bold" : "medium"}
                  >
                    Reserved
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setFilterStatus("available")}
                  bg={filterStatus === "available" ? "green.100" : "coolGray.100"}
                  px={4}
                  py={2}
                  rounded="md"
                  borderWidth={1}
                  borderColor={filterStatus === "available" ? "green.500" : "coolGray.300"}
                >
                  <Text
                    color={filterStatus === "available" ? "green.700" : "coolGray.700"}
                    fontWeight={filterStatus === "available" ? "bold" : "medium"}
                  >
                    Available
                  </Text>
                </Pressable>
              </HStack>
            </ScrollView>
          </Box>

          {/* Filter Buttons for order types */}
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
        </VStack>
      </ScrollView>

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

      {/* Add the PaymentModal */}
      <PaymentModal />
    </Box>
  );
}
