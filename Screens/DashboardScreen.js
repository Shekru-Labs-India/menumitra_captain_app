import React from "react";
import { Dimensions, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "./TabScreen/HomeScreen";
import MenuScreen from "./Menu/MenuScreen";
import CustomTabBar from "./CustomTabBar"; // Correct import for Image
import RestaurantProfile from "./Profile/RestaurantProfile";
import OrderList from "./Orders/OrderList";
import StaffTabs from "./RestaurantStaff/StaffTabs";
import * as ConstantValues from "./utils/ConstantValues";
import RestaurantTables from "./RestaurantTable/RestaurantTables";

// Create Tab Navigator
const Tab = createBottomTabNavigator();
// const tabIcons = [Icon1, Icon2, Icon3,Icon4,Icon5]; // Array of your icons
const tabIcons = [
  "group-line",
  "ri-restaurant-2-line",
  "home-8-line",
  "ri-list-unordered",
  "ri-user-line",
];

export default function DashboardScreen() {
  return (
    <>
      {/* Bottom Tab Navigator */}
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} icons={tabIcons} />}
        initialRouteName="RestaurantTables"
        backBehavior="initialRoute"
        screenOptions={{
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 70,
            borderTopColor: "#919191",
            backgroundColor: "#fff",
          },
          tabBarItemStyle: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarLabelStyle: {
            fontSize: 10,
            paddingBottom: 5,
            fontWeight: "bold",
          },
          tabBarIconStyle: {
            alignItems: "bottom",
          },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="TabScreen/HomeScreen"
          component={HomeScreen}
          options={{
            tabBarLabel: "HomeScreen",
          }}
        />
        <Tab.Screen
          name="MenuScreen"
          component={MenuScreen}
          options={{
            tabBarLabel: "MenuScreen",
            headerTitleAlign: "center",
            headerTitleStyle: {
              fontSize: ConstantValues.HEADER_FONT_SIZE, // Set the font size of the header title
            },
          }}
        />
        <Tab.Screen
          name="RestaurantTables"
          component={RestaurantTables}
          options={{
            tabBarLabel: "Tables",
            headerTitleAlign: "center",
            headerTitleStyle: {
              fontSize: ConstantValues.HEADER_FONT_SIZE, // Set the font size of the header title
            },
          }}
        />
        <Tab.Screen
          name="OrderList"
          component={OrderList}
          options={{
            tabBarLabel: "OrderList",
            headerTitleAlign: "center",
            headerTitleStyle: {
              fontSize: ConstantValues.HEADER_FONT_SIZE, // Set the font size of the header title
            },
          }}
        />
        <Tab.Screen
          name="RestaurantProfile"
          component={RestaurantProfile}
          options={{
            tabBarLabel: "Profile",
            headerTitleAlign: "center",
            headerTitleStyle: {
              fontSize: ConstantValues.HEADER_FONT_SIZE, // Set the font size of the header title
            },
          }}
        />
      </Tab.Navigator>
    </>
  );
}

// Styles

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarContainer: {
    height: 56,
    backgroundColor: "#6200EE",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    color: "white",
    fontSize: 18,
    marginHorizontal: 10,
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
});
