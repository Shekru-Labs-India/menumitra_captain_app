import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  VStack,
  HStack,
  Avatar,
  Text,
  Divider,
  ScrollView,
  Pressable,
  Icon,
} from "native-base";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const profileMenuItems = [
    {
      icon: "person-outline",
      title: "Personal Information",
      subtitle: "Update your personal details",
      route: "/profile/personal-info",
    },
    {
      icon: "schedule",
      title: "Work Schedule",
      subtitle: "View your shifts and timings",
      route: "/profile/schedule",
    },
    {
      icon: "history",
      title: "Order History",
      subtitle: "View your past orders",
      route: "/profile/order-history",
    },
    {
      icon: "notifications-none",
      title: "Notifications",
      subtitle: "Manage your notifications",
      route: "/profile/notifications",
    },
    {
      icon: "security",
      title: "Security",
      subtitle: "Update password and security",
      route: "/profile/security",
    },
    {
      icon: "help-outline",
      title: "Help & Support",
      subtitle: "Get help and contact support",
      route: "/profile/support",
    },
  ];

  const MenuItem = ({ item }) => (
    <Pressable
      onPress={() => router.push(item.route)}
      _pressed={{ bg: "coolGray.100" }}
    >
      <HStack space={4} py={4} px={6} alignItems="center">
        <Box p={2} rounded="full" bg="primary.100">
          <Icon
            as={MaterialIcons}
            name={item.icon}
            size={6}
            color="primary.600"
          />
        </Box>
        <VStack flex={1}>
          <Text fontSize="md" fontWeight="600" color="coolGray.800">
            {item.title}
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            {item.subtitle}
          </Text>
        </VStack>
        <Icon
          as={MaterialIcons}
          name="chevron-right"
          size={6}
          color="coolGray.400"
        />
      </HStack>
    </Pressable>
  );

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Profile Header */}
      <Box px={6} pt={6} pb={8} bg="primary.500">
        <HStack space={4} alignItems="center">
          <Avatar
            size="xl"
            source={{
              uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80",
            }}
            borderWidth={4}
            borderColor="white"
          >
            JD
          </Avatar>
          <VStack flex={1}>
            <Text color="white" fontSize="2xl" fontWeight="bold">
              John Doe
            </Text>
            <Text color="white" fontSize="md">
              Head Captain
            </Text>
            <HStack space={2} mt={1}>
              <Icon as={MaterialIcons} name="email" size={4} color="white" />
              <Text color="white" fontSize="sm">
                john.doe@example.com
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </Box>

      {/* Stats Section */}
      <HStack
        bg="white"
        py={4}
        px={6}
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <VStack alignItems="center">
          <Text fontSize="xl" fontWeight="bold" color="primary.500">
            156
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            Orders Today
          </Text>
        </VStack>
        <VStack alignItems="center">
          <Text fontSize="xl" fontWeight="bold" color="primary.500">
            98%
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            Rating
          </Text>
        </VStack>
        <VStack alignItems="center">
          <Text fontSize="xl" fontWeight="bold" color="primary.500">
            12
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            Months
          </Text>
        </VStack>
      </HStack>

      {/* Menu Items */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space={0} py={2}>
          {profileMenuItems.map((item, index) => (
            <Box key={index}>
              <MenuItem item={item} />
              {index < profileMenuItems.length - 1 && <Divider ml={20} />}
            </Box>
          ))}
        </VStack>

        {/* Logout Button */}
        <Pressable onPress={logout} _pressed={{ bg: "coolGray.100" }}>
          <HStack space={4} py={4} px={6} alignItems="center">
            <Box p={2} rounded="full" bg="red.100">
              <Icon as={MaterialIcons} name="logout" size={6} color="red.600" />
            </Box>
            <Text fontSize="md" fontWeight="600" color="red.600">
              Logout
            </Text>
          </HStack>
        </Pressable>
      </ScrollView>
    </Box>
  );
}
