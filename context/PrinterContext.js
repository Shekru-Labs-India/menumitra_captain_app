import React, { createContext, useState, useContext, useEffect } from "react";
import { BleManager } from "react-native-ble-plx";
import Constants from "expo-constants";
import { Platform, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import base64 from "react-native-base64";

// Common printer service and characteristic UUIDs
const PRINTER_SERVICE_UUIDS = [
  "49535343-FE7D-4AE5-8FA9-9FAFD205E455",
  "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2",
  "000018F0-0000-1000-8000-00805F9B34FB",
];

const PRINTER_CHARACTERISTIC_UUIDS = [
  "49535343-8841-43F4-A8D4-ECBE34729BB3",
  "BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F",
];

const PrinterContext = createContext();

export const usePrinter = () => useContext(PrinterContext);

export const PrinterProvider = ({ children }) => {
  // Initialize BLE Manager only in production build
  const [bleManager] = useState(() => {
    if (Platform.OS === "web") return null;
    if (Constants.appOwnership === "expo") {
      console.log("BLE requires development build");
      return null;
    }
    return new BleManager();
  });

  // Printer states
  const [printerDevice, setPrinterDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [lastConnectedId, setLastConnectedId] = useState(null);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [reconnectAttemptInProgress, setReconnectAttemptInProgress] = useState(false);
  const [connectionMonitorActive, setConnectionMonitorActive] = useState(false);

  // Load last connected printer and auto-reconnect setting on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load last connected printer ID
        const id = await AsyncStorage.getItem("lastConnectedPrinter");
        if (id) setLastConnectedId(id);
        
        // Load auto-reconnect setting
        const reconnectSetting = await AsyncStorage.getItem("printerAutoReconnect");
        if (reconnectSetting !== null) {
          setAutoReconnect(reconnectSetting === "true");
        }
        
        // Auto reconnect if enabled, has a previous connection, and not on Expo
        if (id && (reconnectSetting !== "false") && !Constants.appOwnership && bleManager) {
          console.log("Auto-reconnect: Attempting to reconnect to printer", id);
          
          setTimeout(() => {
            reconnectPrinter().catch(error => {
              console.error("Auto-reconnect failed:", error);
            });
          }, 1500);
        }
      } catch (error) {
        console.error("Error loading printer settings:", error);
      }
    };
    
    loadSettings();
  }, []);

  // Save auto-reconnect setting when changed
  useEffect(() => {
    const saveAutoReconnect = async () => {
      try {
        await AsyncStorage.setItem("printerAutoReconnect", autoReconnect.toString());
      } catch (error) {
        console.error("Error saving auto-reconnect setting:", error);
      }
    };
    
    saveAutoReconnect();
  }, [autoReconnect]);

  // Connect to a printer device
  const connectToPrinter = async (device) => {
    if (!device || isConnecting) return false;
    
    try {
      setConnectionError(null);
      setIsConnecting(true);
      console.log("Connecting to device:", device.id);

      // First check if device is already connected
      try {
        const isDeviceConnected = await device.isConnected();
        if (isDeviceConnected) {
          console.log("Device is already connected");
          setPrinterDevice(device);
          setIsConnected(true);
          await AsyncStorage.setItem("lastConnectedPrinter", device.id);
          setLastConnectedId(device.id);
          setIsConnecting(false);
          return true;
        }
      } catch (checkError) {
        console.log("Error checking if device is connected:", checkError);
        // Continue with connection attempt
      }

      // Connect with proper options
      const connectedDevice = await device.connect({
        timeout: 15000, // Increased timeout for better connection reliability
        requestMTU: 512,
        autoConnect: true,
      });

      console.log("Device connected successfully:", connectedDevice.id);

      // Set up disconnect listener for auto-reconnect
      device.onDisconnected((error, disconnectedDevice) => {
        console.log("Device disconnected event triggered");
        setIsConnected(false);
        setPrinterDevice(null);
        
        // Don't try to reconnect if auto-reconnect is disabled
        if (!autoReconnect) return;
        
        // Attempt to reconnect after a brief delay
        setTimeout(async () => {
          try {
            reconnectPrinter().catch(console.error);
          } catch (e) {
            console.error("Auto-reconnect after disconnect error:", e);
          }
        }, 2000);
      });

      // Discover all services and characteristics
      try {
        await connectedDevice.discoverAllServicesAndCharacteristics();
        console.log("Services and characteristics discovered");
      } catch (discoverError) {
        console.error("Error discovering services:", discoverError);
        // Continue anyway, some printers work without this
      }

      // Save the connected device
      await AsyncStorage.setItem("lastConnectedPrinter", device.id);
      setLastConnectedId(device.id);
      setPrinterDevice(connectedDevice);
      setIsConnected(true);
      console.log("Connection completed and saved");
      return true;
    } catch (error) {
      console.error("Error connecting to printer:", error);
      setConnectionError(error.message);
      setIsConnected(false);
      setPrinterDevice(null);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Scan for available printer devices
  const scanForPrinters = async () => {
    if (!bleManager) {
      console.warn("BLE Manager not initialized, cannot scan for printers");
      setIsScanning(false);
      return false;
    }

    try {
      setIsScanning(true);
      
      // Clear previous devices 
      setAvailableDevices([]);
      
      // Temporary array to batch device updates
      let newDevices = [];
      let lastUpdateTime = Date.now();

      // Check Bluetooth state with better error handling
      let state;
      try {
        state = await bleManager.state();
        console.log("Bluetooth state:", state);
      } catch (stateError) {
        console.error("Error checking BT state:", stateError);
        setIsScanning(false);
        throw new Error("Failed to check Bluetooth status. Please restart the app.");
      }
      
      if (state !== "PoweredOn") {
        setIsScanning(false);
        throw new Error("Bluetooth is not turned on. Please enable Bluetooth to connect to printer.");
      }

      // Start scanning for ALL devices
      try {
        bleManager.startDeviceScan(
          null, // No service UUID filter - scan ALL devices
          null, // No options filter
          (error, device) => {
            if (error) {
              console.error("Scan error:", error);
              return;
            }

            if (device) {
              // Add to temporary array instead of updating state on every device
              if (!newDevices.some(d => d.id === device.id)) {
                newDevices.push(device);
              }
              
              // Update the state in batches to reduce renders
              const now = Date.now();
              if (now - lastUpdateTime > 500 && newDevices.length > 0) {
                setAvailableDevices(prev => {
                  // Merge with previous devices, avoiding duplicates
                  const merged = [...prev];
                  for (const newDevice of newDevices) {
                    if (!merged.some(d => d.id === newDevice.id)) {
                      merged.push(newDevice);
                    }
                  }
                  return merged;
                });
                newDevices = [];
                lastUpdateTime = now;
              }
            }
          }
        );
      } catch (scanError) {
        console.error("Error starting scan:", scanError);
        setIsScanning(false);
        throw new Error("Failed to start scanning for printers. Please restart the app.");
      }

      // Stop scan after timeout
      setTimeout(() => {
        if (bleManager) {
          try {
            bleManager.stopDeviceScan();
          } catch (error) {
            console.error("Error stopping scan:", error);
          }
        }
        
        // Final update with any remaining devices
        if (newDevices.length > 0) {
          setAvailableDevices(prev => {
            const merged = [...prev];
            for (const newDevice of newDevices) {
              if (!merged.some(d => d.id === newDevice.id)) {
                merged.push(newDevice);
              }
            }
            return merged;
          });
        }
        
        setIsScanning(false);
      }, 10000);
      
      return true;
    } catch (error) {
      console.error("Error scanning for devices:", error);
      setIsScanning(false);
      throw error;
    }
  };

  // Disconnect from current printer
  const disconnectPrinter = async () => {
    if (!printerDevice) return;

    try {
      await printerDevice.cancelConnection();
      await AsyncStorage.removeItem("lastConnectedPrinter");
      setPrinterDevice(null);
      setIsConnected(false);
      setLastConnectedId(null);
    } catch (error) {
      console.error("Error disconnecting printer:", error);
    }
  };

  // Try to reconnect to last used printer
  const reconnectPrinter = async () => {
    if (!lastConnectedId || isConnecting || isConnected || reconnectAttemptInProgress) {
      return false;
    }

    try {
      setReconnectAttemptInProgress(true);
      setIsConnecting(true);
      console.log("Attempting to reconnect to last printer:", lastConnectedId);
      
      // Check if BLE manager exists
      if (!bleManager) {
        console.error("BLE Manager not initialized");
        setIsConnecting(false);
        setReconnectAttemptInProgress(false);
        return false;
      }
      
      // Check Bluetooth state first
      let state;
      try {
        state = await bleManager.state();
      } catch (stateError) {
        console.error("Error checking BT state during reconnect:", stateError);
        setIsConnecting(false);
        setReconnectAttemptInProgress(false);
        return false;
      }
      
      if (state !== "PoweredOn") {
        console.log("Bluetooth not powered on, can't reconnect. State:", state);
        setIsConnecting(false);
        setReconnectAttemptInProgress(false);
        return false;
      }
      
      // Try direct connection first
      try {
        const device = await bleManager.connectToDevice(lastConnectedId, {
          autoConnect: true,
          timeout: 5000
        });
        
        if (device) {
          console.log("Connected directly to device:", device.id);
          try {
            await device.discoverAllServicesAndCharacteristics();
          } catch (discoverError) {
            console.log("Service discovery error:", discoverError);
          }
          
          setPrinterDevice(device);
          setIsConnected(true);
          setIsConnecting(false);
          setReconnectAttemptInProgress(false);
          return true;
        }
      } catch (directConnectError) {
        console.log("Direct reconnect failed, trying alternative methods:", directConnectError);
      }
      
      // If direct connection fails, try scanning for it
      setIsScanning(true);
      
      return new Promise((resolve) => {
        try {
          bleManager.startDeviceScan(
            null, // No filters
            null,
            async (error, foundDevice) => {
              if (error) {
                console.error("Scan error during reconnect:", error);
                return;
              }
              
              if (foundDevice && foundDevice.id === lastConnectedId) {
                try {
                  bleManager.stopDeviceScan();
                } catch (stopError) {
                  console.log("Error stopping scan:", stopError);
                }
                
                console.log("Found device during reconnect scan:", foundDevice.id);
                const success = await connectToPrinter(foundDevice);
                setIsScanning(false);
                resolve(success);
              }
            }
          );
        } catch (scanError) {
          console.error("Error starting scan:", scanError);
          setIsScanning(false);
          setIsConnecting(false);
          setReconnectAttemptInProgress(false);
          resolve(false);
        }
        
        // Stop scan after timeout
        setTimeout(() => {
          try {
            if (bleManager) {
              bleManager.stopDeviceScan();
            }
          } catch (stopError) {
            console.log("Error stopping timed scan:", stopError);
          }
          
          setIsScanning(false);
          setIsConnecting(false);
          setReconnectAttemptInProgress(false);
          console.log("Reconnect scan timed out");
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error("Error reconnecting:", error);
      setIsConnecting(false);
      setReconnectAttemptInProgress(false);
      return false;
    }
  };

  // Add helper function for printing
  const sendDataToPrinter = async (data) => {
    if (!printerDevice || !isConnected) {
      throw new Error("No printer connected");
    }

    try {
      // Set printing state to true to prevent connection monitor interference
      setIsPrinting(true);
      
      // Verify connection before sending data
      let connected = false;
      try {
        connected = await printerDevice.isConnected();
      } catch (connectionError) {
        console.log("Error checking connection, assuming disconnected:", connectionError);
        setIsConnected(false);
        setPrinterDevice(null);
        setIsPrinting(false);
        throw new Error("Printer connection lost");
      }
      
      if (!connected) {
        setIsConnected(false);
        setPrinterDevice(null);
        setIsPrinting(false);
        throw new Error("Printer connection lost");
      }
      
      // Get printer services
      const services = await printerDevice.services().catch(error => {
        console.error("Error getting printer services:", error);
        throw new Error("Failed to get printer services");
      });
      
      const service = services.find((svc) =>
        PRINTER_SERVICE_UUIDS.some((uuid) =>
          svc.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );

      if (!service) {
        throw new Error("Printer service not found");
      }

      // Get printer characteristics
      const characteristics = await service.characteristics().catch(error => {
        console.error("Error getting printer characteristics:", error);
        throw new Error("Failed to get printer characteristics");
      });
      
      const characteristic = characteristics.find((char) =>
        PRINTER_CHARACTERISTIC_UUIDS.some((uuid) =>
          char.uuid.toLowerCase().includes(uuid.toLowerCase())
        )
      );

      if (!characteristic) {
        throw new Error("Printer characteristic not found");
      }

      // Send data in chunks
      const CHUNK_SIZE = 150;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        try {
          await characteristic.writeWithoutResponse(
            base64.encode(String.fromCharCode(...chunk))
          );
          
          // Small delay between chunks
          if (i + CHUNK_SIZE < data.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (writeError) {
          console.error("Error writing to printer:", writeError);
          // Check if device is still connected
          try {
            const stillConnected = await printerDevice.isConnected();
            if (!stillConnected) {
              setIsConnected(false);
              setPrinterDevice(null);
            }
          } catch (e) {
            // If error checking connection, assume disconnected
            setIsConnected(false);
            setPrinterDevice(null);
          }
          throw new Error(`Printer write error: ${writeError.message}`);
        }
      }

      return true;
    } catch (error) {
      console.error("Error sending data to printer:", error);
      
      // Update connection state if we detect a disconnection
      if (error.message.includes("connection") || 
          error.message.includes("disconnected") ||
          error.message.includes("write") ||
          error.message.includes("not connected")) {
        setIsConnected(false);
        setPrinterDevice(null);
      }
      
      throw error;
    } finally {
      // Always reset printing state when done
      setIsPrinting(false);
    }
  };

  return (
    <PrinterContext.Provider
      value={{
        bleManager,
        printerDevice,
        isConnected,
        isConnecting,
        connectionError,
        isScanning,
        availableDevices,
        autoReconnect,
        setAutoReconnect,
        isPrinting,
        connectToPrinter,
        disconnectPrinter,
        scanForPrinters,
        reconnectPrinter,
        sendDataToPrinter,
        setAvailableDevices,
        setIsScanning,
        setPrinterDevice,
        setIsConnected,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
};
