import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { NativeBaseProvider, extendTheme } from "native-base";
import LoginScreen from "./Screens/LoginScreen";
import VerifyOTPScreen from "./Screens/VerifyOTPScreen";
import DashboardScreen from "./Screens/DashboardScreen";
import AddNewStaff from "./Screens/RestaurantStaff/AddNewStaff";
import DemoScreen from "./Screens/DemoUI/DemoScreen";
import AddMenuProduct from "./Screens/Menu/MenuProduct/AddMenuProduct";
import AddNewMenuCategory from "./Screens/Category/AddNewMenuCategory";
import UpdateMenuCategory from "./Screens/Category/UpdateMenuCategory";
import UpdateMenuProduct from "./Screens/Menu/MenuProduct/UpdateMenuProduct";
import Banners from "./Screens/Banner/Banners";
import AddBanner from "./Screens/Banner/AddBanner";
import UpdateBanner from "./Screens/Banner/UpdateBanner";
import HomeScreen from "./Screens/TabScreen/HomeScreen";
import AddInventoryProduct from "./Screens/Inventory/AddInventoryProduct";
import UpdateInventoryProduct from "./Screens/Inventory/UpdateInventoryProduct";
import MenuScreen from "./Screens/Menu/MenuScreen";
import MyProfile from "./Screens/Profile/MyProfile";
import RestaurantProfile from "./Screens/Profile/RestaurantProfile";
import OrderList from "./Screens/Orders/OrderList";
import CompletedOrderDetails from "./Screens/Orders/CompletedOrderDetails";
import RestaurantTables from "./Screens/RestaurantTable/RestaurantTables";
import AddRestaurantTable from "./Screens/RestaurantTable/AddRestaurantTable";
import ViewRestaurantTable from "./Screens/RestaurantTable/ViewRestaurantTable";
import StaffTabs from "./Screens/RestaurantStaff/StaffTabs";
import RestaurantInfo from "./Screens/Restaurant/RestaurantInfo";
import InventoryTabs from "./Screens/Inventory/InventoryTabs";
import RestaurantList from "./Screens/Restaurant/RestaurantList";

import OnGoingOrderDetails from "./Screens/Orders/OnGoingOrderDetails";
import AddNewRestaurant from "./Screens/Restaurant/AddNewRestaurant";
import Reports from "./Screens/Reports/Reports";
import SplashScreenComponent from "./Screens/SplashScreenComponent";
import AddRestaurantSection from "./Screens/RestaurantTable/AddRestaurentSection";
import * as ConstantValues from "./Screens/utils/ConstantValues";
import UpdateRestaurantSection from "./Screens/RestaurantTable/UpdateRestaurantSection";
import StaffDetails from "./Screens/RestaurantStaff/StaffDetails";
import EditStaffDetails from "./Screens/RestaurantStaff/EditStaffDetails";
import CategoryScreen from "./Screens/Category/CategoryScreen";
import MenuDetails from "./Screens/Menu/MenuProduct/MenuDetails";
import InventoryDetails from "./Screens/Inventory/InventoryDetails";
import EditRestaurantInfo from "./Screens/Restaurant/EditRestaurantInfo";
import CancelledOrderDetails from "./Screens/Orders/CancelledOrderDetails";
import PlacedOrderDetails from "./Screens/Orders/PlacedOrderDetails";
import OrderCreate from "./Screens/RestaurantTable/OrderCreate";
import MyProfileView from "./Screens/Profile/MyProfileView";
import SupplierList from "./Screens/Supplier/SupplierList";
import AddSupplier from "./Screens/Supplier/AddSupplier";
import EditSupplier from "./Screens/Supplier/EditSupplier";
import ViewSupplier from "./Screens/Supplier/ViewSupplier";
import AddWaiter from "./Screens/Waiter/AddWaiter";
import EditWaiter from "./Screens/Waiter/EditWaiter";
import ViewWaiter from "./Screens/Waiter/ViewWaiter";
import WaiterList from "./Screens/Waiter/WaiterList";
import CaptainList from "./Screens/Captain/CaptainList";
import AddCaptain from "./Screens/Captain/AddCaptain";
import EditCaptain from "./Screens/Captain/EditCaptain";
import ViewCaptain from "./Screens/Captain/ViewCaptain";
import ViewCategory from "./Screens/Category/ViewCategory";
import ServedOrderDetails from "./Screens/Orders/ServedOrderDetails";

import ManagerListView from "./Screens/Managers/ManagerListView";
import AddManager from "./Screens/Managers/AddManager";
import ManagerDetails from "./Screens/Managers/ManagerDetails";
import EditManager from "./Screens/Managers/EditManager";
import ChefListView from "./Screens/Chefs/ChefListView";
import AddChef from "./Screens/Chefs/AddChef";
import ChefDetails from "./Screens/Chefs/ChefDetails";
import UpdateChef from "./Screens/Chefs/UpdateChef";
import * as Notifications from "expo-notifications";
import { PrinterProvider } from "./contexts/PrinterContext";
import OfflineProvider from './providers/OfflineProvider';
import OfflineNavigator from './navigation/OfflineNavigator';
import { OutletProvider } from './utils/OutletContext';
import { RestaurantProvider } from "./context/RestaurantContext";
import Settings from "./Screens/Settings/Settings";
import OrderCreateUIDemo from "./Screens/Demo/OrderCreateUIDemo";
import SupportScreen from "./Screens/Support/SupportScreen";
import CreateTicketScreen from "./Screens/Support/CreateTicketScreen";
import TicketListScreen from "./Screens/Support/TicketListScreen";
import TicketDetailsScreen from './Screens/Support/TicketDetailsScreen';
import OrderDetails from './Screens/Orders/OrderDetails';
import ActivityLogScreen from './Screens/Profile/ActivityLogScreen';
import PrinterManagement from './Screens/Settings/PrinterManagement';
import './hooks/backHandlerFix';
import { BackHandler } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

const Stack = createStackNavigator();

// Define custom theme
const theme = extendTheme({
  colors: {
    primary: {
      50: "#E3F2F9",
      100: "#C5E4F3",
      200: "#A2D4EC",
      300: "#7AC1E4",
      400: "#47A9DA",
      500: "#0088CC", // Primary color
      600: "#007AB8",
      700: "#006BA1",
      800: "#005885",
      900: "#003F5E",
    },
  },
  config: {
    initialColorMode: "light",
  },
});

// Create navigation ref
const navigationRef = React.createRef();

// Make it globally available
global.navigationRef = navigationRef;

// Enable screens before navigation container
enableScreens();

export default function App() {
  useEffect(() => {
    // Test local notification when app starts

    // Add notification listeners
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Received notification:", notification);
      }
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
      });

    // Clean up subscriptions - use .remove() method
    return () => {
      if (subscription) subscription.remove();
      if (responseSubscription) responseSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <OfflineProvider>
          <PrinterProvider>
            <RestaurantProvider>
              <NativeBaseProvider theme={theme}>
                <NavigationContainer ref={navigationRef}>
                  <Stack.Navigator
                    initialRouteName="SplashScreen"
                    screenOptions={{ headerShown: false }}
                  >
                    <Stack.Screen
                      name="SplashScreen"
                      component={SplashScreenComponent}
                    />
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
                    <Stack.Screen name="DemoUI" component={DemoScreen} />
                    <Stack.Screen
                      name="TabScreen/HomeScreen"
                      component={HomeScreen}
                      options={{
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="Staff"
                      component={StaffTabs}
                      options={{
                        headerShown: false,
                        title: " Staff",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="MenuScreen"
                      component={MenuScreen}
                      options={{
                        headerShown: false,
                        headerTitleAlign: "center", // Center the title
                        title: "Menu",
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="Dashboard"
                      component={DashboardScreen}
                      options={{
                        headerShown: false,
                      }}
                    />
                    <Stack.Screen
                      name="AddNewStaff"
                      component={AddNewStaff}
                      options={{
                        // presentation: "modal",
                        headerShown: false,
                        title: "Add New Staff",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />

                    <Stack.Screen
                      name="AddNewMenuCategory"
                      component={AddNewMenuCategory}
                      options={{
                        //presentation: "modal",
                        headerShown: true,
                        title: "Add New Category",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="AddMenuProduct"
                      component={AddMenuProduct}
                      options={{
                        // presentation: "modal",
                        headerShown: true,
                        title: "Add New Menu",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="UpdateMenuCategory"
                      component={UpdateMenuCategory}
                      options={{
                        // presentation: "modal",
                        headerShown: true,
                        title: "Update  Category",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="UpdateMenuProduct"
                      component={UpdateMenuProduct}
                      options={{
                        //presentation: "modal",
                        headerShown: true,
                        title: "Update Menu",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="Banners"
                      component={Banners}
                      options={{ headerShown: true }}
                    />
                    <Stack.Screen
                      name="AddBanner"
                      component={AddBanner}
                      options={{ presentation: "modal", headerShown: true }}
                    />
                    <Stack.Screen
                      name="UpdateBanner"
                      component={UpdateBanner}
                      options={{ presentation: "modal", headerShown: true }}
                    />
                    <Stack.Screen
                      name="ManageInventory"
                      component={InventoryTabs}
                      options={{
                        headerShown: false,
                        title: "Inventory",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="AddInventoryProduct"
                      component={AddInventoryProduct}
                      options={{
                        headerShown: false,
                        title: "Add Inventory",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="UpdateInventoryProduct"
                      component={UpdateInventoryProduct}
                      options={{
                        headerShown: false,
                        title: "Update Inventory Product",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="MyProfile"
                      component={MyProfile}
                      options={{
                        headerShown: false,
                        title: "MyProfile",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="MyProfileView"
                      component={MyProfileView}
                      options={{
                        headerShown: false,
                        title: "MyProfile",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="RestaurantProfile"
                      component={RestaurantProfile}
                      options={{
                        headerShown: false,
                        title: "Restaurant Profile",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="RestaurantInfo"
                      component={RestaurantInfo}
                      options={{
                        headerShown: false,
                      }}
                    />

                    <Stack.Screen
                      name="RestaurantList"
                      component={RestaurantList}
                      options={{
                        // presentation: "modal",
                        headerShown: false,
                        title: "Restaurant List",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />

                    <Stack.Screen
                      name="AddNewRestaurant"
                      component={AddNewRestaurant}
                      options={{
                        headerShown: true,
                        title: "Add New Restaurant",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />

                    <Stack.Screen
                      name="RestaurantTables"
                      component={RestaurantTables}
                      options={{
                        headerShown: false,
                        title: "Restaurant Table",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />

                    <Stack.Screen
                      name="AddRestaurantTable"
                      component={AddRestaurantTable}
                      options={{
                        // presentation: "modal",
                        headerShown: true,
                        title: "Add Tables",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="ViewRestaurantTable"
                      component={ViewRestaurantTable}
                      options={{
                        // presentation: "modal",
                        headerShown: true,
                        title: "View Tables",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />

                    <Stack.Screen
                      name="OrderList"
                      component={OrderList}
                      options={{
                        headerShown: false,
                        title: "My Orders",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="CompletedOrderDetails"
                      component={CompletedOrderDetails}
                      options={{
                        headerShown: true,
                        title: "Completed Order Details",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="OnGoingOrderDetails"
                      component={OnGoingOrderDetails}
                      options={{
                        headerShown: true,
                        title: "Ongoing Order Details",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    

                    
                    

                    <Stack.Screen
                      name="Reports"
                      component={Reports}
                      options={{
                        headerShown: false,
                        title: "Reports",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="OrderCreate"
                      component={OrderCreate}
                      options={{
                        headerShown: false,
                        title: "Create Order",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />

                    <Stack.Screen
                      name="AddRestaurantSection"
                      component={AddRestaurantSection}
                      options={{
                        // presentation: "modal",
                        headerShown: true,
                        title: "Add Restaurant Section",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />

                    <Stack.Screen
                      name="UpdateRestaurantSection"
                      component={UpdateRestaurantSection}
                      options={{
                        // presentation: "modal",
                        headerShown: true,
                        title: "Update Restaurant Section",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />
                    <Stack.Screen
                      name="StaffDetails"
                      component={StaffDetails}
                      options={{ headerShown: false }}
                    />

                    <Stack.Screen
                      name="EditStaffDetails"
                      component={EditStaffDetails}
                      options={{
                        headerShown: false,
                      }}
                    />

                    <Stack.Screen
                      name="Category"
                      component={CategoryScreen}
                      options={{
                        headerShown: false,
                        title: "Categories",
                        headerTitleAlign: "center",
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center",
                          flex: 1,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="MenuDetails"
                      component={MenuDetails}
                      options={{
                        headerShown: true,
                        title: "Menu Details",
                        headerTitleAlign: "center",
                        headerTitleStyle: {
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="InventoryTabs"
                      component={InventoryTabs}
                      options={{
                        headerShown: false,
                        title: "Inventory",
                        headerTitleAlign: "center",
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center",
                          flex: 1,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="InventoryDetails"
                      component={InventoryDetails}
                      options={{
                        title: "Inventory Details",
                      }}
                    />
                    <Stack.Screen
                      name="EditRestaurantInfo"
                      component={EditRestaurantInfo}
                      options={{
                        // presentation: "modal",
                        headerShown: false,
                        title: "Edit Restaurant Info",
                        headerTitleAlign: "center", // Center the title
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center", // Ensure the text is centered
                          flex: 1, // Take full width for centering
                        },
                      }}
                    />

                    <Stack.Screen
                      name="CancelledOrderDetails"
                      component={CancelledOrderDetails}
                      options={{ headerShown: false }}
                    />

                    <Stack.Screen
                      name="PlacedOrderDetails"
                      component={PlacedOrderDetails}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="SupplierList"
                      component={SupplierList}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="AddSupplier"
                      component={AddSupplier}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="EditSupplier"
                      component={EditSupplier}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="ViewSupplier"
                      component={ViewSupplier}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="WaiterList"
                      component={WaiterList}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="AddWaiter"
                      component={AddWaiter}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="EditWaiter"
                      component={EditWaiter}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="ViewWaiter"
                      component={ViewWaiter}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="CaptainList"
                      component={CaptainList}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="AddCaptain"
                      component={AddCaptain}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="EditCaptain"
                      component={EditCaptain}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="ViewCaptain"
                      component={ViewCaptain}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="ViewCategory"
                      component={ViewCategory}
                      options={{
                        headerShown: false,
                        title: "View Category",
                        headerTitleAlign: "center",
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center",
                          flex: 1,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="ServedOrderDetails"
                      component={ServedOrderDetails}
                      options={{
                        headerShown: true,
                        title: "Served Order Details",
                        headerTitleAlign: "center",
                        headerTitleStyle: {
                          padding: 15,
                          fontSize: ConstantValues.HEADER_FONT_SIZE,
                          textAlign: "center",
                          flex: 1,
                        },
                      }}
                    />
                    <Stack.Screen
                      name="ManagerList"
                      component={ManagerListView}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="AddManager"
                      component={AddManager}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="ManagerDetails"
                      component={ManagerDetails}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="EditManager"
                      component={EditManager}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="ChefListView"
                      component={ChefListView}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="AddChef"
                      component={AddChef}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="ChefDetails"
                      component={ChefDetails}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="UpdateChef"
                      component={UpdateChef}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="DemoScreen"
                      component={DemoScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="OfflineMenuList"
                      component={OfflineNavigator}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="Settings"
                      component={Settings}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="OrderCreateUIDemo"
                      component={OrderCreateUIDemo}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="SupportScreen"
                      component={SupportScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="CreateTicket"
                      component={CreateTicketScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="TicketList"
                      component={TicketListScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="TicketDetails"
                      component={TicketDetailsScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="OrderDetails"
                      component={OrderDetails}
                      options={{
                        title: "Order Details",
                        headerBackTitle: "Back",
                      }}
                    />
                    <Stack.Screen
                      name="ActivityLog"
                      component={ActivityLogScreen}
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="PrinterManagement"
                      component={PrinterManagement}
                      options={{ headerShown: false }}
                    />
                  </Stack.Navigator>
                </NavigationContainer>
              </NativeBaseProvider>
            </RestaurantProvider>
          </PrinterProvider>
        </OfflineProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
