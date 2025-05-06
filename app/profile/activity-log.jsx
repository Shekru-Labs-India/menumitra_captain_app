import { useState, useEffect, useCallback } from "react";
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
  Pressable,
  useToast,
} from "native-base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";
import { RefreshControl } from "react-native";

export default function ActivityLogScreen() {
  
  const router = useRouter();
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Add pagination state to match owner app
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 25,
  });
  
  useEffect(() => {
    fetchActivityLogs(1);
  }, []);
  
  const fetchActivityLogs = async (page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      }
      setError(null);
      
      const userId = await AsyncStorage.getItem("user_id");
      
      if (!userId) {
        throw new Error("User ID not found");
      }
      
      console.log("Fetching activity logs for user:", userId, "page:", page);
      
      const data = await fetchWithAuth(`${getBaseUrl()}/activity_log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          page: page,
          records_per_page: 25
        }),
      });
      
      console.log("Activity log response:", data);
      
      if (data && data.st === 1 && data.activity_logs) {
        // Transform API data to match the UI expected format
        const formattedLogs = data.activity_logs.map((log, index) => {
          // Determine category and icon based on module - match the owner app's classification
          let category = log.module || "Activity";
          let icon = "history";
          let iconBg = "lightBlue.100";
          let iconColor = "lightBlue.500";
          
          // Match owner app's module classification
          switch (category) {
            case "Update Profile":
              icon = "person";
              iconBg = "green.100";
              iconColor = "green.500";
              break;
            case "Table Management":
              icon = "table-bar";
              iconBg = "blue.100";
              iconColor = "blue.500";
              break;
            case "Section Management":
              icon = "dashboard";
              iconBg = "purple.100";
              iconColor = "purple.500";
              break;
            case "Order Management":
              icon = "receipt";
              iconBg = "amber.100";
              iconColor = "amber.500";
              break;
            case "Captain Management":
              icon = "person-pin";
              iconBg = "pink.100";
              iconColor = "pink.500";
              break;
            case "Menu Management":
              icon = "restaurant";
              iconBg = "indigo.100";
              iconColor = "indigo.500";
              break;
            case "Outlet Management":
              icon = "store";
              iconBg = "teal.100";
              iconColor = "teal.500";
              break;
            case "Staff Management":
              icon = "groups";
              iconBg = "brown.100";
              iconColor = "brown.500";
              break;
            case "User Management":
              icon = "manage-accounts";
              iconBg = "cyan.100";
              iconColor = "cyan.500";
              break;
            case "Login":
              icon = "login";
              iconBg = "cyan.100";
              iconColor = "cyan.500";
              break;
            case "Settings Management":
              icon = "settings";
              iconBg = "blueGray.100";
              iconColor = "blueGray.500";
              break;
            case "Inventory Management":
              icon = "inventory";
              iconBg = "yellow.100";
              iconColor = "yellow.500";
              break;
            case "Ticket Management":
              icon = "support-agent";
              iconBg = "red.100";
              iconColor = "red.500";
              break;
            default:
              icon = "info";
              iconBg = "blueGray.100";
              iconColor = "blueGray.500";
          }
          
          return {
            id: log.activity_log_id || index,
            type: log.sub_module || "activity",
            title: log.title || "Activity",
            category: category,
            timestamp: log.created_on || "Unknown date",
            icon: icon,
            iconBg: iconBg,
            iconColor: iconColor
          };
        });
        
        setActivities(formattedLogs);
        
        // Set pagination data to match owner app
        if (data.pagination) {
          setPagination({
            currentPage: data.pagination.current_page,
            totalPages: data.pagination.total_pages,
            totalRecords: data.pagination.total_records,
            recordsPerPage: data.pagination.records_per_page,
          });
        }
      } else {
        throw new Error(data?.msg || "Failed to fetch activity logs");
      }
    } catch (error) {
      console.error("Fetch Activity Logs Error:", error);
      setError(error.message || "Failed to load activity logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchActivityLogs(newPage);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivityLogs(1);
  }, []);

  // Pagination controls component (matching owner app)
  const PaginationControls = () => (
    <HStack space={2} alignItems="center" justifyContent="center">
      <Pressable 
        p={2}
        bg="coolGray.100"
        rounded="full"
        opacity={pagination.currentPage === 1 ? 0.5 : 1}
        onPress={() => handlePageChange(1)}
        disabled={pagination.currentPage === 1}
      >
        <Icon 
          as={MaterialIcons} 
          name="first-page" 
          size={5} 
          color={pagination.currentPage === 1 ? "coolGray.400" : "blue.500"} 
        />
      </Pressable>

      <Pressable 
        p={2}
        bg="coolGray.100"
        rounded="full"
        opacity={pagination.currentPage === 1 ? 0.5 : 1}
        onPress={() => handlePageChange(pagination.currentPage - 1)}
        disabled={pagination.currentPage === 1}
      >
        <Icon 
          as={MaterialIcons} 
          name="chevron-left" 
          size={5} 
          color={pagination.currentPage === 1 ? "coolGray.400" : "blue.500"} 
        />
      </Pressable>

      <Text color="coolGray.600" fontWeight="medium">
        {pagination.currentPage}/{pagination.totalPages}
      </Text>

      <Pressable 
        p={2}
        bg="coolGray.100"
        rounded="full"
        opacity={pagination.currentPage === pagination.totalPages ? 0.5 : 1}
        onPress={() => handlePageChange(pagination.currentPage + 1)}
        disabled={pagination.currentPage === pagination.totalPages}
      >
        <Icon 
          as={MaterialIcons} 
          name="chevron-right" 
          size={5} 
          color={pagination.currentPage === pagination.totalPages ? "coolGray.400" : "blue.500"} 
        />
      </Pressable>
    </HStack>
  );

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
  if (loading && !refreshing) {
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
            onPress={() => fetchActivityLogs(1)}
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
            onPress={() => fetchActivityLogs(1)}
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
          onPress={() => fetchActivityLogs(1)}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
      </HStack>

      {/* Pagination info - to match owner app */}
      <Box bg="white" px={4} py={2} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <HStack justifyContent="space-between" alignItems="center">
          <Text fontSize="sm" color="coolGray.600">
            {((pagination.currentPage - 1) * pagination.recordsPerPage) + 1}-
            {Math.min(pagination.currentPage * pagination.recordsPerPage, pagination.totalRecords)}{' '}
            of {pagination.totalRecords} records
          </Text>
          <PaginationControls />
        </HStack>
      </Box>

      {/* Activity List */}
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderActivityItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0066FF"]} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 80 }} // Add padding for floating controls
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

      {/* Floating pagination controls - to match owner app */}
      <Box 
        position="absolute" 
        bottom={0} 
        left={0} 
        right={0} 
        bg="white" 
        py={2} 
        shadow={6}
        borderTopWidth={1} 
        borderTopColor="coolGray.200"
      >
        <PaginationControls />
      </Box>
    </Box>
  );
} 