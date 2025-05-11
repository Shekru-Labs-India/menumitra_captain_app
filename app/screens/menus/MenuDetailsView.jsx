import React, { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  VStack,
  HStack,
  Text,
  Image,
  Icon,
  Badge,
  Spinner,
  useToast,
  Divider,
  Pressable,
  AlertDialog,
  Button,
  Center,
  Fab,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import { router } from "expo-router";
import { Dimensions } from "react-native";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import BottomNavigation from "../../components/BottomNavigation";

const screenWidth = Dimensions.get("window").width;

export default function MenuDetailsView() {
  const [menuDetails, setMenuDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ POS_show_menu_image: true });
  const toast = useToast();
  const { menuId } = useLocalSearchParams();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const cancelRef = React.useRef(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    fetchMenuDetails();
    loadSettings();
  }, [menuId]);

  const fetchMenuDetails = async () => {
    try {
      console.log("Fetching menu details for ID:", menuId);
      const outletId = await AsyncStorage.getItem("outlet_id");
      console.log("Using outlet ID:", outletId);

      if (!menuId) {
        console.error("Menu ID is undefined or null");
        toast.show({
          description: "Invalid menu ID",
          status: "error",
        });
        return;
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          menu_id: menuId,
        }),
      });
      console.log("Menu Details Response:", data);

      if (data.st === 1) {
        console.log("Menu details fetched successfully");
        setMenuDetails(data.data);
      } else {
        console.error("API returned error:", data.msg);
        throw new Error(data.msg || "Failed to fetch menu details");
      }
    } catch (error) {
      console.error("Fetch Menu Details Error:", error);
      toast.show({
        description: "Failed to load menu details",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem("app_settings");
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const userId = await AsyncStorage.getItem("user_id");

      if (!outletId) {
        throw new Error("Outlet ID not found");
      }

      if (!userId) {
        throw new Error("User ID not found");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/menu_delete`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          outlet_id: outletId,
          menu_id: menuId,
          user_id: userId
        }),
      });

      if (data.st === 1) {
        // Close dialog before navigation
        setIsDeleteDialogOpen(false);
        
        toast.show({
          description: "Menu deleted successfully",
          status: "success",
          duration: 2000,
          placement: "bottom"
        });
        
        // Use setTimeout to ensure the toast is visible before navigation
        setTimeout(() => {
          // Try both navigation methods to ensure one works
          try {
            router.replace({
              pathname: "/screens/menus/MenuListView",
              params: { refresh: Date.now().toString() }
            });
          } catch (navError) {
            console.error("Navigation error:", navError);
            // Fallback navigation method
            router.navigate("/screens/menus/MenuListView");
          }
        }, 500);
      } else {
        throw new Error(data.msg || "Failed to delete menu");
      }
    } catch (error) {
      console.error("Delete Menu Error:", error);
      toast.show({
        description: error.message || "Failed to delete menu",
        status: "error",
        duration: 3000,
        placement: "bottom"
      });
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: "/screens/menus/EditMenuView",
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

  if (loading) {
    return (
      <Box flex={1} bg="white" safeArea>
        <Header title="Menu Details" showBackButton />
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
        </Box>
      </Box>
    );
  }

  // Custom Header Component
  const CustomHeader = () => (
    <Box
      px={4}
      py={4}
      bg="white"
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      safeAreaTop
    >
      {/* Left: Back Button */}
      <Pressable onPress={() => router.back()}>
        <Icon
          as={MaterialIcons}
          name="arrow-back"
          size={6}
          color="coolGray.800"
        />
      </Pressable>

      {/* Center: Title */}
      <Text fontSize="xl" fontWeight="bold" flex={1} textAlign="center">
        Menu Details
      </Text>

      {/* Right: Delete Button */}
      <Pressable onPress={() => setIsDeleteDialogOpen(true)}>
        <Icon
          as={MaterialIcons}
          name="delete-outline"
          size={6}
          color="red.500"
        />
      </Pressable>
    </Box>
  );

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      <CustomHeader />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Only render images if POS_show_menu_image is true */}
        {settings.POS_show_menu_image && menuDetails?.images && Array.isArray(menuDetails.images) && menuDetails.images.length > 0 ? (
          <Box bg="white" w="full" h="200px">
            <VStack>
              {/* Main Image Scroll */}
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(
                    e.nativeEvent.contentOffset.x / screenWidth
                  );
                  setActiveImageIndex(newIndex);
                }}
              >
                {menuDetails.images.map((imageItem, index) => {
                  // Validate image URL - handle both string and object formats
                  const validImageUrl = typeof imageItem === 'string' ? imageItem : 
                                     imageItem?.uri || 
                                     imageItem?.url || 
                                     imageItem?.image || 
                                     null;
                  
                  // Skip invalid image URLs
                  if (!validImageUrl) return null;

                  return (
                    <Image
                      key={index}
                      source={{ uri: validImageUrl }}
                      alt={`${menuDetails.name || 'Menu'}-${index + 1}`}
                      w={screenWidth}
                      h="200px"
                      resizeMode="cover"
                      fallbackElement={
                        <Center w={screenWidth} h="200px" bg="coolGray.100">
                          <Icon
                            as={MaterialIcons}
                            name="image-not-supported"
                            size={12}
                            color="coolGray.400"
                          />
                        </Center>
                      }
                    />
                  );
                })}
              </ScrollView>

              {/* Image Indicators - Only show for valid images */}
              {menuDetails.images.filter(img => 
                typeof img === 'string' || img?.uri || img?.url || img?.image
              ).length > 1 && (
                <HStack
                  space={2}
                  justifyContent="center"
                  position="absolute"
                  bottom={2}
                  w="full"
                >
                  {menuDetails.images.map((img, index) => {
                    // Skip indicators for invalid images
                    if (!(typeof img === 'string' || img?.uri || img?.url || img?.image)) return null;
                    
                    return (
                      <Box
                        key={index}
                        w={2}
                        h={2}
                        rounded="full"
                        bg={
                          index === activeImageIndex
                            ? "white"
                            : "rgba(255,255,255,0.5)"
                        }
                      />
                    );
                  })}
                </HStack>
              )}

              {/* Image Counter Badge - Show count of valid images only */}
              <Badge
                position="absolute"
                top={2}
                right={2}
                bg="rgba(0,0,0,0.7)"
                rounded="lg"
                px={2}
                py={1}
                _text={{ color: "white" }}
              >
                {`${activeImageIndex + 1}/${menuDetails.images.filter(img => 
                  typeof img === 'string' || img?.uri || img?.url || img?.image
                ).length}`}
              </Badge>
            </VStack>
          </Box>
        ) : (
          <Box bg="coolGray.100" w="full" h="120px">
            <Center flex={1}>
              <Icon as={MaterialIcons} name="store" size={16} color="coolGray.300" />
              <Text color="coolGray.500" mt={2}>
                {settings.POS_show_menu_image ? "No images available" : "Images hidden by settings"}
              </Text>
            </Center>
          </Box>
        )}

        {/* Menu Details Card */}
        <Box bg="white" mt={4} mx={4} rounded="xl" shadow={2} overflow="hidden">
          <VStack space={4} p={4}>
            {/* Title and Badge */}
            <HStack justifyContent="space-between" alignItems="center">
              <VStack space={1}>
                <HStack alignItems="center" space={2}>
                  <Text fontSize="2xl" fontWeight="bold">
                    {menuDetails?.name}
                  </Text>
                  {menuDetails?.is_special && (
                    <Icon
                      as={MaterialIcons}
                      name="star"
                      size="md"
                      color="amber.400"
                    />
                  )}
                </HStack>
                <Text
                  fontSize="md"
                  color="coolGray.600"
                  textTransform="capitalize"
                >
                  {menuDetails?.category_name}
                </Text>
              </VStack>
              <VStack alignItems="flex-end" space={2}>
                <Badge
                  colorScheme={menuDetails?.food_type === "veg" ? "green" : "red"}
                  rounded="lg"
                  px={3}
                  py={1}
                  variant="subtle"
                >
                  {menuDetails?.food_type?.toUpperCase()}
                </Badge>
                {menuDetails?.is_special && (
                  <Badge
                    colorScheme="amber"
                    rounded="lg"
                    px={3}
                    py={1}
                    variant="subtle"
                    leftIcon={
                      <Icon
                        as={MaterialIcons}
                        name="star"
                        size="xs"
                        color="amber.600"
                        mr={1}
                      />
                    }
                  >
                    SPECIAL
                  </Badge>
                )}
              </VStack>
            </HStack>

            {/* Rating and Spicy Level */}
            <HStack space={6} alignItems="center">
              <HStack space={2} alignItems="center">
                <Icon
                  as={MaterialIcons}
                  name="star"
                  size="sm"
                  color="amber.400"
                />
                <Text fontSize="md" fontWeight="semibold">
                  {parseFloat(menuDetails?.rating).toFixed(1)}
                </Text>
              </HStack>
              {renderSpicyLevel(menuDetails?.spicy_index)}
            </HStack>

            <Divider />

            {/* Pricing */}
            <VStack space={3}>
              <Text fontSize="lg" fontWeight="bold" color="coolGray.700">
                Pricing
              </Text>
              <HStack justifyContent="space-between" alignItems="center">
                <VStack space={2}>
                  {menuDetails?.half_price > 0 && (
                    <Text fontSize="md" color="coolGray.600">
                      Half: ₹{menuDetails.half_price}
                    </Text>
                  )}
                  <Text fontSize="xl" fontWeight="bold" color="primary.600">
                    Full: ₹{menuDetails?.full_price}
                  </Text>
                </VStack>
                <HStack space={2} alignItems="center">
                  {menuDetails?.is_special && (
                    <Box
                      bg="amber.100"
                      px={3}
                      py={2}
                      rounded="lg"
                      flexDirection="row"
                      alignItems="center"
                    >
                      <Icon
                        as={MaterialIcons}
                        name="star"
                        size="sm"
                        color="amber.600"
                        mr={1}
                      />
                      <Text color="amber.600" fontWeight="medium">
                        Special Menu
                      </Text>
                    </Box>
                  )}
                  {menuDetails?.offer > 0 && (
                    <Badge colorScheme="red" variant="solid" rounded="lg">
                      {menuDetails.offer}% OFF
                    </Badge>
                  )}
                </HStack>
              </HStack>
            </VStack>

            <Divider />

            {/* Description */}
            {menuDetails.description && (
              <VStack space={2}>
                <Text fontSize="md" fontWeight="bold" color="coolGray.600">
                  Description
                </Text>
                <Text color="coolGray.600">{menuDetails.description}</Text>
              </VStack>
            )}

            {/* Ingredients */}
            {menuDetails.ingredients && (
              <VStack space={2}>
                <Text fontSize="md" fontWeight="bold" color="coolGray.600">
                  Ingredients
                </Text>
                <Text color="coolGray.600">{menuDetails.ingredients}</Text>
              </VStack>
            )}

            {/* Creation and Update Details */}
            <VStack space={4} mt={2}>
              {/* Creation Details */}
              <VStack
                space={2}
                borderBottomWidth={1}
                borderBottomColor="coolGray.200"
                pb={2}
              >
                <Text fontSize="md" fontWeight="bold" color="coolGray.700">
                  Creation Details
                </Text>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="person"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Created by: {menuDetails.created_by || "N/A"}
                  </Text>
                </HStack>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="event"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Created on: {menuDetails.created_on || "N/A"}
                  </Text>
                </HStack>
              </VStack>

              {/* Update Details */}
              <VStack space={2}>
                <Text fontSize="md" fontWeight="bold" color="coolGray.700">
                  Last Update Details
                </Text>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="person"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Updated by: {menuDetails.updated_by || "N/A"}
                  </Text>
                </HStack>
                <HStack space={2} alignItems="center">
                  <Icon
                    as={MaterialIcons}
                    name="update"
                    size={5}
                    color="coolGray.500"
                  />
                  <Text fontSize="sm" color="coolGray.600">
                    Updated on: {menuDetails.updated_on || "N/A"}
                  </Text>
                </HStack>
              </VStack>
            </VStack>
          </VStack>
        </Box>
      </ScrollView>

      {/* Edit FAB */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<Icon color="white" as={MaterialIcons} name="edit" size="sm" />}
        onPress={handleEdit}
        bottom={85}
        right={4}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Delete Menu</AlertDialog.Header>
          <AlertDialog.Body>
            Are you sure you want to delete this menu? This action cannot be
            undone.
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant="unstyled"
                colorScheme="coolGray"
                onPress={() => setIsDeleteDialogOpen(false)}
                ref={cancelRef}
              >
                Cancel
              </Button>
              <Button colorScheme="danger" onPress={handleDelete}>
                Delete
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </Box>
  );
}
