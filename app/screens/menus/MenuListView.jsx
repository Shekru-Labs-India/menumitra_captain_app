import React, { useState, useEffect } from "react";
import {
  Box,
  FlatList,
  HStack,
  VStack,
  Text,
  Image,
  Pressable,
  Icon,
  Badge,
  Spinner,
  useToast,
  Input,
  IconButton,
  Fab,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";

export default function MenuListView() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMenus, setFilteredMenus] = useState([]);
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    filterMenus();
  }, [searchQuery, menus]);

  useEffect(() => {
    if (params.refresh) {
      fetchMenus();
    }
  }, [params.refresh]);

  const fetchMenus = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(
        "https://men4u.xyz/common_api/menu_listview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            outlet_id: outletId,
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        setMenus(data.lists);
      } else {
        throw new Error(data.msg || "Failed to fetch menus");
      }
    } catch (error) {
      console.error("Fetch Menus Error:", error);
      toast.show({
        description: "Failed to load menus",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMenus = () => {
    const filtered = menus.filter(
      (menu) =>
        menu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menu.category_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMenus(filtered);
  };

  const handleMenuPress = (menuId) => {
    console.log("Navigating to menu details:", menuId);
    router.push({
      pathname: "/screens/menus/MenuDetailsView",
      params: { menuId: menuId },
    });
  };

  const renderSpicyLevel = (level) => {
    const spicyLevel = parseInt(level);
    return (
      <HStack space={1}>
        {[...Array(5)].map((_, index) => (
          <Icon
            key={index}
            as={MaterialIcons}
            name="whatshot"
            size="xs"
            color={index < spicyLevel ? "red.500" : "gray.300"}
          />
        ))}
      </HStack>
    );
  };

  const renderRating = (rating) => {
    const ratingValue = parseFloat(rating);
    return (
      <HStack space={1} alignItems="center">
        <Icon as={MaterialIcons} name="star" size="sm" color="amber.400" />
        <Text fontSize="sm" color="coolGray.600">
          {ratingValue.toFixed(1)}
        </Text>
      </HStack>
    );
  };

  const renderMenuItem = ({ item }) => (
    <Pressable onPress={() => handleMenuPress(item.menu_id)} mb={3}>
      <Box bg="white" rounded="lg" shadow={1} overflow="hidden">
        <HStack space={3} p={3} alignItems="center">
          <Box>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                alt={item.name}
                size="sm"
                w="70px"
                h="70px"
                rounded="md"
              />
            ) : (
              <Box
                w="70px"
                h="70px"
                rounded="md"
                bg="coolGray.100"
                justifyContent="center"
                alignItems="center"
              >
                <Icon
                  as={MaterialIcons}
                  name="restaurant"
                  size={5}
                  color="coolGray.400"
                />
              </Box>
            )}
          </Box>

          <VStack flex={1} space={1}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="md" fontWeight="bold" maxW="70%">
                {item.name}
              </Text>
              <Badge
                colorScheme={item.food_type === "veg" ? "green" : "red"}
                variant="subtle"
                rounded="sm"
                px={2}
                py={0.5}
              >
                {item.food_type.toUpperCase()}
              </Badge>
            </HStack>

            <Text fontSize="sm" color="coolGray.600" textTransform="capitalize">
              {item.category_name}
            </Text>

            <HStack space={4} alignItems="center">
              {renderSpicyLevel(item.spicy_index)}
              {renderRating(item.rating)}
            </HStack>

            <HStack justifyContent="space-between" alignItems="center" mt={1}>
              {item.half_price > 0 && (
                <Text fontSize="sm" color="coolGray.600">
                  Half: ₹{item.half_price}
                </Text>
              )}
              <Text fontSize="md" fontWeight="bold" color="primary.600">
                Full: ₹{item.full_price}
              </Text>
            </HStack>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <Header title="Menu List" showBackButton />

      {/* Search Bar */}
      <Box px={4} py={2} bg="white" shadow={1}>
        <Input
          placeholder="Search menus..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          bg="coolGray.100"
          borderRadius="lg"
          py={2}
          px={4}
          fontSize="md"
          InputLeftElement={
            <Icon
              as={MaterialIcons}
              name="search"
              size={5}
              ml={2}
              color="gray.400"
            />
          }
          InputRightElement={
            searchQuery ? (
              <IconButton
                icon={
                  <Icon
                    as={MaterialIcons}
                    name="close"
                    size={5}
                    color="gray.400"
                  />
                }
                onPress={() => setSearchQuery("")}
              />
            ) : null
          }
        />
      </Box>

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      ) : (
        <FlatList
          data={filteredMenus}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.menu_id.toString()}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
              <Text color="coolGray.400">No menu items found</Text>
            </Box>
          }
        />
      )}

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<Icon color="white" as={MaterialIcons} name="add" size="md" />}
        onPress={() => router.push("/screens/menus/CreateMenuView")}
        position="absolute"
        bottom={100}
        right={6}
      />
    </Box>
  );
}
