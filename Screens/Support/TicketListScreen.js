import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import RemixIcon from 'react-native-remix-icon';
import { getRestaurantId } from '../utils/getOwnerData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onGetProductionUrl } from '../utils/ConstantFunctions';
import axiosInstance from '../../utils/axiosConfig';
import CustomTabBar from '../CustomTabBar';

const TicketListScreen = ({ navigation }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem('access_token')
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + 'ticket_listview',
        {
          outlet_id: restaurantId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.st === 1) {
        setTickets(response.data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'open':
        return '#00C853';
      case 'closed':
        return '#757575';
      case 'in progress':
        return '#FF6B00';
      case 'rejected':
        return '#E91E63';
      default:
        return '#666666';
    }
  };

  const renderTicketItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.ticketItem}
      onPress={() => navigation.navigate('TicketDetails', { ticketId: item.ticket_id })}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketNumberContainer}>
          <Text style={styles.ticketLabel}>Ticket No: </Text>
          <Text style={styles.ticketNumber}>#{item.ticket_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.metaInfo}>
        <Text style={styles.ticketLabel}>Title: </Text>
        <Text style={styles.ticketTitle}>{item.title}</Text>
      </View>

      <View style={styles.ticketFooter}>
        <View style={styles.metaInfo}>
          <Text style={styles.metaLabel}>Created By: </Text>
          <View style={styles.userInfo}>
            <RemixIcon name="user-3-line" size={14} color="#666" />
            <Text style={styles.userName}>{item.user_name}</Text>
            <Text style={styles.userRole}>({item.user_role})</Text>
          </View>
        </View>
        <View style={styles.metaInfo}>
          <Text style={styles.metaLabel}>Created On: </Text>
          <Text style={styles.metaValue}>{item.created_on}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Support Tickets"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#0066FF" />
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={item => item.ticket_number}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <RemixIcon name="inbox-line" size={48} color="#666" />
              <Text style={styles.emptyText}>No tickets found</Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => navigation.navigate('CreateTicket')}
      >
        <RemixIcon name="add-line" size={24} color="#fff" />
      </TouchableOpacity>

      <CustomTabBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  fabButton: {
    position: 'absolute',
    right: 16,
    bottom: 76, // Adjust based on your bottom nav height
    backgroundColor: '#00C853',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Add extra padding for FAB
  },
  ticketItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 80,
  },
  ticketNumber: {
    fontSize: 14,
    color: '#0066FF',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  ticketFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  metaValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

export default TicketListScreen; 