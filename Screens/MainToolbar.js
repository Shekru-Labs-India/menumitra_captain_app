import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native"; // Import useNavigation hook
import { getOwnerName } from "./utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "./utils/WebService";
import { isDevelopment } from "./utils/ConstantFunctions"; // Import isDevelopment function

const MainToolBar = () => {
  const navigation = useNavigation(); // Use navigation hook

  const [restaurantName, setRestaurantName] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");

  useFocusEffect(
    React.useCallback(() => {
      const fetchOwnerData = async () => {
        const restaurantName = await AsyncStorage.getItem(
          WebService.OUTLET_NAME
        );
        // const ownerName = await getOwnerName();
        const ownerName = await AsyncStorage.getItem(WebService.OWNER_NAME);
        setRestaurantName(restaurantName || "Restaurant"); // Default value if null
        setOwnerName(ownerName || "Owner"); // Default value if null
      };
      fetchOwnerData();
    }, [])
  );

  return (
    <View style={styles.toolbar}>
      {/* Left Section */}
      {/* <TouchableOpacity
        style={styles.leftSection}
        onPress={() => navigation.navigate("RestaurantList")}
      > */}
        <RemixIcon name="ri-store-2-line" size={15} color="#000" />
        <Text style={styles.title}>{restaurantName}</Text>
        {/* <View style={styles.circleIcon}>
          <RemixIcon name="ri-arrow-down-s-line" size={15} color="#000" />
        </View> */}
      {/* </TouchableOpacity> */}

      {/* Center Section - Testing Badge */}
      {isDevelopment() && (
        <View style={styles.centerSection}>
          <View style={styles.testBadge}>
            <Text style={styles.testBadgeText}>TESTING </Text>
          </View>
        </View>
      )}

      {/* Right Section - Removed Printer Status */}
      <View style={styles.rightSection} />
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f6f6f6", // Change as needed
    paddingHorizontal: 5,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    position: "relative",
    flex: 1,
    justifyContent: "flex-end",
  },
  title: {
    marginHorizontal: 5,
    fontSize: 16,
    fontWeight: "bold",
  },
  circleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  testBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  testBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default MainToolBar;
