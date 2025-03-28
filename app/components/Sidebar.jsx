import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useVersion } from "../../context/VersionContext";
import { useAuth } from "../../context/AuthContext";
import { Box, VStack, HStack, Text, Pressable, Image, Icon } from "native-base";
import { NotificationService } from "../../services/NotificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "native-base";
import * as Notifications from "expo-notifications";

const SIDEBAR_WIDTH = 300;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Sidebar({ isOpen, onClose }) {
  const { version, appName } = useVersion();
  const { logout, user, accessToken } = useAuth();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      // Animate sidebar in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH - SIDEBAR_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate sidebar out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const menuItems = [
    { title: "Home", icon: "home", route: "/(tabs)" },
    { title: "Staff", icon: "people", route: "/(tabs)/staff" },
    { title: "Orders", icon: "receipt", route: "/(tabs)/orders" },
    { title: "Profile", icon: "account-circle", route: "/(tabs)/profile" },
    {
      title: "Inventory",
      icon: "inventory",
      route: "/screens/inventory/inventory-items",
    },
    // {
    //   title: "Inventory Report",
    //   icon: "assessment",
    //   route: "/(tabs)/staff/inventory-report",
    // },
    // {
    //   title: "Order Report",
    //   icon: "insert-chart",
    //   route: "/(tabs)/staff/order-report",
    // },
  ];

  const handleNavigation = (route) => {
    router.push(route);
    onClose();
  };

  const onCallWaiter = async () => {
    try {
      // Get outlet_id from AsyncStorage
      const outletData = await AsyncStorage.getItem("selectedOutlet");
      const outlet = outletData ? JSON.parse(outletData) : null;
      const userId = await AsyncStorage.getItem("userId");

      if (!outlet?.id || !userId) {
        Alert.alert("Error", "Missing outlet or user information");
        return;
      }

      const response = await NotificationService.callWaiter({
        outletId: outlet.id,
        userId: parseInt(userId),
        accessToken,
      });

      if (response.success) {
        Alert.alert("Success", "Waiter has been called");
      } else {
        Alert.alert("Error", response.message || "Failed to call waiter");
      }
    } catch (error) {
      console.error("Error calling waiter:", error);
      Alert.alert("Error", "Something went wrong while calling waiter");
    }
  };

  const sendTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification",
          body:
            "This is a test notification " + new Date().toLocaleTimeString(),
        },
        trigger: null,
      });
      toast.show({
        description: "Test notification sent",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast.show({
        description: "Failed to send test notification",
        status: "error",
        duration: 3000,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity style={styles.overlayBg} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <Box style={styles.sidebarHeader}>
          <Text style={styles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </Box>

        <VStack space={1} style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={styles.sidebarItem}
              onPress={() => handleNavigation(item.route)}
            >
              <MaterialIcons name={item.icon} size={24} color="#333" />
              <Text style={styles.sidebarText} numberOfLines={1}>
                {item.title}
              </Text>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </Pressable>
          ))}

          <Pressable
            style={[styles.sidebarItem, { marginTop: "auto" }]}
            onPress={async () => {
              try {
                const outletId = await AsyncStorage.getItem("outlet_id");
                const userId = await AsyncStorage.getItem("user_id");
                const accessToken = await AsyncStorage.getItem("access");

                const response = await NotificationService.callWaiter({
                  outletId: parseInt(outletId),
                  userId: parseInt(userId),
                  accessToken: accessToken,
                });

                if (response.success) {
                  toast.show({
                    description: "Waiter has been called successfully",
                    status: "success",
                    duration: 3000,
                    placement: "top",
                  });
                } else {
                  toast.show({
                    description: response.message || "Failed to call waiter",
                    status: "error",
                    duration: 3000,
                    placement: "top",
                  });
                }
              } catch (error) {
                toast.show({
                  description: "Something went wrong while calling waiter",
                  status: "error",
                  duration: 3000,
                  placement: "top",
                });
              }
            }}
          >
            <MaterialIcons name="room-service" size={24} color="#333" />
            <Text style={styles.sidebarText} numberOfLines={1}>
              Call Waiter
            </Text>
          </Pressable>

          {/* <Pressable
            style={[styles.sidebarItem]}
            onPress={sendTestNotification}
          >
            <MaterialIcons name="notifications" size={24} color="#333" />
            <Text style={styles.sidebarText} numberOfLines={1}>
              Test Notification
            </Text>
          </Pressable> */}
        </VStack>

        <Box borderTopWidth={1} borderTopColor="coolGray.200" p={4}>
          <VStack space={3} alignItems="center">
            <HStack space={2} alignItems="center">
              <Image
                source={require("../../assets/images/mm-logo.png")}
                alt="MenuMitra Logo"
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              />
              <Text fontSize="md" fontWeight="semibold" color="coolGray.700">
                MenuMitra
              </Text>
            </HStack>

            <HStack space={8} justifyContent="center" mt={2}>
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
                  )
                }
              >
                <Icon
                  as={MaterialCommunityIcons}
                  name="facebook"
                  size={7}
                  color="#1877F2"
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  Linking.openURL("https://www.instagram.com/menumitra/")
                }
              >
                <Icon
                  as={MaterialCommunityIcons}
                  name="instagram"
                  size={7}
                  color="#E4405F"
                />
              </Pressable>
              <Pressable
                onPress={() =>
                  Linking.openURL("https://www.youtube.com/@menumitra")
                }
              >
                <Icon
                  as={MaterialCommunityIcons}
                  name="youtube"
                  size={7}
                  color="#FF0000"
                />
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL("https://x.com/MenuMitra")}
              >
                <Icon
                  as={MaterialCommunityIcons}
                  name="twitter"
                  size={7}
                  color="#000000"
                />
              </Pressable>
            </HStack>

            <VStack space={1} alignItems="center" mt={2} mb={2}>
              <HStack space={1} alignItems="center">
                <Icon
                  as={MaterialCommunityIcons}
                  name="flash"
                  size={3}
                  color="gray.500"
                />
                <Text fontSize="xs" color="gray.500">
                  Powered by
                </Text>
              </HStack>
              <Pressable
                onPress={() => Linking.openURL("https://www.shekruweb.com")}
              >
                <Text
                  fontSize="xs"
                  color="#4CAF50"
                  fontWeight="medium"
                  textAlign="center"
                >
                  Shekru Labs India Pvt. Ltd.
                </Text>
              </Pressable>
              <Text fontSize="2xs" color="gray.500" mt={1} textAlign="center">
                version {version || "1.0.0"}
              </Text>
            </VStack>
          </VStack>
        </Box>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlayBg: {
    flex: 1,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    shadowColor: "#000",
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sidebarHeader: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },
  menuContainer: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sidebarText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: "#333",
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  logoutText: {
    color: "#FF3B30",
  },
});
