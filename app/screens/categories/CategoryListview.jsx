import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Box,
  FlatList,
  HStack,
  VStack,
  Text,
  Image,
  Pressable,
  Icon,
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
import { fetchWithAuth } from "../../../utils/apiInterceptor";

export default function CategoryListView() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [updatingCategories, setUpdatingCategories] = useState({});
  const router = useRouter();
  const params = useLocalSearchParams();
  const toast = useToast();

  useFocusEffect(
    React.useCallback(() => {
      fetchCategories();
    }, [])
  );

  useEffect(() => {
    fetchCategories();
  }, [params.refresh]);

  useEffect(() => {
    filterCategories();
  }, [searchQuery, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const outletId = await AsyncStorage.getItem("outlet_id");

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_category_listview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
        }),
      });

      if (data.st === 1) {
        const validCategories = data.menucat_details.filter(
          (cat) =>
            cat && cat.menu_cat_id !== null && cat.category_name !== "all"
        );
        setCategories(validCategories);
        setFilteredCategories(validCategories);
      } else {
        throw new Error(data.msg || "Failed to fetch categories");
      }
    } catch (error) {
      console.error("Fetch Categories Error:", error);
      toast.show({
        description: "Failed to load categories",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    const filtered = categories.filter((category) =>
      category.category_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCategories(filtered);
  };

  const handleCategoryPress = (categoryId) => {
    router.push({
      pathname: "/screens/categories/CategoryDetailsView",
      params: { categoryId: categoryId },
    });
  };

  const handleAddCategory = () => {
    router.push({
      pathname: "/screens/categories/CreateCategoryView",
    });
  };

  const handleToggleStatus = async (categoryId, currentStatus) => {
    try {
      setUpdatingCategories(prev => ({
        ...prev,
        [categoryId]: true
      }));
      
      const outletId = await AsyncStorage.getItem("outlet_id");

      const response = await fetchWithAuth(`${getBaseUrl()}/update_active_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          type: "menu_category",
          id: categoryId.toString(),
          is_active: !currentStatus
        }),
      });

      if (response.st === 1) {
        setCategories(prevCategories => 
          prevCategories.map(category => 
            category.menu_cat_id === categoryId 
              ? { ...category, is_active: !currentStatus }
              : category
          )
        );
        
        toast.show({
          description: `Category ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
          status: "success",
        });
      } else {
        throw new Error(response.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Update Status Error:", error);
      toast.show({
        description: "Failed to update category status",
        status: "error",
      });
    } finally {
      setUpdatingCategories(prev => ({
        ...prev,
        [categoryId]: false
      }));
    }
  };

  const renderCategoryItem = ({ item }) => (
    <Pressable onPress={() => handleCategoryPress(item.menu_cat_id)} mb={3}>
      <Box bg="white" rounded="lg" shadow={1} overflow="hidden">
        <HStack space={3} p={3} alignItems="center">
          <Box>
            {item.image ? (
              <Image
                source={{
                  uri: item.image,
                }}
                alt={item.category_name}
                size="sm"
                w="70px"
                h="70px"
                rounded="md"
                resizeMode="cover"
                fallbackElement={
                  <Box
                    w="70px"
                    h="70px"
                    bg="gray.200"
                    rounded="md"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Icon
                      as={MaterialIcons}
                      name="category"
                      size={6}
                      color="gray.400"
                    />
                  </Box>
                }
              />
            ) : (
              <Box
                w="70px"
                h="70px"
                rounded="md"
                bg="gray.200"
                justifyContent="center"
                alignItems="center"
              >
                <Icon
                  as={MaterialIcons}
                  name="category"
                  size={6}
                  color="gray.400"
                />
              </Box>
            )}
          </Box>

          <VStack flex={1} space={1}>
            <Text fontSize="md" fontWeight="bold">
              {item.category_name}
            </Text>
            <HStack space={2} alignItems="center">
              <Icon
                as={MaterialIcons}
                name="restaurant-menu"
                size={4}
                color="gray.500"
              />
              <Text fontSize="sm" color="gray.500">
                {item.menu_count} {item.menu_count === 1 ? "Menu" : "Menus"}
              </Text>
            </HStack>
          </VStack>

          <Switch
            size="md"
            onToggle={() => {
              handleToggleStatus(item.menu_cat_id, item.is_active);
            }}
            isChecked={item.is_active}
            isDisabled={!!updatingCategories[item.menu_cat_id]}
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
      <Header title="Categories" showBackButton />

      {/* Search Bar */}
      <Box px={4} py={2} bg="white" shadow={1}>
        <Input
          placeholder="Search categories..."
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
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.menu_cat_id.toString()}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" mt={10}>
              <Text color="coolGray.400">No categories found</Text>
            </Box>
          }
        />
      )}

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<Icon color="white" as={MaterialIcons} name="add" size="md" />}
        onPress={handleAddCategory}
        position="absolute"
        bottom={100}
        right={6}
      />
    </Box>
  );
}
