import React, { createContext, useState, useContext } from "react";
import { BleManager } from "react-native-ble-plx";
import Constants from "expo-constants";
import { Platform } from "react-native";

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

  // Keep only essential printer states
  const [printerDevice, setPrinterDevice] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Basic printer connection functions
  const connectToPrinter = async (device) => {
    if (Constants.appOwnership === "expo") {
      console.log("Printer functionality requires development build");
      return;
    }

    try {
      setConnectionError(null);
      const connectedDevice = await device.connect({
        timeout: 5000,
        requestMTU: 512,
      });
      await connectedDevice.discoverAllServicesAndCharacteristics();
      setPrinterDevice(connectedDevice);
      setIsConnected(true);
      return true;
    } catch (error) {
      console.error("Error connecting to printer:", error);
      setConnectionError(error.message);
      setPrinterDevice(null);
      setIsConnected(false);
      throw error;
    }
  };

  const disconnectPrinter = async () => {
    if (Constants.appOwnership === "expo") return;

    try {
      if (printerDevice) {
        await printerDevice.cancelConnection();
      }
    } catch (error) {
      console.error("Error disconnecting printer:", error);
    } finally {
      setPrinterDevice(null);
      setIsConnected(false);
    }
  };

  return (
    <PrinterContext.Provider
      value={{
        bleManager,
        printerDevice,
        isConnected,
        connectionError,
        setPrinterDevice,
        setIsConnected,
        connectToPrinter,
        disconnectPrinter,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
};
