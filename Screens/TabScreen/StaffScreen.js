import React from 'react';
import {Dimensions, StyleSheet, Text, View} from 'react-native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import AllStaff from "./ManageStaff/AllStaff";
import WaiterStaff from "./ManageStaff/WaiterStaff";
import CheffStaff from "./ManageStaff/CheffStaff";
import ManagerStaff from "./ManageStaff/ManagerStaff";
import {useNavigation} from "@react-navigation/native";

// Create Top Tab Navigator
const Tab = createMaterialTopTabNavigator();

// Dummy Screen Components for each tab
function AllScreen() {
    return (
        <View style={styles.screen}>
            <AllStaff/>
        </View>
    );
}

function WaiterScreen() {
    return (
        <View style={styles.screen}>
            <WaiterStaff/>
        </View>
    );
}

function ChefScreen() {
    return (
        <View style={styles.screen}>
            <CheffStaff/>
        </View>
    );
}

function ManagerScreen() {
    return (
        <View style={styles.screen}>
           <ManagerStaff/>
        </View>
    );
}

// Manage Staff Screen with Top Tab Navigator
export default function StaffScreen() {
    const navigation = useNavigation();
    return (
        <View style={styles.container}>
            <Tab.Navigator
                screenOptions={{
                    tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
                    tabBarStyle: { backgroundColor: '#ffffff', elevation: 0 }, // Customizing tab bar
                    tabBarActiveTintColor: '#181818',
                    tabBarIndicatorStyle: { backgroundColor: '#181818' }, // Active tab indicator color
                    tabBarItemStyle: { paddingVertical: 10 }, // Add padding to tabs
                }}
            >
                <Tab.Screen name="All" component={AllScreen} />
                <Tab.Screen name="Waiter" component={WaiterScreen} />
                <Tab.Screen name="Chef" component={ChefScreen} />
                <Tab.Screen name="Manager" component={ManagerScreen} />
            </Tab.Navigator>
            {/*<HomeNavigation navigation={navigation}/>*/}
        </View>
    );
}

// Styles
const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
    container: {

        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: 'rgba(208,208,208,0)', // Optional: Set a light background color
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        padding: 10,
        backgroundColor: '#ffffff', // Set a background color to distinguish the title
        color: '#000000',
        textAlign: 'center',
        elevation: 3, // Add a small shadow for visibility
    },
    screen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
