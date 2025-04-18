import React, { createContext, useState, useContext, useEffect } from "react";
import { BleManager } from "react-native-ble-plx";
import Constants from "expo-constants";
import { Platform, Alert, Linking } from "react-native";
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
  
  // Add state for global disconnection handling
  const [showDisconnectionAlert, setShowDisconnectionAlert] = useState(false);
  const [disconnectedDevice, setDisconnectedDevice] = useState(null);

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
          
          // First check if Bluetooth is available with better error handling
          try {
            setReconnectAttemptInProgress(true);
            
            // Check Bluetooth state first
            let btState;
            try {
              btState = await bleManager.state();
            } catch (stateError) {
              console.error("Error checking BT state during auto-reconnect:", stateError);
              throw new Error("BT state check failed");
            }
            
            if (btState === "PoweredOn") {
              console.log("Bluetooth is powered on, attempting immediate connection");
              
              // Try immediate direct connection
              try {
                console.log("Attempting direct connection to device", id);
                const device = await bleManager.connectToDevice(id, {
                  autoConnect: true,
                  timeout: 5000
                });
                
                if (device) {
                  console.log("Connected directly to device:", device.id);
                  await device.discoverAllServicesAndCharacteristics();
                  setPrinterDevice(device);
                  setIsConnected(true);
                  setReconnectAttemptInProgress(false);
                  return;
                }
              } catch (directConnectError) {
                console.log("Direct connection failed:", directConnectError);
              }
              
              // Reduced delay for faster reconnection
              setTimeout(async () => {
                try {
                  await reconnectPrinter();
                } catch (e) {
                  console.error("Auto-reconnect failed:", e);
                } finally {
                  setReconnectAttemptInProgress(false);
                }
              }, 500);
            } else {
              console.log("Bluetooth not ready for auto-reconnect:", btState);
              setReconnectAttemptInProgress(false);
            }
          } catch (error) {
            console.error("Error during auto-reconnect:", error);
            setReconnectAttemptInProgress(false);
          }
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

  // Add connection state monitoring to ensure connection stability
  useEffect(() => {
    // Only run the monitor if we have a connected device
    if (printerDevice && isConnected && !connectionMonitorActive) {
      setConnectionMonitorActive(true);
      
      // Set up a periodic connection check
      const monitorInterval = setInterval(async () => {
        try {
          if (!printerDevice) {
            clearInterval(monitorInterval);
            setConnectionMonitorActive(false);
            return;
          }
          
          // Skip connection check if currently printing
          if (isPrinting) {
            console.log("Connection monitor: Skipping check during active printing");
            return;
          }
          
          // Check connection state with better error handling
          let deviceConnected = false;
          try {
            deviceConnected = await printerDevice.isConnected();
          } catch (connectionError) {
            console.log("Connection check error:", connectionError);
            // Don't immediately assume disconnection on error
            return;
          }
          
          // If suddenly disconnected, update state to match reality
          if (!deviceConnected && isConnected) {
            console.log("Connection monitor: Device disconnection detected");
            
            // Store the disconnected device for potential reconnection
            setDisconnectedDevice(printerDevice);
            
            // Set printer as disconnected
            setIsConnected(false);
            setPrinterDevice(null);
            
            // Show global disconnection alert if auto-reconnect is disabled
            if (!autoReconnect) {
              setShowDisconnectionAlert(true);
            } else {
              // Attempt reconnection if auto-reconnect is enabled
              console.log("Connection monitor: Triggering reconnection attempt");
              setTimeout(() => reconnectPrinter(), 1000);
            }
          }
        } catch (error) {
          console.error("Connection monitor error:", error);
          // Don't automatically assume disconnection on general errors
        }
      }, 5000); // Check every 5 seconds
      
      // Clean up the interval when component unmounts or connection status changes
      return () => {
        clearInterval(monitorInterval);
        setConnectionMonitorActive(false);
      };
    } else if (!isConnected) {
      setConnectionMonitorActive(false);
    }
  }, [printerDevice, isConnected, autoReconnect, isPrinting]);

  // Handle manual reconnection from alert
  const handleManualReconnect = async () => {
    setShowDisconnectionAlert(false);
    
    if (!disconnectedDevice) return;
    
    try {
      setReconnectAttemptInProgress(true);
      setIsConnecting(true);
      console.log("Attempting to reconnect to device:", disconnectedDevice.id);
      
      const success = await connectToPrinter(disconnectedDevice);
      
      if (success) {
        console.log("Manual reconnection successful");
      } else {
        console.log("Manual reconnection failed");
      }
    } catch (error) {
      console.error("Manual reconnection error:", error);
    } finally {
      setReconnectAttemptInProgress(false);
      setIsConnecting(false);
    }
  };

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
        if (!autoReconnect) {
          // Set the disconnected device for potential manual reconnection
          setDisconnectedDevice(disconnectedDevice);
          setShowDisconnectionAlert(true);
          return;
        }
        
        // Attempt to reconnect after a brief delay
        setTimeout(async () => {
          try {
            if (bleManager && !isConnecting && !reconnectAttemptInProgress) {
              setReconnectAttemptInProgress(true);
              console.log("Attempting to reconnect after disconnect");
              const devices = await bleManager.devices([device.id]);
              if (devices && devices.length > 0) {
                connectToPrinter(devices[0]).catch(console.error);
              } else {
                // If device not found, try full reconnection from scanning
                reconnectPrinter();
              }
              setReconnectAttemptInProgress(false);
            }
          } catch (e) {
            console.error("Auto-reconnect after disconnect error:", e);
            setReconnectAttemptInProgress(false);
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
      
      // Add a short delay after connection to ensure the printer is fully initialized
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Send a printer initialization command sequence to reset the printer state
      try {
        // Find a valid characteristic to send initialization commands
        const services = await connectedDevice.services();
        const service = services.find((s) =>
          PRINTER_SERVICE_UUIDS.some((uuid) =>
            s.uuid.toLowerCase().includes(uuid.toLowerCase())
          )
        );
        
        if (service) {
          const characteristics = await service.characteristics();
          const printCharacteristic = characteristics.find((c) =>
            PRINTER_CHARACTERISTIC_UUIDS.some((uuid) =>
              c.uuid.toLowerCase().includes(uuid.toLowerCase())
            )
          );
          
          if (printCharacteristic) {
            // ESC @ command to initialize printer
            const initCommand = [0x1B, 0x40]; // ESC @
            await printCharacteristic.writeWithoutResponse(
              base64.encode(String.fromCharCode(...initCommand))
            );
            // Small delay to let printer process the command
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (initError) {
        // Ignore initialization errors - connection is still valid
        console.log("Printer initialization warning:", initError);
      }
      
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
        // Try to reset BLE manager on error
        try {
          bleManager.destroy();
          await new Promise(resolve => setTimeout(resolve, 500)); // Short delay
          // Manager will be re-created on next operation
        } catch (destroyError) {
          console.error("Error destroying BLE manager:", destroyError);
        }
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
      setDisconnectedDevice(null); // Clear the disconnected device
    } catch (error) {
      console.error("Error disconnecting printer:", error);
    }
  };

  // Try to reconnect to last used printer with improved error handling
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
      
      // Check Bluetooth state first with proper error handling
      let state;
      try {
        state = await bleManager.state();
      } catch (stateError) {
        console.error("Error checking BT state during reconnect:", stateError);
        
        // Instead of immediately failing, try to recover the BLE stack
        try {
          console.log("Attempting to recover BLE manager...");
          
          // Create a small delay to let the BLE stack stabilize
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try checking state again after delay
          state = await bleManager.state();
          console.log("BLE manager recovered, state:", state);
        } catch (recoveryError) {
          console.error("BLE manager recovery failed:", recoveryError);
          setIsConnecting(false);
          setReconnectAttemptInProgress(false);
          return false;
        }
      }
      
      if (state !== "PoweredOn") {
        console.log("Bluetooth not powered on, can't reconnect. State:", state);
        setIsConnecting(false);
        setReconnectAttemptInProgress(false);
        return false;
      }
      
      // Try direct connection first for speed
      try {
        const device = await bleManager.connectToDevice(lastConnectedId, {
          autoConnect: true,
          timeout: 8000
        });
        
        if (device) {
          console.log("Connected directly to device:", device.id);
          try {
            await device.discoverAllServicesAndCharacteristics();
          } catch (discoverError) {
            console.log("Service discovery error:", discoverError);
          }
          
          // Initialize the printer
          try {
            const services = await device.services();
            const service = services.find((s) =>
              PRINTER_SERVICE_UUIDS.some((uuid) =>
                s.uuid.toLowerCase().includes(uuid.toLowerCase())
              )
            );
            
            if (service) {
              const characteristics = await service.characteristics();
              const printCharacteristic = characteristics.find((c) =>
                PRINTER_CHARACTERISTIC_UUIDS.some((uuid) =>
                  c.uuid.toLowerCase().includes(uuid.toLowerCase())
                )
              );
              
              if (printCharacteristic) {
                // ESC @ command to initialize printer
                const initCommand = [0x1B, 0x40]; // ESC @
                await printCharacteristic.writeWithoutResponse(
                  base64.encode(String.fromCharCode(...initCommand))
                );
              }
            }
          } catch (initError) {
            console.log("Printer initialization warning during reconnect:", initError);
            // Continue anyway
          }
          
          setPrinterDevice(device);
          setIsConnected(true);
          // Small delay to ensure states are updated
          await new Promise(resolve => setTimeout(resolve, 300));
          setIsConnecting(false);
          setReconnectAttemptInProgress(false);
          return true;
        }
      } catch (directConnectError) {
        console.log("Direct reconnect failed, trying alternative methods:", directConnectError);
      }
      
      // If direct connection fails, try to get device from known devices
      let device = null;
      try {
        const devices = await bleManager.devices([lastConnectedId]);
        device = devices?.[0];
      } catch (devicesError) {
        console.log("Error getting known devices:", devicesError);
      }
      
      // If not found, scan for it
      if (!device) {
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
          }, 8000);
        });
      } else {
        console.log("Found device in known devices:", device.id);
        const success = await connectToPrinter(device);
        return success;
      }
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

      // Send data in larger chunks with optimized delays for better speed/reliability balance
      const CHUNK_SIZE = 150;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        try {
          await characteristic.writeWithResponse(  // Changed to writeWithResponse for better reliability
            base64.encode(String.fromCharCode(...chunk))
          );
          
          // Reduced delay between chunks
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

  // Render global disconnection alert if needed
  const renderDisconnectionAlert = () => {
    if (showDisconnectionAlert && disconnectedDevice) {
      Alert.alert(
        "Printer Disconnected",
        `The printer "${disconnectedDevice.name || 'Unknown Printer'}" has been disconnected.`,
        [
          {
            text: "Reconnect",
            onPress: handleManualReconnect
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setShowDisconnectionAlert(false)
          }
        ]
      );
      // Reset the flag after showing the alert
      setShowDisconnectionAlert(false);
    }
  };

  // Call the alert renderer whenever the flag changes
  useEffect(() => {
    renderDisconnectionAlert();
  }, [showDisconnectionAlert]);

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
        disconnectedDevice,
        handleManualReconnect
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
};
