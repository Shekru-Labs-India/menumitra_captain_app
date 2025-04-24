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
  Switch,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { useFocusEffect } from "@react-navigation/native";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

export default function MenuListView() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMenus, setFilteredMenus] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();

  useFocusEffect(
    React.useCallback(() => {
      fetchMenus();
    }, [params?.refresh])
  );

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
      setLoading(true);
      const outletId = await AsyncStorage.getItem("outlet_id");

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
        }),
      });

      if (data.st === 1) {
        setMenus(data.lists);
        setFilteredMenus(data.lists);
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
    if (!searchQuery.trim()) {
      setFilteredMenus(menus);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = menus.filter(menu => 
      menu.name.toLowerCase().includes(query) ||
      menu.category_name.toLowerCase().includes(query)
    );

    // Sort the filtered results based on priority
    filtered.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      
      // Priority 1: Exact match at the start of the name
      if (nameA.startsWith(query) && !nameB.startsWith(query)) return -1;
      if (!nameA.startsWith(query) && nameB.startsWith(query)) return 1;
      
      // Priority 2: Partial match in the name
      const nameMatchA = nameA.includes(query);
      const nameMatchB = nameB.includes(query);
      if (nameMatchA && !nameMatchB) return -1;
      if (!nameMatchA && nameMatchB) return 1;
      
      // Priority 3: Category match (only if no name match)
      if (!nameMatchA && !nameMatchB) {
        const catA = a.category_name.toLowerCase();
        const catB = b.category_name.toLowerCase();
        if (catA.includes(query) && !catB.includes(query)) return -1;
        if (!catA.includes(query) && catB.includes(query)) return 1;
      }
      
      return 0;
    });

    setFilteredMenus(filtered);
  };

  const handleMenuPress = (menuId) => {
    console.log("Navigating to menu details:", menuId);
    try {
      router.push({
        pathname: "/screens/menus/MenuDetailsView",
        params: { menuId: menuId.toString() },
      });
    } catch (error) {
      console.error("Navigation error:", error);
      toast.show({
        description: "Error navigating to menu details",
        status: "error",
      });
    }
  };

  const handleToggleStatus = async (menuId, currentStatus) => {
    try {
      setUpdatingStatus(true);
      const outletId = await AsyncStorage.getItem("outlet_id");

      const response = await fetchWithAuth(`${getBaseUrl()}/update_active_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          type: "menu",
          id: menuId.toString(),
          is_active: !currentStatus
        }),
      });

      if (response.st === 1) {
        // Update the local state
        setMenus(prevMenus => 
          prevMenus.map(menu => 
            menu.menu_id === menuId 
              ? { ...menu, is_active: !currentStatus }
              : menu
          )
        );
        
        toast.show({
          description: `Menu ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
          status: "success",
        });
      } else {
        throw new Error(response.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Update Status Error:", error);
      toast.show({
        description: "Failed to update menu status",
        status: "error",
      });
    } finally {
      setUpdatingStatus(false);
    }
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
    if (ratingValue === 0) return null;
    
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
            <Text fontSize="md" fontWeight="bold">
              {item.name}
            </Text>

            <Text fontSize="sm" color="coolGray.600" textTransform="capitalize">
              {item.category_name}
            </Text>

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

          <Switch
            size="md"
            onToggle={() => {
              handleToggleStatus(item.menu_id, item.is_active);
            }}
            isChecked={item.is_active}
            isDisabled={updatingStatus}
            colorScheme="primary"
            _light={{
              onTrackColor: "primary.500",
              onThumbColor: "white",
              offTrackColor: "coolGray.200",
              offThumbColor: "coolGray.400",
            }}
          />
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
