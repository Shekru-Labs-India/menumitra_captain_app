import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Pressable,
  Icon,
  StatusBar,
  StyleSheet,
  Platform
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

export const Sidebar = ({ isOpen, onClose }) => {
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
      icon: "calendar-clock-outline",
      route: "/attendance",
    },
    {
      title: "Inventory",
      icon: "package-variant-closed",
      route: "/inventory",
    },
    {
      title: "Inventory Report",
      icon: "file-document-outline",
      route: "/inventory-report",
    },
    {
      title: "Order Report",
      icon: "clipboard-text-outline",
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
          <MaterialCommunityIcons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => handleNavigation(item.route)}
            py={4}
            px={6}
            borderBottomWidth={1}
            borderBottomColor="gray.200"
          >
            <MaterialCommunityIcons name={item.icon} size={24} color="#333" />
            <Text style={styles.sidebarText} numberOfLines={1}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleLogout}
        py={4}
        px={6}
        borderTopWidth={1}
        borderTopColor="gray.200"
      >
        <MaterialCommunityIcons
          name="logout-variant"
          size={24}
          color="#FF3B30"
        />
        <Text style={[styles.sidebarText, styles.logoutText]}>Logout</Text>
      </Pressable>
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
