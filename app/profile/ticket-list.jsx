import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  IconButton,
  Heading,
  Pressable,
  Badge,
  Spinner,
  useToast,
} from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../config/api.config';
import { fetchWithAuth } from '../../utils/apiInterceptor';

const TicketListScreen = () => {
  const router = useRouter();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = async () => {
    try {
      const outletId = await AsyncStorage.getItem('outlet_id');
      
      const response = await fetchWithAuth(`${getBaseUrl()}/support/list-tickets`, {
        method: 'POST',
        body: JSON.stringify({
          outlet_id: outletId,
          app: 'captain'
        })
      });

      if (response.st === 1) {
        setTickets(response.tickets || []);
      } else {
        throw new Error(response.msg || 'Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.show({
        description: "Failed to load tickets. Please try again.",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchTickets();
  }, []);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'success';
      case 'closed':
        return 'coolGray';
      case 'in_progress':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'info';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'coolGray';
      case 'normal':
        return 'info';
      case 'high':
        return 'warning';
      case 'urgent':
        return 'error';
      default:
        return 'coolGray';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

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
          Support Tickets
        </Heading>
        <IconButton
          icon={<MaterialIcons name="add" size={24} color="#0066FF" />}
          onPress={() => router.push("/profile/create-ticket")}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        />
      </HStack>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0066FF"]}
            tintColor="#0066FF"
          />
        }
      >
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
            <Spinner size="lg" color="blue.500" />
          </Box>
        ) : tickets.length === 0 ? (
          <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
            <Text color="coolGray.500">No tickets found</Text>
          </Box>
        ) : (
          <VStack space={3} p={4}>
            {tickets.map((ticket) => (
              <Pressable
                key={ticket.id}
                onPress={() => router.push({
                  pathname: "/profile/ticket-details",
                  params: { id: ticket.id }
                })}
              >
                <Box bg="white" p={4} rounded="lg" shadow={1}>
                  <VStack space={2}>
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="md" fontWeight="bold" color="coolGray.800" flex={1}>
                        {ticket.subject}
                      </Text>
                      <Badge colorScheme={getStatusColor(ticket.status)} variant="subtle">
                        {ticket.status}
                      </Badge>
                    </HStack>
                    
                    <Text fontSize="sm" color="coolGray.600" numberOfLines={2}>
                      {ticket.message}
                    </Text>
                    
                    <HStack justifyContent="space-between" alignItems="center" mt={2}>
                      <Badge colorScheme={getPriorityColor(ticket.priority)} variant="outline">
                        {ticket.priority}
                      </Badge>
                      <Text fontSize="xs" color="coolGray.500">
                        {formatDate(ticket.created_at)}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </Pressable>
            ))}
          </VStack>
        )}
      </ScrollView>
    </Box>
  );
};

export default TicketListScreen; 