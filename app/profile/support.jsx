import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  ScrollView,
  Pressable,
  Icon,
  IconButton,
  Heading,
  Button,
  Spinner,
  useToast,
} from 'native-base';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../config/api.config';
import { fetchWithAuth } from '../../utils/apiInterceptor';

const SupportScreen = () => {
  const router = useRouter();
  const toast = useToast();
  const [ticketStats, setTicketStats] = useState({
    total_tickets: 0,
    open_tickets: 0,
    closed_tickets: 0,
    wip_tickets: 0,
    rejected_tickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTicketStats = async () => {
    try {
      const [outletId, accessToken] = await AsyncStorage.multiGet(['outlet_id', 'access_token']);
      
      const response = await fetchWithAuth(`${getBaseUrl()}/total_tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outlet_id: outletId[1]
        })
      });

      if (response.st === 1) {
        setTicketStats({
          total_tickets: response.total_tickets || 0,
          open_tickets: response.open_tickets || 0,
          closed_tickets: response.closed_tickets || 0,
          wip_tickets: response.wip_tickets || 0,
          rejected_tickets: response.rejected_tickets || 0
        });
      } else {
        throw new Error(response.msg || 'Failed to fetch ticket statistics');
      }
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      toast.show({
        description: "Failed to load ticket statistics",
        status: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTicketStats().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchTicketStats();
  }, []);

  const handleWhatsApp = (phoneNumber) => {
    Linking.openURL(`whatsapp://send?phone=91${phoneNumber}`);
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
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }}
          variant="ghost"
          _pressed={{
            bg: "coolGray.100",
          }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          24/7 Support
        </Heading>
        <Box w={10} />
      </HStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0066FF"]}
            tintColor="#0066FF"
          />
        }
      >
        {/* Support Section */}
        <Box bg="white" p={5} mt={4} mx={4} rounded="lg" shadow={1}>
          <Text fontSize="md" color="coolGray.600" mb={6}>
            Need help? Our support team is available <Text color="blue.500" fontWeight="medium">24/7</Text> to assist you.
          </Text>

          <HStack space={4} mb={6}>
            {/* First Contact */}
            <Box flex={1} alignItems="center">
              <Text fontSize="md" color="coolGray.700" mb={2}>
                Call / WhatsApp
              </Text>
              <Text fontSize="lg" color="blue.500" fontWeight="medium" mb={4}>
                +91 9527279639
              </Text>
              <HStack space={3}>
                <IconButton
                  icon={<MaterialIcons name="phone" size={24} color="white" />}
                  bg="blue.500"
                  rounded="full"
                  onPress={() => Linking.openURL('tel:9527279639')}
                  _pressed={{ bg: "blue.600" }}
                />
                <IconButton
                  icon={<MaterialCommunityIcons name="whatsapp" size={24} color="white" />}
                  bg="green.500"
                  rounded="full"
                  onPress={() => handleWhatsApp('9527279639')}
                  _pressed={{ bg: "green.600" }}
                />
              </HStack>
            </Box>

            {/* Second Contact */}
            <Box flex={1} alignItems="center">
              <Text fontSize="md" color="coolGray.700" mb={2}>
                Call / WhatsApp
              </Text>
              <Text fontSize="lg" color="blue.500" fontWeight="medium" mb={4}>
                +91 8600704616
              </Text>
              <HStack space={3}>
                <IconButton
                  icon={<MaterialIcons name="phone" size={24} color="white" />}
                  bg="blue.500"
                  rounded="full"
                  onPress={() => Linking.openURL('tel:8600704616')}
                  _pressed={{ bg: "blue.600" }}
                />
                <IconButton
                  icon={<MaterialCommunityIcons name="whatsapp" size={24} color="white" />}
                  bg="green.500"
                  rounded="full"
                  onPress={() => handleWhatsApp('8600704616')}
                  _pressed={{ bg: "green.600" }}
                />
              </HStack>
            </Box>
          </HStack>

          <Pressable
            onPress={() => Linking.openURL('mailto:menumitra.info@gmail.com')}
            bg="coolGray.50"
            p={4}
            rounded="lg"
            mb={2}
          >
            <HStack space={3} alignItems="center">
              <Icon
                as={MaterialIcons}
                name="mail"
                size={6}
                color="blue.500"
              />
              <VStack>
                <Text fontSize="sm" color="coolGray.600">
                  Email us at
                </Text>
                <Text fontSize="md" color="blue.500" fontWeight="medium">
                  menumitra.info@gmail.com
                </Text>
              </VStack>
            </HStack>
          </Pressable>
        </Box>

        {/* Tickets Section */}
        <Box bg="white" p={5} mt={4} mx={4} rounded="lg" shadow={1}>
          <HStack justifyContent="space-between" alignItems="center" mb={6}>
            <Heading size="md" color="blue.500">
              Support Tickets
            </Heading>
            <HStack space={2}>
              <IconButton
                icon={<MaterialIcons name="add" size={24} color="white" />}
                bg="green.500"
                onPress={() => router.push("/profile/create-ticket")}
                _pressed={{ bg: "green.600" }}
                rounded="lg"
              />
              <Button
                leftIcon={<MaterialIcons name="list" size={20} color="white" />}
                bg="coolGray.500"
                onPress={() => router.push("/profile/ticket-list")}
                _pressed={{ bg: "coolGray.600" }}
                rounded="lg"
              >
                Manage
              </Button>
            </HStack>
          </HStack>

          {loading ? (
            <Spinner size="lg" color="blue.500" />
          ) : (
            <VStack space={4}>
              <HStack justifyContent="space-between">
                <Box bg="coolGray.50" p={4} rounded="lg" w="47%">
                  <Text fontSize="2xl" color="blue.500" fontWeight="bold">
                    {ticketStats.total_tickets}
                  </Text>
                  <Text fontSize="sm" color="coolGray.600">
                    Total
                  </Text>
                </Box>
                <Box bg="coolGray.50" p={4} rounded="lg" w="47%">
                  <Text fontSize="2xl" color="green.500" fontWeight="bold">
                    {ticketStats.open_tickets}
                  </Text>
                  <Text fontSize="sm" color="coolGray.600">
                    Open
                  </Text>
                </Box>
              </HStack>
              <HStack justifyContent="space-between">
                <Box bg="coolGray.50" p={4} rounded="lg" w="31%">
                  <Text fontSize="2xl" color="orange.500" fontWeight="bold">
                    {ticketStats.wip_tickets}
                  </Text>
                  <Text fontSize="sm" color="coolGray.600">
                    In Progress
                  </Text>
                </Box>
                <Box bg="coolGray.50" p={4} rounded="lg" w="31%">
                  <Text fontSize="2xl" color="coolGray.500" fontWeight="bold">
                    {ticketStats.closed_tickets}
                  </Text>
                  <Text fontSize="sm" color="coolGray.600">
                    Closed
                  </Text>
                </Box>
                <Box bg="coolGray.50" p={4} rounded="lg" w="31%">
                  <Text fontSize="2xl" color="red.500" fontWeight="bold">
                    {ticketStats.rejected_tickets}
                  </Text>
                  <Text fontSize="sm" color="coolGray.600">
                    Rejected
                  </Text>
                </Box>
              </HStack>
            </VStack>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default SupportScreen; 