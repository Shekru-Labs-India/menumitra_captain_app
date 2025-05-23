import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const HomeNavigation = ({ navigation }) => {
    const handleIconPress = (screenName) => {
        navigation.navigate(screenName);
    };

    return (
        <View style={styles.iconMenu}>

            <TouchableOpacity onPress={() => handleIconPress('StaffScreen')} style={styles.iconContainer}>
                <Icon name="person-outline" size={30} color="#000" />
                <Text style={styles.iconText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleIconPress('NotificationsScreen')} style={styles.iconContainer}>
                <Icon name="notifications-outline" size={30} color="#000" />
                <Text style={styles.iconText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleIconPress('TabScreen/HomeScreen')} style={styles.iconContainer}>
                <Icon name="home-outline" size={40} color="#000" />
                <Text style={styles.iconText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleIconPress('SettingsScreen')} style={styles.iconContainer}>
                <Icon name="settings-outline" size={30} color="#000" />
                <Text style={styles.iconText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleIconPress('ProfileScreen')} style={styles.iconContainer}>
                <Icon name="person-outline" size={30} color="#000" />
                <Text style={styles.iconText}>Profile</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    iconMenu: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#fff',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    iconContainer: {
        alignItems: 'center',
    },
    iconText: {
        marginTop: 5,
        fontSize: 12,
        color: '#000',
    },
});

export default HomeNavigation;
