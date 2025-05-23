import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Image,
  Linking,
} from "react-native";
import RemixIcon from "react-native-remix-icon";
import { useNavigation } from "@react-navigation/native";
import NotificationService from "../services/notificationService";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const SCREEN_WIDTH = Dimensions.get("window").width;

const Sidebar = ({ isOpen, onClose }) => {
  const navigation = useNavigation();
  const translateX = new Animated.Value(isOpen ? 0 : SCREEN_WIDTH);

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const handleCallWaiter = async () => {
    try {
      const result = await NotificationService.callWaiter();
      if (result.success) {
        Alert.alert("Success", "Waiter has been notified");
      } else {
        Alert.alert("Error", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to call waiter");
    }
    onClose();
  };

  const menuItems = [
    { icon: "home-line", label: "Dashboard", route: "TabScreen/HomeScreen" },
    { icon: "group-line", label: "Staff Management", route: "Staff" },
    {
      icon: "restaurant-2-line",
      label: "Menu Management",
      route: "MenuScreen",
    },
    { icon: "store-2-line", label: "Inventory", route: "InventoryTabs" },
    { icon: "truck-line", label: "Suppliers", route: "SupplierList" },
    { icon: "list-check", label: "Orders", route: "OrderList" },
    // { icon: "settings-3-line", label: "Settings", route: "Settings" },
    { icon: "user-line", label: "Profile", route: "RestaurantProfile" },
    // {
    //   icon: "notification-line",
    //   label: "Call Waiter",
    //   action: handleCallWaiter,
    // },
  ];

  const handleNavigation = (item) => {
    if (item.action) {
      item.action();
    } else {
      navigation.navigate(item.route);
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <RemixIcon name="close-line" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handleNavigation(item)}
            >
              <View style={styles.menuItemContent}>
                <RemixIcon name={item.icon} size={24} color="#333" />
                <Text style={styles.menuText} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.logoRow}>
            <Image
              source={require("../assets/icon-transparent.png")}
              style={styles.footerLogo}
            />
            <Text style={styles.footerTitle}>MenuMitra</Text>
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() =>
                Linking.openURL(
                  "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
                )
              }
            >
              <MaterialCommunityIcons
                name="facebook"
                size={28}
                color="#1877F2"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() =>
                Linking.openURL("https://www.instagram.com/menumitra/")
              }
            >
              <MaterialCommunityIcons
                name="instagram"
                size={28}
                color="#E4405F"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() =>
                Linking.openURL("https://www.youtube.com/@menumitra")
              }
            >
              <MaterialCommunityIcons
                name="youtube"
                size={28}
                color="#FF0000"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIcon}
              onPress={() => Linking.openURL("https://x.com/MenuMitra")}
            >
              <MaterialCommunityIcons
                name="twitter"
                size={28}
                color="#000000"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.footerTextContainer}>
            <View style={styles.poweredByContainer}>
              <MaterialCommunityIcons name="flash" size={14} color="#666" />
              <Text style={styles.poweredByText}>Powered by</Text>
            </View>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://www.shekruweb.com")}
            >
              <Text style={styles.companyText}>
                Shekru Labs India Pvt. Ltd.
              </Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>version 1.3   </Text>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: "#fff",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginTop: 30,
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
    paddingTop: 16,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  menuText: {
    marginLeft: 16,
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 999,
  },
  footerContainer: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#f5f5f5",
    borderTopColor: "#e0e0e0",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  footerLogo: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    marginBottom: 5,
  },
  socialIcon: {
    padding: 4,
    marginHorizontal: 8,
  },
  footerTextContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  poweredByContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: "#666666",
  },
  companyText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    textAlign: "center",
  },
  versionText: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
    textAlign: "center",
    paddingBottom: 4,
  },
});

export default Sidebar;
