import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Heading,
  IconButton,
  FlatList,
  Divider,
  Badge,
  Spinner,
  Center,
} from "native-base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";

export default function ActivityLogScreen() {
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchActivityLogs();
  }, []);
  
  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = await AsyncStorage.getItem("user_id");
      
      if (!userId) {
        throw new Error("User ID not found");
      }
      
      console.log("Fetching activity logs for user:", userId);
      
      const data = await fetchWithAuth(`${getBaseUrl()}/activity_log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
        }),
      });
      
      console.log("Activity log response:", data);
      
      if (data && data.st === 1 && data.logs) {
        // Transform API data to match the UI in the image
        const formattedLogs = data.logs.map((log, index) => {
          console.log(`Processing log: ${JSON.stringify(log)}`);
          
          // Determine category and icon based on activity type
          let category = "Activity";
          let icon = "history";
          let iconBg = "lightBlue.100";
          let iconColor = "lightBlue.500";
          
          if (log.activity_type?.toLowerCase().includes("login") || 
              log.activity_type?.toLowerCase().includes("logout")) {
            category = "User Management";
            icon = "person";
            iconBg = "lightBlue.100";
            iconColor = "lightBlue.500";
          } else if (log.activity_type?.toLowerCase().includes("order")) {
            category = "Order Management";
            icon = "receipt";
            iconBg = "amber.100";
            iconColor = "amber.500";
          } else if (log.activity_type?.toLowerCase().includes("profile")) {
            category = "User Management";
            icon = "person";
            iconBg = "lightBlue.100";
            iconColor = "lightBlue.500";
          } else if (log.activity_type?.toLowerCase().includes("menu")) {
            category = "Menu Management";
            icon = "restaurant";
            iconBg = "orange.100";
            iconColor = "orange.500";
          } else if (log.activity_type?.toLowerCase().includes("setting")) {
            category = "Settings Management";
            icon = "settings";
            iconBg = "coolGray.100";
            iconColor = "coolGray.500";
          } else if (log.activity_type?.toLowerCase().includes("inventory")) {
            category = "Inventory Management";
            icon = "inventory";
            iconBg = "green.100";
            iconColor = "green.500";
          }
          
          // Format the title to match the image
          const title = log.activity_description || log.activity_title || "Activity";
          
          return {
            id: log.activity_id || index,
            type: log.activity_type || "activity",
            title: title,
            category: category,
            timestamp: log.created_at || "Unknown date",
            icon: icon,
            iconBg: iconBg,
            iconColor: iconColor
          };
        });
        
        setActivities(formattedLogs);
      } else {
        throw new Error(data?.msg || "Failed to fetch activity logs");
      }
    } catch (error) {
      console.error("Fetch Activity Logs Error:", error);
      setError(error.message || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const renderActivityItem = ({ item }) => (
    <Box my={2} mx={4} bg="white" rounded="lg" shadow={1} overflow="hidden">
      <HStack p={4} space={4} alignItems="center">
        <Box bg={item.iconBg} p={3} rounded="lg">
          <Icon as={MaterialIcons} name={item.icon} size={6} color={item.iconColor} />
        </Box>
        <VStack flex={1}>
          <Text fontSize="md" fontWeight="semibold" color="coolGray.800">
            {item.title}
          </Text>
          <HStack space={1} alignItems="center" justifyContent="space-between">
            <Text fontSize="sm" color="coolGray.500">
              {item.category}
            </Text>
            <Text fontSize="sm" color="coolGray.500">
              {item.timestamp}
            </Text>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );

  // Loading state
  if (loading) {
    return (
      <Box flex={1} bg="white" safeArea>
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
            _pressed={{ bg: "coolGray.100" }}
            borderRadius="full"
          />
          <Heading size="md" flex={1} textAlign="center">
            Activity Log
          </Heading>
          <Box w={10} />
        </HStack>
        
        <Center flex={1}>
          <Spinner size="lg" color="blue.500" />
          <Text mt={2} color="coolGray.500">Loading activity logs...</Text>
        </Center>
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Box flex={1} bg="white" safeArea>
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
            _pressed={{ bg: "coolGray.100" }}
            borderRadius="full"
          />
          <Heading size="md" flex={1} textAlign="center">
            Activity Log
          </Heading>
          <IconButton
            icon={<MaterialIcons name="refresh" size={24} color="gray" />}
            onPress={fetchActivityLogs}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
            borderRadius="full"
          />
        </HStack>
        
        <Center flex={1}>
          <Icon
            as={MaterialIcons}
            name="error-outline"
            size={12}
            color="red.500"
            mb={4}
          />
          <Text fontSize="md" color="coolGray.500" textAlign="center" px={4}>
            {error}
          </Text>
          <IconButton
            mt={4}
            icon={<Icon as={MaterialIcons} name="refresh" size={5} color="white" />}
            onPress={fetchActivityLogs}
            bg="blue.500"
            _pressed={{ bg: "blue.600" }}
            rounded="full"
          />
        </Center>
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
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          Activity Log
        </Heading>
        <IconButton
          icon={<MaterialIcons name="refresh" size={24} color="gray" />}
          onPress={fetchActivityLogs}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
      </HStack>

      {/* Activity List */}
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderActivityItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12 }}
        ItemSeparatorComponent={() => <Box h={0} />}
        ListHeaderComponent={null}
        ListEmptyComponent={
          <Box flex={1} justifyContent="center" alignItems="center" py={10}>
            <Icon
              as={MaterialIcons}
              name="history"
              size={12}
              color="coolGray.300"
              mb={4}
            />
            <Text fontSize="md" color="coolGray.500">
              No activity found
            </Text>
          </Box>
        }
      />
    </Box>
  );
} 