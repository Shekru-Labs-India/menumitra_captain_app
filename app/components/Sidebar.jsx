import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import BoxIcon from "./BoxIcon";

export default function Sidebar({ isOpen, onClose }) {
  const menuItems = [
    {
      title: "Home",
      icon: "home",
      route: "/(tabs)",
    },
    {
      title: "Staff",
      icon: "staff",
      route: "/(tabs)/staff",
    },
    {
      title: "Attendance",
      icon: "calendar",
      route: "/attendance",
    },
    {
      title: "Inventory",
      icon: "cube",
      route: "/inventory",
    },
    {
      title: "Inventory Report",
      icon: "document-text",
      route: "/inventory-report",
    },
    {
      title: "Order Report",
      icon: "receipt",
      route: "/order-report",
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
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <BoxIcon name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.sidebarItem}
            onPress={() => handleNavigation(item.route)}
          >
            <BoxIcon name={item.icon} size={24} color="#333" />
            <Text style={styles.sidebarText} numberOfLines={1}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.sidebarItem, styles.logoutItem]}
        onPress={handleLogout}
      >
        <BoxIcon name="logout" size={24} color="#FF3B30" />
        <Text style={[styles.sidebarText, styles.logoutText]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 300,
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderLeftColor: "#eee",
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
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 15,
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
    marginLeft: 15,
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  logoutItem: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  logoutText: {
    color: "#FF3B30",
  },
});
