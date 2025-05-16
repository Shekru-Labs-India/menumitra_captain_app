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
  AlertDialog,
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
import { Asset } from "expo-asset";
// import { useFocusEffect } from "@react-navigation/native";

// Add these imports at the top if not already present
import * as Updates from 'expo-updates';

import { checkForExpoUpdates, isRunningInExpoGo } from "../../../../utils/updateChecker";
import UpdateModal from "../../../../components/UpdateModal";
import Constants from 'expo-constants';
import { useVersion } from "../../../../context/VersionContext";
import { getSettings } from "../../../../utils/getSettings";

// Get the app version from expo constants, fallback to version from app.json
const appVersion = Constants.expoConfig?.version || '1.2.1';

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
            width: "60%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
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
            width: "100%",
            height: "100%",
            position: "absolute",
            left: 0,
            top: 0,
            backgroundColor: "transparent",
            opacity: 0.6,
          }}
        >
          <Animated.View
            style={{
              width: "50%",
              height: "200%",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              transform: [
                { translateX: shimmerAnim },
                { translateY: -5 },
                { rotateZ: "25deg" },
              ],
              position: "absolute",
            }}
          />
        </Animated.View>
        <Box
          width="40%"
          height="20px"
          bg="#CBD5E0"
          alignSelf="center"
          borderRadius="sm"
        />
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
                        width: "50%",
                        height: "100%",
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        transform: [{ translateX: shimmerAnim }],
                        position: "absolute",
                      }}
                    />
                  </Box>
                  <Box width={10} position="relative" overflow="hidden">
                    <Box height={6} bg="#E2E8F0" rounded="md" width="100%" />
                    <Animated.View
                      style={{
                        width: "50%",
                        height: "100%",
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                        transform: [{ translateX: shimmerAnim }],
                        position: "absolute",
                      }}
                    />
                  </Box>
                </HStack>

                {/* Section Stats Skeleton */}
                <HStack space={3} alignItems="center" mt={2}>
                  {[1, 2, 3].map((statItem) => (
                    <HStack key={statItem} space={1} alignItems="center">
                      <Box
                        w={3}
                        h={3}
                        bg="#E2E8F0"
                        rounded="full"
                        overflow="hidden"
                      >
                        <Animated.View
                          style={{
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(255, 255, 255, 0.5)",
                            transform: [{ translateX: shimmerAnim }],
                          }}
                        />
                      </Box>
                      <Box width={16} position="relative" overflow="hidden">
                        <Box
                          height={4}
                          bg="#E2E8F0"
                          rounded="md"
                          width="100%"
                        />
                        <Animated.View
                          style={{
                            width: "50%",
                            height: "100%",
                            backgroundColor: "rgba(255, 255, 255, 0.8)",
                            transform: [{ translateX: shimmerAnim }],
                            position: "absolute",
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
                    {[1, 2, 3].map((col) => (
                      <ShimmerTable key={`${row}-${col}`} />
                    ))}
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
  const [orderTypeSettings, setOrderTypeSettings] = useState({
    counter: true, // Start with all buttons enabled for optimistic rendering
    parcel: true,
    delivery: true,
    driveThrough: true,
  });
  const router = useRouter();
  const isFocused = useIsFocused();

  // Load settings using useFocusEffect to refresh on navigation
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      const loadOrderTypeSettings = async () => {
        try {
          console.log("OrderTypeButtons: Loading settings on focus...");
          // Use getSettings utility to get latest settings from API
          const settings = await getSettings();
          console.log("OrderTypeButtons: Settings received:", settings);
          
          // Only update if component is still mounted
          if (isMounted) {
            setOrderTypeSettings({
              counter: settings.has_counter,
              parcel: settings.has_parcel,
              delivery: settings.has_delivery,
              driveThrough: settings.has_drive_through,
            });
          }
        } catch (error) {
          console.error("OrderTypeButtons: Error loading settings:", error);
          // Don't change the optimistic state on error
        }
      };

      loadOrderTypeSettings();
      
      return () => {
        // Clean up
        isMounted = false;
        console.log("OrderTypeButtons: Component unfocused");
      };
    }, [])
  );

  // Get outlet_id once
  const [outletId, setOutletId] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem("outlet_id").then((id) => {
      if (id) setOutletId(parseInt(id));
    });
  }, []);

  // Calculate active buttons count
  const activeButtonCount =
    Object.values(orderTypeSettings).filter(Boolean).length;

  // Calculate width percentage based on active button count
  // Subtract small gap amount (2%) between buttons from total width
  const buttonWidthPercent =
    activeButtonCount > 0
      ? (100 - (activeButtonCount - 1) * 2) / activeButtonCount
      : 100;

  // Create array of visible buttons with specific colors
  const buttons = [
    {
      type: "counter",
      active: orderTypeSettings.counter,
      icon: "point-of-sale",
      label: "Counter",
      color: "#4CAF50", // Green for counter
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
      color: "#FF9800", // Orange for parcel
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
      color: "#2196F3", // Blue for delivery
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
      color: "#9C27B0", // Purple for drive-through
      params: {
        isSpecialOrder: "true",
        orderType: "drive-through",
        clearPrevious: "true",
        outlet_id: outletId?.toString() || "",
      },
    },
  ].filter((button) => button.active);

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
          justifyContent={activeButtonCount === 0 ? "center" : "space-between"}
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
                borderColor={button.color}
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
                  color={button.color}
                  style={{ marginRight: 8 }}
                />
                <Text color={button.color} fontSize="sm" fontWeight="medium">
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

  // Add state variables for download/share
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Add the viewShotRef here at the component level (not inside QRCodeModal)
  const viewShotRef = useRef(null);

  const [updateTimestamp, setUpdateTimestamp] = useState(Date.now()); // Add this to track refresh timestamps

  const [isReservation, setIsReservation] = useState(false);

  const [isOpen, setIsOpen] = React.useState(false);
  // const [selectedTable, setSelectedTable] = React.useState(null);
  const cancelRef = React.useRef(null);

  // Add near the top of the component, where other imports are

  // Then replace the current useEffect for loading app settings with this useFocusEffect
  useFocusEffect(
    useCallback(() => {
      const loadAppSettings = async () => {
        try {
          console.log("FOCUS EFFECT: Loading app_settings in tables screen...");
          // Replace direct AsyncStorage call with getSettings utility function
          const settings = await getSettings();
          
          console.log("FOCUS EFFECT: Received settings:", settings);

          // Be extremely explicit about the check
          const reserveValue = settings.reserve_table;
          console.log(
            "FOCUS EFFECT: Reserve value:",
            reserveValue,
            "Type:",
            typeof reserveValue
          );

          // Handle all possible value formats
          const isEnabled =
            reserveValue === true ||
            reserveValue === 1 ||
            reserveValue === "1" ||
            reserveValue === "true";

          console.log("FOCUS EFFECT: Setting isReservation to:", isEnabled);
          setIsReservation(isEnabled);

          // Also check for other settings that might be relevant
          console.log("FOCUS EFFECT: All settings:", settings);
        } catch (error) {
          console.error("FOCUS EFFECT: Error loading app settings:", error);
        }
      };

      // Execute immediately when screen is focused
      loadAppSettings();

      // Also fetch directly to verify correct storage format
      AsyncStorage.getAllKeys().then((keys) => {
        console.log("FOCUS EFFECT: All AsyncStorage keys:", keys);
      });

      return () => {
        // Cleanup if needed
        console.log("FOCUS EFFECT: Tables screen unfocused");
      };
    }, []) // Empty dependency array to only react to focus/unfocus events
  );

  // Also add a debug element to the UI to show the current state
  // Add this right before the closing </ScrollView> tag
  {
    __DEV__ && (
      <Box
        position="absolute"
        top={100}
        right={10}
        px={3}
        py={2}
        bg="rgba(0,0,0,0.7)"
        rounded="md"
        zIndex={9999}
      >
        <Text color="white" fontSize="xs">
          isReservation: {String(isReservation)}
        </Text>
      </Box>
    );
  }
  const handleReservationClick = (table) => {
    setSelectedTable(table);
    setIsOpen(true);
  };


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
        // Skip refresh if QR modal is open or edit mode is enabled
        if (isQRModalOpen || showQRModal || showEditIcons) {
          console.log("Skipping refresh because QR modal is open or edit mode is enabled");
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
    }, [isQRModalOpen, showQRModal, showEditIcons])
  );

  const getStoredData = async () => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (storedOutletId) {
        setOutletId(parseInt(storedOutletId));
        await fetchSections(parseInt(storedOutletId), true); // true = isInitialLoad
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
      setLoading(false); // Ensure loading is turned off even on error
    }
  };

  // Replace the fetchSections function with this optimized version
  const fetchSections = async (outletId, isInitialLoad = false) => {
    try {
      // Only set loading state for initial load, not for refreshes
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setBackgroundRefreshing(true);
      }

      // Log a timestamp to track this refresh
      const refreshTime = Date.now();
      console.log(`Starting section fetch at ${refreshTime}`);

      const data = await fetchWithAuth(`${getBaseUrl()}/table_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
        }),
      });

      if (data.st === 1) {
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

        // Use functional update to properly merge with existing state
        setSections((currentSections) => {
          // Preserve UI state for tables (like isLoading, etc.)
          return processedSections.map((newSection) => {
            // Find this section in current sections (if it exists)
            const existingSection = currentSections.find(
              (s) => s.id === newSection.id
            );

            if (!existingSection) return newSection;

            // Merge tables data to preserve any local UI state
            const mergedTables = newSection.tables.map((newTable) => {
              const existingTable = existingSection.tables.find(
                (t) => t.table_id === newTable.table_id
              );

              if (!existingTable) return newTable;

              // Preserve UI states like loading, deleting, etc.
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
        });

        // Set active section only if not set already
        if (processedSections.length > 0 && !activeSection) {
          setActiveSection(processedSections[0]);
        }

        // Update sales data
        setSalesData({
          liveSales: data.live_sales || 0,
          todayTotalSales: data.today_total_sales || 0,
        });

        // Update timestamp to trigger any components that depend on fresh data
        setUpdateTimestamp(Date.now());
      }
    } catch (error) {
      console.error("Fetch Sections Error:", error);
      // Only show error toast for user-initiated actions, not background refreshes
      if (isInitialLoad) {
        toast.show({
          description: error.message || "Failed to load sections",
          status: "error",
        });
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      setBackgroundRefreshing(false);
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

      if (table.is_reserved) {
        // toast.show({
        //   description: "Table is reserved",
        //   status: "error",
        // });
        // handleTableReservation(table);
        handleReservationClick(table);

        return;
      }
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
    if (isQRModalOpen || showQRModal || showEditIcons) {
      console.log("Skipping refresh because QR modal is open or edit mode is enabled");
      return;
    }
    try {
      setRefreshing(true);

      // Log app_settings data during refresh using getSettings
      console.log("PULL REFRESH: Checking app_settings...");
      const settings = await getSettings();
      console.log("PULL REFRESH: Settings loaded:", settings);
      console.log(
        "PULL REFRESH: reserve_table value:",
        settings.reserve_table,
        "Type:",
        typeof settings.reserve_table
      );
      
      // Update isReservation state with the fetched value
      const reserveValue = settings.reserve_table;
      const isEnabled =
        reserveValue === true ||
        reserveValue === 1 ||
        reserveValue === "1" ||
        reserveValue === "true";
      setIsReservation(isEnabled);

      // Also log all keys in AsyncStorage for verification
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("PULL REFRESH: All AsyncStorage keys:", allKeys);

      // Continue with normal refresh
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (storedOutletId) {
        await fetchSections(parseInt(storedOutletId), false); // false = not initial load
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
  }, [isQRModalOpen, showQRModal, showEditIcons]); // Add showEditIcons to dependencies

  // Update auto-refresh interval to use the non-loading version of fetchSections
  useEffect(() => {
    refreshInterval.current = setInterval(async () => {
      try {
        // Only refresh if no modal is open and we're not already doing something
        if (
          isQRModalOpen ||
          showQRModal ||
          showDeleteModal ||
          deletingSections.size > 0 ||
          showEditIcons // Add check for edit mode
        ) {
          console.log("Skipping auto-refresh because of active UI state or edit mode");
          return;
        }

        // Set background refreshing flag (won't show spinner)
        setBackgroundRefreshing(true);

        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          await fetchSections(parseInt(storedOutletId), false); // false = not initial load
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
  }, [isQRModalOpen, showQRModal, showDeleteModal, deletingSections.size, showEditIcons]); // Add showEditIcons to dependencies

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

      console.log(
        `Background refresh ${refreshTimestamp} received response:`,
        data.st
      );

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
        setSections((currentSections) => {
          // Compare and merge data (for a smoother update)
          const mergedSections = processedSections.map((newSection) => {
            // Find this section in current state (if it exists)
            const existingSection = currentSections.find(
              (s) => s.id === newSection.id
            );

            if (!existingSection) return newSection;

            // Merge tables data to preserve any local UI state
            const mergedTables = newSection.tables.map((newTable) => {
              const existingTable = existingSection.tables.find(
                (t) => t.table_id === newTable.table_id
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
                      <HStack
                        space={2}
                        alignItems="center"
                        flex={1}
                        maxWidth="70%"
                      >
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
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
                                            : table.action === "has_save"
                                            ? "#e8f5e9" // Has Save - Light green background
                                            : table.action === "create_order"
                                            ? "#ffcdd2" // Create order - Light red background
                                            : table.action === "placed"
                                            ? "#ffcdd2" // Placed - Light red background
                                            : "#ffcdd2" // Standard occupied - Light red background
                                          : table.is_reserved
                                          ? "#e0e0e0" // Reserved - Gray background
                                          : "white" // Available - Light green background
                                      }
                                      borderWidth={1}
                                      borderStyle={
                                        table.action === "has_save"
                                          ? "dashed"
                                          : "dashed"
                                      }
                                      borderColor={
                                        table.isLoading
                                          ? "#aaaaaa" // Gray border for loading
                                          : isOccupied
                                          ? table.action === "print_and_save"
                                            ? "#ff9800" // Print & Save - Orange border
                                            : table.action === "KOT_and_save"
                                            ? "#000000" // KOT & Save - Black border
                                            : table.action === "has_save"
                                            ? "#4CAF50" // Has Save - Green border
                                            : table.action ===
                                                    "create_order"
                                                  ? "#dc3545" // Create order - Red
                                                  : table.action === "placed"
                                                  ? "#dc3545" // Placed - Red
                                                  : "#dc3545" // Regular occupied - Blue
                                          : table.is_reserved
                                          ? "#757575" // Reserved - Gray border
                                          : "#aaaaaa" // Available - Green border
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
                                                  : table.action === "has_save"
                                                  ? "#4CAF50" // Has Save - Green
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
                                                      "has_save"
                                                    ? "#4CAF50" // Has Save - Green
                                                    : table.action ===
                                                      "create_order"
                                                    ? "#dc3545" // Create order - Red
                                                    : "#dc3545" // Default red
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

                                          {/* Reserve button with lock icon */}
                                          {showEditIcons &&
                                            table.is_occupied !== 1 &&
                                            isReservation && (
                                              <Box
                                                position="absolute"
                                                top={1}
                                                left={1}
                                                zIndex={2}
                                              >
                                                <Pressable
                                                  onPress={() =>
                                                    handleReservationClick(
                                                      table
                                                    )
                                                  }
                                                  rounded="full"
                                                  size={8}
                                                  w={8}
                                                  h={8}
                                                  alignItems="center"
                                                  justifyContent="center"
                                                >
                                                  <MaterialIcons
                                                    name={
                                                      table.is_reserved
                                                        ? "lock-open"
                                                        : "lock-outline"
                                                    }
                                                    size={18}
                                                    color={
                                                      table.is_reserved
                                                        ? "#000"
                                                        : "#ef4444"
                                                    }
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
                                                table.action === "has_save" ||
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
    setIsOpen(false); // Close the dialog first
    try {
      // Set loading state but don't show a global loading spinner
      setUpdatingStatus(true);

      // Optimistically update UI immediately - before API call
      setSections((prevSections) =>
        prevSections.map((section) => ({
          ...section,
          tables: section.tables.map((t) =>
            t.table_id === table.table_id
              ? { ...t, is_reserved: !t.is_reserved }
              : t
          ),
        }))
      );

      // Show toast notification for immediate feedback
      toast.show({
        description: table.is_reserved
          ? "Removing reservation..."
          : "Reserving table...",
        status: "info",
        duration: 1000,
      });

      // Get stored outlet ID and user ID
      const [storedOutletId, storedUserId] = await Promise.all([
        AsyncStorage.getItem("outlet_id"),
        AsyncStorage.getItem("user_id"),
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
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table_id: table.table_id.toString(),
            table_number: table.table_number.toString(),
            outlet_id: storedOutletId.toString(),
            is_reserved: !table.is_reserved, // Toggle the reservation status
            user_id: storedUserId.toString(),
          }),
        }
      );

      if (response.st === 1) {
        // Success - UI already updated, just show success toast
        toast.show({
          description: table.is_reserved
            ? "Table reservation removed"
            : "Table has been reserved",
          status: "success",
          duration: 2000,
        });

        // Remove the need to refresh data - UI is already updated
        // fetchSections(parseInt(storedOutletId)); - REMOVED THIS LINE
      } else {
        // API failed - revert optimistic update
        setSections((prevSections) =>
          prevSections.map((section) => ({
            ...section,
            tables: section.tables.map((t) =>
              t.table_id === table.table_id
                ? { ...t, is_reserved: table.is_reserved } // Revert to original state
                : t
            ),
          }))
        );

        toast.show({
          description: response.msg || "Failed to update table reservation",
          status: "error",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error reserving table:", error);

      // Revert optimistic update on error
      setSections((prevSections) =>
        prevSections.map((section) => ({
          ...section,
          tables: section.tables.map((t) =>
            t.table_id === table.table_id
              ? { ...t, is_reserved: table.is_reserved } // Revert to original state
              : t
          ),
        }))
      );

      toast.show({
        description: "Failed to update table reservation",
        status: "error",
        duration: 3000,
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

    // Find local path to the mm-logo.png - adjust this path based on your project structure
    // You might need to try a few options:
    const logoPath = require("../../../../assets/images/mm-logo.png");
    // or if that doesn't work:
    // const logoPath = require('../../../assets/images/mm-logo.png');
    // or:
    // const logoPath = require('../../assets/images/mm-logo.png');

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
          {/* Hidden ViewShot container for capture */}
          {qrData?.qr_code_url && (
            <Box position="absolute" top={-9999} left={-9999}>
              <ViewShot
                ref={viewShotRef}
                options={{ quality: 1, format: "png" }}
                style={{
                  backgroundColor: "white",
                  padding: 16,
                  borderWidth: 3,
                  borderColor: "#FF7043",
                  borderRadius: 12,
                }}
              >
                <Box
                  width={250}
                  height={250}
                  alignItems="center"
                  justifyContent="center"
                >
                  <QRCode
                    value={qrData.qr_code_url}
                    size={250}
                    color="#0066FF"
                    backgroundColor="white"
                    logo={logoPath}
                    logoSize={70}
                    logoBackgroundColor="white"
                    logoBorderRadius={10}
                    quietZone={10}
                    enableLinearGradient={false}
                    ecl="H"
                  />
                </Box>
              </ViewShot>
            </Box>
          )}

          {/* Visible QR display */}
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

            {qrData?.qr_code_url ? (
              <VStack space={4} alignItems="center">
                <Box
                  style={{
                    backgroundColor: "white",
                    padding: 16,
                    borderWidth: 3,
                    borderColor: "#FF7043",
                    borderRadius: 12,
                  }}
                >
                  <Box
                    width={250}
                    height={250}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <QRCode
                      value={qrData.qr_code_url}
                      size={250}
                      color="#0066FF"
                      backgroundColor="white"
                      logo={logoPath}
                      logoSize={70}
                      logoBackgroundColor="white"
                      logoBorderRadius={10}
                      quietZone={10}
                      enableLinearGradient={false}
                      ecl="H"
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
                    disabled={isDownloading || isSharing}
                    opacity={isDownloading || isSharing ? 0.7 : 1}
                  >
                    {isDownloading ? (
                      <HStack space={2} alignItems="center">
                        <Spinner size="sm" color="white" />
                        <Text color="white" fontWeight="medium">
                          Downloading...
                        </Text>
                      </HStack>
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
                      <HStack space={2} alignItems="center">
                        <Spinner size="sm" color="white" />
                        <Text color="white" fontWeight="medium">
                          Sharing...
                        </Text>
                      </HStack>
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

  // Add this function to convert the logo image to base64
  const imageToBase64 = async (imageSource) => {
    try {
      // Load the image asset
      const asset = Asset.fromModule(imageSource);
      await asset.downloadAsync();

      // Read the file and convert to base64
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return base64;
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return null;
    }
  };

  // Update the handleQRIconPress function
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
      // Get outlet_id from AsyncStorage if needed
      const storedOutletId =
        outletId || (await AsyncStorage.getItem("outlet_id"));

      if (!storedOutletId) {
        throw new Error("Outlet ID not found");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/send_qr_link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outlet_id: storedOutletId.toString(),
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

      // Set QR data
      setQrData({
        ...data,
        qr_code_url: qrUrl,
        table_number: data.table_number,
        rawUrl: qrUrl,
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

  // Add this function near your other handlers
  const closeModal = () => {
    if (qrStableTimeout.current) {
      clearTimeout(qrStableTimeout.current);
    }
    setShowQRModal(false);
    setQrData(null);
    setIsQRModalOpen(false);
  };

  // Modified shareQRCode function to use ViewShot
  const shareQRCode = async () => {
    try {
      setIsSharing(true);

      // Show info toast immediately
      const toastId = toast.show({
        description: "Preparing to share...",
        status: "info",
        duration: 10000,
      });

      // Check if viewShotRef exists and is current
      if (!viewShotRef.current) {
        throw new Error("QR code view not ready. Please try again.");
      }

      // Capture the QR code using ViewShot
      const uri = await viewShotRef.current.capture();

      // Close the info toast
      toast.close(toastId);

      // Share the captured image
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: `Table ${selectedTableForQR?.table_number} QR Code`,
      });
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

  // Modified downloadAsPNG function to use ViewShot
  const downloadAsPNG = async () => {
    try {
      setIsDownloading(true);

      // Optimistically show success toast immediately
      const toastId = toast.show({
        description: "Preparing QR code...",
        status: "info",
        duration: 10000,
      });

      // Check if viewShotRef exists and is current
      if (!viewShotRef.current) {
        throw new Error("QR code view not ready. Please try again.");
      }

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        toast.close(toastId);
        toast.show({
          description: "Permission denied to save to gallery",
          status: "error",
        });
        return;
      }

      // Capture the QR code using ViewShot
      const uri = await viewShotRef.current.capture();

      // Save to gallery
      const asset = await MediaLibrary.createAssetAsync(uri);

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

      // Close the info toast
      toast.close(toastId);

      // Show success toast
      toast.show({
        description: "QR code saved to gallery",
        status: "success",
        duration: 2000,
      });

      // Close modal after a short delay
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

  // Updated handlePDFDownload function with better Android handling
  const handlePDFDownload = async () => {
    try {
      setIsDownloading(true);

      // Optimistically show info toast
      const toastId = toast.show({
        description: "Preparing PDF...",
        status: "info",
        duration: 10000,
      });

      // Check if viewShotRef exists and is current
      if (!viewShotRef.current) {
        throw new Error("QR code view not ready. Please try again.");
      }

      // Get outlet name
      const outlet = (await AsyncStorage.getItem("outlet_name")) || "MenuMitra";

      // Capture QR code as image
      const qrImageUri = await viewShotRef.current.capture();

      // Convert captured image to base64 for embedding in PDF
      const base64QR = await FileSystem.readAsStringAsync(qrImageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create HTML content for PDF with data URL of the QR image
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
              .qr-image { max-width: 100%; height: auto; border: 3px solid #FF7043; border-radius: 10px; padding: 10px; }
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
                <img src="data:image/png;base64,${base64QR}" class="qr-image" />
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

      // Generate a filename with timestamp
      const filename = `Table_${
        selectedTableForQR?.table_number || "Unknown"
      }_QR_${Date.now()}.pdf`;

      // Create PDF
      const { uri: pdfUri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Close the info toast
      toast.close(toastId);

      // Request permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        toast.show({
          description: "Permission denied to save to gallery",
          status: "error",
          duration: 3000,
        });
        return;
      }

      // For Android, save to MediaLibrary first, then optionally share
      if (Platform.OS === "android") {
        try {
          // For Android 11+ (API 30+), use StorageAccessFramework
          const { StorageAccessFramework } = FileSystem;

          // Let user select a directory
          const permissions =
            await StorageAccessFramework.requestDirectoryPermissionsAsync();

          if (!permissions.granted) {
            toast.show({
              description: "Permission denied to save file",
              status: "error",
              duration: 3000,
            });
            return;
          }

          // Create the file in the selected directory
          const destinationUri = await StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            "application/pdf"
          );

          // Read the PDF file
          const pdfContent = await FileSystem.readAsStringAsync(pdfUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Write the PDF content to the new file
          await StorageAccessFramework.writeAsStringAsync(
            destinationUri,
            pdfContent,
            {
              encoding: FileSystem.EncodingType.Base64,
            }
          );

          toast.show({
            description: "PDF saved successfully",
            status: "success",
            duration: 3000,
          });

          setTimeout(() => closeModal(), 1500);
        } catch (error) {
          console.error("Android PDF saving failed:", error);

          // As a last resort, try sharing the file
          try {
            // Move the PDF to a more accessible location with proper filename
            const destinationUri = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.moveAsync({
              from: pdfUri,
              to: destinationUri,
            });

            await Sharing.shareAsync(destinationUri, {
              mimeType: "application/pdf",
              dialogTitle: `Table ${selectedTableForQR?.table_number} QR Code PDF`,
              UTI: "com.adobe.pdf",
            });

            toast.show({
              description: "PDF ready to share",
              status: "success",
              duration: 3000,
            });
          } catch (shareError) {
            toast.show({
              description: "Could not save or share PDF. Please try again.",
              status: "error",
              duration: 3000,
            });
          }
        }
      } else if (Platform.OS === "ios") {
        // iOS handling remains the same
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

          // Close modal after a delay
          setTimeout(() => {
            closeModal();
          }, 1500);
        } catch (error) {
          console.error("iOS save failed:", error);
          toast.show({
            description: "Failed to save PDF",
            status: "error",
            duration: 3000,
          });
        }
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

  // Add these state variables in the HomeScreen component
  const [apiVersion, setApiVersion] = useState("");
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [otaUpdateAvailable, setOtaUpdateAvailable] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(isRunningInExpoGo());
  const { version: appVersion } = useVersion();

  // Add the version check function
  const checkVersion = useCallback(async () => {
    // Skip version check in Expo Go
    if (isExpoGo) return;

    try {
      const response = await fetchWithAuth('https://men4u.xyz/1.3/common_api/check_version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_type: 'captain_app' })
      });
      
      if (response.st === 1) {
        setApiVersion(response.version || '');
        // Compare versions
        const apiVer = response.version ? response.version.split('.').map(Number) : [0, 0, 0];
        const appVer = appVersion.split('.').map(Number);
        
        // Compare version numbers
        for (let i = 0; i < 3; i++) {
          if (apiVer[i] > appVer[i]) {
            setNeedsUpdate(true);
            setShowUpdateModal(true);
            break;
          } else if (apiVer[i] < appVer[i]) {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error checking version:', error);
    }
  }, [appVersion, isExpoGo]);

  // Add the OTA update check function
  const checkForUpdates = async () => {
    await checkForExpoUpdates({
      silent: true,
      onUpdateAvailable: () => {
        setOtaUpdateAvailable(true);
      }
    });
  };

  // Add the OTA update handler
  const handleOtaUpdate = async () => {
    try {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        "Update Downloaded",
        "The update has been downloaded. The app will now restart to apply the changes.",
        [
          {
            text: "OK",
            onPress: async () => {
              await Updates.reloadAsync();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error downloading update:", error);
      Alert.alert(
        "Error",
        "Failed to download update. Please try again later."
      );
    }
  };

  // Add this useEffect for initial version check
  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  // Update the useFocusEffect to include update checks
  useFocusEffect(
    useCallback(() => {
      const initializeScreen = async () => {
        await fetchData();
        if (!isExpoGo) {
          await checkForUpdates();
        }
      };

      initializeScreen();
    }, [fetchData, isExpoGo])
  );

  // Add the update modals in the return statement, right after the Box flex={1} bg="white" safeArea
  return (
    <Box flex={1} bg="white" safeArea>
      {/* Store Update Modal - Only show if not in Expo Go */}
      {!isExpoGo && (
        <UpdateModal 
          isOpen={showUpdateModal}
          currentVersion={appVersion}
          newVersion={apiVersion}
          forceUpdate={true}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      {/* OTA Update Modal - Only show if not in Expo Go */}
      {!isExpoGo && (
        <UpdateModal 
          isOpen={otaUpdateAvailable}
          currentVersion={appVersion}
          newVersion="latest"
          isOtaUpdate={true}
          onClose={() => setOtaUpdateAvailable(false)}
          onApplyOtaUpdate={handleOtaUpdate}
        />
      )}

      {/* Fixed Header Parts */}
      <VStack>
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

        {/* Restaurant Name Box */}
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
      </VStack>

      {/* Main Content Area with Scrollable Content */}
      <Box flex={1}>
        {/* This is the scrollable area with stickyHeaderIndices for order type buttons */}
        <ScrollView
          stickyHeaderIndices={[2]} // Make the 4th element (OrderTypeButtons at index 3) sticky
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 70 }} // Add padding to bottom for FAB
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0891b2"]} // For Android
              tintColor="#0891b2" // For iOS
            />
          }
        >
          {/* Element 0: Search */}
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

          {/* Element 1: Status Filter Buttons */}
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

          {/* Element 3: Order Type Buttons - THIS WILL STICK WHEN SCROLLED TO TOP */}
          <Box
            bg="white"
            borderBottomWidth={1}
            borderBottomColor="coolGray.200"
            shadow={2}
            zIndex={10}
          >
            <OrderTypeButtons />
          </Box>

          {/* Element 2: Sales Summary Row */}
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

          {/* Element 4: Content */}
          <Box flex={1} bg="coolGray.100">
            {loading && !showEditIcons ? (
              <TableSkeletonLoader />
            ) : (
              <>
                {/* Render tables - always use grid view */}
                {renderGridView(sortedSections)}

                {/* Floating action indicators */}
                {updatingSections.size > 0 && (
                  <Box
                    position="absolute"
                    top={4}
                    right={4}
                    zIndex={1000}
                    px={3}
                    py={1.5}
                    bg="rgba(0,0,0,0.7)"
                    rounded="md"
                    shadow={2}
                  >
                    <HStack space={2} alignItems="center">
                      <Spinner size="sm" color="white" />
                      <Text color="white" fontSize="xs">
                        Updating section
                      </Text>
                    </HStack>
                  </Box>
                )}

                {deletingSections.size > 0 && (
                  <Box
                    position="absolute"
                    top={4}
                    right={4}
                    zIndex={1000}
                    px={3}
                    py={1.5}
                    bg="rgba(220,53,69,0.7)"
                    rounded="md"
                    shadow={2}
                  >
                    <HStack space={2} alignItems="center">
                      <Spinner size="sm" color="white" />
                      <Text color="white" fontSize="xs">
                        Deleting section
                      </Text>
                    </HStack>
                  </Box>
                )}

                {deletingTables.size > 0 && (
                  <Box
                    position="absolute"
                    top={14}
                    right={4}
                    zIndex={1000}
                    px={3}
                    py={1.5}
                    bg="rgba(220,53,69,0.7)"
                    rounded="md"
                    shadow={2}
                  >
                    <HStack space={2} alignItems="center">
                      <Spinner size="sm" color="white" />
                      <Text color="white" fontSize="xs">
                        Deleting table
                      </Text>
                    </HStack>
                  </Box>
                )}

                {/* Background sync indicator */}
                {backgroundRefreshing && (
                  <Box
                    position="absolute"
                    bottom={2}
                    right={4}
                    zIndex={1000}
                    px={3}
                    py={1}
                    bg="rgba(8,145,178,0.7)"
                    rounded="full"
                    shadow={1}
                  >
                    <HStack space={1} alignItems="center">
                      <Spinner size="sm" color="white" />
                      <Text color="white" fontSize="xs" fontWeight="medium">
                        Syncing
                      </Text>
                    </HStack>
                  </Box>
                )}
              </>
            )}
          </Box>
        </ScrollView>

        {/* FAB - Outside ScrollView so it's always visible */}
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
            <FormControl isRequired={false}>
              <FormControl.Label _text={{ fontWeight: "bold" }}>
                <Text color="red.500">*</Text> Section Name
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
    
     {/* Your existing JSX */}
    
     <AlertDialog
      leastDestructiveRef={cancelRef}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    >
      <AlertDialog.Content>
        <AlertDialog.CloseButton />
        <AlertDialog.Header>Confirm Reservation</AlertDialog.Header>
        <AlertDialog.Body>
          {selectedTable?.is_reserved 
            ? `Are you sure you want to remove the reservation for this table no ${selectedTable?.table_number}`
            : `Are you sure you want to reserve this table no : ${selectedTable?.table_number}`}
        </AlertDialog.Body>
        <AlertDialog.Footer>
          <Button.Group space={2}>
            <Button
              variant="unstyled"
              colorScheme="coolGray"
              onPress={() => setIsOpen(false)}
              ref={cancelRef}
            >
              Cancel
            </Button>
            <Button
              colorScheme={selectedTable?.is_reserved ? "red" : "success"}
              onPress={() => handleTableReservation(selectedTable)}
            >
              {selectedTable?.is_reserved ? "Remove" : "Reserve"}
            </Button>
          </Button.Group>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
    </Box>
    
  );
}

// Add fetchData function
const fetchData = async () => {
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

    // Load app settings using the getSettings utility
    const settings = await getSettings();
    
    // Update isReservation state based on settings
    const reserveValue = settings.reserve_table;
    const isEnabled =
      reserveValue === true ||
      reserveValue === 1 ||
      reserveValue === "1" ||
      reserveValue === "true";
    setIsReservation(isEnabled);

    // Fetch sections data
    await fetchSections(parseInt(storedOutletId));

    // Get restaurant name
    await getRestaurantName();

  } catch (error) {
    console.error("Error fetching initial data:", error);
    toast.show({
      description: "Failed to load initial data",
      status: "error",
    });
  }
};
