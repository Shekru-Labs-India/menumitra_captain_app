import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const [sessionData, accessToken, outletId] = await AsyncStorage.multiGet([
        "userSession",
        "access",
        "outlet_id",
      ]);

      if (sessionData[1] && accessToken[1] && outletId[1]) {
        const session = JSON.parse(sessionData[1]);
        const currentTime = new Date();
        const expiryTime = new Date(session.expiryDate);

        if (expiryTime > currentTime) {
          setIsAuthenticated(true);
          return true;
        }
      }
      setIsAuthenticated(false);
      return false;
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data) => {
    try {
      const sessionData = {
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId: data.user_id,
        captainId: data.captain_id,
        outletId: data.outlet_id,
      };

      await AsyncStorage.multiSet([
        ["userSession", JSON.stringify(sessionData)],
        ["access", data.access || ""],
        ["outlet_id", data.outlet_id?.toString() || ""],
      ]);

      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        "userSession",
        "access",
        "outlet_id",
        "user_id",
        "mobile",
        "captain_id",
        "captain_name",
        "gst",
        "service_charges",
        "sessionToken",
        "expoPushToken",
      ]);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
