import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import MainToolBar from '../MainToolbar';
import RemixIcon from 'react-native-remix-icon';
import { getRestaurantId } from '../utils/getOwnerData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onGetProductionUrl } from '../utils/ConstantFunctions';
import axiosInstance from '../../utils/axiosConfig';
import CustomTabBar from '../CustomTabBar';

const SupportScreen = ({ navigation }) => {
  const [ticketStats, setTicketStats] = useState({
    total_tickets: 0,
    open_tickets: 0,
    closed_tickets: 0,
    wip_tickets: 0,
    rejected_tickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchTicketStats().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchTicketStats();
  }, []);

  const fetchTicketStats = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem('access_token')
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + 'total_tickets',
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
        setTicketStats({
          total_tickets: response.data.total_tickets || 0,
          open_tickets: response.data.open_tickets || 0,
          closed_tickets: response.data.closed_tickets || 0,
          wip_tickets: response.data.wip_tickets || 0,
          rejected_tickets: response.data.rejected_tickets || 0
        });
      }
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    Linking.openURL('tel:7776827177');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:menumitra.info@gmail.com');
  };

  const handleWhatsApp = (phoneNumber) => {
    Linking.openURL(`whatsapp://send?phone=91${phoneNumber}`);
  };

  return (
    <View style={styles.mainContainer}>
      <CustomHeader title="24/7 Support" />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0066FF"]}
            tintColor="#0066FF"
          />
        }
      >
        <View style={styles.supportSection}>
          <Text style={styles.description}>
            Need help? Our support team is available <Text style={styles.blueText}>24/7</Text> to assist you.
          </Text>
          
          <View style={styles.contactsRow}>
            {/* First Contact */}
            <View style={styles.contactColumn}>
              <Text style={styles.contactHeader}>Call / WhatsApp</Text>
              <Text style={styles.phoneNumber}>+91 9527279639</Text>
              <View style={styles.buttonsRow}>
                <TouchableOpacity 
                  style={[styles.iconButton, styles.callButton]}
                  onPress={() => Linking.openURL('tel:9527279639')}
                >
                  <RemixIcon name="phone-fill" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.iconButton, styles.whatsappButton]}
                  onPress={() => handleWhatsApp('9527279639')}
                >
                  <RemixIcon name="whatsapp-fill" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Second Contact */}
            <View style={styles.contactColumn}>
              <Text style={styles.contactHeader}>Call / WhatsApp</Text>
              <Text style={styles.phoneNumber}>+91 8600704616</Text>
              <View style={styles.buttonsRow}>
                <TouchableOpacity 
                  style={[styles.iconButton, styles.callButton]}
                  onPress={() => Linking.openURL('tel:8600704616')}
                >
                  <RemixIcon name="phone-fill" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.iconButton, styles.whatsappButton]}
                  onPress={() => handleWhatsApp('8600704616')}
                >
                  <RemixIcon name="whatsapp-fill" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={handleEmail} style={styles.contactItem}>
            <RemixIcon name="mail-line" size={24} color="#0066FF" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactLabel}>Email us at</Text>
              <Text style={styles.contactValue}>menumitra.info@gmail.com</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.ticketsSection}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketsTitle}>Support Tickets</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('CreateTicket')}
              >
                <RemixIcon name="add-line" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.manageButton}
                onPress={() => navigation.navigate('TicketList')}
              >
                <RemixIcon name="list-unordered" size={20} color="#fff" />
                <Text style={styles.manageText}>Manage</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0066FF" style={styles.loader} />
          ) : (
            <View style={styles.statsContainer}>
              <View style={[styles.statBox, styles.statBoxLarge]}>
                <Text style={[styles.statNumber, { color: '#0066FF' }]}>
                  {ticketStats.total_tickets}
                </Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxLarge]}>
                <Text style={[styles.statNumber, { color: '#00C853' }]}>
                  {ticketStats.open_tickets}
                </Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxSmall]}>
                <Text style={[styles.statNumber, { color: '#FF6B00' }]}>
                  {ticketStats.wip_tickets}
                </Text>
                <Text style={styles.statLabel}>Work in Progress</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxSmall]}>
                <Text style={[styles.statNumber, { color: '#757575' }]}>
                  {ticketStats.closed_tickets}
                </Text>
                <Text style={styles.statLabel}>Closed</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxSmall]}>
                <Text style={[styles.statNumber, { color: '#E91E63' }]}>
                  {ticketStats.rejected_tickets}
                </Text>
                <Text style={styles.statLabel}>Rejected</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      <CustomTabBar />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  supportSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 24
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8
  },
  contactTextContainer: {
    marginLeft: 16
  },
  contactLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  contactValue: {
    fontSize: 16,
    color: '#0066FF',
    fontWeight: '500'
  },
  ticketsSection: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  ticketsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066FF'
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  addButton: {
    backgroundColor: '#00C853',
    borderRadius: 8,
    padding: 8,
    marginRight: 8
  },
  manageButton: {
    backgroundColor: '#757575',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  manageText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 14
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center'
  },
  statBoxLarge: {
    width: '48%'
  },
  statBoxSmall: {
    width: '31%'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center'
  },
  loader: {
    marginVertical: 20
  },
  contactsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  contactColumn: {
    flex: 1,
    alignItems: 'center',
  },
  contactHeader: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 18,
    color: '#0066FF',
    fontWeight: '500',
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#0066FF',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  blueText: {
    color: '#0066FF',
  },
});

export default SupportScreen; 