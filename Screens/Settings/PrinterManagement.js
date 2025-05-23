// screens/Settings/PrinterManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Switch,
  SafeAreaView,
  Platform,
  Linking,
  PermissionsAndroid,
  ToastAndroid,
  TextInput
} from 'react-native';
import { usePrinter } from '../../contexts/PrinterContext';
import RemixIcon from 'react-native-remix-icon';
import CustomHeader from '../../components/CustomHeader';
import CustomTabBar from '../CustomTabBar';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';

// Define a dedicated component for device items for better performance
const DeviceItem = React.memo(({ item, printerDevice, onPress }) => (
  <TouchableOpacity
    style={[
      styles.deviceItem,
      printerDevice?.id === item.id && styles.connectedDevice
    ]}
    onPress={() => onPress(item)}
    activeOpacity={0.7}
  >
    <View style={styles.deviceInfo}>
      <Text style={styles.deviceName} numberOfLines={1} ellipsizeMode="tail">
        {item.name || 'Unknown Device'}
      </Text>
      <Text style={styles.deviceId} numberOfLines={1} ellipsizeMode="tail">
        {item.id}
      </Text>
    </View>
    {printerDevice?.id === item.id && (
      <View style={styles.connectedIndicator}>
        <RemixIcon name="printer-line" size={20} color="#4CAF50" />
        <Text style={styles.connectedText}>Connected</Text>
      </View>
    )}
  </TouchableOpacity>
), (prevProps, nextProps) => {
  // Custom comparison for React.memo to prevent unnecessary rerenders
  return (
    prevProps.item.id === nextProps.item.id &&
    (prevProps.printerDevice?.id === nextProps.printerDevice?.id) &&
    (prevProps.item.id === prevProps.printerDevice?.id) === 
    (nextProps.item.id === nextProps.printerDevice?.id)
  );
});

const PrinterManagement = ({ navigation }) => {
  const {
    printerDevice,
    isConnected,
    isScanning,
    availableDevices,
    scanForPrinters: contextScanForPrinters,
    connectToPrinter,
    disconnectPrinter,
    autoReconnect,
    setAutoReconnect,
    bleManager,
    reconnectPrinter,
    setIsScanning,
    setAvailableDevices,
    isConnecting
  } = usePrinter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [lastConnectedDevice, setLastConnectedDevice] = useState(null);
  const [showReconnectPopup, setShowReconnectPopup] = useState(false);
  const [intentionalDisconnect, setIntentionalDisconnect] = useState(false);

  // Skip checks in Expo
  const isExpo = Constants.appOwnership === "expo";
  
  // Filter devices based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDevices(availableDevices);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = availableDevices.filter(device => {
        const deviceName = (device.name || "Unknown Device").toLowerCase();
        const deviceId = device.id.toLowerCase();
        return deviceName.includes(query) || deviceId.includes(query);
      });
      setFilteredDevices(filtered);
    }
  }, [searchQuery, availableDevices]);
  
  // Monitor printer connection status and show/hide popup based on connection state
  useEffect(() => {
    // The simplest, most direct approach:
    // If connected, hide popup
    if (isConnected) {
      setShowReconnectPopup(false);
      setIntentionalDisconnect(false);
    } 
    // Only show popup when ALL of these conditions are true:
    // 1. We have a last device to reconnect to
    // 2. We're not currently connected
    // 3. We're not currently loading/connecting
    // 4. This wasn't an intentional disconnect
    else if (lastConnectedDevice && 
             !isConnected && 
             !isLoading && 
             !isConnecting && 
             !intentionalDisconnect) {
      setShowReconnectPopup(true);
    }
  }, [isConnected, lastConnectedDevice, isLoading, isConnecting, intentionalDisconnect]);

  // On first mount, try to reconnect to last printer if auto-reconnect is enabled
  useEffect(() => {
    if (autoReconnect && !isConnected && reconnectPrinter && !connectionAttempted) {
      // Add a delay to let BLE manager initialize properly
      setConnectionAttempted(true);
      const timer = setTimeout(() => {
        reconnectPrinter().then(success => {
          if (success) {
            showToast("Reconnected to printer");
            // Important: update our local states if reconnection is successful
            if (isConnected && printerDevice) {
              setLastConnectedDevice(printerDevice);
              setShowReconnectPopup(false); // Ensure popup is not shown
            }
          }
        }).catch(error => {
          console.error("Error during auto-reconnect:", error);
        });
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [autoReconnect, isConnected, reconnectPrinter, connectionAttempted, printerDevice]);

  // Reset connection attempted flag when component is unmounted
  useEffect(() => {
    return () => {
      setConnectionAttempted(false);
      // Clear reconnect popup state on unmount
      setShowReconnectPopup(false);
      setIntentionalDisconnect(false);
    };
  }, []);

  // Use useFocusEffect to run scan when the screen is focused (only if not connected)
  useFocusEffect(
    useCallback(() => {
      // Only scan if not already connected to a printer and not attempted connection yet
      if (!isConnected && !connectionAttempted) {
        setConnectionAttempted(true);
        if (isExpo) {
          handleScan();
        } else {
          checkAndScan();
        }
      }
      
      return () => {
        if (isScanning && bleManager) {
          try {
            bleManager.stopDeviceScan();
            setIsScanning(false);
          } catch (error) {
            // Silently handle errors during cleanup
            console.error("Error stopping scan:", error);
          }
        }
      };
    }, [bleManager, isExpo, isScanning, isConnected, connectionAttempted])
  );

  // Track the last connected printer for reconnection popup
  useEffect(() => {
    if (isConnected && printerDevice) {
      // Store the last successfully connected device
      setLastConnectedDevice(printerDevice);
      
      // Double check if we need to hide the loading indicator
      // Sometimes the loading indicator can stay visible after auto-connection
      setIsLoading(false);
    }
  }, [isConnected, printerDevice]);

  // Add an effect to update UI immediately when connection status changes
  useEffect(() => {
    // When connection status changes, ensure loading state is reset
    if (!isConnecting && isLoading) {
      // Only reset loading if it's been active for more than 1 second
      // This prevents flickering on quick operations
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isConnecting, isConnected]);

  // Main function to check everything and scan
  const checkAndScan = async () => {
    // Don't scan if already connected
    if (isConnected) return;
    
    try {
      setIsLoading(true);
      setLoadingMessage("Checking Bluetooth...");
      
      // 1. Check if BLE Manager exists
      if (!bleManager) {
        if (isExpo) {
          // In Expo environment, we skip BLE checks and just try to scan with mock data
          console.log("Running in Expo environment, using mock data");
          setTimeout(() => {
            setIsScanning(false);
            // Add mock printer devices for development/testing in Expo
            setAvailableDevices([
              {
                id: "mock-printer-001",
                name: "Thermal Printer (58mm)",
                connect: () => {
                  console.log("Mock connect called");
                  return Promise.resolve({ discoverAllServicesAndCharacteristics: () => Promise.resolve() });
                }
              },
              {
                id: "mock-printer-002",
                name: "POS Printer (80mm)",
                connect: () => {
                  console.log("Mock connect called");
                  return Promise.resolve({ discoverAllServicesAndCharacteristics: () => Promise.resolve() });
                }
              },
              {
                id: "mock-printer-003",
                name: "ESC/POS Receipt Printer",
                connect: () => {
                  console.log("Mock connect called");
                  return Promise.resolve({ discoverAllServicesAndCharacteristics: () => Promise.resolve() });
                }
              }
            ]);
          }, 2000);
          setIsLoading(false);
          return;
        } else {
          setIsLoading(false);
          Alert.alert(
            "Bluetooth Error",
            "Please restart the app and try again.",
            [{ text: "OK" }]
          );
          return;
        }
      }
      
      // 2. Request permissions using simpler approach from OrderCreate
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert(
          "Permission Required",
          "Bluetooth permission is needed to connect to printer",
          [{ text: "OK" }]
        );
        setIsLoading(false);
        return;
      }
      
      // 3. Check Bluetooth state with improved error handling and recovery
      let state;
      let retries = 0;
      let stateError = null;
      
      while (retries < 3) {
        try {
          state = await bleManager.state();
          stateError = null;
          break; // Success, exit loop
        } catch (error) {
          console.error(`Error checking BLE state (attempt ${retries + 1}):`, error);
          stateError = error;
          retries++;
          
          // Short delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // If we still have an error after retries
      if (stateError) {
        console.error("Failed to check BLE state after retries");
        
        // Try recovery steps
        try {
          console.log("Attempting to stabilize BLE manager...");
          
          // Wait a bit longer to let BT stack recover
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Try one more time
          state = await bleManager.state();
          console.log("BLE manager recovered after wait, state:", state);
        } catch (finalError) {
          setIsLoading(false);
          Alert.alert(
            "Bluetooth Error",
            "Unable to access Bluetooth. Please make sure Bluetooth is enabled and restart the app if the problem persists.",
            [{ text: "OK" }]
          );
          return;
        }
      }
      
      if (state !== "PoweredOn") {
        Alert.alert(
          "Bluetooth Required",
          "Please turn on Bluetooth to connect to printers",
          [
            {
              text: "Open Settings",
              onPress: () => {
                Platform.OS === "android"
                  ? Linking.openSettings()
                  : Linking.openURL('App-Prefs:Bluetooth');
              }
            },
            { text: "Cancel", style: "cancel" }
          ]
        );
        setIsLoading(false);
        return;
      }
      
      // Don't scan if already connected
      if (isConnected) {
        setIsLoading(false);
        return;
      }
      
      // 4. Start scanning for ALL devices, matching OrderCreate.js approach
      setIsLoading(false);
      setIsScanning(true);
      
      try {
        // For batching device updates
        let newDevices = [];
        let lastUpdateTime = Date.now();
        
        bleManager.startDeviceScan(
          null, // No service UUID filter - scan ALL devices
          null, // No options filter
          (error, device) => {
            if (error) {
              console.error("Scan error:", error);
              return;
            }

            if (device) {
              // Add a more comprehensive filter for printer devices
              const deviceName = (device.name || "").toLowerCase();
              
              // Expanded list of common printer identifiers
              const printerPatterns = [
                "print", "pos", "thermal", "escpos", "esc/pos", "receipt", 
                "hm-", "gprinter", "xprinter", "epson", "star", "zebra", 
                "pt-", "prt-", "btp-", "tsp", "rongta", "iposprinter", 
                "epp", "bth-", "posprinter", "cashier", "bill", "invoice",
                "58mm", "80mm", "zcs", "btprinter", "bt printer", "sprocket",
                "mtp-", "mini", "label", "票据", "打印", "プリンター",
                "sr-", "sr58", "sr80", "srp", "spp", "sprt", 
  "citizen", "bixolon", "sewoo", "woosim", "posiflex",
  "ncr", "fujitsu", "ibm", "hp printer", "hp thermal",
  "peripage", "paperang", "catiga", "munbyn", "hprt", "goojprt",
  "gainscha", "itpp", "issyzonepos", "terow", "prtmn", "urovo",
  "symcode", "poynt", "nemvas", "pr2", "pr3", "printer machine",
  "sam4s", "snbc", "sunmi", "seiko", "tmt", "tm-t", "tm-p", 
  "rpp", "rpt", "pt-", "dtprinter", "pockjet", "pb", "mprint", 
  "mprnt", "codesoft", "tsc", "argox", "godex", "honeywell prnt",
  "prntify", "printify", "barcode printer", "label printer",
  "shipping printer", "kitchen printer", "zjiang", "loyverse",
  "bluebamboo", "square printer", "shopify printer", "paypal prnt",
  "sumup printer", "bt-printer", "morefine", "metapace", "anker prtr",
  "jp-", "jp58", "jp80", "panasonic printer", "casio printer",
  "impact printer", "dot matrix", "termal", "termol"

              ];
              
              // Check if device name includes any printer pattern
              const isPrinterPattern = printerPatterns.some(pattern => 
                deviceName.includes(pattern)
              );
              
              // Expanded list of common non-printer Bluetooth devices to exclude
              const knownNonPrinterPatterns = [
                "iphone", "samsung", "galaxy", "pixel", "car", "speaker", 
                "audio", "headphone", "headset", "watch", "band", "tv", 
                "earphone", "earbud", "mi", "scale", "speaker", "headphone", 
                "bose", "jbl", "powerbeats", "sony", "buds", "airpods", 
                "keyboard", "mouse", "remote", "camera", "fitness", "fitbit",
                "garmin", "huawei", "honor", "oneplus", "redmi", "xiaomi",
                "oppo", "vivo", "realme", "poco", "smart", "wear", "tag",
                "tracker", "light", "lamp", "bulb", "camera", "security",
                "lock", "door", "window", "sensor", "monitor", "scan",
                "controller", "game", "play", "joy", "xbox", "playstation", 
                "phone", "tab", "pad", "laptop", "computer", "pc", "mac",
                "book", "reader", "kindle", "alexa", "echo", "google", "home"
              ];
              
              const isKnownNonPrinter = knownNonPrinterPatterns.some(pattern => 
                deviceName.includes(pattern)
              );
              
              // Additional filters based on device characteristics
              // Most printers have limited services and characteristics
              // Only show unnamed devices if they have certain common BLE printer services
              const isUnnamedButPotentialPrinter = !deviceName && 
                                                 device.serviceUUIDs && 
                                                 device.serviceUUIDs.some(uuid => 
                                                   uuid.toLowerCase().includes("18f0") || 
                                                   uuid.toLowerCase().includes("1101") || // SPP service
                                                   uuid.toLowerCase().includes("ffe0") ||
                                                   uuid.toLowerCase().includes("ff00") ||
                                                   uuid.toLowerCase().includes("4553") ||
                                                   uuid.toLowerCase().includes("49535343"));
              
              // Include device if it matches ANY of these conditions:
              // 1. Has a name that includes a known printer pattern
              // 2. Is unnamed but has a printer service UUID
              // AND it doesn't match any known non-printer pattern
              if ((isPrinterPattern || isUnnamedButPotentialPrinter) && !isKnownNonPrinter) {
                // Add to temporary array instead of updating state immediately
                if (!newDevices.some(d => d.id === device.id)) {
                  newDevices.push(device);
                }
                
                // Only update state periodically to reduce renders
                const now = Date.now();
                if (now - lastUpdateTime > 500 && newDevices.length > 0) {
                  setAvailableDevices((prevDevices) => {
                    // Create merged list avoiding duplicates
                    const merged = [...prevDevices];
                    for (const newDevice of newDevices) {
                      if (!merged.some(d => d.id === newDevice.id)) {
                        merged.push(newDevice);
                      }
                    }
                    return merged;
                  });
                  
                  // Reset after update
                  newDevices = [];
                  lastUpdateTime = now;
                }
              }
            }
          }
        );
        
        // Stop scan after timeout
        setTimeout(() => {
          try {
            if (bleManager) {
              bleManager.stopDeviceScan();
            }
            
            // Final update with any remaining devices
            if (newDevices.length > 0) {
              setAvailableDevices((prevDevices) => {
                const merged = [...prevDevices];
                for (const newDevice of newDevices) {
                  if (!merged.some(d => d.id === newDevice.id)) {
                    merged.push(newDevice);
                  }
                }
                return merged;
              });
            }
            
          } catch (error) {
            console.error("Error stopping scan:", error);
          } finally {
            setIsScanning(false);
          }
        }, 10000);
      } catch (error) {
        console.error("Error starting scan:", error);
        setIsScanning(false);
        Alert.alert(
          "Scan Error",
          "Unable to scan for devices. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error during setup:", error);
      Alert.alert("Error", "Failed to prepare for scanning");
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  // Simplified permission request function from OrderCreate
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      try {
        if (Platform.Version >= 31) {
          // Android 12 or higher
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
      } catch (error) {
        console.error("Permission request error:", error);
        return false;
      }
    }
    return true;
  };

  // Handle scan button
  const handleScan = async () => {
    // Don't scan if already connected
    if (isConnected) return;
    
    setRefreshing(true);
    
    if (isExpo) {
      // In Expo, show mock printer devices
      setAvailableDevices([
        {
          id: "mock-printer-001",
          name: "Thermal Printer (58mm)",
          connect: () => {
            console.log("Mock connect called");
            return Promise.resolve({ discoverAllServicesAndCharacteristics: () => Promise.resolve() });
          }
        },
        {
          id: "mock-printer-002",
          name: "POS Printer (80mm)",
          connect: () => {
            console.log("Mock connect called");
            return Promise.resolve({ discoverAllServicesAndCharacteristics: () => Promise.resolve() });
          }
        },
        {
          id: "mock-printer-003",
          name: "ESC/POS Receipt Printer",
          connect: () => {
            console.log("Mock connect called");
            return Promise.resolve({ discoverAllServicesAndCharacteristics: () => Promise.resolve() });
          }
        }
      ]);
      setRefreshing(false);
      return;
    }
    
    try {
      // Clear previous devices first
      setAvailableDevices([]);
      
      // First try to use the context's scanForPrinters function
      if (contextScanForPrinters) {
        await contextScanForPrinters();
      } else {
        // Fallback to our implementation
        await checkAndScan();
      }
    } catch (error) {
      console.error("Scan error:", error);
      Alert.alert("Error", "Failed to scan for printers");
    } finally {
      setRefreshing(false);
    }
  };

  // Handle printer connection with improved error handling
  const handleConnect = async (device) => {
    try {
      // Check if already connected to this device
      if (isConnected && printerDevice?.id === device.id) {
        showToast("Already connected to this printer");
        return;
      }
      
      // Reset intentional disconnect flag when attempting to connect
      setIntentionalDisconnect(false);
      
      setIsLoading(true);
      setLoadingMessage(`Connecting to ${device.name || 'printer'}...`);
      
      // If connected to different device, disconnect first
      if (isConnected && printerDevice) {
        try {
          await disconnectPrinter();
        } catch (error) {
          console.error("Error disconnecting before new connection:", error);
          // Continue anyway
        }
      }
      
      // Improved connection with timeout and error handling
      let success = false;
      
      try {
        // First try to stabilize BLE system
        if (bleManager) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        success = await connectToPrinter(device);
      } catch (connectionError) {
        console.error("Connection attempt error:", connectionError);
        
        // If first attempt fails, wait briefly and try one more time
        if (retryCount < 1) {
          setRetryCount(count => count + 1);
          setLoadingMessage(`Retrying connection to ${device.name || 'printer'}...`);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            success = await connectToPrinter(device);
          } catch (retryError) {
            console.error("Retry connection error:", retryError);
            success = false;
          }
        } else {
          success = false;
        }
      }
      
      // Reset retry count
      setRetryCount(0);
      
      // IMPORTANT: Check the actual connection status from context, not just the local success variable
      // This fixes the issue where it shows "connection failed" even though the printer is connected
      const actuallyConnected = isConnected && printerDevice?.id === device.id;
      
      if (success || actuallyConnected) {
        showToast("Connected successfully");
      } else {
        // Only show toast if we're not already connected
        if (!isConnected || printerDevice?.id !== device.id) {
          showToast("Connection failed. Try again.");
        }
      }
    } catch (error) {
      console.error("Connection error:", error);
      showToast("Failed to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle printer disconnection
  const handleDisconnect = async () => {
    try {
      // Check if actually connected before trying to disconnect
      if (!isConnected || !printerDevice) {
        showToast("No printer connected");
        return;
      }
      
      setIsLoading(true);
      setLoadingMessage("Disconnecting printer...");
      
      // Set flag before disconnecting
      setIntentionalDisconnect(true);
      
      await disconnectPrinter();
      showToast("Printer disconnected");
      
      // Clear the last connected device and hide the reconnect popup
      setLastConnectedDevice(null);
      setShowReconnectPopup(false);
    } catch (error) {
      console.error("Disconnect error:", error);
      // Don't show error, just log it
    } finally {
      setIsLoading(false);
    }
  };

  // Show toast message (Android only)
  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // For iOS, you could implement an alternative (e.g., Alert)
      console.log("Toast message:", message);
    }
  };

  // Handle auto-reconnect setting change
  const handleAutoReconnectChange = (value) => {
    setAutoReconnect(value);
    if (value && !isConnected && reconnectPrinter) {
      // Try to reconnect right away when enabling auto-reconnect
      setTimeout(() => {
        reconnectPrinter().then(success => {
          if (success) {
            showToast("Reconnected to printer");
          }
        }).catch(console.error);
      }, 500);
    }
    
    // Show confirmation
    showToast(value ? "Auto-reconnect enabled" : "Auto-reconnect disabled");
  };

  // Handle reconnection attempt from popup
  const handleReconnectFromPopup = async () => {
    // Hide popup immediately to prevent double-taps
    setShowReconnectPopup(false);
    
    if (!lastConnectedDevice) {
      showToast("No previous connection found");
      return;
    }
    
    // Check if we're already connected to this device (to prevent reconnecting to an already connected device)
    if (isConnected && printerDevice && printerDevice.id === lastConnectedDevice.id) {
      showToast("Already connected to this printer");
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage(`Reconnecting to ${lastConnectedDevice.name || 'previous printer'}...`);
    
    try {
      // If we're connected to a different printer, disconnect first
      if (isConnected && printerDevice && printerDevice.id !== lastConnectedDevice.id) {
        await disconnectPrinter();
        // Small delay to ensure disconnection is complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const success = await connectToPrinter(lastConnectedDevice);
      
      if (success) {
        showToast("Reconnected successfully");
      } else {
        Alert.alert(
          "Reconnection Failed",
          "Could not reconnect to the previous printer. Would you like to scan for available printers?",
          [
            {
              text: "Yes",
              onPress: handleScan
            },
            {
              text: "No",
              style: "cancel"
            }
          ]
        );
      }
    } catch (error) {
      console.error("Reconnect error:", error);
      Alert.alert(
        "Reconnection Error",
        "An error occurred while reconnecting. Would you like to scan for available printers?",
        [
          {
            text: "Yes",
            onPress: handleScan
          },
          {
            text: "No",
            style: "cancel"
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Reconnection popup component - simple version with extra safety check
  const ReconnectPopup = () => {
    // Extra safety check: NEVER show the popup if we're connected
    if (!showReconnectPopup || isConnected) return null;
    
    return (
      <View style={styles.popupOverlay}>
        <View style={styles.popupContainer}>
          <RemixIcon name="error-warning-line" size={40} color="#FF9800" />
          <Text style={styles.popupTitle}>Printer Disconnected</Text>
          <Text style={styles.popupMessage}>
            The printer "{lastConnectedDevice?.name || 'Unknown'}" has been disconnected.
            Would you like to try reconnecting?
          </Text>
          <View style={styles.popupButtonsContainer}>
            <TouchableOpacity 
              style={[styles.popupButton, styles.popupButtonSecondary]}
              onPress={() => {
                setShowReconnectPopup(false);
                setIntentionalDisconnect(true); // Mark as intentional to prevent auto-popup
              }}
            >
              <Text style={styles.popupButtonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.popupButton, styles.popupButtonPrimary]}
              onPress={handleReconnectFromPopup}
            >
              <Text style={styles.popupButtonPrimaryText}>Reconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Reset scan and connection state when component unmounts
  useEffect(() => {
    return () => {
      if (isScanning && bleManager) {
        try {
          bleManager.stopDeviceScan();
        } catch (error) {
          console.error("Error stopping scan on unmount:", error);
        }
      }
      
      // Clear reconnect popup state on unmount
      setShowReconnectPopup(false);
      setIntentionalDisconnect(false);
    };
  }, [isScanning, bleManager]);

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Printer Management" navigation={navigation} />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      )}

      <ReconnectPopup />

      <View style={styles.header}>
        <Text style={styles.title}>Printer Management</Text>
        <Text style={styles.subtitle}>
          {isConnected 
            ? `Connected to: ${printerDevice?.name || 'Unknown Printer'}` 
            : 'No printer connected'}
        </Text>
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Auto-reconnect on startup</Text>
        <Switch
          value={autoReconnect}
          onValueChange={handleAutoReconnectChange}
          trackColor={{ false: '#d1d1d1', true: '#4CAF50' }}
          thumbColor={autoReconnect ? '#fff' : '#f4f3f4'}
        />
      </View>

      {/* Only show device list and scan button if not connected */}
      {!isConnected && (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Available Printers</Text>
            <TouchableOpacity 
              style={[styles.refreshButton, isScanning && styles.refreshButtonSpinning]} 
              onPress={handleScan}
              disabled={isScanning}
            >
              <RemixIcon 
                name={isScanning ? "loader-4-line" : "refresh-line"} 
                size={22} 
                color={isScanning ? "#4CAF50" : "#333"} 
              />
            </TouchableOpacity>
          </View>

          {/* Add Search Bar */}
          <View style={styles.searchContainer}>
            <RemixIcon name="search-line" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search printers by name or ID"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <RemixIcon name="close-circle-fill" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {isScanning && (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="small" color="#4CAF50" />
              <Text style={styles.scanningText}>Scanning for printers...</Text>
            </View>
          )}

          <FlatList
            data={filteredDevices}
            keyExtractor={(item) => item.id}
            renderItem={(props) => (
              <DeviceItem 
                {...props} 
                printerDevice={printerDevice} 
                onPress={handleConnect} 
              />
            )}
            contentContainerStyle={[styles.listContent, filteredDevices.length === 0 && styles.emptyListContent]}
            ListEmptyComponent={
              !isScanning && (
                <View style={styles.emptyContainer}>
                  <RemixIcon 
                    name={searchQuery.length > 0 ? "search-line" : "bluetooth-line"} 
                    size={40} 
                    color="#ccc" 
                  />
                  <Text style={styles.emptyTitle}>
                    {searchQuery.length > 0 ? "No matching printers" : "No printers found"}
                  </Text>
                  <Text style={styles.emptyText}>
                    {searchQuery.length > 0 
                      ? "Try a different search term or clear the search"
                      : "Make sure your printer is turned on and in pairing mode."}
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyButton}
                    onPress={searchQuery.length > 0 ? () => setSearchQuery("") : handleScan}
                  >
                    <Text style={styles.emptyButtonText}>
                      {searchQuery.length > 0 ? "Clear Search" : "Scan Again"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            }
            refreshing={refreshing}
            onRefresh={handleScan}
            
            // Performance optimizations
            windowSize={10}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={true}
            initialNumToRender={8}
            getItemLayout={(data, index) => ({
              length: 60, // Approximate height of each item
              offset: 60 * index,
              index,
            })}
          />
        </>
      )}

      {/* Show connected device details if connected */}
      {isConnected && (
        <>
          <View style={styles.connectedDetails}>
            <RemixIcon name="printer-fill" size={50} color="#4CAF50" style={styles.printerIcon} />
            <Text style={styles.connectedName}>{printerDevice?.name || 'Unnamed Printer'}</Text>
            <Text style={styles.connectedId}>{printerDevice?.id}</Text>
            <Text style={styles.connectionStatus}>Status: Connected</Text>
            
            <TouchableOpacity 
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <RemixIcon name="plug-line" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.disconnectText}>Disconnect Printer</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      
      <CustomTabBar navigation={navigation} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  refreshButtonSpinning: {
    backgroundColor: '#e6f7ff',
  },
  listContent: {
    flexGrow: 1,
    padding: 10,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  connectedDevice: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f9fff9',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  connectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  connectedText: {
    color: '#4CAF50',
    marginLeft: 5,
    fontWeight: '500',
  },
  connectedDetails: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  printerIcon: {
    marginBottom: 20,
  },
  connectedName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  connectedId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  connectionStatus: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 30,
  },
  disconnectButton: {
    flexDirection: 'row',
    width: '80%',
    padding: 15,
    backgroundColor: '#f44336',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    marginTop: 20,
  },
  disconnectText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginHorizontal: 10,
    backgroundColor: '#e6f7ff',
    borderRadius: 5,
  },
  scanningText: {
    marginLeft: 10,
    color: '#219ebc',
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 999,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    height: 48,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 6,
  },
  popupOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  popupContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  popupMessage: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  popupButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  popupButton: {
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  popupButtonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  popupButtonSecondaryText: {
    color: '#333',
    fontWeight: '500',
  },
  popupButtonPrimary: {
    backgroundColor: '#4CAF50',
  },
  popupButtonPrimaryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PrinterManagement;
