import { Image, StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function HomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Image
            source={require('../../assets/images/mm-logo-bg-fill-hat.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>MenuMitra</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#333" />
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
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
    color: '#333',
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
    top: 0,
    right: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    shadowColor: '#000',
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
    borderBottomColor: '#eee',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 15,
  },
  closeButton: {
    padding: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sidebarText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
});
