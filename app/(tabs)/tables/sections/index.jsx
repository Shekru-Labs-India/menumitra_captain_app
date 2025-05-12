// import React, {
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
  Switch,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Platform,
  StatusBar,
  ScrollView,
  RefreshControl,
  AppState,
  Animated,
  Easing, // Add this import
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../../../../app/components/Header";
import PaymentModal from "../../../../app/components/PaymentModal";
import { getBaseUrl } from "../../../../config/api.config";
import { fetchWithAuth } from "../../../../utils/apiInterceptor";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { QR_STYLES } from "../../../../app/styles/qrcode.styles";
import * as MediaLibrary from "expo-media-library";
import * as Print from "expo-print";
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

// Add a new helper function to check if table should display in alarm state (45+ minutes)
const isTableInAlarmState = (occupiedTime) => {
  try {
    if (!occupiedTime) return false;

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

    // Return true if occupied for 45 minutes or more
    return diffInMinutes >= 45;
  } catch (error) {
    console.error("Alarm state check error:", error);
    return false;
  }
};

// Add after startBlinkAnimation function and before useEffect

// Skeleton loader for the grid view
const TableSkeletonLoader = () => {
  // Create animation value for skeleton shimmer effect
  const shimmerAnim = useRef(new Animated.Value(-100)).current;

  // Run shimmer animation when component mounts
  useEffect(() => {
    const startShimmerAnimation = () => {
      shimmerAnim.setValue(-100);
      Animated.timing(shimmerAnim, {
        toValue: 400, // End position well beyond component width
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.linear,
      }).start(() => startShimmerAnimation()); // Loop animation
    };

    startShimmerAnimation();

    // Clean up animation on unmount
    return () => {
      shimmerAnim.stopAnimation();
    };
  }, []);

  // Create a shimmer component
  const Shimmer = ({ width, height, style }) => {
    return (
      <Box 
        width={width} 
        height={height} 
        bg="#E2E8F0" 
        borderRadius="md" 
        overflow="hidden"
        style={style}
      >
        <Animated.View
          style={{
            width: '60%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            transform: [{ translateX: shimmerAnim }],
          }}
        />
      </Box>
    );
  };

  // Shimmer table component
  const ShimmerTable = () => (
    <Box
      width="31%"
      minW="100px"
      height="100px"
      mx="1%"
      my="1.5%"
      overflow="hidden"
      position="relative"
    >
      <Box
        p={2}
        rounded="lg"
        width="100%"
        height="100%"
        bg="#E2E8F0"
        borderWidth={1}
        borderStyle="dashed"
        borderColor="#A0AEC0"
        position="relative"
        justifyContent="center"
        alignItems="center"
        overflow="hidden"
      >
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0,
            backgroundColor: 'transparent',
            opacity: 0.6,
          }}
        >
          <Animated.View
            style={{
              width: '50%',
              height: '200%',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              transform: [
  { translateX: shimmerAnim },
  { translateY: -5 },
  { rotateZ: '25deg' }
],
              position: 'absolute',
            }}
          />
        </Animated.View>
        <Box width="40%" height="20px" bg="#CBD5E0" alignSelf="center" borderRadius="sm" />
      </Box>
    </Box>
  );

  return (
    <VStack space={4} p={2} pb={8}>
      {[1, 2, 3].map((section) => (
        <Box key={section} mb={2}>
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={4}>
              {/* Section Header Skeleton */}
              <VStack space={1}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Box width="60%" position="relative" overflow="hidden">
                    <Box height={6} bg="#E2E8F0" rounded="md" width="100%" />
                    <Animated.View
                      style={{
                        width: '50%',
                        height: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        transform: [{ translateX: shimmerAnim }],
                        position: 'absolute',
                      }}
                    />
                  </Box>
                  <Box width={10} position="relative" overflow="hidden">
                    <Box height={6} bg="#E2E8F0" rounded="md" width="100%" />
                    <Animated.View
                      style={{
                        width: '50%',
                        height: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        transform: [{ translateX: shimmerAnim }],
                        position: 'absolute',
                      }}
                    />
                  </Box>
                </HStack>

                {/* Section Stats Skeleton */}
                <HStack space={3} alignItems="center" mt={2}>
                  {[1, 2, 3].map((statItem) => (
                    <HStack key={statItem} space={1} alignItems="center">
                      <Box w={3} h={3} bg="#E2E8F0" rounded="full" overflow="hidden">
                        <Animated.View
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'rgba(255, 255, 255, 0.5)',
                            transform: [{ translateX: shimmerAnim }],
                          }}
                        />
                      </Box>
                      <Box width={16} position="relative" overflow="hidden">
                        <Box height={4} bg="#E2E8F0" rounded="md" width="100%" />
                        <Animated.View
                          style={{
                            width: '50%',
                            height: '100%',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            transform: [{ translateX: shimmerAnim }],
                            position: 'absolute',
                          }}
                        />
                      </Box>
                    </HStack>
                  ))}
                </HStack>
              </VStack>

              {/* Divider */}
              <Box height={0.5} bg="coolGray.200" />

              {/* Tables Grid Skeleton */}
              <VStack space={2}>
                {[1, 2].map((row) => (
                  <HStack 
                    key={row}
                    px={0}
                    py={3}
                    alignItems="center"
                    justifyContent="space-evenly"
                  >
                    {[1, 2, 3].map((col) => <ShimmerTable key={`${row}-${col}`} />)}
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Box>
        </Box>
      ))}
    </VStack>
  );
};

// Create a standalone component outside of the main component for order type buttons
const OrderTypeButtons = () => {
  const [loading, setLoading] = useState(true);
  const [orderTypeSettings, setOrderTypeSettings] = useState({
    counter: false,
    parcel: false,
    delivery: false,
    driveThrough: false,
  });
  const router = useRouter();

  // Fetch settings only once when component mounts
  useEffect(() => {
    const getOrderTypeSettings = async () => {
      try {
        setLoading(true);
        const storedSettings = await AsyncStorage.getItem("app_settings");
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          setOrderTypeSettings({
            counter: parsedSettings.has_counter,
            parcel: parsedSettings.has_parcel,
            delivery: parsedSettings.has_delivery,
            driveThrough: parsedSettings.has_drive_through,
          });
        }
      } catch (error) {
        console.error("Error loading order type settings:", error);
      } finally {
        setLoading(false);
      }
    };

    getOrderTypeSettings();
  }, []);

  // Get outlet_id once
  const [outletId, setOutletId] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem("outlet_id").then(id => {
      if (id) setOutletId(parseInt(id));
    });
  }, []);

  // Calculate active buttons count
  const activeButtonCount = Object.values(orderTypeSettings).filter(Boolean).length;

  // Calculate width percentage based on active button count
  // Subtract small gap amount (2%) between buttons from total width
  const buttonWidthPercent =
    activeButtonCount > 0
      ? (100 - (activeButtonCount - 1) * 2) / activeButtonCount
      : 100;

  // Create array of visible buttons
  const buttons = [
    {
      type: "counter",
      active: orderTypeSettings.counter,
      icon: "point-of-sale",
      label: "Counter",
      params: {
        isSpecialOrder: "true",
        orderType: "counter",
        clearPrevious: "true",
        outlet_id: outletId?.toString() || "",
      },
    },
    {
      type: "parcel",
      active: orderTypeSettings.parcel,
      icon: "takeout-dining",
      label: "Parcel",
      params: {
        isSpecialOrder: "true",
        orderType: "parcel",
        clearPrevious: "true",
        outlet_id: outletId?.toString() || "",
      },
    },
    {
      type: "delivery",
      active: orderTypeSettings.delivery,
      icon: "delivery-dining",
      label: "Delivery",
      params: {
        isSpecialOrder: "true",
        orderType: "delivery",
        clearPrevious: "true",
        outlet_id: outletId?.toString() || "",
      },
    },
    {
      type: "drive-through",
      active: orderTypeSettings.driveThrough,
      icon: "drive-eta",
      label: "Drive",
      params: {
        isSpecialOrder: "true",
        orderType: "drive-through",
        clearPrevious: "true",
        outlet_id: outletId?.toString() || "",
      },
    },
  ].filter((button) => button.active);

  if (loading) {
    return null; // Don't render anything while loading
  }

  return (
    <Box
      bg="white"
      py={2}
      borderBottomWidth={1}
      borderBottomColor="coolGray.200"
    >
      <Box px={4} width="100%">
        <HStack
          space={2}
          justifyContent={
            activeButtonCount === 0 ? "center" : "space-between"
          }
        >
          {buttons.map((button, index) => (
            <Pressable
              key={button.type}
              flex={1}
              maxWidth={`${buttonWidthPercent}%`}
              onPress={() =>
                router.push({
                  pathname: "/screens/orders/menu-selection",
                  params: button.params,
                })
              }
            >
              <Box
                py={2.5}
                bg="white"
                borderWidth={1}
                borderColor="#0891b2"
                rounded="lg"
                shadow={1}
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                width="100%"
              >
                <MaterialIcons
                  name={button.icon}
                  size={20}
                  color="#0891b2"
                  style={{ marginRight: 8 }}
                />
                <Text color="#0891b2" fontSize="sm" fontWeight="medium">
                  {button.label}
                </Text>
              </Box>
            </Pressable>
          ))}
        </HStack>
      </Box>
    </Box>
  );
};

export default function TableSectionsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [viewType, setViewType] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
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
  const [blinkAnimation] = useState(new Animated.Value(0));
  const [qrReady, setQrReady] = useState(false);
  const [qrRenderAttempt, setQrRenderAttempt] = useState(0);
  const qrContainerRef = useRef(null);
  const [printerDevice, setPrinterDevice] = useState(null);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [creatingTableSectionId, setCreatingTableSectionId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Add this state at the component level
  const [deletingTables, setDeletingTables] = useState(new Set());

  // Add this with other state declarations
  const [updatingSections, setUpdatingSections] = useState(new Set());

  // Add this with other state declarations
  const [deletingSections, setDeletingSections] = useState(new Set());

  // Add this state to track background refresh status (near your other state declarations)
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);

  // Add with other state variables
  const [salesData, setSalesData] = useState({
    liveSales: 0,
    todayTotalSales: 0,
  });

  const handleSelectChange = (value) => {
    if (value === "availableTables") {
      setFilterStatus("available");
      setSortBy(value); // Update the sort criteria
    } else if (value === "occupiedTables") {
      setFilterStatus("occupied");
      setSortBy(value); // Update the sort criteria
    } else if (
      value === "name" ||
      value === "totalTables" ||
      value === "engagedTables"
    ) {
      setSortBy(value); // Update the sort criteria
    } else {
      setFilterStatus("all"); // Reset the filter when other options are selected
      setSortBy("default"); // Reset to default order (original API response)
    }
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

  // Update the fetchSections function to add the alarm state flag to each table
  const fetchSections = async (outletId) => {
    try {
      // Only set loading state for user-initiated fetches
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
            isInAlarmState: isTableInAlarmState(table.occupied_time),
            // Make sure action property is present and correctly set
            action: table.action || (table.is_occupied === 1 ? "placed" : null),
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
        
        // Add this to store the sales data
        setSalesData({
          liveSales: data.live_sales || 0,
          todayTotalSales: data.today_total_sales || 0,
        });
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
        const sectionNameMatch = section.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

        // Check if any table number matches
        const tableNumberMatch = section.tables.some((table) =>
          table.table_number.toString().includes(searchQuery)
        );

        return sectionNameMatch || tableNumberMatch;
      });
    }

    // Only apply sorting if a sort option is explicitly selected
    if (sortBy && sortBy !== "default") {
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
    }

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
          user_id: storedUserId.toString(),
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
              order_id: table.order_id.toString(),
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

  const getFilteredTables = (sectionTables, sectionName) => {
    if (!sectionTables || sectionTables.length === 0) return [];

    // Filter by search query first
    let filteredBySearch = sectionTables;
    if (searchQuery.trim()) {
      // Check if the section name matches the search query
      const sectionNameMatches = sectionName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Only filter tables by search query if section name doesn't match
      if (!sectionNameMatches) {
        filteredBySearch = sectionTables.filter((table) =>
          table.table_number.toString().includes(searchQuery)
        );
      }
    }

    // Then filter by status
    switch (filterStatus) {
      case "occupied":
        return filteredBySearch.filter((table) => table.is_occupied === 1);
      case "available":
        return filteredBySearch.filter(
          (table) => table.is_occupied === 0 && !table.is_reserved
        );
      case "reserved":
        return filteredBySearch.filter((table) => table.is_reserved === true);
      default:
        return filteredBySearch;
    }
  };

  // Update the getTablesByRow function to fix spacing issues
  const getTablesByRow = (sectionTables, sectionName) => {
    if (!sectionTables || sectionTables.length === 0) return { 0: {} }; // For sections with no tables

    const filteredTables = getFilteredTables(sectionTables, sectionName);
    const grouped = {};

    // Determine how many columns we have (changing from 4 to 3)
    const columnsPerRow = 3;

    // Fill in the existing tables in a grid
    filteredTables.forEach((table, index) => {
      const row = Math.floor(index / columnsPerRow);
      const column = index % columnsPerRow;

      if (!grouped[row]) {
        grouped[row] = {};
      }

      grouped[row][column] = table;
    });

    // Ensure all rows have entries for all columns (even if they're null)
    // This helps maintain the grid structure
    Object.keys(grouped).forEach((rowIndex) => {
      for (let colIndex = 0; colIndex < columnsPerRow; colIndex++) {
        if (grouped[rowIndex][colIndex] === undefined) {
          grouped[rowIndex][colIndex] = null;
        }
      }
    });

    // Only add an extra row for the "Add Table" button when edit mode is active
    // This ensures we don't have unnecessary empty space when not in edit mode
    if (
      showEditIcons &&
      filteredTables.length > 0 &&
      filteredTables.length % columnsPerRow === 0
    ) {
      const extraRowIndex = Math.floor(filteredTables.length / columnsPerRow);
      if (!grouped[extraRowIndex]) {
        grouped[extraRowIndex] = {};
      }
      for (let i = 0; i < columnsPerRow; i++) {
        grouped[extraRowIndex][i] = null;
      }
    }

    return grouped;
  };

  // Add handleDeleteTable function
  const handleDeleteTable = async (sectionId, tableId) => {
    const originalSections = [...sections];

    try {
      // Add table to deleting set
      setDeletingTables((prev) => new Set([...prev, tableId]));

      // Optimistically update the UI
      setSections((prevSections) =>
        prevSections.map((section) => {
          if (section.id === sectionId) {
            return {
              ...section,
              tables: section.tables.filter(
                (table) => table.table_id !== tableId
              ),
              totalTables: section.totalTables - 1,
            };
          }
          return section;
        })
      );

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
          table_id: (tableId || "").toString(),
        }),
      });

      if (data.st === 1) {
        toast.show({
          description: "Table deleted successfully",
          status: "success",
        });
      } else {
        throw new Error(data.msg || "Failed to delete table");
      }
    } catch (error) {
      console.error("Delete Table Error:", error);
      setSections(originalSections);
      toast.show({
        description: error.message || "Failed to delete table",
        status: "error",
      });
    } finally {
      // Remove table from deleting set
      setDeletingTables((prev) => {
        const next = new Set(prev);
        next.delete(tableId);
        return next;
      });
    }
  };

  // Get the last table from the section's tables
  const getLastTable = (sectionTables) => {
    if (!sectionTables || sectionTables.length === 0) return null;
    return sectionTables[sectionTables.length - 1];
  };

  // Add this function for pull to refresh
  const onRefresh = useCallback(async () => {
    if (isQRModalOpen || showQRModal) {
      console.log("Skipping refresh because QR modal is open");
      return;
    }
    try {
      setRefreshing(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (storedOutletId) {
        await fetchSections(parseInt(storedOutletId));
        toast.show({
          description: "Tables refreshed",
          status: "success",
          duration: 1000,
        });
      }
    } catch (error) {
      console.error("Refresh Error:", error);
      toast.show({
        description: "Failed to refresh tables",
        status: "error",
      });
    } finally {
      setRefreshing(false);
    }
  }, [isQRModalOpen, showQRModal]);

  // Replace the auto-refresh useEffect with this optimized version
  useEffect(() => {
    refreshInterval.current = setInterval(async () => {
      try {
        // Only refresh if no modal is open and we're not already doing something
        if (isQRModalOpen || showQRModal || showDeleteModal || deletingSections.size > 0) {
          console.log("Skipping auto-refresh because of active UI state");
          return;
        }
        
        // Set background refreshing flag (won't show spinner)
        setBackgroundRefreshing(true);
        
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          // Use the silent refresh function instead
          await silentRefreshSections(parseInt(storedOutletId));
        }
      } catch (error) {
        console.error("Auto Refresh Error:", error);
      } finally {
        setBackgroundRefreshing(false);
      }
    }, 60000); // Every minute

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [isQRModalOpen, showQRModal, showDeleteModal, deletingSections.size]);

  // Add a new function for silent refresh without global loading state
  const silentRefreshSections = async (outletId) => {
    try {
      // Don't set loading state here - that's the key difference
      
      // Create a timestamp to track this specific refresh
      const refreshTimestamp = Date.now();
      console.log(`Starting background refresh ${refreshTimestamp}`);
      
      // Make the API call
      const data = await fetchWithAuth(`${getBaseUrl()}/table_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
        }),
      });

      console.log(`Background refresh ${refreshTimestamp} received response:`, data.st);

      if (data.st === 1) {
        // Process the data (same as in fetchSections)
        const processedSections = data.data.map((section) => ({
          id: section.section_id,
          name: section.section_name,
          tables: section.tables.map((table) => ({
            ...table,
            timeSinceOccupied: calculateTimeDifference(table.occupied_time),
            isInAlarmState: isTableInAlarmState(table.occupied_time),
            action: table.action || (table.is_occupied === 1 ? "placed" : null),
          })),
          totalTables: section.tables.length,
          engagedTables: section.tables.filter(
            (table) => table.is_occupied === 1
          ).length,
        }));

        // Use a functional state update to ensure we're working with fresh state
        setSections(currentSections => {
          // Compare and merge data (for a smoother update)
          const mergedSections = processedSections.map(newSection => {
            // Find this section in current state (if it exists)
            const existingSection = currentSections.find(s => s.id === newSection.id);
            
            if (!existingSection) return newSection;
            
            // Merge tables data to preserve any local UI state
            const mergedTables = newSection.tables.map(newTable => {
              const existingTable = existingSection.tables.find(t => 
                t.table_id === newTable.table_id
              );
              
              if (!existingTable) return newTable;
              
              // Preserve UI states like deletingTables, updatingStatus, etc.
              return {
                ...newTable,
                isLoading: existingTable.isLoading || false,
              };
            });
            
            return {
              ...newSection,
              tables: mergedTables,
            };
          });
          
          return mergedSections;
        });
        
        // Update active section if needed
        if (processedSections.length > 0 && !activeSection) {
          setActiveSection(processedSections[0]);
        }
      }
    } catch (error) {
      console.error("Silent Refresh Error:", error);
      // No toast notification for background refresh errors
    }
  };

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

    // Store original sections state for rollback
    const originalSections = [...sections];
    const originalEditingId = editingSectionId;

    try {
      // Add section to updating set
      setUpdatingSections((prev) => new Set([...prev, section.id]));

      // Optimistically update the UI
      setSections((prevSections) =>
        prevSections.map((s) =>
          s.id === section.id ? { ...s, name: sanitizedText.trim() } : s
        )
      );

      // Optimistically clear editing state
      setEditingSectionId(null);

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
          user_id: storedUserId.toString(),
        }),
      });

      if (data.st === 1) {
        toast.show({
          description: "Section updated successfully",
          status: "success",
        });
      } else {
        throw new Error(data.msg || "Failed to update section");
      }
    } catch (error) {
      console.error("Edit Section Error:", error);

      // Rollback on error
      setSections(originalSections);
      setEditingSectionId(originalEditingId);

      toast.show({
        description: error.message || "Failed to update section",
        status: "error",
      });
    } finally {
      // Remove section from updating set
      setUpdatingSections((prev) => {
        const next = new Set(prev);
        next.delete(section.id);
        return next;
      });
    }
  };

  // Update the renderGridView function's table rendering logic
  const renderGridView = (sections) => (
    <VStack space={4} p={2} pb={showEditIcons ? 16 : 8}>
      {sections.map((section) => {
        // Filter tables based on current criteria (search and status filter)
        const filteredTables = getFilteredTables(section.tables, section.name);

        // Skip this section entirely if no tables match the filter criteria
        if (filteredTables.length === 0 && filterStatus !== "all") {
          return null;
        }

        const tablesByRow = getTablesByRow(section.tables, section.name);
        const hasNoTables = !section.tables || section.tables.length === 0;

        return (
          <Box key={section.id} mb={2}>
            <Box bg="white" p={4} rounded="lg" shadow={1}>
              <VStack space={4}>
                {/* Section Header */}
                <VStack space={1}>
                  <HStack justifyContent="space-between" alignItems="center">
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
                        flex={1}
                        maxWidth="70%"
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
                        isDisabled={updatingSections.has(section.id)}
                      />
                    ) : (
                      <HStack space={2} alignItems="center" flex={1} maxWidth="70%">
                        <Text fontSize="lg" fontWeight="bold" numberOfLines={1} ellipsizeMode="tail">
                          {section.name}
                        </Text>
                        {updatingSections.has(section.id) && (
                          <Spinner size="sm" color="blue.500" />
                        )}
                      </HStack>
                    )}

                    {showEditIcons && (
                      <HStack space={2} alignItems="center" ml="auto">
                        {editingSectionId === section.id ? (
                          // Show confirm and cancel buttons when editing
                          <>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              colorScheme="green"
                              icon={
                                updatingSections.has(section.id) ? (
                                  <Spinner size="sm" color="green.500" />
                                ) : (
                                  <MaterialIcons
                                    name="check"
                                    size={20}
                                    color="green.500"
                                  />
                                )
                              }
                              onPress={() => {
                                if (editedSectionName) {
                                  handleEditSectionNameChange(section);
                                }
                              }}
                              isDisabled={updatingSections.has(section.id)}
                            />
                            <IconButton
                              size="sm"
                              variant="ghost"
                              colorScheme="coolGray"
                              icon={
                                <MaterialIcons
                                  name="close"
                                  size={20}
                                  color="coolGray.500"
                                />
                              }
                              onPress={() => setEditingSectionId(null)}
                              isDisabled={updatingSections.has(section.id)}
                            />
                          </>
                        ) : (
                          // Show edit and delete buttons when not editing
                          <>
                            <IconButton
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              icon={
                                <MaterialIcons
                                  name="edit"
                                  size={20}
                                  color="blue.500"
                                />
                              }
                              onPress={() => {
                                setEditingSectionId(section.id);
                                setEditedSectionName(section.name);
                              }}
                              isDisabled={deletingSections.has(section.id)}
                            />
                            <IconButton
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              icon={
                                deletingSections.has(section.id) ? (
                                  <Spinner size="sm" color="red.500" />
                                ) : (
                                  <MaterialIcons
                                    name="delete"
                                    size={20}
                                    color="red.500"
                                  />
                                )
                              }
                              onPress={() => {
                                setActiveSection(section);
                                setShowDeleteModal(true);
                              }}
                              isDisabled={deletingSections.has(section.id)}
                            />
                          </>
                        )}
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
                      {section.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "No tables match the current status filter."
                        : "No tables match the current filter."}
                    </Text>
                  </Center>
                ) : (
                  <VStack space={0}>
                    <VStack space={2}>
                      {Object.entries(tablesByRow).map(([rowIndex, row]) => (
                        <HStack
                          key={rowIndex}
                          px={0}
                          py={3} // Consistent vertical spacing for all rows
                          alignItems="center"
                          justifyContent="space-evenly" // More evenly spaced tables
                        >
                          {Array.from({ length: 3 }).map((_, colIndex) => {
                            // Calculate the absolute index for this position
                            const absoluteIndex =
                              parseInt(rowIndex) * 3 + colIndex;

                            // Is this position immediately after the last table?
                            const isAddTableSlot =
                              showEditIcons &&
                              absoluteIndex === section.tables.length;

                            const table = row[colIndex];
                            const isOccupied = table?.is_occupied === 1;

                            // If this is a place for the add button
                            if (isAddTableSlot) {
                              return (
                                <Box
                                  key={`${rowIndex}-${colIndex}`}
                                  width="31%" // Keep this or adjust as needed
                                  minW="100px" // Slightly wider since there are fewer columns
                                  height="100px"
                                  mx="1%"
                                  my="1.5%"
                                >
                                  <Pressable
                                    onPress={() => {
                                      setActiveSection(section);
                                      setSelectedSection(section.id);
                                      handleCreateTable(); // Call handleCreateTable directly
                                    }}
                                  >
                                    <Box
                                      rounded="lg"
                                      width="100%"
                                      height="100%"
                                      borderWidth={1}
                                      borderStyle="dashed"
                                      borderColor="#0dcaf0"
                                      bg="#f8f9fa"
                                      display="flex"
                                      justifyContent="center"
                                      alignItems="center"
                                    >
                                      <Box bg="blue.400" rounded="full" p={2}>
                                        <MaterialIcons
                                          name="add"
                                          size={24}
                                          color="white"
                                        />
                                      </Box>
                                    </Box>
                                  </Pressable>
                                </Box>
                              );
                            }

                            // Create placeholder for empty slots to maintain grid structure
                            if (!table) {
                              return (
                                <Box
                                  key={`${rowIndex}-${colIndex}`}
                                  width="31%" // Keep this or adjust as needed
                                  minW="100px" // Slightly wider since there are fewer columns
                                  height="100px"
                                  mx="1%"
                                  my="1.5%"
                                />
                              );
                            }

                            return (
                              <Box
                                key={`${rowIndex}-${colIndex}`}
                                width="31%" // Keep this or adjust as needed
                                minW="100px" // Slightly wider since there are fewer columns
                                height="100px"
                                mx="1%"
                                my="1.5%"
                              >
                                {table ? (
                                  <Pressable
                                    onPress={() =>
                                      handleTablePress(table, section)
                                    }
                                  >
                                    <Box
                                      p={2}
                                      rounded="lg"
                                      width="100%"
                                      height="100%"
                                      bg={
                                        table.isLoading
                                          ? "#f0f0f0" // Light gray for loading state
                                          : isOccupied
                                          ? table.action === "print_and_save"
                                            ? "#fff3e0" // Print & Save - Light orange background
                                            : table.action === "KOT_and_save"
                                            ? "#e2e2e2" // KOT & Save - Grey background
                                            : table.action === "create_order"
                                            ? "#ffcdd2" // Create order - Light red background
                                            : table.action === "placed"
                                            ? "#ffcdd2" // Placed - Light red background
                                            : "#ffcdd2" // Standard occupied - Light red background
                                          : table.is_reserved
                                          ? "#e0e0e0" // Reserved - Gray background
                                          : "#e8f5e9" // Available - Light green background
                                      }
                                      borderWidth={1}
                                      borderStyle="dashed"
                                      borderColor={
                                        table.isLoading
                                          ? "#aaaaaa" // Gray border for loading
                                          : isOccupied
                                          ? table.action === "print_and_save"
                                            ? "#ff9800" // Print & Save - Orange border
                                            : table.action === "KOT_and_save"
                                            ? "#000000" // KOT & Save - Black border
                                            : table.action === "create_order"
                                            ? "#dc3545" // Create order - Red
                                            : table.action === "placed"
                                            ? "#dc3545" // Placed - Red
                                            : "#2196f3" // Regular occupied - Blue
                                          : table.is_reserved
                                          ? "#757575" // Reserved - Gray border
                                          : "#198754" // Available - Green border
                                      }
                                      position="relative"
                                      justifyContent="center"
                                      alignItems="center"
                                    >
                                      {/* Show spinner for loading tables */}
                                      {table.isLoading ? (
                                        <VStack
                                          space={2}
                                          alignItems="center"
                                          justifyContent="center"
                                        >
                                          <Spinner size="sm" color="gray.500" />
                                          <Text
                                            fontSize={16}
                                            fontWeight="medium"
                                            color="gray.500"
                                          >
                                            {table.table_number}
                                          </Text>
                                        </VStack>
                                      ) : (
                                        <>
                                          {/* Price banner for occupied tables */}
                                          {isOccupied && (
                                            <Box
                                              position="absolute"
                                              top={-15} // Move higher up
                                              left={3}
                                              right={15}
                                              mx="auto" // Center horizontally
                                              width="90%" // Adjust width to match screenshots
                                              bg={
                                                table.action ===
                                                "print_and_save"
                                                  ? "#ff9800" // Print & Save - Orange
                                                  : table.action ===
                                                    "KOT_and_save"
                                                  ? "#000000" // KOT & Save - Black
                                                  : table.action ===
                                                    "create_order"
                                                  ? "#dc3545" // Create order - Red
                                                  : table.action === "placed"
                                                  ? "#dc3545" // Placed - Red
                                                  : "#dc3545" // Regular occupied - Blue
                                              }
                                              py={1}
                                              px={1}
                                              rounded="md"
                                              shadow={1}
                                              zIndex={1}
                                              alignItems="center"
                                              alignSelf="center"
                                            >
                                              <Text
                                                color="white"
                                                fontSize="xs" // Smaller text
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

                                          {/* Reserved label */}
                                          {table.is_reserved && (
                                            <Box
                                              position="absolute"
                                              top={-10}
                                              left="75%"
                                              style={{
                                                transform: [
                                                  { translateX: -55 },
                                                ],
                                              }}
                                              bg="gray.500"
                                              px={2}
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

                                          {/* Printer icon - always show for occupied tables */}
                                          {isOccupied && table.order_id && (
                                            <Box
                                              position="absolute"
                                              style={{
                                                left: "50%",
                                                bottom: "50%",
                                                transform: [
                                                  { translateX: -10 },
                                                  { translateY: 56 },
                                                ],
                                                zIndex: 2,
                                              }}
                                            >
                                              <Pressable
                                                onPress={() =>
                                                  handlePaymentIconPress(
                                                    table,
                                                    section
                                                  )
                                                }
                                                bg={
                                                  table.action ===
                                                  "print_and_save"
                                                    ? "#ff9800" // Print & Save - Orange
                                                    : table.action ===
                                                      "KOT_and_save"
                                                    ? "#000000" // KOT & Save - Black
                                                    : table.action ===
                                                      "create_order"
                                                    ? "#dc3545" // Create order - Red
                                                    : "#dc3545" // Default orange
                                                }
                                                w={8}
                                                h={8}
                                                rounded="full"
                                                shadow={2}
                                                alignItems="center"
                                                justifyContent="center"
                                              >
                                                <MaterialIcons
                                                  name="print"
                                                  size={22}
                                                  color="white"
                                                />
                                              </Pressable>
                                            </Box>
                                          )}

                                          {/* QR icon - only show when gear is active */}
                                          {showEditIcons && (
                                            <Box
                                              position="absolute"
                                              bottom={1} // Changed from 8 to 2
                                              right={1} // Changed from 8 to 2
                                              zIndex={2}
                                            >
                                              <Pressable
                                                onPress={() =>
                                                  handleQRIconPress(
                                                    table,
                                                    section
                                                  )
                                                }
                                                bg="transparent"
                                                rounded="full"
                                                size={8}
                                                w={8}
                                                h={8}
                                                shadow={0}
                                                alignItems="center"
                                                justifyContent="center"
                                                style={{
                                                  shadowOpacity: 0,
                                                  elevation: 0,
                                                  backgroundColor:
                                                    "transparent",
                                                }}
                                              >
                                                <MaterialIcons
                                                  name="qr-code"
                                                  size={22}
                                                  color="#0891b2"
                                                />
                                              </Pressable>
                                            </Box>
                                          )}

                                          {/* Reserve button with lock icon - only show when gear is active and table is NOT occupied */}
                                          {showEditIcons && table.is_occupied !== 1 && (
                                            <Box
                                              position="absolute"
                                              bottom={1}
                                              left={1}
                                              zIndex={2}
                                            >
                                              <Pressable
                                                onPress={() => {
                                                  handleTableReservation(table);
                                                }}
                                                rounded="full"
                                                size={8}
                                                w={8}
                                                h={8}
                                                alignItems="center"
                                                justifyContent="center"
                                              >
                                                <MaterialIcons
                                                  name={table.is_reserved ? "lock-open" : "lock-outline"}
                                                  size={18}
                                                  color={table.is_reserved ? "#000" : "#ef4444"}
                                                />
                                              </Pressable>
                                            </Box>
                                          )}

                                          {/* Delete icon for last table */}
                                          {showEditIcons &&
                                            table.table_id ===
                                              getLastTable(section.tables)
                                                ?.table_id &&
                                            table.is_occupied === 0 && (
                                              <IconButton
                                                position="absolute"
                                                top={-6}
                                                right={-6}
                                                zIndex={2}
                                                size="sm"
                                                rounded="full"
                                                bg="white"
                                                shadow={2}
                                                _pressed={{ bg: "gray.100" }}
                                                _hover={{ bg: "gray.50" }}
                                                icon={
                                                  deletingTables.has(
                                                    table.table_id
                                                  ) ? (
                                                    <Spinner
                                                      size="sm"
                                                      color="red.500"
                                                    />
                                                  ) : (
                                                    <MaterialIcons
                                                      name="delete"
                                                      size={16}
                                                      color="red"
                                                    />
                                                  )
                                                }
                                                onPress={() =>
                                                  handleDeleteTable(
                                                    section.id,
                                                    table.table_id
                                                  )
                                                }
                                                isDisabled={deletingTables.has(
                                                  table.table_id
                                                )}
                                              />
                                            )}

                                          <VStack
                                            space={2}
                                            alignItems="center"
                                            justifyContent="center"
                                            height="100%"
                                          >
                                            <HStack
                                              space={1}
                                              alignItems="center"
                                            >
                                              {/* Blinker indicator - matching owner app conditions exactly */}
                                              {(table.action ===
                                                "KOT_and_save" ||
                                                table.action ===
                                                  "print_and_save" ||
                                                table.action ===
                                                  "create_order" ||
                                                table.action === "placed") && (
                                                <Animated.View
                                                  style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: "#dc3545",
                                                    marginRight: 4,
                                                    opacity: blinkAnimation,
                                                  }}
                                                />
                                              )}
                                              <Text
                                                fontSize={16}
                                                fontWeight="bold"
                                                textAlign="center"
                                                color="black"
                                              >
                                                {table.table_number}
                                              </Text>
                                            </HStack>
                                            {isOccupied && (
                                              <Text
                                                fontSize={14}
                                                mt={-2}
                                                color={
                                                  table.timeSinceOccupied &&
                                                  (table.timeSinceOccupied.includes(
                                                    "3h+"
                                                  ) ||
                                                    (table.timeSinceOccupied.includes(
                                                      "m"
                                                    ) &&
                                                      parseInt(
                                                        table.timeSinceOccupied.split(
                                                          "m"
                                                        )[0]
                                                      ) > 45))
                                                    ? "#dc3545" // Red for tables occupied > 45 min
                                                    : "#555" // Regular gray otherwise
                                                }
                                                textAlign="center"
                                                fontWeight={
                                                  table.timeSinceOccupied &&
                                                  (table.timeSinceOccupied.includes(
                                                    "3h+"
                                                  ) ||
                                                    (table.timeSinceOccupied.includes(
                                                      "m"
                                                    ) &&
                                                      parseInt(
                                                        table.timeSinceOccupied.split(
                                                          "m"
                                                        )[0]
                                                      ) > 45))
                                                    ? "bold"
                                                    : "normal"
                                                }
                                              >
                                                {table.timeSinceOccupied ||
                                                  "3h+"}
                                              </Text>
                                            )}
                                          </VStack>
                                        </>
                                      )}
                                    </Box>
                                  </Pressable>
                                ) : isAddTableSlot ? (
                                  <Pressable
                                    onPress={() => {
                                      setSelectedSection(section.id);
                                      handleCreateTable(); // Call handleCreateTable directly
                                    }}
                                  >
                                    <Box
                                      p={2}
                                      rounded="lg"
                                      width="31%"
                                      minW="90px"
                                      height="100px"
                                      mx="1%"
                                      my="1.5%"
                                      borderWidth={1}
                                      borderStyle="dashed"
                                      borderColor="#0dcaf0"
                                      justifyContent="center"
                                      alignItems="center"
                                      bg="#f8f9fa"
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
                                  // Empty slot - render nothing visible
                                  <Box width={24} height={18} />
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
        );
      })}
    </VStack>
  );

  // Add DeleteConfirmationModal component
  const DeleteConfirmationModal = () => {
    const hasOccupiedTables =
      activeSection?.tables?.some((table) => table.is_occupied === 1) || false;
    const isDeleting = deletingSections.has(activeSection?.id);

    console.log("DeleteConfirmationModal render", {
      hasOccupiedTables,
      isDeleting,
      activeSectionId: activeSection?.id,
      deletingSections: Array.from(deletingSections),
    });

    return (
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            console.log("Closing delete modal");
            setShowDeleteModal(false);
            // Clear active section when modal is closed
            setActiveSection(null);
          }
        }}
      >
        <Modal.Content maxWidth="400px">
          <Modal.CloseButton disabled={isDeleting} />
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
                  isDisabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  onPress={handleDeleteSection}
                  isDisabled={isDeleting}
                  leftIcon={
                    isDeleting ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <Icon
                        as={MaterialIcons}
                        name="delete"
                        size="sm"
                        color="white"
                      />
                    )
                  }
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </HStack>
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    );
  };

  const handleDeleteSection = async () => {
    console.log("Starting delete section process", {
      activeSection,
      currentSections: sections,
    });

    // Early validation for occupied tables
    const hasOccupiedTables = activeSection?.tables?.some(
      (table) => table.is_occupied === 1
    );
    if (hasOccupiedTables) {
      console.log("Blocked deletion - section has occupied tables");
      toast.show({
        description: "Cannot delete section with occupied tables",
        status: "warning",
      });
      return;
    }

    // Store original state for rollback
    const originalSections = [...sections];
    const sectionToDelete = { ...activeSection }; // Create a copy of activeSection

    console.log("Starting optimistic update", {
      sectionToDelete: sectionToDelete?.id,
      sectionsCount: sections.length,
    });

    try {
      // Add to deleting set BEFORE UI updates
      setDeletingSections((prev) => {
        const next = new Set(prev).add(sectionToDelete.id);
        console.log("Added to deletingSections", {
          sectionId: sectionToDelete.id,
          deletingCount: next.size,
        });
        return next;
      });

      // Close modal immediately for better UX
      setShowDeleteModal(false);

      // Optimistically update UI
      setSections((prevSections) => {
        const updatedSections = prevSections.filter(
          (s) => s.id !== sectionToDelete.id
        );
        console.log("Optimistically removed section", {
          beforeCount: prevSections.length,
          afterCount: updatedSections.length,
        });
        return updatedSections;
      });

      // Clear active section
      setActiveSection(null);

      // Get user ID without showing loading
      const storedUserId = await AsyncStorage.getItem("user_id");
      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }

      console.log("Making API call to delete section", {
        sectionId: sectionToDelete.id,
        outletId,
      });

      // Make API call
      const data = await fetchWithAuth(`${getBaseUrl()}/section_delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: sectionToDelete.id.toString(),
          user_id: storedUserId.toString(),
        }),
      });

      console.log("API Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Section deleted successfully",
          status: "success",
          duration: 2000,
        });

        // No need to fetch sections again, UI is already updated
      } else {
        throw new Error(data.msg || "Failed to delete section");
      }
    } catch (error) {
      console.error("Delete Section Error:", error, {
        sectionId: sectionToDelete?.id,
        originalSectionsCount: originalSections.length,
      });

      // Rollback UI changes
      console.log("Rolling back UI changes");
      setSections(originalSections);
      setActiveSection(sectionToDelete); // Restore active section on error
      setShowDeleteModal(true); // Reopen modal on error

      toast.show({
        description: error.message || "Failed to delete section",
        status: "error",
        duration: 3000,
      });
    } finally {
      // Clear deleting state
      setDeletingSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionToDelete?.id);
        console.log("Cleared deletingSections", {
          sectionId: sectionToDelete?.id,
          remainingCount: next.size,
        });
        return next;
      });
    }
  };

  const handleCreateTable = async () => {
    // Get section ID
    const sectionId = selectedSection || activeSection?.id;

    if (!sectionId) {
      toast.show({
        description: "No section selected. Please select a section first.",
        status: "error",
      });
      return;
    }

    // Optimistically add a temporary table with loading state
    const tempId = `temp-${Date.now()}`;
    let lastTableNumber = 0;

    // Find the section and get the last table number
    setSections((prevSections) => {
      const updatedSections = prevSections.map((section) => {
        if (section.id === parseInt(sectionId)) {
          // Find the highest table number in this section
          const tables = section.tables || [];
          if (tables.length > 0) {
            tables.forEach((table) => {
              const tableNum = parseInt(table.table_number);
              if (!isNaN(tableNum) && tableNum > lastTableNumber) {
                lastTableNumber = tableNum;
              }
            });
          }

          // Create a temporary table with next number
          const tempTable = {
            table_id: tempId,
            table_number: (lastTableNumber + 1).toString(),
            is_occupied: 0,
            outlet_id: outletId,
            timeSinceOccupied: "",
            isInAlarmState: false,
            is_reserved: false,
            isLoading: true, // Add loading state
          };

          return {
            ...section,
            tables: [...section.tables, tempTable],
            totalTables: section.totalTables + 1,
          };
        }
        return section;
      });

      return updatedSections;
    });

    // Now make the actual API call (without setting global loading state)
    try {
      const storedUserId = await AsyncStorage.getItem("user_id");

      if (!storedUserId) {
        throw new Error("User ID not found. Please login again.");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/table_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          section_id: sectionId.toString(),
          user_id: storedUserId.toString(),
        }),
      });

      console.log("Create Table Response:", data);

      if (data.st === 1) {
        // Success - replace temp table with actual table data
        setSections((prevSections) => {
          return prevSections.map((section) => {
            if (section.id === parseInt(sectionId)) {
              // Get tables without the temp
              const tablesWithoutTemp = section.tables.filter(
                (t) => t.table_id !== tempId
              );

              // Create real table object with data from API or fallback to our temp data
              const newTable = {
                table_id: data.data?.id || data.data?.table_id || Date.now(),
                table_number:
                  data.data?.table_number || (lastTableNumber + 1).toString(),
                is_occupied: 0,
                outlet_id: outletId,
                timeSinceOccupied: "",
                isInAlarmState: false,
                is_reserved: false,
              };

              return {
                ...section,
                tables: [...tablesWithoutTemp, newTable],
              };
            }
            return section;
          });
        });

        toast.show({
          description: "Table created successfully",
          status: "success",
        });
      } else {
        // API returned error - remove the temp table
        setSections((prevSections) => {
          return prevSections.map((section) => {
            if (section.id === parseInt(sectionId)) {
              return {
                ...section,
                tables: section.tables.filter((t) => t.table_id !== tempId),
                totalTables: section.totalTables - 1,
              };
            }
            return section;
          });
        });

        throw new Error(data.msg || "Failed to create table");
      }
    } catch (error) {
      console.error("Create Table Error:", error);

      // Remove the temporary table on error
      setSections((prevSections) => {
        return prevSections.map((section) => {
          if (section.id === parseInt(sectionId)) {
            return {
              ...section,
              tables: section.tables.filter((t) => t.table_id !== tempId),
              totalTables: section.totalTables - 1,
            };
          }
          return section;
        });
      });

      toast.show({
        description: error.message || "Failed to create table",
        status: "error",
      });
    }
  };

  // You can remove or comment out the CreateTableModal component
  // since it's not being used anymore
  // const CreateTableModal = () => (...)

  // Add this handler function at component level
  const handleSectionNameChange = (text) => {
    // Only allow letters and spaces
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setNewSectionName(sanitizedText);
  };

  const handleTableReservation = async (table) => {
    try {
      // Set loading state but don't show a global loading spinner
      setUpdatingStatus(true);
      
      // Optimistically update UI immediately - before API call
      setSections(prevSections => 
        prevSections.map(section => ({
          ...section,
          tables: section.tables.map(t => 
            t.table_id === table.table_id 
              ? { ...t, is_reserved: !t.is_reserved }
              : t
          )
        }))
      );
      
      // Show toast notification for immediate feedback
      toast.show({
        description: table.is_reserved 
          ? "Removing reservation..." 
          : "Reserving table...",
        status: "info",
        duration: 1000
      });

      // Get stored outlet ID and user ID
      const [storedOutletId, storedUserId] = await Promise.all([
        AsyncStorage.getItem("outlet_id"),
        AsyncStorage.getItem("user_id")
      ]);
      
      if (!storedOutletId || !table.table_id || !storedUserId) {
        throw new Error("Missing outlet, user, or table data");
      }
      
      // Call the API to reserve the table
      const response = await fetchWithAuth(
        `${getBaseUrl()}/table_is_reserved`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            table_id: table.table_id.toString(),
            table_number: table.table_number.toString(),
            outlet_id: storedOutletId.toString(),
            is_reserved: !table.is_reserved, // Toggle the reservation status
            user_id: storedUserId.toString()
          })
        }
      );
      
      if (response.st === 1) {
        // Success - UI already updated, just show success toast
        toast.show({
          description: table.is_reserved 
            ? "Table reservation removed" 
            : "Table has been reserved",
          status: "success",
          duration: 2000
        });
        
        // Remove the need to refresh data - UI is already updated
        // fetchSections(parseInt(storedOutletId)); - REMOVED THIS LINE
      } else {
        // API failed - revert optimistic update
        setSections(prevSections => 
          prevSections.map(section => ({
            ...section,
            tables: section.tables.map(t => 
              t.table_id === table.table_id 
                ? { ...t, is_reserved: table.is_reserved } // Revert to original state
                : t
            )
          }))
        );
        
        toast.show({
          description: response.msg || "Failed to update table reservation",
          status: "error",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Error reserving table:", error);
      
      // Revert optimistic update on error
      setSections(prevSections => 
        prevSections.map(section => ({
          ...section,
          tables: section.tables.map(t => 
            t.table_id === table.table_id 
              ? { ...t, is_reserved: table.is_reserved } // Revert to original state
              : t
          )
        }))
      );
      
      toast.show({
        description: "Failed to update table reservation",
        status: "error",
        duration: 3000
      });
    } finally {
      setUpdatingStatus(false);
    }
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

      Alert.alert("Download QR Code", "Choose format to download", [
        {
          text: "PNG",
          onPress: downloadAsPNG,
        },
        {
          text: "PDF",
          onPress: handlePDFDownload,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
    };

    // Download as PNG - close modal after successful download
    const downloadAsPNG = async () => {
      try {
        setIsDownloading(true);

        // Show loading toast
        toast.show({
          description: "Saving QR code...",
          status: "info",
          duration: 2000,
        });

        // Request permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          toast.show({
            description: "Permission denied to save to gallery",
            status: "error",
          });
          return;
        }

        // Generate a reliable QR code using QRServer API
        const encodedQrValue = encodeURIComponent(qrValue);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedQrValue}&margin=10&color=0066FF&bgcolor=FFFFFF`;
        const filename = `Table_${
          selectedTableForQR?.table_number || "Unknown"
        }_QR_${Date.now()}.png`;
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;

        // Download the QR image
        const downloadResult = await FileSystem.downloadAsync(
          qrApiUrl,
          fileUri
        );

        if (downloadResult.status !== 200) {
          throw new Error("Failed to download QR code image");
        }

        // Save to gallery
        const asset = await MediaLibrary.createAssetAsync(fileUri);

        // Create album if it doesn't exist
        try {
          const album = await MediaLibrary.getAlbumAsync("MenuMitra");
          if (album === null) {
            await MediaLibrary.createAlbumAsync("MenuMitra", asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (error) {
          console.log("Album error (non-critical):", error);
        }

        toast.show({
          description: "QR code saved to gallery",
          status: "success",
          duration: 2000,
        });

        // Close modal on successful download
        setTimeout(() => {
          closeModal();
        }, 1000);
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

    // PDF download function - don't share automatically, just save
    const handlePDFDownload = async () => {
      try {
        setIsDownloading(true);
        toast.show({
          description: "Generating PDF...",
          status: "info",
          duration: 2000,
        });

        // Get outlet name
        const outlet =
          (await AsyncStorage.getItem("outlet_name")) || "MenuMitra";
        const encodedQrValue = encodeURIComponent(qrValue);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedQrValue}&margin=10&color=0066FF&bgcolor=FFFFFF`;

        // Create HTML content for PDF with directly embedded QR code URL
        const tableInfo = `Table ${
          selectedTableForQR?.table_number || "Unknown"
        }`;
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
                .qr-container img { max-width: 100%; height: auto; border: 3px solid #FF7043; border-radius: 10px; padding: 10px; }
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
                  <img src="${qrApiUrl}" width="350" height="350" />
                </div>
                <div class="instructions">
                  Scan this QR code with your smartphone camera to place your order
                </div>
                <div class="footer">
                  &copy; MenuMitra - Digital Menu Solutions
                </div>
              </div>
            </body>
          </html>
        `;

        // Create PDF
        const { uri: pdfUri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false,
        });

        let saveSuccess = false;

        // For Android
        if (Platform.OS === "android") {
          try {
            const asset = await MediaLibrary.createAssetAsync(pdfUri);
            const album = await MediaLibrary.getAlbumAsync("MenuMitra");

            if (album === null) {
              await MediaLibrary.createAlbumAsync("MenuMitra", asset, false);
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }

            toast.show({
              description: "QR code PDF saved to your gallery!",
              status: "success",
              duration: 3000,
            });
            saveSuccess = true;
          } catch (error) {
            console.error("Save to gallery failed:", error);
            // Show error but don't share automatically
            toast.show({
              description: "Could not save PDF to gallery",
              status: "error",
              duration: 3000,
            });
          }
        } else if (Platform.OS === "ios") {
          // iOS doesn't save PDFs to photo library, save to Files
          try {
            await Sharing.shareAsync(pdfUri, {
              UTI: "com.adobe.pdf",
              mimeType: "application/pdf",
              dialogTitle: "Save PDF",
            });
            toast.show({
              description: "Please select 'Save to Files' to save your PDF",
              status: "success",
              duration: 3000,
            });
            saveSuccess = true;
          } catch (error) {
            console.error("iOS save failed:", error);
            toast.show({
              description: "Failed to save PDF",
              status: "error",
              duration: 3000,
            });
          }
        }

        // Close modal on successful save
        if (saveSuccess) {
          setTimeout(() => {
            closeModal();
          }, 1500);
        }
      } catch (error) {
        console.error("PDF Generation Error:", error);
        toast.show({
          description: "Failed to generate PDF: " + error.message,
          status: "error",
          duration: 3000,
        });
      } finally {
        setIsDownloading(false);
      }
    };

    // Share QR code
    const shareQRCode = async () => {
      try {
        setIsSharing(true);

        if (!qrValue) {
          throw new Error("No QR code data available to share");
        }

        // Generate a reliable QR code using QRServer API
        const encodedQrValue = encodeURIComponent(qrValue);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedQrValue}&margin=10&color=0066FF&bgcolor=FFFFFF`;
        const filename = `Table_${
          selectedTableForQR?.table_number || "Unknown"
        }_QR_${Date.now()}.png`;
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;

        // Download the QR image
        const downloadResult = await FileSystem.downloadAsync(
          qrApiUrl,
          fileUri
        );

        if (downloadResult.status !== 200) {
          throw new Error("Failed to download QR code image for sharing");
        }

        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: "image/png",
          dialogTitle: `Table ${selectedTableForQR?.table_number} QR Code`,
        });

        // Cleanup after sharing
        setTimeout(async () => {
          try {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          } catch (e) {
            console.log("Cleanup error (non-critical):", e);
          }
        }, 3000);
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
              <Icon
                as={MaterialIcons}
                name="close"
                size="md"
                color="coolGray.500"
              />
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
                {/* QR Container */}
                <Box
                  bg="white"
                  p={4}
                  borderWidth={3}
                  borderColor="coolGray.400"
                  borderRadius="lg"
                  position="relative"
                >
                  {/* Render QR code directly from API */}
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                        qrValue
                      )}&margin=10&color=0066FF&bgcolor=FFFFFF`,
                    }}
                    alt="QR Code"
                    width={250}
                    height={250}
                    resizeMode="contain"
                  />
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
                    disabled={isDownloading || isSharing}
                    opacity={isDownloading || isSharing ? 0.7 : 1}
                  >
                    {isDownloading ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <HStack space={2} alignItems="center">
                        <Icon
                          as={MaterialIcons}
                          name="download"
                          size="sm"
                          color="white"
                        />
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
                    disabled={isDownloading || isSharing}
                    opacity={isDownloading || isSharing ? 0.7 : 1}
                  >
                    {isSharing ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <HStack space={2} alignItems="center">
                        <Icon
                          as={MaterialIcons}
                          name="share"
                          size="sm"
                          color="white"
                        />
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
                <Text mt={4} color="coolGray.600">
                  Loading QR code...
                </Text>
              </Center>
            )}
          </Box>
        </Box>
      </Modal>
    );
  };

  // Update handleQRIconPress to fetch sections first if needed
  const handleQRIconPress = async (table, section) => {
    setIsLoadingQr(true);
    setIsQRModalOpen(true);
    setShowQRModal(true);
    setQrReady(false);
    setQrRenderAttempt((prev) => prev + 1);
    setSelectedTableForQR({
      ...table,
      section_id: section.id,
    });

    try {
      // Make sure we have the latest section data
      await fetchSectionsForQR();

      const data = await fetchWithAuth(`${getBaseUrl()}/send_qr_link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          table_id: table.table_id.toString(),
          section_id: section.id.toString(),
        }),
      });

      console.log("QR Response:", data);

      if (
        !data.user_app_url ||
        !data.outlet_code ||
        !data.section_id ||
        !data.table_number
      ) {
        throw new Error("Invalid QR code data received");
      }

      // Generate the QR URL with proper format and encoding
      const qrUrl = `${data.user_app_url}o${data.outlet_code}/s${data.section_id}/t${data.table_number}`;
      console.log("Generated QR URL:", qrUrl);

      // Set QR data
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
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // If app comes back to foreground and QR modal is open, we might need to re-render
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        isQRModalOpen
      ) {
        // Force QR code re-render by incrementing the counter
        setQrRenderAttempt((prev) => prev + 1);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isQRModalOpen]);

  // Update the getRestaurantName function to use AsyncStorage
  const getRestaurantName = useCallback(async () => {
    try {
      const name = await AsyncStorage.getItem("outlet_name");
      if (name) {
        setRestaurantName(name);
      }
    } catch (error) {
      console.error("Error getting restaurant name:", error);
    }
  }, []);

  // Call getRestaurantName when component mounts
  useEffect(() => {
    getRestaurantName();
  }, [getRestaurantName]);

  // Update the animation implementation
  const startBlinkAnimation = () => {
    // Reset value before starting animation
    blinkAnimation.setValue(0);

    // Create the animation sequence
    const animate = () => {
      Animated.sequence([
        Animated.timing(blinkAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(blinkAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ]).start(() => {
        // Recursively call animate to ensure continuous blinking
        animate();
      });
    };

    // Start the animation
    animate();
  };

  useEffect(() => {
    let isSubscribed = true;

    if (isSubscribed) {
      startBlinkAnimation();
    }

    return () => {
      isSubscribed = false;
      // Ensure proper cleanup
      blinkAnimation.stopAnimation();
      blinkAnimation.setValue(0);
    };
  }, []); // Empty dependency array to run only once

  // Updated payment icon press handler to match RestaurantTables.js pattern
  const handlePaymentIconPress = (table, section) => {
    // Reset states
    setPaymentSuccess(false);
    setPaymentLoading(false);

    // Store table and section info
    setSelectedTable({
      ...table,
      section_name: section.name,
      section_id: section.id,
    });

    // Set default payment method
    if (table.payment_method) {
      setSelectedPaymentMethod(table.payment_method.toLowerCase());
    } else {
      setSelectedPaymentMethod("cash"); // Default to cash in our case
    }

    // Set paid to false by default
    setIsPaid(false);

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
        duration: 2000,
      });
      return;
    }

    // Make sure table has all required properties
    if (!selectedTable || !selectedTable.order_id) {
      toast.show({
        description: "Order information is incomplete",
        status: "error",
        duration: 2000,
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

      // Get the order type (defaults to dine-in for table orders)
      const orderType = selectedTable.order_type || "dine-in";

      // Prepare request payload
      const settleRequestBody = {
        outlet_id: outletId.toString(),
        order_id: selectedTable.order_id.toString(),
        order_status: "paid", // "paid" to match API requirements
        user_id: storedUserId.toString(),
        is_paid: isPaid ? "paid" : "0",
        order_type: orderType,
        tables: [{ table_no: selectedTable.table_number.toString() }],
        section_id: selectedTable.section_id.toString(),
        payment_method: selectedPaymentMethod.toLowerCase(), // Ensure lowercase for API
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

  // Replace the PaymentModal component implementation with the imported one
  const renderPaymentModal = () => (
    <PaymentModal 
        isOpen={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
      tableData={selectedTable}
      paymentSuccess={paymentSuccess}
      paymentLoading={paymentLoading}
      selectedPaymentMethod={selectedPaymentMethod}
      setSelectedPaymentMethod={setSelectedPaymentMethod}
      isPaid={isPaid}
      setIsPaid={setIsPaid}
      onSettlePayment={handleSettlePayment}
    />
  );

  const handleToggleStatus = async (sectionId, currentStatus) => {
    try {
      setUpdatingStatus(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      const response = await fetchWithAuth(
        `${getBaseUrl()}/update_active_status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: storedOutletId,
            type: "section",
            id: sectionId.toString(),
            is_active: !currentStatus,
          }),
        }
      );

      if (response.st === 1) {
        // Update the local state
        setSections((prevSections) =>
          prevSections.map((section) =>
            section.section_id === sectionId
              ? { ...section, is_active: !currentStatus }
              : section
          )
        );

        toast.show({
          description: `Section ${
            !currentStatus ? "activated" : "deactivated"
          } successfully`,
          status: "success",
        });
      } else {
        throw new Error(response.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Update Status Error:", error);
      toast.show({
        description: "Failed to update section status",
        status: "error",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderListView = (sections) => (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            try {
              setRefreshing(true);
              const storedOutletId = await AsyncStorage.getItem("outlet_id");
              if (storedOutletId) {
                await fetchSections(parseInt(storedOutletId));
              }
            } catch (error) {
              console.error("Pull to refresh error:", error);
              toast.show({
                description: "Failed to refresh tables",
                status: "error",
              });
            } finally {
              setRefreshing(false);
            }
          }}
          colors={["#0891b2"]} // For Android
          tintColor="#0891b2" // For iOS
        />
      }
    >
      <VStack space={3} p={4}>
        {sections.map((section) => (
          <Pressable
            key={section.section_id}
            onPress={() => handleSectionPress(section)}
          >
            <Box
              bg="white"
              p={4}
              rounded="lg"
              shadow={2}
              borderWidth={1}
              borderColor={
                activeSection?.section_id === section.section_id
                  ? "primary.500"
                  : "coolGray.200"
              }
            >
              <HStack justifyContent="space-between" alignItems="center">
                <VStack space={1} flex={1}>
                  <HStack space={2} alignItems="center">
                    <Text fontSize="lg" fontWeight="bold">
                      {section.section_name}
                    </Text>
                    <Badge
                      colorScheme={section.is_active ? "success" : "danger"}
                      variant="subtle"
                      rounded="full"
                    >
                      {section.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </HStack>
                  <Text color="coolGray.600">
                    {section.tables?.length || 0} Tables
                  </Text>
                </VStack>
                <HStack space={2} alignItems="center">
                  <Switch
                    size="md"
                    onToggle={() => {
                      handleToggleStatus(section.section_id, section.is_active);
                    }}
                    isChecked={section.is_active}
                    isDisabled={updatingStatus}
                    colorScheme="primary"
                    _light={{
                      onTrackColor: "primary.500",
                      onThumbColor: "white",
                      offTrackColor: "coolGray.200",
                      offThumbColor: "coolGray.400",
                    }}
                  />
                  <Icon
                    as={MaterialIcons}
                    name="chevron-right"
                    size={6}
                    color="coolGray.400"
                  />
                </HStack>
              </HStack>
            </Box>
          </Pressable>
        ))}
      </VStack>
    </ScrollView>
  );

  // Update the fetchRestaurantQRCode function to include correct parameters
  const fetchSectionsForQR = async () => {
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

      const data = await fetchWithAuth(`${getBaseUrl()}/table_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId.toString(),
        }),
      });

      if (data.st === 1 && data.data) {
        // Process sections data if needed
        console.log("Sections for QR fetched successfully");
      }
    } catch (error) {
      console.error("Error fetching sections for QR:", error);
    }
  };

  // Update the useEffect that handles section fetching
  useEffect(() => {
    const refreshSections = async () => {
      // Skip refresh if modal is open or deletion is in progress
      if (showDeleteModal || deletingSections.size > 0) {
        console.log(
          "Skipping refresh because modal is open or deletion in progress"
        );
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
      }
    };

    refreshSections();
  }, [showDeleteModal, deletingSections.size]); // Add dependencies

  return (
    <Box safeArea flex={1} bg="coolGray.100">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0891b2"]} // For Android
            tintColor="#0891b2" // For iOS
          />
        }
      >
        <VStack flex={1}>
          <HStack
            alignItems="center"
            bg="white"
            px={4}
            py={2}
            shadow={1}
            safeAreaTop
          >
            <Pressable
              onPress={() => router.back()}
              p={2}
              rounded="full"
              _pressed={{ bg: "coolGray.100" }}
            >
              <Icon
                as={MaterialIcons}
                name="arrow-back"
                size={5}
                color="gray.800"
              />
            </Pressable>

            <Text
              fontSize="xl"
              fontWeight="bold"
              flex={1}
              textAlign="center"
              mr={12}
            >
              Tables
            </Text>

            <IconButton
              variant="ghost"
              colorScheme="coolGray"
              icon={<Icon as={MaterialIcons} name="settings" size={5} />}
              onPress={() => setShowEditIcons(!showEditIcons)}
              bg={showEditIcons ? "primary.500" : "transparent"}
              _pressed={{
                bg: showEditIcons ? "primary.600" : "coolGray.100",
              }}
              rounded="full"
              position="absolute"
              right={4}
              size="sm"
            />
          </HStack>

          {/* Add Restaurant Name Box */}
          <Box>
            <Pressable>
              <HStack
                alignItems="center"
                justifyContent="space-between"
                bg="white"
                rounded="md"
                p={2}
              >
                <HStack alignItems="center" space={2}>
                  <Icon
                    as={MaterialIcons}
                    name="store"
                    size={5}
                    color="gray.600"
                  />
                  <Text fontWeight="medium" fontSize="md">
                    {restaurantName || ""}
                  </Text>
                </HStack>
              </HStack>
            </Pressable>
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

          {/* Status Filter Buttons */}
          <Box
            bg="white"
            py={2}
            borderBottomWidth={1}
            borderBottomColor="coolGray.200"
          >
            <Box px={4} width="100%">
              <HStack space={2} justifyContent="space-between">
                <Pressable
                  onPress={() => setFilterStatus("all")}
                  flex={1}
                  bg={filterStatus === "all" ? "blue.100" : "coolGray.100"}
                  py={2.5}
                  rounded="lg"
                  borderWidth={1}
                  borderColor={
                    filterStatus === "all" ? "blue.500" : "coolGray.300"
                  }
                >
                  <HStack space={2} alignItems="center" justifyContent="center">
                    <MaterialIcons
                      name="view-list"
                      size={20}
                      color={filterStatus === "all" ? "#1e40af" : "#666"}
                    />
                    <Text
                      color={
                        filterStatus === "all" ? "blue.700" : "coolGray.700"
                      }
                      fontWeight={filterStatus === "all" ? "bold" : "medium"}
                    >
                      All
                    </Text>
                  </HStack>
                </Pressable>

                <Pressable
                  onPress={() => setFilterStatus("occupied")}
                  flex={1}
                  bg={filterStatus === "occupied" ? "red.100" : "coolGray.100"}
                  py={2.5}
                  rounded="lg"
                  borderWidth={1}
                  borderColor={
                    filterStatus === "occupied" ? "red.500" : "coolGray.300"
                  }
                >
                  <HStack space={2} alignItems="center" justifyContent="center">
                    <MaterialIcons
                      name="event-seat"
                      size={20}
                      color={filterStatus === "occupied" ? "#b91c1c" : "#666"}
                    />
                    <Text
                      color={
                        filterStatus === "occupied" ? "red.700" : "coolGray.700"
                      }
                      fontWeight={
                        filterStatus === "occupied" ? "bold" : "medium"
                      }
                    >
                      Occupied
                    </Text>
                  </HStack>
                </Pressable>

                <Pressable
                  onPress={() => setFilterStatus("available")}
                  flex={1}
                  bg={
                    filterStatus === "available" ? "green.100" : "coolGray.100"
                  }
                  py={2.5}
                  rounded="lg"
                  borderWidth={1}
                  borderColor={
                    filterStatus === "available" ? "green.500" : "coolGray.300"
                  }
                >
                  <HStack space={2} alignItems="center" justifyContent="center">
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={filterStatus === "available" ? "#15803d" : "#666"}
                    />
                    <Text
                      color={
                        filterStatus === "available"
                          ? "green.700"
                          : "coolGray.700"
                      }
                      fontWeight={
                        filterStatus === "available" ? "bold" : "medium"
                      }
                    >
                      Available
                    </Text>
                  </HStack>
                </Pressable>
              </HStack>
            </Box>
          </Box>

          {/* Sales Summary Row */}
          <Box 
            bg="white" 
            py={3}
            borderBottomWidth={1}
            borderBottomColor="coolGray.200"
          >
            <HStack mx={4} justifyContent="space-between">
              <Box 
                flex={1} 
                bg="coolGray.50" 
                rounded="lg" 
                p={3} 
                borderWidth={1}
                borderColor="coolGray.200"
                mr={2}
              >
                <HStack space={2} alignItems="center" justifyContent="center">
                  <Text color="coolGray.500" fontSize="sm">
                    Live Sales:
                  </Text>
                  <Text fontSize="md" fontWeight="bold">
                    ₹{Number(salesData?.liveSales || 0).toFixed(2)}
                  </Text>
                </HStack>
              </Box>
              
              <Box 
                flex={1} 
                bg="coolGray.50" 
                rounded="lg" 
                p={3} 
                borderWidth={1}
                borderColor="coolGray.200"
                ml={2}
              >
                <HStack space={2} alignItems="center" justifyContent="center">
                  <Text color="coolGray.500" fontSize="sm">
                    Today's Sales:
                  </Text>
                  <Text fontSize="md" fontWeight="bold">
                    ₹{Number(salesData?.todayTotalSales || 0).toFixed(2)}
                  </Text>
                </HStack>
              </Box>
            </HStack>
          </Box>

          {/* Filter Buttons for order types */}
          <OrderTypeButtons />

          {/* Content */}
          <Box flex={1} bg="coolGray.100">
            {loading ? (
              <TableSkeletonLoader />
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

      {/* Add QR Code Modal */}
      <QRCodeModal />

      {/* Add the PaymentModal */}
      {renderPaymentModal()}
    </Box>
  );
}
