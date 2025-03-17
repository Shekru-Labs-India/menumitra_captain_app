import { useState } from "react";
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
} from "native-base";

export default function ActivityLogScreen() {
  const router = useRouter();
  
  // Static activity data (will be replaced with API data later)
  const [activities, setActivities] = useState([
    {
      id: 1,
      type: "login",
      title: "Account Login",
      description: "You logged in from Chrome browser",
      timestamp: "Today, 10:30 AM",
      icon: "login",
      iconBg: "blue.500"
    },
    {
      id: 2,
      type: "order",
      title: "Order Processed",
      description: "You processed order #ORD123456",
      timestamp: "Today, 9:15 AM",
      icon: "receipt",
      iconBg: "green.500"
    },
    {
      id: 3,
      type: "profile",
      title: "Profile Updated",
      description: "You updated your profile information",
      timestamp: "Yesterday, 2:45 PM",
      icon: "person",
      iconBg: "purple.500"
    },
    {
      id: 4,
      type: "order",
      title: "Order Processed",
      description: "You processed order #ORD123455",
      timestamp: "Yesterday, 11:20 AM",
      icon: "receipt",
      iconBg: "green.500"
    },
    {
      id: 5,
      type: "login",
      title: "Account Login",
      description: "You logged in from Mobile App",
      timestamp: "Sep 10, 2023, 8:30 AM",
      icon: "login",
      iconBg: "blue.500"
    },
    {
      id: 6,
      type: "profile",
      title: "Password Changed",
      description: "You changed your account password",
      timestamp: "Sep 8, 2023, 4:15 PM",
      icon: "lock",
      iconBg: "red.500"
    },
    {
      id: 7,
      type: "order",
      title: "Order Cancelled",
      description: "You cancelled order #ORD123450",
      timestamp: "Sep 5, 2023, 3:45 PM",
      icon: "cancel",
      iconBg: "red.500"
    },
  ]);

  const renderActivityItem = ({ item }) => (
    <Box px={4} py={3}>
      <HStack space={3} alignItems="center">
        <Box bg={item.iconBg} p={2} rounded="full">
          <Icon as={MaterialIcons} name={item.icon} size={5} color="white" />
        </Box>
        <VStack flex={1}>
          <HStack justifyContent="space-between" alignItems="center">
            <Text fontSize="md" fontWeight="bold">
              {item.title}
            </Text>
            <Text fontSize="xs" color="coolGray.500">
              {item.timestamp}
            </Text>
          </HStack>
          <Text fontSize="sm" color="coolGray.600">
            {item.description}
          </Text>
        </VStack>
      </HStack>
    </Box>
  );

  return (
    <Box flex={1} bg="white" safeArea>
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
        <Box w={10} /> {/* Empty box for alignment */}
      </HStack>

      {/* Activity List */}
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderActivityItem}
        ItemSeparatorComponent={() => <Divider />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <HStack px={4} pt={4} pb={2} justifyContent="space-between" alignItems="center">
            <Heading size="sm">Recent Activity</Heading>
            <Badge colorScheme="blue" variant="subtle" rounded="md" px={2}>
              Last 30 days
            </Badge>
          </HStack>
        }
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