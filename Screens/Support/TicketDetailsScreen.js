import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  RefreshControl
} from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import RemixIcon from 'react-native-remix-icon';
import { getRestaurantId, getUserId } from '../utils/getOwnerData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onGetProductionUrl } from '../utils/ConstantFunctions';
import axiosInstance from '../../utils/axiosConfig';
import CustomTabBar from '../CustomTabBar';

const TicketDetailsScreen = ({ route, navigation }) => {
  const { ticketId } = route.params;
  const [ticketDetails, setTicketDetails] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef();

  const fetchTicketDetails = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem('access_token')
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + 'ticket_view',
        {
          ticket_id: ticketId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.st === 1) {
        setTicketDetails(response.data.ticket);
        setChatMessages(response.data.chat || []);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const [userId, accessToken] = await Promise.all([
        getUserId(),
        AsyncStorage.getItem('access_token')
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + 'continue_chat',
        {
          ticket_id: ticketId,
          user_id: userId,
          message: newMessage.trim(),
          flag: "1"
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.st === 1) {
        setNewMessage('');
        fetchTicketDetails(); // Refresh chat messages
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTicketDetails();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

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

  const renderChatMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.flag === "1" ? styles.userMessage : styles.supportMessage
    ]}>
      <View style={styles.messageContent}>
        <Text style={styles.messageText}>{item.message}</Text>
      </View>
      <View style={styles.messageFooter}>
        <Text style={styles.messageSender}>{item.user_name} ({item.user_role})</Text>
        <Text style={styles.messageTime}>{item.created_on}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Ticket Chat"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <View style={styles.ticketInfo}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketNumberContainer}>
              <Text style={styles.ticketNumberLabel}>Ticket No: </Text>
              <Text style={styles.ticketNumber}>{ticketDetails?.ticket_number}</Text>
            </View>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(ticketDetails?.status) }
            ]}>
              <Text style={styles.statusText}>{ticketDetails?.status}</Text>
            </View>
          </View>

          <Text style={styles.ticketTitle}>{ticketDetails?.title}</Text>
          <Text style={styles.ticketDescription}>{ticketDetails?.description}</Text>
          
          <View style={styles.metaInfo}>
            <Text style={styles.metaLabel}>Created By: </Text>
            <Text style={styles.metaValue}>
              {ticketDetails?.user_name} ({ticketDetails?.user_role})
            </Text>
          </View>
          
          <View style={styles.metaInfo}>
            <Text style={styles.metaLabel}>Created On: </Text>
            <Text style={styles.metaValue}>{ticketDetails?.created_on}</Text>
          </View>

          {(ticketDetails?.attachment_1 || ticketDetails?.attachment_2) && (
            <View style={styles.attachments}>
              <Text style={styles.attachmentsTitle}>Attachments</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ticketDetails?.attachment_1 && (
                  <Image 
                    source={{ uri: onGetProductionUrl() + ticketDetails.attachment_1 }}
                    style={styles.attachmentImage}
                  />
                )}
                {ticketDetails?.attachment_2 && (
                  <Image 
                    source={{ uri: onGetProductionUrl() + ticketDetails.attachment_2 }}
                    style={styles.attachmentImage}
                  />
                )}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.conversationContainer}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle}>Conversation</Text>
            <View style={styles.conversationHeaderRight}>
              <Text style={styles.conversationTime}>
                Chats Started On: {ticketDetails?.created_on}
              </Text>
              <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
                <RemixIcon name="refresh-line" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={chatMessages}
            renderItem={renderChatMessage}
            keyExtractor={item => item.ticket_chat_id.toString()}
            contentContainerStyle={styles.chatContent}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#0066FF']}
              />
            }
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxHeight={100}
            />
            <TouchableOpacity 
              style={[styles.sendButton, sending && styles.sendingButton]}
              onPress={handleSendMessage}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <RemixIcon name="send-plane-fill" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomNavSpacer} />
      </View>

      <CustomTabBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  ticketInfo: {
    backgroundColor: '#fff',
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketNumberLabel: {
    fontSize: 14,
    color: '#666',
  },
  ticketNumber: {
    fontSize: 14,
    color: '#0066FF',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ticketDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  metaValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  attachments: {
    marginTop: 16,
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  conversationContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  conversationHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'column',
  },
  conversationHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  conversationTime: {
    fontSize: 12,
    color: '#666',
  },
  refreshButton: {
    padding: 4,
  },
  chatContent: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '85%',
    marginBottom: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  supportMessage: {
    alignSelf: 'flex-start',
  },
  messageContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderTopRightRadius: 0,
    padding: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  messageSender: {
    fontSize: 12,
    color: '#666',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#0066FF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendingButton: {
    opacity: 0.7,
  },
  bottomNavSpacer: {
    height: 60,
  }
});

export default TicketDetailsScreen; 