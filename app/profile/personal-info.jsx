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
  ScrollView,
  Divider,
  Avatar,
} from "native-base";

export default function PersonalInfoScreen() {
  const router = useRouter();
  // Static user data (will be replaced with API data later)
  const [userData, setUserData] = useState({
    name: "Cafe HashTag",
    email: "cafe.hashtag@example.com",
    phone: "+91 9876543210",
    role: "Cafe Owner",
    joinedDate: "Jan 15, 2023",
    address: "123 Cafe Street, Food District, City - 400001",
  });

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
          My Profile
        </Heading>
        <IconButton
          icon={<MaterialIcons name="edit" size={24} color="blue" />}
          onPress={() => router.push("/profile/edit-profile")}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
      </HStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Avatar */}
        <Box alignItems="center" my={6}>
          <Avatar
            size="xl"
            source={{ uri: "https://via.placeholder.com/150" }}
            bg="blue.500"
          >
            {userData.name.charAt(0)}
          </Avatar>
          <Text mt={2} fontSize="lg" fontWeight="bold">
            {userData.name}
          </Text>
          <Text fontSize="sm" color="coolGray.500">
            {userData.role}
          </Text>
        </Box>

        {/* Profile Information */}
        <Box bg="white" rounded="lg" shadow={1} mx={4} mb={4}>
          <VStack space={4} p={4}>
            <Heading size="sm" mb={2}>
              Personal Information
            </Heading>
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="email" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Email
                </Text>
                <Text>{userData.email}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="phone" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Phone
                </Text>
                <Text>{userData.phone}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="location-on" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Address
                </Text>
                <Text>{userData.address}</Text>
              </VStack>
            </HStack>
            
            <Divider />
            
            <HStack space={3} alignItems="center">
              <Icon as={MaterialIcons} name="date-range" size={5} color="blue.500" />
              <VStack>
                <Text fontSize="xs" color="coolGray.500">
                  Member Since
                </Text>
                <Text>{userData.joinedDate}</Text>
              </VStack>
            </HStack>
          </VStack>
        </Box>
      </ScrollView>
    </Box>
  );
} 