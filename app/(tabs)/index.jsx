import { Image, StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Animated, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const managementCards = [
    { 
      title: 'Staff Management',
      icon: 'people',
      color: '#4CAF50',
      route: '/staff-management'
    },
    { 
      title: 'Staff Attendance',
      icon: 'calendar',
      color: '#2196F3',
      route: '/staff-attendance'
    },
    { 
      title: 'Attendance Report',
      icon: 'document-text',
      color: '#9C27B0',
      route: '/attendance-report'
    },
    { 
      title: 'Inventory Management',
      icon: 'cube',
      color: '#FF9800',
      route: '/inventory'
    },
    { 
      title: 'Inventory Report',
      icon: 'bar-chart',
      color: '#F44336',
      route: '/inventory-report'
    },
    { 
      title: 'Orders',
      icon: 'receipt',
      color: '#3F51B5',
      route: '/orders'
    },
    { 
      title: 'Order Report',
      icon: 'stats-chart',
      color: '#009688',
      route: '/order-report'
    }
  ];

  const sidebarItems = [
    { icon: 'home', title: 'Home' },
    { icon: 'list', title: 'Orders' },
    { icon: 'person', title: 'Profile' },
    { icon: 'settings-outline', title: 'Settings' },
    { icon: 'log-out-outline', title: 'Logout' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Image
            source={require('../../assets/images/mm-logo-bg-fill-hat.png')}
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

      {/* Main Content */}
      <View style={styles.content}>
        <Image
          source={require('../../assets/images/mm-logo-bg-fill-hat.png')}
          style={styles.centerLogo}
          resizeMode="contain"
        />
      </View>

      {/* Sidebar - Right Side */}
      {isSidebarOpen && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.sidebarItem}>
            <Ionicons name="home" size={24} color="#333" />
            <Text style={styles.sidebarText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sidebarItem}>
            <Ionicons name="list" size={24} color="#333" />
            <Text style={styles.sidebarText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sidebarItem}>
            <Ionicons name="person" size={24} color="#333" />
            <Text style={styles.sidebarText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sidebarItem}>
            <Ionicons name="settings-outline" size={24} color="#333" />
            <Text style={styles.sidebarText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sidebarItem}>
            <Ionicons name="log-out-outline" size={24} color="#333" />
            <Text style={styles.sidebarText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLogo: {
    width: 200,
    height: 200,
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    padding: 20,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sidebarText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
});
