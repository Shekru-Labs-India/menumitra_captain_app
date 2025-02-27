import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  Image,
  Heading,
  Button,
  IconButton,
  Spinner,
  useToast,
  Badge,
  FlatList,
  Center,
  Icon,
  Divider,
  Modal,
  Alert,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Linking, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../../config/api.config";
import * as Print from "expo-print";
import { BleManager } from "react-native-ble-plx";
import Constants from "expo-constants";
import { PermissionsAndroid } from "react-native";
import base64 from "react-native-base64";

const formatTime = (dateTimeString) => {
  if (!dateTimeString) return "";
  const [date, time, ampm] = dateTimeString.split(" ");
  const [hours, minutes] = time.split(":").slice(0, 2); // Only take hours and minutes
  return `${date} • ${hours}:${minutes} ${ampm}`;
};

const calculateOrderTimer = (orderTime) => {
  try {
    if (!orderTime) return 0;

    // Parse the time string (format: "04:33:21 PM")
    const [time, period] = orderTime.split(" ");
    const [hours, minutes, seconds] = time.split(":");

    let hour = parseInt(hours);
    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }

    const orderDate = new Date();
    orderDate.setHours(hour);
    orderDate.setMinutes(parseInt(minutes));
    orderDate.setSeconds(parseInt(seconds));

    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - orderDate) / 1000);
    return Math.max(0, 90 - elapsedSeconds);
  } catch (error) {
    console.error("Error calculating timer:", error);
    return 0;
  }
};

// Add these constants for printer commands
const PRINTER_SERVICE_UUIDS = [
  "49535343-FE7D-4AE5-8FA9-9FAFD205E455",
  "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2",
  "000018F0-0000-1000-8000-00805F9B34FB",
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  "49535343-8841-43F4-A8D4-ECBE34729BB3",
  "BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F",
];

// Add the generateReceiptHTML function
const generateReceiptHTML = (orderDetails, menuItems) => {
  try {
    const items = menuItems
      .map(
        (item) => `
    <tr>
      <td style="text-align: left;">${item.menu_name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">₹${item.price}</td>
      <td style="text-align: right;">₹${item.menu_sub_total}</td>
    </tr>
  `
      )
      .join("");

    return `
  <html>
    <head>
      <style>
        @page {
          margin: 0;
          size: 80mm 297mm;
        }
        body { 
          font-family: monospace;
          padding: 10px;
          width: 80mm;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 10px;
        }
        .restaurant-name {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .restaurant-address {
          font-size: 14px;
          margin-bottom: 5px;
        }
        .order-info {
          margin-bottom: 10px;
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 14px;
        }
        th, td {
          padding: 3px 0;
        }
        .dotted-line {
          border-top: 1px dotted black;
          margin: 5px 0;
        }
        .total-section {
          font-size: 14px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .website {
          text-align: center;
          font-size: 12px;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="restaurant-name">${orderDetails.outlet_name}</div>
        <div class="restaurant-address">${orderDetails.outlet_address}</div>
        ${
          orderDetails.outlet_mobile
            ? `<div class="restaurant-phone">Ph: ${orderDetails.outlet_mobile}</div>`
            : ""
        }
      </div>

      <div class="order-info">
        Order: #${orderDetails.order_number}<br>
        Table: ${orderDetails.section} - ${orderDetails.table_number[0]}<br>
        DateTime: ${orderDetails.datetime}
        ${
          orderDetails.customer_name
            ? `<br>Customer: ${orderDetails.customer_name}`
            : ""
        }
      </div>

      <div class="dotted-line"></div>

      <table>
        <tr>
          <th style="text-align: left;">Item</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Amt</th>
        </tr>
        ${items}
      </table>

      <div class="dotted-line"></div>

      <div class="total-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>₹${Number(orderDetails.total_bill_amount).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Discount(${orderDetails.discount_percent}%):</span>
          <span>-₹${Number(orderDetails.discount_amount).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Service Charges(${
            orderDetails.service_charges_percent
          }%):</span>
          <span>+₹${Number(orderDetails.service_charges_amount).toFixed(
            2
          )}</span>
        </div>
        <div class="total-row">
          <span>GST(${orderDetails.gst_percent}%):</span>
          <span>+₹${Number(orderDetails.gst_amount).toFixed(2)}</span>
        </div>
      </div>

      <div class="dotted-line"></div>

      <div class="total-row" style="font-weight: bold;">
        <span>Total:</span>
        <span>₹${Number(orderDetails.grand_total).toFixed(2)}</span>
      </div>
    </body>
  </html>
  `;
  } catch (error) {
    console.error("Error generating receipt HTML:", error);
    throw error;
  }
};

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id, order_id } = useLocalSearchParams();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [invoiceUrl, setInvoiceUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [printerDevice, setPrinterDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [bleManager] = useState(() => {
    if (Platform.OS === "web") return null;
    if (Constants.appOwnership === "expo") {
      console.log("BLE requires development build");
      return null;
    }
    return new BleManager();
  });

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!id) {
        console.error("No order number provided");
        return;
      }

      try {
        console.log("Fetching order details with params:", {
          order_number: id,
          order_id: order_id,
          outlet_id: await AsyncStorage.getItem("outlet_id")
        });
        
        const accessToken = await AsyncStorage.getItem("access");
        const storedOutletId = await AsyncStorage.getItem("outlet_id");

        const response = await fetch(`${getBaseUrl()}/order_view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            order_number: id,
            order_id: order_id,
            outlet_id: storedOutletId
          }),
        });

        const data = await response.json();
        console.log("Order Details Response:", data);

        if (data.st === 1 && data.lists) {
          // Fix datetime parsing based on actual format "27-Jan-2025 03:53:30 PM"
          const [date, time, period] =
            data.lists.order_details.datetime.split(" ");

          // Transform the data to match our UI structure
          const transformedOrder = {
            ...data.lists.order_details,
            menu_items: Array.isArray(data.lists.menu_details)
              ? data.lists.menu_details
              : [data.lists.menu_details], // Handle single object case
            invoice_url: data.lists.invoice_url,
            date: date,
            time: `${time} ${period}`,
            total_quantity: data.lists.menu_details?.[0]?.quantity || 0,
          };

          setOrderDetails(transformedOrder);
          setMenuItems(
            Array.isArray(data.lists.menu_details)
              ? data.lists.menu_details
              : [data.lists.menu_details]
          );
        } else {
          throw new Error(data.msg || "Failed to fetch order details");
        }
      } catch (error) {
        console.error("Fetch Order Details Error:", error);
        toast.show({
          description: "Failed to fetch order details",
          status: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setIsLoading(true);
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const storedUserId = await AsyncStorage.getItem("user_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(`${getBaseUrl()}/update_order_status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: storedOutletId,
          order_id: orderDetails.order_id.toString(),
          order_status: newStatus,
          user_id: storedUserId,
        }),
      });

      const data = await response.json();

      if (data.st === 1) {
        toast.show({
          description: `Order ${
            newStatus === "cancelled" ? "cancelled" : "marked as " + newStatus
          } successfully`,
          status: "success",
          duration: 2000,
        });

        router.replace({
          pathname: "/(tabs)/orders",
          params: {
            refresh: Date.now().toString(),
          },
        });
      } else {
        throw new Error(
          data.msg || `Failed to update order status to ${newStatus}`
        );
      }
    } catch (error) {
      console.error("Status Update Error:", error);
      toast.show({
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const StatusActionButton = () => {
    if (!orderDetails) return null;

    switch (orderDetails.order_status?.toLowerCase()) {
      case "placed":
        return (
          <Button
            colorScheme="red"
            leftIcon={<Icon as={MaterialIcons} name="cancel" size="sm" />}
            onPress={() => handleStatusUpdate("cancelled")}
            isLoading={isLoading}
          >
            Cancel Order
          </Button>
        );
      case "cooking":
        return (
          <Button
            colorScheme="orange"
            leftIcon={<Icon as={MaterialIcons} name="room-service" size="sm" />}
            onPress={() => handleStatusUpdate("served")}
            isLoading={isLoading}
          >
            Mark as Served
          </Button>
        );
      case "served":
        return (
          <Button
            colorScheme="green"
            leftIcon={<Icon as={MaterialIcons} name="payment" size="sm" />}
            onPress={() => handleStatusUpdate("paid")}
            isLoading={isLoading}
          >
            Mark as Paid
          </Button>
        );
      default:
        return null;
    }
  };

  const handleTimerEnd = async () => {
    try {
      await handleStatusUpdate("cooking");
    } catch (error) {
      console.error("Error handling timer end:", error);
    }
  };

  useEffect(() => {
    let timerInterval;

    const initTimer = () => {
      if (orderDetails?.order_status?.toLowerCase() === "placed") {
        const remaining = calculateOrderTimer(orderDetails.time);
        setTimeRemaining(remaining);

        if (remaining > 0) {
          timerInterval = setInterval(() => {
            const newTime = calculateOrderTimer(orderDetails.time);
            setTimeRemaining(newTime);

            if (newTime <= 0) {
              clearInterval(timerInterval);
              handleTimerEnd();
            }
          }, 1000);
        } else if (remaining === 0) {
          handleTimerEnd();
        }
      }
    };

    initTimer();

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [orderDetails]);

  const renderTimer = () => {
    if (
      orderDetails?.order_status?.toLowerCase() !== "placed" ||
      timeRemaining <= 0
    ) {
      return null;
    }

    return (
      <HStack
        bg={timeRemaining <= 30 ? "red.100" : "orange.100"}
        p={2}
        rounded="md"
        alignItems="center"
        space={2}
      >
        <Icon
          as={MaterialIcons}
          name="timer"
          size={5}
          color={timeRemaining <= 30 ? "red.500" : "orange.500"}
        />
        <Text
          fontSize="lg"
          color={timeRemaining <= 30 ? "red.500" : "orange.500"}
          fontWeight="bold"
        >
          {timeRemaining} seconds
        </Text>
      </HStack>
    );
  };

  const textToBytes = (text) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };

  const sendToDevice = async (commands) => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      const services = await printerDevice.services();
      const service = services.find((s) =>
        PRINTER_SERVICE_UUIDS.includes(s.uuid.toUpperCase())
      );

      if (!service) {
        throw new Error("Printer service not found");
      }

      const characteristics = await service.characteristics();
      const printCharacteristic = characteristics.find((c) =>
        PRINTER_CHARACTERISTIC_UUIDS.includes(c.uuid.toUpperCase())
      );

      if (!printCharacteristic) {
        throw new Error("Printer characteristic not found");
      }

      // Send data in chunks
      const CHUNK_SIZE = 20;
      for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(
          i,
          Math.min(i + CHUNK_SIZE, commands.length)
        );
        const base64Data = base64.encode(String.fromCharCode(...chunk));

        // Add retry logic
        let retries = 3;
        while (retries > 0) {
          try {
            await printCharacteristic.writeWithoutResponse(base64Data);
            break;
          } catch (error) {
            retries--;
            if (retries === 0) throw error;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return true;
    } catch (error) {
      console.error("Send to printer error:", error);
      throw error;
    }
  };

  const requestPermissions = async () => {
    try {
      const state = await bleManager.state();
      if (state !== "PoweredOn") {
        Alert.alert(
          "Bluetooth Required",
          "Please enable Bluetooth to connect to printer",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return false;
      }

      if (Platform.OS === "android") {
        if (Platform.Version >= 31) {
          const results = await Promise.all([
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
            ),
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
            ),
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            ),
          ]);
          return results.every(
            (result) => result === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
      }
      return true;
    } catch (error) {
      console.error("Permission request error:", error);
      return false;
    }
  };

  const scanForPrinters = async () => {
    try {
      const isExpoGo = Constants.executionEnvironment === "storeClient";
      const isWeb = Platform.OS === "web";

      if (isExpoGo || isWeb) {
        Alert.alert(
          "Feature Not Available",
          "Bluetooth printing is not available in Expo Go or web. Please use PDF printing instead.",
          [
            {
              text: "Print PDF",
              onPress: async () => {
                try {
                  const html = generateReceiptHTML(orderDetails, menuItems);
                  await Print.printAsync({
                    html,
                    orientation: "portrait",
                  });
                } catch (error) {
                  Alert.alert("Error", "Failed to generate receipt PDF");
                }
              },
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      if (!bleManager) {
        Alert.alert(
          "Feature Not Available",
          "Bluetooth printing is only available in development or production builds."
        );
        return;
      }

      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert("Permission Error", "Bluetooth permissions not granted");
        return;
      }

      setIsScanning(true);
      setAvailableDevices([]);
      setIsModalVisible(true);

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error("Scan error:", error);
          return;
        }
        if (device) {
          setAvailableDevices((prevDevices) => {
            if (!prevDevices.find((d) => d.id === device.id)) {
              return [...prevDevices, device];
            }
            return prevDevices;
          });
        }
      });
    } catch (error) {
      console.error("Scan error:", error);
      Alert.alert("Error", "Failed to start scanning");
    }
  };

  const handleDeviceSelection = async (device) => {
    try {
      setIsModalVisible(false);
      setIsScanning(false);
      bleManager.stopDeviceScan();

      setLoadingMessage("Connecting to device...");
      setIsLoading(true);

      const connectedDevice = await device.connect();
      const discoveredDevice =
        await connectedDevice.discoverAllServicesAndCharacteristics();

      setPrinterDevice(discoveredDevice);
      setIsConnected(true);

      device.onDisconnected((error, disconnectedDevice) => {
        setIsConnected(false);
        setPrinterDevice(null);
        Alert.alert("Disconnected", "Printer connection was lost");
      });

      Alert.alert("Success", `Connected to ${device.name || "printer"}`);
    } catch (error) {
      console.error("Connection error:", error);
      Alert.alert(
        "Connection Failed",
        "Could not connect to the selected device"
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handlePrint = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage("Printing...");

      // Check if running in Expo Go or web
      const isExpoGo = Constants.executionEnvironment === "storeClient";
      const isWeb = Platform.OS === "web";

      if (isExpoGo || isWeb) {
        // Use PDF printing in Expo Go or web
        const html = generateReceiptHTML(orderDetails, menuItems);
        await Print.printAsync({
          html,
          orientation: "portrait",
        });
      } else {
        // Use thermal printing in development or production builds
        if (printerDevice && isConnected) {
          await printReceipt();
        } else {
          setIsModalVisible(true);
          scanForPrinters();
        }
      }

      toast.show({
        description: "Receipt printed successfully",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("Print Error:", error);
      Alert.alert(
        "Print Error",
        "Failed to print receipt. Would you like to try PDF printing?",
        [
          {
            text: "Print PDF",
            onPress: async () => {
              try {
                const html = generateReceiptHTML(orderDetails, menuItems);
                await Print.printAsync({
                  html,
                  orientation: "portrait",
                });
              } catch (pdfError) {
                Alert.alert("Error", "Failed to generate receipt PDF");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const printReceipt = async () => {
    try {
      if (!printerDevice || !isConnected) {
        throw new Error("No printer connected");
      }

      // Generate and send commands for thermal printer
      const commands = [
        ...textToBytes("\x1B\x40"), // Initialize printer
        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes(`${orderDetails.outlet_name}\n`),
        ...textToBytes(`${orderDetails.outlet_address}\n\n`),
        ...textToBytes("\x1B\x61\x00"), // Left alignment
        ...textToBytes(`Bill Number: ${orderDetails.order_number}\n`),
        ...textToBytes(
          `Table: ${orderDetails.section} - ${orderDetails.table_number[0]}\n`
        ),
        ...textToBytes(`Date: ${orderDetails.datetime}\n\n`),
        ...textToBytes("----------------------------------------\n"),
        ...textToBytes("Item                  Qty    Rate    Amt\n"),
        ...textToBytes("----------------------------------------\n"),

        // Print items
        ...menuItems.flatMap((item) => {
          const itemName = item.menu_name.padEnd(20).substring(0, 20);
          return textToBytes(
            `${itemName} ${String(item.quantity).padStart(3)}  ${String(
              item.price
            ).padStart(6)} ${String(item.menu_sub_total).padStart(7)}\n`
          );
        }),

        ...textToBytes("----------------------------------------\n"),
        ...textToBytes(
          `Subtotal:${String(orderDetails.total_bill_amount).padStart(29)}\n`
        ),
        ...textToBytes(
          `Discount (${orderDetails.discount_percent}%):${String(
            -orderDetails.discount_amount
          ).padStart(20)}\n`
        ),
        ...textToBytes(
          `Service Charge (${orderDetails.service_charges_percent}%):${String(
            orderDetails.service_charges_amount
          ).padStart(17)}\n`
        ),
        ...textToBytes(
          `GST (${orderDetails.gst_percent}%):${String(
            orderDetails.gst_amount
          ).padStart(28)}\n`
        ),
        ...textToBytes("----------------------------------------\n"),
        ...textToBytes(
          `GRAND TOTAL:${String(orderDetails.grand_total).padStart(27)}\n\n`
        ),

        ...textToBytes("\x1B\x61\x01"), // Center alignment
        ...textToBytes("Thank you for dining with us!\n"),
        ...textToBytes("Visit us again\n\n"),
        ...textToBytes("\x1D\x56\x41\x10"), // Cut paper
      ];

      // Send commands to printer
      await sendToDevice(commands);
    } catch (error) {
      console.error("Thermal print error:", error);
      throw error;
    }
  };

  const DeviceSelectionModal = ({ visible, devices, onSelect, onClose }) => (
    <Modal isOpen={visible} onClose={onClose}>
      <Modal.Content maxWidth="90%" maxHeight="80%">
        <Modal.Header>Select a Bluetooth Printer</Modal.Header>
        <Modal.Body>
          {isScanning && (
            <Center p={4}>
              <Spinner size="lg" color="blue.500" />
              <Text mt={2} color="gray.600">
                Scanning for devices...
              </Text>
            </Center>
          )}

          <ScrollView maxH="300">
            {devices.map((device, index) => (
              <Pressable
                key={device.id || index}
                p={4}
                borderBottomWidth={1}
                borderBottomColor="gray.200"
                onPress={() => onSelect(device)}
              >
                <Text fontSize="md" fontWeight="500">
                  {device.name || "Unknown Device"}
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  {device.id}
                </Text>
              </Pressable>
            ))}
            {!isScanning && devices.length === 0 && (
              <Text textAlign="center" color="gray.500" p={4}>
                No printers found. Make sure your printer is turned on and
                nearby.
              </Text>
            )}
          </ScrollView>
        </Modal.Body>

        <Modal.Footer>
          <Button.Group space={2}>
            <Button
              variant="ghost"
              colorScheme="blueGray"
              onPress={() => {
                setAvailableDevices([]);
                scanForPrinters();
              }}
            >
              Scan Again
            </Button>
            <Button onPress={onClose}>Close</Button>
          </Button.Group>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );

  if (isLoading) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Order Details" showBack />
        <Center flex={1}>
          <Spinner size="lg" />
          <Text mt={2}>Loading order details...</Text>
        </Center>
      </Box>
    );
  }

  if (!orderDetails) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Order Details" showBack />
        <Center flex={1}>
          <Text>Order not found</Text>
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Order Details" showBack />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary Card */}
        <Box m={4} p={4} bg="white" rounded="lg" shadow={1}>
          <VStack space={3}>
            <HStack justifyContent="space-between" alignItems="center">
              <VStack space={2}>
                <Heading size="md">Order #{orderDetails.order_number}</Heading>
                <Text fontSize="sm" color="coolGray.600">
                  {orderDetails.date} • {orderDetails.time}
                </Text>
                {renderTimer()}
              </VStack>
              <Badge
                px={3}
                py={1}
                rounded="full"
                colorScheme={
                  orderDetails.order_status === "cooking"
                    ? "orange"
                    : orderDetails.order_status === "paid"
                    ? "green"
                    : orderDetails.order_status === "placed"
                    ? "purple"
                    : "red"
                }
              >
                {orderDetails.order_status?.toUpperCase()}
              </Badge>
            </HStack>

            <HStack space={4} alignItems="center">
              <HStack space={2} alignItems="center">
                <MaterialIcons name="table-restaurant" size={20} color="gray" />
                <Text fontSize="md">Table {orderDetails.table_number}</Text>
              </HStack>
            </HStack>
          </VStack>
        </Box>

        {/* Menu Items Card */}
        <Box mx={4} mb={4} p={4} bg="white" rounded="lg" shadow={1}>
          <HStack justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="sm">
              Order Items{" "}
              <Text color="coolGray.600" fontSize="sm">
                ({menuItems.length} {menuItems.length === 1 ? "item" : "items"})
              </Text>
            </Heading>
            <Text color="coolGray.600" fontSize="sm">
              Total Qty:{" "}
              {menuItems.reduce((sum, item) => sum + Number(item.quantity), 0)}
            </Text>
          </HStack>
          <VStack space={4}>
            {menuItems.map((item, index) => (
              <Box
                key={index}
                borderBottomWidth={index !== menuItems.length - 1 ? 1 : 0}
                borderColor="coolGray.200"
                pb={index !== menuItems.length - 1 ? 4 : 0}
              >
                <HStack justifyContent="space-between" alignItems="flex-start">
                  <VStack flex={1} space={1}>
                    <Text fontSize="md" fontWeight="bold">
                      {item.menu_name}{" "}
                      <Text fontSize="sm" color="coolGray.600">
                        ({item.quantity})
                      </Text>
                      {item.half_or_full && (
                        <Text fontSize="sm" color="coolGray.600">
                          {" "}
                          - {item.half_or_full}
                        </Text>
                      )}
                    </Text>
                    {item.comment && (
                      <Text fontSize="sm" color="coolGray.600" italic>
                        Note: {item.comment}
                      </Text>
                    )}
                    <HStack space={2} alignItems="center">
                      {item.offer > 0 && (
                        <Badge
                          colorScheme="red"
                          variant="subtle"
                          rounded="full"
                          px={3}
                          minW={16}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text fontSize="xs" fontWeight="medium">
                            {item.offer}% OFF
                          </Text>
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                  <VStack alignItems="flex-end" space={1}>
                    <Text fontSize="md" fontWeight="semibold">
                      ₹{item.menu_sub_total}
                    </Text>
                    <Text fontSize="sm" color="coolGray.600">
                      ₹{item.price}
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Box>

        {/* Bill Details Card */}
        <Box mx={4} mb={4} p={4} bg="white" rounded="lg" shadow={1}>
          <Heading size="sm" mb={4}>
            Bill Details
          </Heading>
          <VStack space={3}>
            {/* Item Total */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Item Total</Text>
              <Text>₹{Number(orderDetails.total_bill_amount).toFixed(2)}</Text>
            </HStack>

            {/* Discount (if applicable) */}
            {orderDetails.discount_amount > 0 && (
              <HStack justifyContent="space-between">
                <Text color="green.600">
                  Discount ({orderDetails.discount_percent}%)
                </Text>
                <Text color="green.600">
                  -₹{Number(orderDetails.discount_amount).toFixed(2)}
                </Text>
              </HStack>
            )}

            {/* Total after discount */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">Total after discount</Text>
              <Text>
                ₹
                {Number(
                  orderDetails.total_bill_amount - orderDetails.discount_amount
                ).toFixed(2)}
              </Text>
            </HStack>

            {/* Service Charge */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">
                Service Charge ({orderDetails.service_charges_percent}%)
              </Text>
              <Text>
                ₹{Number(orderDetails.service_charges_amount).toFixed(2)}
              </Text>
            </HStack>

            {/* GST */}
            <HStack justifyContent="space-between">
              <Text color="coolGray.600">
                GST ({orderDetails.gst_percent}%)
              </Text>
              <Text>₹{Number(orderDetails.gst_amount).toFixed(2)}</Text>
            </HStack>

            {/* Grand Total */}
            <HStack
              justifyContent="space-between"
              pt={2}
              borderTopWidth={1}
              borderColor="coolGray.200"
            >
              <Text fontWeight="bold">Grand Total</Text>
              <Text fontWeight="bold" fontSize="lg">
                ₹{Number(orderDetails.grand_total).toFixed(2)}
              </Text>
            </HStack>
          </VStack>
        </Box>

        {/* Status Action Button */}
        <Box px={4} pb={4}>
          <StatusActionButton />

          {/* Print Button */}
          <Button
            mt={2}
            variant="outline"
            leftIcon={<Icon as={MaterialIcons} name="print" size="sm" />}
            onPress={handlePrint}
            isLoading={loadingMessage === "Printing..."}
            isDisabled={isLoading}
          >
            {loadingMessage === "Printing..." ? "Printing..." : "Print Receipt"}
          </Button>
        </Box>

        {/* Invoice Button */}
        {orderDetails.order_status === "paid" && orderDetails.invoice_url && (
          <Pressable
            onPress={() => Linking.openURL(orderDetails.invoice_url)}
            mx={4}
            mb={4}
          >
            <Box
              bg="blue.50"
              p={4}
              rounded="lg"
              borderWidth={1}
              borderColor="blue.200"
            >
              <HStack space={2} alignItems="center" justifyContent="center">
                <MaterialIcons name="receipt" size={24} color="#3182CE" />
                <Text color="blue.600" fontWeight="semibold">
                  View Invoice
                </Text>
              </HStack>
            </Box>
          </Pressable>
        )}
      </ScrollView>

      <DeviceSelectionModal
        visible={isModalVisible}
        devices={availableDevices}
        onSelect={handleDeviceSelection}
        onClose={() => {
          setIsModalVisible(false);
          setIsScanning(false);
          bleManager?.stopDeviceScan();
        }}
      />
    </Box>
  );
}
