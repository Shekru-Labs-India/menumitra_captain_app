import React from "react";
import {
  Image,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StatusBar,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Sidebar } from "../../components/Sidebar";

export default function HomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const managementCards = [
    {
      title: "Staff Management",
      icon: "people",
      color: "#4CAF50",
      route: "/(tabs)/staff",
    },
    {
      title: "Inventory Management",
      icon: "cube",
      color: "#FF9800",
      route: "/(tabs)/staff/inventory",
    },
    {
      title: "Inventory Report",
      icon: "bar-chart",
      color: "#F44336",
      route: "/(tabs)/staff/inventory-report",
    },
    {
      title: "Orders",
      icon: "receipt",
      color: "#3F51B5",
      route: "/(tabs)/orders",
    },
    {
      title: "Order Report",
      icon: "stats-chart",
      color: "#009688",
      route: "/(tabs)/staff/order-report",
    },
  ];

  const sidebarItems = [
    { icon: "home", title: "Home" },
    { icon: "list", title: "Orders" },
    { icon: "person", title: "Profile" },
    { icon: "settings-outline", title: "Settings" },
    { icon: "log-out-outline", title: "Logout" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      {/* Header */}
      <View
        style={[
          styles.header,
          Platform.OS === "android" && {
            marginTop: StatusBar.currentHeight,
          },
        ]}
      >
        <View style={styles.headerTitleContainer}>
          <Image
            source={require("../../assets/images/mm-logo-bg-fill-hat.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>MenuMitra Captain</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.menuButton}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color="#333"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <MaterialCommunityIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {managementCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { backgroundColor: card.color }]}
              onPress={() => router.push(card.route)}
            >
              <Ionicons name={card.icon} size={32} color="#fff" />
              <Text style={styles.cardTitle}>{card.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* New Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  card: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
  },
  sidebar: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: "#fff",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    padding: 20,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sidebarText: {
    marginLeft: 15,
    fontSize: 16,
    color: "#333",
  },
});
