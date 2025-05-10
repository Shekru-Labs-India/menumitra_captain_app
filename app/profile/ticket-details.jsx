import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  IconButton,
  Heading,
  Input,
  Button,
  useToast,
  Badge,
  Image,
  Spinner,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Icon,
} from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RefreshControl, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../config/api.config';
import { fetchWithAuth } from '../../utils/apiInterceptor';

const TicketDetailsScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [ticketDetails, setTicketDetails] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef();

  const fetchTicketDetails = async () => {
    try {
      const [outletId, accessToken] = await AsyncStorage.multiGet(['outlet_id', 'access_token']);
      
      const response = await fetchWithAuth(`${getBaseUrl()}/ticket_view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticket_id: id
        })
      });

      if (response.st === 1) {
        setTicketDetails(response.ticket);
        setChatMessages(response.chat || []);
      } else {
        throw new Error(response.msg || 'Failed to fetch ticket details');
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.show({
        description: "Failed to load ticket details",
        status: "error"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const [captainId, accessToken] = await AsyncStorage.multiGet(['captain_id', 'access_token']);

      const response = await fetchWithAuth(`${getBaseUrl()}/continue_chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticket_id: id,
          user_id: captainId[1],
          message: newMessage.trim(),
          flag: "1"
        })
      });

      if (response.st === 1) {
        setNewMessage('');
        fetchTicketDetails();
      } else {
        throw new Error(response.msg || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.show({
        description: "Failed to send message",
        status: "error"
      });
    } finally {
      setSending(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTicketDetails();
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'success';
      case 'closed':
        return 'coolGray';
      case 'in progress':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'info';
    }
  };

  const renderChatMessage = ({ item }) => (
    <Box
      alignSelf={item.flag === "1" ? "flex-end" : "flex-start"}
      maxW="85%"
      mb={4}
    >
      <Box
        bg="white"
        rounded="xl"
        roundedTopRight={item.flag === "1" ? "none" : "xl"}
        roundedTopLeft={item.flag === "1" ? "xl" : "none"}
        p={3}
        shadow={1}
      >
        <Text fontSize="sm" color="coolGray.800">
          {item.message}
        </Text>
      </Box>
      <HStack 
        space={2} 
        mt={1} 
        justifyContent={item.flag === "1" ? "flex-end" : "flex-start"}
      >
        <Text fontSize="xs" color="coolGray.500">
          {item.user_name} ({item.user_role})
        </Text>
        <Text fontSize="xs" color="coolGray.500">
          {item.created_on}
        </Text>
      </HStack>
    </Box>
  );

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" color="blue.500" />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      {/* Header */}
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        bg="white"
        shadow={2}
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          Ticket Chat
        </Heading>
        <IconButton
          icon={<MaterialIcons name="refresh" size={24} color="gray" />}
          onPress={onRefresh}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        />
      </HStack>

      <KeyboardAvoidingView
        flex={1}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <VStack flex={1}>
          {/* Ticket Info */}
          <Box bg="white" p={4}>
            <HStack justifyContent="space-between" alignItems="center" mb={4}>
              <HStack space={2} alignItems="center">
                <Text color="coolGray.600">Ticket No:</Text>
                <Text color="blue.500" fontWeight="600">
                  #{ticketDetails?.ticket_number}
                </Text>
              </HStack>
              <Badge colorScheme={getStatusColor(ticketDetails?.status)} rounded="full" px={3} py={1}>
                {ticketDetails?.status}
              </Badge>
            </HStack>

            <Text fontSize="md" fontWeight="600" color="coolGray.800" mb={2}>
              {ticketDetails?.title}
            </Text>
            <Text fontSize="sm" color="coolGray.600" mb={4}>
              {ticketDetails?.description}
            </Text>

            <VStack space={1}>
              <HStack space={2}>
                <Text w="100" color="coolGray.600">Created By:</Text>
                <Text flex={1} color="coolGray.800">
                  {ticketDetails?.user_name} ({ticketDetails?.user_role})
                </Text>
              </HStack>
              <HStack space={2}>
                <Text w="100" color="coolGray.600">Created On:</Text>
                <Text flex={1} color="coolGray.800">
                  {ticketDetails?.created_on}
                </Text>
              </HStack>
            </VStack>

            {(ticketDetails?.attachment_1 || ticketDetails?.attachment_2) && (
              <VStack mt={4} space={2}>
                <Text fontSize="sm" fontWeight="500">Attachments</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <HStack space={2}>
                    {ticketDetails?.attachment_1 && (
                      <Image
                        source={{ uri: `${getBaseUrl()}${ticketDetails.attachment_1}` }}
                        alt="Attachment 1"
                        size="lg"
                        rounded="lg"
                      />
                    )}
                    {ticketDetails?.attachment_2 && (
                      <Image
                        source={{ uri: `${getBaseUrl()}${ticketDetails.attachment_2}` }}
                        alt="Attachment 2"
                        size="lg"
                        rounded="lg"
                      />
                    )}
                  </HStack>
                </ScrollView>
              </VStack>
            )}
          </Box>

          {/* Chat Messages */}
          <Box flex={1} bg="white" mt={2}>
            <FlatList
              data={chatMessages}
              renderItem={renderChatMessage}
              keyExtractor={item => item.ticket_chat_id.toString()}
              contentContainerStyle={{ padding: 16 }}
              ref={flatListRef}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          </Box>

          {/* Message Input */}
          <Box bg="white" p={4} shadow={2}>
            <HStack space={2} alignItems="flex-end">
              <Input
                flex={1}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                multiline
                maxHeight={100}
                bg="coolGray.100"
                rounded="2xl"
                py={2}
                px={4}
                _focus={{
                  borderColor: "blue.500",
                  bg: "white",
                }}
              />
              <IconButton
                icon={
                  sending ? (
                    <Spinner color="white" size="sm" />
                  ) : (
                    <MaterialIcons name="send" size={24} color="white" />
                  )
                }
                bg="blue.500"
                rounded="full"
                onPress={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                _pressed={{
                  bg: "blue.600",
                }}
              />
            </HStack>
          </Box>
        </VStack>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default TicketDetailsScreen; 