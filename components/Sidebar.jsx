import {
  Box,
  VStack,
  Pressable,
  HStack,
  Icon,
  Text,
  IconButton,
  Divider,
} from "native-base";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Sidebar({ isOpen, onClose }) {
  const router = useRouter();

  const menuItems = [
    {
      title: "Home",
      icon: (
        <Icon
          as={MaterialCommunityIcons}
          name="home-variant-outline"
          size={6}
          color="coolGray.600"
        />
      ),
      onPress: () => {
        router.push("/(tabs)");
        onClose();
      },
    },
    {
      title: "Staff",
      icon: (
        <Icon
          as={MaterialCommunityIcons}
          name="account-group-outline"
          size={6}
          color="coolGray.600"
        />
      ),
      onPress: () => {
        router.push("/(tabs)/staff");
        onClose();
      },
    },
    {
      title: "Attendance",
      icon: (
        <Icon
          as={MaterialCommunityIcons}
          name="calendar-clock-outline"
          size={6}
          color="coolGray.600"
        />
      ),
      onPress: () => {
        router.push("/attendance");
        onClose();
      },
    },
    {
      title: "Inventory",
      icon: (
        <Icon as={Ionicons} name="cube-outline" size={6} color="coolGray.600" />
      ),
      onPress: () => {
        router.push("/staff/inventory");
        onClose();
      },
    },
    {
      title: "Inventory Report",
      icon: (
        <Icon
          as={MaterialCommunityIcons}
          name="file-document-outline"
          size={6}
          color="coolGray.600"
        />
      ),
      onPress: () => {
        router.push("/inventory-report");
        onClose();
      },
    },
    {
      title: "Order Report",
      icon: (
        <Icon
          as={MaterialCommunityIcons}
          name="clipboard-text-outline"
          size={6}
          color="coolGray.600"
        />
      ),
      onPress: () => {
        router.push("/order-report");
        onClose();
      },
    },
  ];

  if (!isOpen) return null;

  return (
    <Box
      position="absolute"
      top={0}
      right={0}
      bottom={0}
      w="300"
      bg="white"
      shadow={4}
    >
      {/* Header */}
      <HStack
        px={4}
        py={3}
        justifyContent="flex-end"
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <IconButton
          icon={
            <Icon
              as={MaterialCommunityIcons}
              name="close"
              size={6}
              color="coolGray.600"
            />
          }
          onPress={onClose}
        />
      </HStack>

      {/* Menu Items */}
      <VStack space={1} py={2}>
        {menuItems.map((item, index) => (
          <Pressable
            key={index}
            px={5}
            py={3}
            onPress={item.onPress}
            _pressed={{ bg: "coolGray.100" }}
          >
            <HStack space={3} alignItems="center">
              {item.icon}
              <Text fontSize="md" color="coolGray.800">
                {item.title}
              </Text>
            </HStack>
          </Pressable>
        ))}
      </VStack>

      {/* Logout Button */}
      <Pressable
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        py={4}
        px={5}
        borderTopWidth={1}
        borderTopColor="coolGray.200"
        onPress={() => {
          router.replace("/login");
          onClose();
        }}
        _pressed={{ bg: "coolGray.100" }}
      >
        <HStack space={3} alignItems="center">
          <Icon
            as={MaterialCommunityIcons}
            name="logout-variant"
            size={6}
            color="red.500"
          />
          <Text fontSize="md" color="red.500">
            Logout
          </Text>
        </HStack>
      </Pressable>
    </Box>
  );
}
