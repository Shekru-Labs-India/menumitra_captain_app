import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useVersion } from "../../context/VersionContext";

export default function Sidebar({ isOpen, onClose }) {
  const { version, appName } = useVersion();

  const menuItems = [
    {
      title: "Home",
      icon: "home",
      route: "/(tabs)",
    },
    {
      title: "Staff",
      icon: "people",
      route: "/(tabs)/staff",
    },
    {
      title: "Orders",
      icon: "receipt",
      route: "/(tabs)/orders",
    },
    {
      title: "Profile",
      icon: "account-circle",
      route: "/(tabs)/profile",
    },
    {
      title: "Inventory",
      icon: "inventory",
      route: "/(tabs)/staff/inventory",
    },
    {
      title: "Inventory Report",
      icon: "assessment",
      route: "/(tabs)/staff/inventory-report",
    },
    {
      title: "Order Report",
      icon: "insert-chart",
      route: "/(tabs)/staff/order-report",
    },
  ];

  const handleNavigation = (route) => {
    router.push(route);
    onClose();
  };

  const handleLogout = () => {
    router.replace("/login");
  };

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.overlayBg} onPress={onClose} />
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.sidebarItem}
              onPress={() => handleNavigation(item.route)}
            >
              <MaterialIcons name={item.icon} size={24} color="#333" />
              <Text style={styles.sidebarText} numberOfLines={1}>
                {item.title}
              </Text>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.sidebarItem, styles.logoutItem]}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={24} color="#FF3B30" />
          <Text style={[styles.sidebarText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.version}>
            {appName} v{version}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 1000,
  },
  overlayBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
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
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  version: {
    fontSize: 12,
    color: "#666",
  },
});
