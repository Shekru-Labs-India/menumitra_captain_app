import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Image 
            source={require('../../assets/images/mm-logo-bg-fill-hat.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>MenuMitra Captain</Text>
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

      {/* Sidebar */}
      {isSidebarOpen && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {sidebarItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.sidebarItem}>
              <Ionicons name={item.icon} size={24} color="#333" />
              <Text style={styles.sidebarText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 70,
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
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
