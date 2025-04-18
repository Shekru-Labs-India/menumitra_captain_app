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
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrRefReady, setQrRefReady] = useState(false);
  const [qrStableTimeout, setQrStableTimeout] = useState(null);
  const [qrRenderAttempt, setQrRenderAttempt] = useState(0);
  const appState = useRef(AppState.currentState);
  const [restaurantName, setRestaurantName] = useState("");
  const [editedSectionName, setEditedSectionName] = useState("");
  const [blinkAnimation] = useState(new Animated.Value(1));
  const [qrReady, setQrReady] = useState(false);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [refExists, setRefExists] = useState(false);
  const qrContainerRef = useRef(null);
  const [isQrRefValid, setIsQrRefValid] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CASH");
  const [isPaid, setIsPaid] = useState(true);

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

                    {/* Add this condition for no tables message */}
                    {section.tables.length === 0 && !showEditIcons ? (
                      <Center py={4}>
                        <Text color="coolGray.500" fontSize="sm">
                          No tables available in this section.
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
    </ScrollView>
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

  // Update the QRCodeModal component to improve ref initialization
  const QRCodeModal = () => {
    if (!selectedTableForQR) return null;

    const qrValue = qrData?.qr_code_url || "";
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [isQrRefValid, setIsQrRefValid] = useState(false);
    
    // Check if ref is available after render
    useEffect(() => {
      if (qrContainerRef.current) {
        console.log("QR container ref is now available");
        setIsQrRefValid(true);
      } else {
        console.log("QR container ref not available yet");
        setIsQrRefValid(false);
      }
    }, [qrValue, isLoadingQr, qrReady]);

    // More reliable way to track QR rendering
    useEffect(() => {
      if (qrValue && !isLoadingQr) {
        // Give the QR code time to fully render
        const timer = setTimeout(() => {
          console.log("QR code should be ready now");
          setQrReady(true);
          
          // Check ref again after QR is ready
          if (qrContainerRef.current) {
            console.log("Confirmed QR container ref is valid");
            setIsQrRefValid(true);
          } else {
            console.log("QR container ref still not valid after render");
            setIsQrRefValid(false);
          }
        }, 1500); // Longer timeout for more reliable rendering
        
        return () => clearTimeout(timer);
      } else {
        setQrReady(false);
        setIsQrRefValid(false);
      }
    }, [qrValue, isLoadingQr]);

    const closeModal = () => {
      setShowQRModal(false);
      setQrData(null);
      setIsQRModalOpen(false);
      setQrRefReady(false);
      setQrReady(false);
      setCaptureAttempts(0);
      setShowDownloadOptions(false);
    };

    // Replace the saveToGallery function with a more robust implementation
    const saveToGallery = async () => {
      try {
        console.log("Starting QR code capture process...");
        setIsLoadingQr(true);
        
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
        
        // Wait for QR code to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        let uri = null;
        
        // Method 1: Try to get data URL directly from QR ref
        if (global.nativeQRRef) {
          try {
            console.log("Using QR reference method");
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
          } catch (refError) {
            console.error("QR ref method failed:", refError);
            uri = null;
          }
        }
        
        // Method 2: Try using API as fallback
        if (!uri) {
          console.log("Using API fallback method");
          try {
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
            console.log("API URL:", qrApiUrl);
            
            // Download directly to a file instead of creating a blob URL
            const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;
            
            const downloadResult = await FileSystem.downloadAsync(qrApiUrl, fileUri);
            
            if (downloadResult.status !== 200) {
              throw new Error(`Download failed with status ${downloadResult.status}`);
            }
            
            console.log("QR code downloaded successfully to:", fileUri);
            uri = fileUri;
          } catch (apiError) {
            console.error("API fallback failed:", apiError);
            throw new Error("All QR code generation methods failed");
          }
        }
        
        // Save the QR code
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
          
          try {
            // Save to media library
            console.log("Saving to media library:", fileUri);
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            console.log("QR code saved to gallery, asset ID:", asset.id);
            
            // Create album if it doesn't exist
            try {
              await MediaLibrary.createAlbumAsync("MenuMitra QR Codes", asset, false);
            } catch (albumError) {
              console.log("Album already exists or error creating album:", albumError);
            }
            
            // Show success message
            toast.show({
              description: "QR code saved to gallery",
              status: "success",
              duration: 2000
            });
          } catch (saveError) {
            console.error("Error saving QR code to gallery:", saveError);
            toast.show({
              description: "Failed to save QR code: " + (saveError.message || "Unknown error"),
              status: "error",
              duration: 3000
            });
          }
        } else {
          throw new Error("Failed to generate QR code");
        }
      } catch (error) {
        console.error("QR Save Error:", error);
        toast.show({
          description: "Failed to save QR code: " + (error.message || "Unknown error"),
          status: "error",
          duration: 3000
        });
      } finally {
        setIsLoadingQr(false);
      }
    };

    // Add function to save QR code to downloads folder
    const saveToDownloads = async () => {
      try {
        setIsLoadingQr(true);
        toast.show({
          description: "Preparing to save QR code...",
          status: "info",
          duration: 2000
        });
        
        // Generate QR code data
        let qrDataUrl = null;
        
        if (global.nativeQRRef) {
          // Get QR code as data URL using the ref, ensuring logo is included
          qrDataUrl = await new Promise((resolve, reject) => {
            // Options to ensure logo is included in the data URL
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
                console.log("QR data URL with logo generated for download");
                resolve(data);
              } else {
                reject(new Error("Failed to generate QR code data"));
              }
            }, options);
          });
        }
        
        // If we have QR data, save it
        if (qrDataUrl) {
          // Create a unique filename based on table number and timestamp
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          
          // Save to appropriate folder based on platform
          if (Platform.OS === 'android') {
            // For Android, we can save to the Downloads directory
            const downloadPath = `${FileSystem.documentDirectory}${filename}`;
            const base64Data = qrDataUrl.split(',')[1];
            
            await FileSystem.writeAsStringAsync(downloadPath, base64Data, {
              encoding: FileSystem.EncodingType.Base64
            });
            
            // For sharing the file or making it available in downloads
            await Sharing.shareAsync(downloadPath, {
              mimeType: 'image/png',
              dialogTitle: 'Save QR Code',
              UTI: 'public.png'
            });
            
            toast.show({
              description: "QR code saved. Check your Downloads folder.",
              status: "success",
              duration: 3000
            });
          } else if (Platform.OS === 'ios') {
            // For iOS, use sharing to save to Files app
            const tempFilePath = `${FileSystem.cacheDirectory}${filename}`;
            const base64Data = qrDataUrl.split(',')[1];
            
            await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
              encoding: FileSystem.EncodingType.Base64
            });
            
            await Sharing.shareAsync(tempFilePath, {
              mimeType: 'image/png',
              dialogTitle: 'Save QR Code to Files',
              UTI: 'public.png'
            });
            
            toast.show({
              description: "QR code ready to save",
              status: "success",
              duration: 3000
            });
          } else {
            // For web or other platforms
            throw new Error("Saving to downloads not supported on this platform");
          }
        } else {
          // If no QR data from ref, try using API as fallback
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
          
          // Create a unique filename
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          const downloadPath = `${FileSystem.documentDirectory}${filename}`;
          
          // Download directly from API
          await FileSystem.downloadAsync(qrApiUrl, downloadPath);
          
          // Share the file
          await Sharing.shareAsync(downloadPath, {
            mimeType: 'image/png', 
            dialogTitle: 'Save QR Code',
            UTI: 'public.png'
          });
          
          toast.show({
            description: "QR code ready to save",
            status: "success",
            duration: 3000
          });
        }
        
        setShowDownloadOptions(false);
      } catch (error) {
        console.error("Error saving to downloads:", error);
        toast.show({
          description: "Failed to save QR code: " + (error.message || "Unknown error"),
          status: "error",
          duration: 3000
        });
      } finally {
        setIsLoadingQr(false);
      }
    };

    // Add the missing handleShareQRCode function
    const handleShareQRCode = async () => {
      try {
        setIsLoadingQr(true);
        toast.show({
          description: "Preparing to share QR code...",
          status: "info",
          duration: 2000
        });

        // Get QR code data URL
        let qrDataUrl = null;
        
        if (global.nativeQRRef) {
          // Get QR code as data URL
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
                console.log("QR data URL generated for sharing");
                resolve(data);
              } else {
                reject(new Error("Failed to generate QR code data for sharing"));
              }
            }, options);
          });
        }
        
        if (qrDataUrl) {
          // Save to temporary file for sharing
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          const filePath = `${FileSystem.cacheDirectory}${filename}`;
          const base64Data = qrDataUrl.split(',')[1];
          
          await FileSystem.writeAsStringAsync(filePath, base64Data, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          // Share the file
          await Sharing.shareAsync(filePath, {
            mimeType: 'image/png',
            dialogTitle: `Table ${selectedTableForQR?.table_number} QR Code`
          });
          
          toast.show({
            description: "QR code shared successfully",
            status: "success",
            duration: 2000
          });
        } else {
          // Fallback to API if ref method fails
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrValue)}`;
          const filename = `QRCode_Table${selectedTableForQR?.table_number || "Unknown"}_${Date.now()}.png`;
          const filePath = `${FileSystem.cacheDirectory}${filename}`;
          
          // Download the QR code from API
          await FileSystem.downloadAsync(qrApiUrl, filePath);
          
          // Share the file
          await Sharing.shareAsync(filePath, {
            mimeType: 'image/png',
            dialogTitle: `Table ${selectedTableForQR?.table_number} QR Code`
          });
          
          toast.show({
            description: "QR code shared successfully",
            status: "success",
            duration: 2000
          });
        }
      } catch (error) {
        console.error("QR Share Error:", error);
        toast.show({
          description: "Failed to share QR code: " + (error.message || "Unknown error"),
          status: "error",
          duration: 3000
        });
      } finally {
        setIsLoadingQr(false);
      }
    };
    
    // Add the missing handlePDFDownload function
    const handlePDFDownload = async () => {
      try {
        setIsLoadingQr(true);
        toast.show({
          description: "Generating PDF...",
          status: "info",
          duration: 2000
        });
        
        // Wait for QR code to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get QR code as data URL
        let qrDataUrl = null;
        
        if (global.nativeQRRef) {
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
        }
        
        if (!qrDataUrl) {
          throw new Error("Could not generate QR code image for PDF");
        }
        
        // Get restaurant name for the PDF
        const outlet = await AsyncStorage.getItem("outlet_name") || "MenuMitra";
        
        // Create HTML content with embedded QR code and logo
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
                .qr-container { margin: 30px 0; }
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
        console.log("Creating PDF with logo");
        const { uri: pdfUri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false
        });

        console.log("Sharing PDF with logo");
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `Table ${selectedTableForQR?.table_number} QR Code PDF`
        });
        
        toast.show({
          description: "QR code PDF created successfully",
          status: "success",
          duration: 3000
        });
        
        setShowDownloadOptions(false);
      } catch (error) {
        console.error("PDF Generation Error:", error);
        toast.show({
          description: "Failed to generate PDF: " + (error.message || "Unknown error"),
          status: "error",
          duration: 3000
        });
      } finally {
        setIsLoadingQr(false);
      }
    };

    return (
      <Modal 
        isOpen={showQRModal} 
        onClose={closeModal} 
        size="md"
        closeOnOverlayClick={false}
      >
        <Modal.Content 
          borderRadius="xl" 
          p={4}
          width="90%"
          maxWidth="350px"
          bg="white"
        >
          <HStack alignItems="center" justifyContent="space-between" mb={4}>
            <Text fontSize="xl" fontWeight="medium">
              Table {qrData?.table_number || selectedTableForQR?.table_number} QR Code
            </Text>
            <Pressable onPress={closeModal}>
              <Icon as={MaterialIcons} name="close" size="md" color="gray.500" />
            </Pressable>
          </HStack>
          <Modal.Body alignItems="center" p={0}>
            {isLoadingQr ? (
              <Center h={280} w={280}>
                <Spinner size="lg" color="primary.500" />
              </Center>
            ) : qrValue ? (
              <VStack space={6} alignItems="center" width="100%">
                <Box 
                  alignItems="center"
                  bg="white"
                  borderRadius="lg"
                  borderWidth={1}
                  borderColor="gray.300"
                  shadow={2}
                  p={4}
                  ref={qrContainerRef}
                  collapsable={false}
                  key={"qrbox-" + qrRenderAttempt}
                >
                  {/* Use a simple Box instead of ViewShot to avoid ref issues */}
                  <Box 
                    bg="white" 
                    p={4} 
                    borderRadius="md" 
                    collapsable={false} 
                    key={"qrcode-" + qrRenderAttempt}
                  >
                   <QRCode
                      value={qrValue}
                      size={280}
                      logo={require('../../../../assets/images/mm-logo.png')}
                      logoSize={60}
                      logoBackgroundColor="white"
                      logoMargin={2}
                      logoBorderRadius={8}
                      backgroundColor="white"
                      color="#000000"
                      enableLinearGradient={false}
                      ecl="H" // Higher error correction level to accommodate logo
                      quietZone={16}
                      logoHasBackground={false}
                      getRef={(c) => {
                        global.nativeQRRef = c;
                        console.log("QR code ref set:", c ? "success" : "failed");
                      }}
                      onError={(error) => {
                        console.error("QR Code error:", error);
                        setQrReady(false);
                      }}
                    />
                  </Box>
                </Box>

                <VStack space={2} alignItems="center">
                  <Text fontSize="md" color="gray.700" fontWeight="medium">
                  Scan to place your order
                </Text>
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    Point your camera at the QR code to open the menu
                  </Text>
                </VStack>

                <HStack space={4} width="100%" px={4}>
                  <Button
                    flex={1}
                    size="lg"
                    colorScheme="cyan"
                    _pressed={{ bg: "cyan.600" }}
                    leftIcon={<Icon as={MaterialIcons} name="download" size="sm" color="white" />}
                    onPress={() => setShowDownloadOptions(true)}
                    isDisabled={isLoadingQr}
                    _text={{ fontWeight: "semibold" }}
                  >
                    Download
                  </Button>
                  <Button
                    flex={1}
                    size="lg"
                    colorScheme="green"
                    _pressed={{ bg: "green.700" }}
                    leftIcon={<Icon as={MaterialIcons} name="share" size="sm" color="white" />}
                    onPress={handleShareQRCode}
                    isDisabled={isLoadingQr}
                    _text={{ fontWeight: "semibold" }}
                  >
                    Share
                  </Button>
                </HStack>

                {/* Download Options Modal */}
                <Modal isOpen={showDownloadOptions} onClose={() => setShowDownloadOptions(false)}>
                  <Modal.Content maxWidth="320px" borderRadius="xl">
                    <Modal.Header borderBottomWidth={0}>Download Options</Modal.Header>
                    <Modal.CloseButton />
                    <Modal.Body py={4}>
                      <VStack space={4}>
                        <Button
                          size="lg"
                          colorScheme="blue"
                          _pressed={{ bg: "blue.600" }}
                          leftIcon={<Icon as={MaterialIcons} name="image" size="sm" color="white" />}
                          onPress={saveToGallery}
                          isDisabled={isLoadingQr}
                          _text={{ fontWeight: "semibold" }}
                        >
                          Save as Image
                        </Button>
                        <Button
                          size="lg"
                          colorScheme="red"
                          _pressed={{ bg: "red.600" }}
                          leftIcon={<Icon as={MaterialIcons} name="picture-as-pdf" size="sm" color="white" />}
                          onPress={handlePDFDownload}
                          isDisabled={isLoadingQr}
                          _text={{ fontWeight: "semibold" }}
                        >
                          Save as PDF
                        </Button>
                        <Button
                          size="lg"
                          colorScheme="orange"
                          _pressed={{ bg: "orange.600" }}
                          leftIcon={<Icon as={MaterialIcons} name="folder" size="sm" color="white" />}
                          onPress={saveToDownloads}
                          isDisabled={isLoadingQr}
                          _text={{ fontWeight: "semibold" }}
                        >
                          Save to Downloads
                        </Button>
                      </VStack>
                    </Modal.Body>
                  </Modal.Content>
                </Modal>
              </VStack>
            ) : (
              <VStack space={4} alignItems="center" py={4}>
                <Icon as={MaterialIcons} name="error-outline" size="xl" color="red.500" />
                <Text color="red.500" fontWeight="medium">Failed to generate QR code</Text>
                <Button size="sm" onPress={closeModal}>Close</Button>
              </VStack>
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
  };

  // Update handleQRIconPress for simplicity - no need for complex ref handling
  const handleQRIconPress = async (table, section) => {
    setIsLoadingQr(true);
    setIsQRModalOpen(true);
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
      if (qrStableTimeout) {
        clearTimeout(qrStableTimeout);
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

  // Add this function to handle payment icon press
  const handlePaymentIconPress = (table, section) => {
    setSelectedTable({
      ...table,
      section_name: section.name,
      section_id: section.id
    });
    setSelectedPaymentMethod("CASH");
    setIsPaid(true);
    setIsPaymentModalVisible(true);
  };

  // Add this function to handle payment settlement
  const handleSettlePayment = async () => {
    try {
      if (!selectedPaymentMethod) {
        toast.show({
          description: "Please select a payment method",
          status: "warning",
        });
        return;
      }

      setLoading(true);
      const storedUserId = await AsyncStorage.getItem("user_id");
      
      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/update_order_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          order_id: selectedTable.order_id.toString(),
          order_status: "completed",
          user_id: storedUserId.toString(),
          is_paid: isPaid ? "1" : "0",
          order_type: "dine-in",
          tables: [{ table_no: selectedTable.table_number.toString() }],
          section_id: selectedTable.section_id.toString(),
          payment_method: selectedPaymentMethod
        }),
      });

      if (data.st === 1) {
        toast.show({
          description: "Payment settled successfully",
          status: "success",
        });
        setIsPaymentModalVisible(false);
        await fetchSections(outletId);
      } else {
        throw new Error(data.msg || "Failed to settle payment");
      }
    } catch (error) {
      console.error("Payment Error:", error);
      toast.show({
        description: error.message || "Failed to settle payment",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Payment Modal Component
  const PaymentModal = () => (
    <Modal isOpen={isPaymentModalVisible} onClose={() => setIsPaymentModalVisible(false)}>
      <Modal.Content maxWidth="350px" borderRadius="lg" shadow={6}>
        <Modal.CloseButton />
        <Modal.Header borderBottomWidth={1} borderBottomColor="coolGray.200" py={3}>
          <Text fontSize="md" fontWeight="semibold">
            Table {selectedTable?.table_number} | Order No {selectedTable?.order_number}
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="#0891b2">
            ₹{selectedTable?.grand_total?.toFixed(2)}
          </Text>
        </Modal.Header>
        <Modal.Body py={4}>
          <VStack space={5}>
            <Text fontSize="md" fontWeight="semibold" color="coolGray.800">
              Select Payment Method
            </Text>
            
            <HStack space={3} justifyContent="space-between" alignItems="center">
              <Pressable 
                flex={1} 
                onPress={() => setSelectedPaymentMethod("CASH")}
                bg={selectedPaymentMethod === "CASH" ? "coolGray.100" : "transparent"}
                p={3}
                rounded="md"
                borderWidth={1}
                borderColor={selectedPaymentMethod === "CASH" ? "#0891b2" : "coolGray.300"}
              >
                <VStack alignItems="center" space={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="payments" 
                    size="md" 
                    color={selectedPaymentMethod === "CASH" ? "#0891b2" : "coolGray.500"} 
                  />
                  <Text 
                    fontSize="sm" 
                    fontWeight="medium" 
                    color={selectedPaymentMethod === "CASH" ? "#0891b2" : "coolGray.800"}
                  >
                    CASH
                  </Text>
                </VStack>
              </Pressable>
              
              <Pressable 
                flex={1} 
                onPress={() => setSelectedPaymentMethod("UPI")}
                bg={selectedPaymentMethod === "UPI" ? "coolGray.100" : "transparent"}
                p={3}
                rounded="md"
                borderWidth={1}
                borderColor={selectedPaymentMethod === "UPI" ? "#0891b2" : "coolGray.300"}
              >
                <VStack alignItems="center" space={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="smartphone" 
                    size="md" 
                    color={selectedPaymentMethod === "UPI" ? "#0891b2" : "coolGray.500"} 
                  />
                  <Text 
                    fontSize="sm" 
                    fontWeight="medium" 
                    color={selectedPaymentMethod === "UPI" ? "#0891b2" : "coolGray.800"}
                  >
                    UPI
                  </Text>
                </VStack>
              </Pressable>
              
              <Pressable 
                flex={1} 
                onPress={() => setSelectedPaymentMethod("CARD")}
                bg={selectedPaymentMethod === "CARD" ? "coolGray.100" : "transparent"}
                p={3}
                rounded="md"
                borderWidth={1}
                borderColor={selectedPaymentMethod === "CARD" ? "#0891b2" : "coolGray.300"}
              >
                <VStack alignItems="center" space={1}>
                  <Icon 
                    as={MaterialIcons} 
                    name="credit-card" 
                    size="md" 
                    color={selectedPaymentMethod === "CARD" ? "#0891b2" : "coolGray.500"} 
                  />
                  <Text 
                    fontSize="sm" 
                    fontWeight="medium" 
                    color={selectedPaymentMethod === "CARD" ? "#0891b2" : "coolGray.800"}
                  >
                    CARD
                  </Text>
                </VStack>
              </Pressable>
            </HStack>
            
            <HStack space={2} alignItems="center" pt={2}>
              <Pressable onPress={() => setIsPaid(!isPaid)}>
                <HStack space={2} alignItems="center">
                  <Box
                    size={6}
                    rounded="sm"
                    borderWidth={1}
                    borderColor="#0891b2"
                    alignItems="center"
                    justifyContent="center"
                    bg={isPaid ? "#0891b2" : "transparent"}
                  >
                    {isPaid && (
                      <MaterialIcons name="check" size={16} color="white" />
                    )}
                  </Box>
                  <Text color="coolGray.800" fontSize="md" fontWeight="medium">
                    Received Full Payment
                  </Text>
                </HStack>
              </Pressable>
            </HStack>
          </VStack>
        </Modal.Body>
        <Modal.Footer pt={0} borderTopWidth={0}>
          <Button
            w="full"
            bg="#0891b2"
            _pressed={{ bg: "#06748e" }}
            rounded="md"
            py={3}
            onPress={handleSettlePayment}
            isLoading={loading}
            leftIcon={<Icon as={MaterialIcons} name="check-circle" size="sm" />}
            shadow={2}
          >
            SETTLE PAYMENT
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );

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

      {/* Restaurant Name */}
      <Box px={4} py={2} bg="white">
        <HStack alignItems="center" space={2}>
          <Icon as={MaterialIcons} name="restaurant" size="sm" color="coolGray.600" />
          <Text fontSize="lg" fontWeight="medium" color="coolGray.800">
            {restaurantName || "Restaurant"}
          </Text>
        </HStack>
      </Box>

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

      {/* Add the PaymentModal */}
      <PaymentModal />
    </Box>
  );
}
