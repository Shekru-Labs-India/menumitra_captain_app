import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import RemixIcon from 'react-native-remix-icon';
import { useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../../utils/axiosConfig';
import { onGetProductionUrl } from '../utils/ConstantFunctions';
import { getUserId } from '../utils/getOwnerData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomHeader from '../../components/CustomHeader';
import CustomTabBar from '../CustomTabBar';

const ActivityLogScreen = ({ navigation }) => {
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 25,
  });

  // Function to get icon based on module type
  const getModuleIcon = (module) => {
    switch (module) {
      case 'Update Profile':
        return 'user-settings-line';
      case 'Table Management':
        return 'table-2';
      case 'Section Management':
        return 'layout-grid-line';
      case 'Order Management':
        return 'file-list-3-line';
      case 'Captain Management':
        return 'user-star-line';
      case 'Menu Management':
        return 'menu-2-fill';
      case 'Outlet Management':
        return 'store-2-line';
      case 'Staff Management':
        return 'team-line';
      case 'User Management': 
        return 'user-settings-line';
      case 'Login':
        return 'login-box-line';
      case 'Settings Management':
        return 'settings-3-line';
      case 'Inventory Management':
        return 'stack-line';
      case 'Ticket Management':
        return 'customer-service-2-line';
      default:
        return 'information-line';
    }
  };

  // Function to get color based on module type
  const getModuleColor = (module) => {
    switch (module) {
      case 'Update Profile':
        return '#4CAF50'; // Green
      case 'Table Management':
        return '#2196F3'; // Blue
      case 'Section Management':
        return '#9C27B0'; // Purple
      case 'Order Management':
        return '#FF9800'; // Orange
      case 'Captain Management':
        return '#E91E63'; // Pink
      case 'Menu Management':
        return '#3F51B5'; // Indigo
      case 'Outlet Management':
        return '#009688'; // Teal
      case 'Staff Management':
        return '#795548'; // Brown
      case 'User Management':
        return '#00BCD4'; // Cyan
      case 'Login':
        return '#00BCD4'; // Cyan
      case 'Settings Management':
        return '#607D8B'; // Blue Gray
      case 'Inventory Management':
        return '#FFC107'; // Amber
      case 'Ticket Management':
        return '#F44336'; // Red
      default:
        return '#607D8B'; // Blue Gray
    }
  };

  useEffect(() => {
    fetchActivityLogs(1);
  }, []);

  const fetchActivityLogs = async (page = 1) => {
    setError(null);
    setLoading(true);
    
    try {
      const userId = await getUserId();
      const accessToken = await AsyncStorage.getItem('access_token');
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + 'activity_log',
        { 
          user_id: userId,
          page: page,
          records_per_page: 25
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.st === 1) {
        setActivityLogs(response.data.activity_logs || []);
        setPagination({
          currentPage: response.data.pagination.current_page,
          totalPages: response.data.pagination.total_pages,
          totalRecords: response.data.pagination.total_records,
          recordsPerPage: response.data.pagination.records_per_page,
        });
      } else {
        throw new Error(response.data.msg || 'Failed to load activity logs');
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Fetch data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchActivityLogs();
      return () => {};
    }, [])
  );
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchActivityLogs(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchActivityLogs(newPage);
    }
  };

  const PaginationControls = () => (
    <View style={styles.paginationControls}>
      <TouchableOpacity 
        style={[
          styles.pageButton,
          pagination.currentPage === 1 && styles.pageButtonDisabled
        ]}
        onPress={() => handlePageChange(1)}
        disabled={pagination.currentPage === 1}
      >
        <RemixIcon name="home-4-line" size={16} color={pagination.currentPage === 1 ? '#ccc' : '#0066FF'} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.pageButton,
          pagination.currentPage === 1 && styles.pageButtonDisabled
        ]}
        onPress={() => handlePageChange(pagination.currentPage - 1)}
        disabled={pagination.currentPage === 1}
      >
        <RemixIcon name="arrow-left-s-line" size={16} color={pagination.currentPage === 1 ? '#ccc' : '#0066FF'} />
      </TouchableOpacity>

      <Text style={styles.pageInfoText}>
        {pagination.currentPage}/{pagination.totalPages}
      </Text>

      <TouchableOpacity 
        style={[
          styles.pageButton,
          pagination.currentPage === pagination.totalPages && styles.pageButtonDisabled
        ]}
        onPress={() => handlePageChange(pagination.currentPage + 1)}
        disabled={pagination.currentPage === pagination.totalPages}
      >
        <RemixIcon name="arrow-right-s-line" size={16} color={pagination.currentPage === pagination.totalPages ? '#ccc' : '#0066FF'} />
      </TouchableOpacity>
    </View>
  );

  // Render activity log item
  const renderActivityItem = ({ item }) => {
    const moduleColor = getModuleColor(item.module);
    const moduleIcon = getModuleIcon(item.module);
    
    // Just use the date string as provided by the API
    const timeString = item.created_on || 'N/A';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${moduleColor}20` }]}>
            <RemixIcon name={moduleIcon} size={22} color={moduleColor} />
          </View>
          
          <View style={styles.contentContainer}>
            <Text style={styles.titleText}>{item.title}</Text>
            <View style={styles.footerRow}>
              <Text style={styles.moduleText}>{item.module}</Text>
              <Text style={styles.timeText}>{timeString}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Activity Log" navigation={navigation} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Loading activity logs...</Text>
        </View>
        <CustomTabBar />
      </SafeAreaView>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader title="Activity Log" navigation={navigation} />
        <View style={styles.errorContainer}>
          <RemixIcon name="error-warning-line" size={60} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
        <CustomTabBar />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="Activity Log" navigation={navigation} />
      
      <View style={styles.paginationInfo}>
        <View style={styles.paginationHeader}>
          <Text style={styles.paginationText}>
            {((pagination.currentPage - 1) * pagination.recordsPerPage) + 1}-
            {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)}{' '}
            of {pagination.totalRecords} records         
          </Text>
          <PaginationControls />
        </View>
      </View>
      
      <FlatList
        data={activityLogs}
        keyExtractor={(item) => item.activity_log_id.toString()}
        renderItem={renderActivityItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 120 } // Add extra padding for floating controls
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0066FF"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <RemixIcon name="clipboard-line" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No activity logs found</Text>
          </View>
        }
      />

      <View style={styles.floatingPaginationContainer}>
        <PaginationControls />
      </View>
      
      <CustomTabBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0dcaf0',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  paginationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  pageButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 4,
  },
  pageButtonDisabled: {
    backgroundColor: '#f1f1f1',
  },
  pageInfoText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  floatingPaginationContainer: {
    position: 'absolute',
    bottom: 60, // Position above CustomTabBar
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  paginationInfo: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ActivityLogScreen; 