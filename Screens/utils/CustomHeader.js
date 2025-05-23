import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CustomHeader = () => {
    return (
        <View style={styles.header}>
            <Text style={styles.title}>Dashboard</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent', // Transparent background
        elevation: 0, // Remove shadow for Android
        shadowOpacity: 0, // Remove shadow for iOS
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#6c2727', // Set text color
    },
});

export default CustomHeader;
