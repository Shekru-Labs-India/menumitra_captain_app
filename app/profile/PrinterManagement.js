// screens/Settings/PrinterManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Platform,
  Alert,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import { usePrinter } from '../../context/PrinterContext';
import { MaterialIcons } from "@expo/vector-icons";
import Header from '../components/Header';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import {
  Box,
  HStack,
  VStack,
  IconButton,
  ScrollView,
  Pressable,
  Icon,
  useToast,
  Spinner,
  Center,
  Input,
  Button,
  Modal,
  Text,
  FlatList,
  Switch,
  StatusBar,
  useColorMode
} from "native-base";
import { useRouter } from "expo-router";

// Define a dedicated component for device items for better performance
const DeviceItem = React.memo(({ item, printerDevice, onPress }) => (
  <Pressable onPress={() => onPress(item)}>
    <Box
      bg="white"
      p={4}
      my={1}
      rounded="lg"
      shadow={1}
      borderLeftWidth={printerDevice?.id === item.id ? 4 : 0}
      borderLeftColor="green.500"
      backgroundColor={printerDevice?.id === item.id ? "green.50" : "white"}
    >
      <HStack justifyContent="space-between" alignItems="center">
        <VStack flex={1}>
          <Text fontSize="md" fontWeight="semibold" color="coolGray.800">
            {item.name || 'Unknown Device'}
          </Text>
          <Text fontSize="xs" color="coolGray.500">
            {item.id}
          </Text>
        </VStack>
        {printerDevice?.id === item.id && (
          <HStack 
            space={1} 
            bg="green.100" 
            px={2} 
            py={1} 
            rounded="full" 
            alignItems="center"
          >
            <Icon 
              as={MaterialIcons} 
              name="print" 
              size={4} 
              color="green.600" 
            />
            <Text color="green.600" fontWeight="medium">Connected</Text>
          </HStack>
        )}
      </HStack>
    </Box>
  </Pressable>
));

const PrinterManagement = () => {
  const router = useRouter();
  const toast = useToast();
  const { colorMode } = useColorMode();
  const {
    printerDevice,
    isConnected,
    isScanning,
    availableDevices,
    scanForPrinters,
    connectToPrinter,
    disconnectPrinter,
    autoReconnect,
    setAutoReconnect,
    bleManager,
    reconnectPrinter,
    setIsScanning,
    setAvailableDevices
  } = usePrinter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [lastConnectedDevice, setLastConnectedDevice] = useState(null);
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
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
  
  // On first mount, try to reconnect to last printer if auto-reconnect is enabled
  useEffect(() => {
    if (autoReconnect && !isConnected && reconnectPrinter && !connectionAttempted) {
      // Add a delay to let BLE manager initialize properly
      setConnectionAttempted(true);
      const timer = setTimeout(() => {
        reconnectPrinter().then(success => {
          if (success) {
            showToast("Reconnected to printer");
          }
        }).catch(error => {
          console.error("Error during auto-reconnect:", error);
        });
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [autoReconnect, isConnected, reconnectPrinter, connectionAttempted]);
  
  // Reset connection attempted flag when component is unmounted
  useEffect(() => {
    return () => setConnectionAttempted(false);
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
    }
  }, [isConnected, printerDevice]);

  // Monitor printer connection status and show popup on disconnection
  useEffect(() => {
    // If we had a previously connected printer (lastConnectedDevice exists)
    // but now we're disconnected, show the reconnect popup
    // Only show if not intentionally disconnected
    if (lastConnectedDevice && !isConnected && !isLoading && !intentionalDisconnect) {
      setShowReconnectDialog(true);
    }
  }, [isConnected, lastConnectedDevice, isLoading, intentionalDisconnect]);

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
            // Add some mock data for development/testing in Expo
            setAvailableDevices([
              {
                id: "mock-printer-001",
                name: "Demo Printer (Expo)",
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
      
      // 4. Start scanning for ALL devices (no filtering)
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
      // In Expo, show mock data
      setAvailableDevices([
        {
          id: "mock-printer-001",
          name: "Demo Printer (Expo)",
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
      if (scanForPrinters) {
        await scanForPrinters();
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
      
      if (success) {
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
      setShowReconnectDialog(false);
    } catch (error) {
      console.error("Disconnect error:", error);
      // Don't show error, just log it
    } finally {
      setIsLoading(false);
    }
  };

  // Replace showToast function to use NativeBase toast
  const showToast = (message) => {
    toast.show({
      description: message,
      placement: "bottom",
      duration: 2000
    });
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
    setShowReconnectDialog(false);
    
    if (!lastConnectedDevice) {
      showToast("No previous connection found");
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage(`Reconnecting to ${lastConnectedDevice.name || 'previous printer'}...`);
    
    try {
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

  // Reconnection popup component
  const ReconnectPopup = () => {
    if (!showReconnectDialog) return null;
    
    return (
      <Modal isOpen={showReconnectDialog} onClose={() => setShowReconnectDialog(false)}>
        <Modal.Content>
          <Modal.Header>Printer Disconnected</Modal.Header>
          <Modal.Body>
            <VStack space={3} alignItems="center">
              <Icon 
                as={MaterialIcons} 
                name="warning" 
                size={10} 
                color="orange.500" 
              />
              <Text>
                The printer "{lastConnectedDevice?.name || 'Unknown'}" has been disconnected.
                Would you like to try reconnecting?
              </Text>
            </VStack>
          </Modal.Body>
          <Modal.Footer>
            <Button.Group space={2}>
              <Button 
                variant="ghost" 
                onPress={() => setShowReconnectDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                colorScheme="blue" 
                onPress={handleReconnectFromPopup}
              >
                Reconnect
              </Button>
            </Button.Group>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
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
      setShowReconnectDialog(false);
      setIntentionalDisconnect(false);
    };
  }, [isScanning, bleManager]);

  return (
    <Box flex={1} bg="coolGray.50" safeArea>
      <StatusBar barStyle={colorMode === "dark" ? "light-content" : "dark-content"} />
      
      <Header title="Printer Management" />

      {isLoading && (
        <Center flex={1} bg="rgba(255, 255, 255, 0.9)" position="absolute" w="full" h="full" zIndex={999}>
          <Spinner size="lg" color="blue.500" />
          <Text mt={2} color="coolGray.600">{loadingMessage}</Text>
        </Center>
      )}

      <ReconnectPopup />

      <ScrollView>
        <VStack space={4} p={4}>
          {/* Connection Status */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <HStack alignItems="center" space={3}>
              <Icon 
                as={MaterialIcons} 
                name="print" 
                size={6} 
                color={isConnected ? "green.600" : "coolGray.400"} 
              />
              <VStack>
                <Text fontSize="md" fontWeight="semibold">
                  {isConnected ? "Connected" : "Not Connected"}
                </Text>
                <Text fontSize="sm" color="coolGray.500">
                  {isConnected 
                    ? `Connected to: ${printerDevice?.name || 'Unknown Printer'}` 
                    : 'No printer connected'}
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Auto Reconnect Setting */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="md">Auto-reconnect on startup</Text>
              <Switch
                isChecked={autoReconnect}
                onToggle={handleAutoReconnectChange}
                colorScheme="green"
              />
            </HStack>
          </Box>

          {/* Search and Device List */}
          {!isConnected && (
            <VStack space={4}>
              <Input
                placeholder="Search printers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                InputLeftElement={
                  <Icon
                    as={MaterialIcons}
                    name="search"
                    size={5}
                    ml={2}
                    color="coolGray.400"
                  />
                }
                InputRightElement={
                  searchQuery ? (
                    <IconButton
                      icon={<Icon as={MaterialIcons} name="close" size={5} color="coolGray.400" />}
                      onPress={() => setSearchQuery("")}
                    />
                  ) : null
                }
              />

              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="lg" fontWeight="semibold">Available Printers</Text>
                <IconButton
                  icon={
                    <Icon 
                      as={MaterialIcons} 
                      name={isScanning ? "sync" : "refresh"} 
                      size={6}
                      color="coolGray.500"
                    />
                  }
                  onPress={handleScan}
                  isDisabled={isScanning}
                  _icon={{
                    style: isScanning ? { transform: [{ rotate: '360deg' }] } : {}
                  }}
                />
              </HStack>

              {isScanning && (
                <HStack space={2} justifyContent="center" p={2} bg="blue.50" rounded="md">
                  <Spinner size="sm" color="blue.500" />
                  <Text color="blue.600">Scanning for printers...</Text>
                </HStack>
              )}

              <FlatList
                data={filteredDevices}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <DeviceItem
                    item={item}
                    printerDevice={printerDevice}
                    onPress={handleConnect}
                  />
                )}
                ListEmptyComponent={
                  !isScanning && (
                    <Center py={10}>
                      <Icon 
                        as={MaterialIcons}
                        name={searchQuery ? "search-off" : "bluetooth-disabled"}
                        size={12}
                        color="coolGray.300"
                      />
                      <Text fontSize="lg" fontWeight="medium" color="coolGray.400" mt={4}>
                        {searchQuery ? "No matching printers" : "No printers found"}
                      </Text>
                      <Text fontSize="sm" color="coolGray.500" mt={1}>
                        {searchQuery 
                          ? "Try a different search term"
                          : "Make sure your printer is turned on and in range"}
                      </Text>
                      <Button
                        mt={4}
                        onPress={searchQuery ? () => setSearchQuery("") : handleScan}
                        leftIcon={<Icon as={MaterialIcons} name={searchQuery ? "clear" : "refresh"} />}
                      >
                        {searchQuery ? "Clear Search" : "Scan Again"}
                      </Button>
                    </Center>
                  )
                }
              />
            </VStack>
          )}

          {/* Connected Printer Details */}
          {isConnected && (
            <Box bg="white" p={6} rounded="lg" shadow={1} alignItems="center">
              <Icon 
                as={MaterialIcons}
                name="print"
                size={16}
                color="green.500"
                mb={4}
              />
              <Text fontSize="xl" fontWeight="bold">
                {printerDevice?.name || 'Unnamed Printer'}
              </Text>
              <Text fontSize="sm" color="coolGray.500" mb={6}>
                {printerDevice?.id}
              </Text>
              <Button
                colorScheme="red"
                leftIcon={<Icon as={MaterialIcons} name="close" size={5} />}
                onPress={handleDisconnect}
                width="full"
              >
                Disconnect Printer
              </Button>
            </Box>
          )}
        </VStack>
      </ScrollView>
    </Box>
  );
};

export default PrinterManagement;