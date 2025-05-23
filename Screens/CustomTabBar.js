import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import RemixIcon from "react-native-remix-icon";
import { useNavigation, useRoute } from "@react-navigation/native";

const CustomTabBar = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const routeGroups = {
    "TabScreen/HomeScreen": ["TabScreen/HomeScreen"],
    MenuScreen: ["MenuScreen", "CategoryScreen", "AllMenuProducts", "MenuDetails", "UpdateMenuProduct", "AddMenuProduct"],
    RestaurantTables: ["RestaurantTables", "OrderCreate" , "DemoScreen"],
    OrderList: ["OrderList", "OrderDetails", "OrderHistory"],
    RestaurantProfile: [
      "RestaurantProfile", 
      "RestaurantInfo", 
      "Settings", 
      "MyProfileView", 
      "MyProfile", 
      "Support",
      "ActivityLog"
    ],
  
  };

  const tabs = [
    { icon: "home-8-line", label: "Home", route: "TabScreen/HomeScreen" },
    { icon: "ri-restaurant-2-line", label: "Menu", route: "MenuScreen" },
    { icon: "layout-grid-line", label: "Tables", route: "RestaurantTables", isCenter: true },
    { icon: "ri-list-unordered", label: "Orders", route: "OrderList" },
    { icon: "ri-user-line", label: "Profile", route: "RestaurantProfile" },
  ];

  // Function to determine which tab is active based on current route
  const getActiveTabIndex = () => {
    const currentRoute = route.name;
    console.log("Current route:", currentRoute);
    
    for (const [key, routes] of Object.entries(routeGroups)) {
      if (routes.includes(currentRoute)) {
        const index = tabs.findIndex(tab => tab.route === key);
        console.log("Found match:", key, "index:", index);
        return index;
      }
    }
    return 0; // Default to Home tab
  };

  const handleTabPress = (index, route) => {
    navigation.navigate(route);
  };

  const activeTab = getActiveTabIndex();
  console.log("Active tab index:", activeTab);

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handleTabPress(index, tab.route)}
          style={[
            styles.iconContainer,
            tab.isCenter && styles.centerIconContainer,
            activeTab === index && styles.activeTabContainer,
            activeTab === index && tab.isCenter && styles.activeTabContainer,
          ]}
        >
          <RemixIcon
            name={tab.icon}
            size={tab.isCenter ? 32 : 28}
            color={activeTab === index ? "#219ebc" : "#000"}
          />
          <Text
            style={[
              styles.iconText,
              tab.isCenter && styles.centerIconText,
              activeTab === index
                ? styles.activeTabText
                : styles.inactiveTabText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    elevation: 5,
    height: 70,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  iconContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 5,
  },
  centerIconContainer: {
    flex: 1.1,
    marginTop: -5,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  activeTabContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 13,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#219ebc",
  },
  iconText: {
    fontSize: 12,
    paddingVertical: 3,
  },
  centerIconText: {
    fontSize: 13,
    fontWeight: "600",
  },
  activeTabText: {
    fontWeight: "900",
    color: "#219ebc",
  },
  inactiveTabText: {
    fontWeight: "400",
    color: "#000",
  },
});

export default CustomTabBar;


