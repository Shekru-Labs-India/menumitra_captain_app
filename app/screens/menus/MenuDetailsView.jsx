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

export default function MenuDetailsView() {
  const [menuDetails, setMenuDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { menuId } = useLocalSearchParams();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const cancelRef = React.useRef(null);

  useEffect(() => {
    fetchMenuDetails();
  }, [menuId]);

  const fetchMenuDetails = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch("https://men4u.xyz/common_api/menu_view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: outletId,
          menu_id: menuId,
        }),
      });

      const data = await response.json();
      console.log("Menu Details:", data);

      if (data.st === 1) {
        setMenuDetails(data.data);
      } else {
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

  const handleDelete = async () => {
    try {
      const outletId = await AsyncStorage.getItem("outlet_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch("https://men4u.xyz/common_api/menu_delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outlet_id: outletId,
          menu_id: menuId,
        }),
      });

      const data = await response.json();
      if (data.st === 1) {
        toast.show({
          description: "Menu deleted successfully",
          status: "success",
        });
        router.back();
      } else {
        throw new Error(data.msg || "Failed to delete menu");
      }
    } catch (error) {
      console.error("Delete Menu Error:", error);
      toast.show({
        description: "Failed to delete menu",
        status: "error",
      });
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
      pt={12}
      pb={3}
      bg="white"
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
    >
      <HStack space={3} alignItems="center">
        <Pressable onPress={() => router.back()}>
          <Icon
            as={MaterialIcons}
            name="arrow-back"
            size={6}
            color="coolGray.800"
          />
        </Pressable>
        <Text fontSize="xl" textAlign="center" fontWeight="bold">
          Menu Details
        </Text>
      </HStack>
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
        {/* Menu Image or Placeholder */}
        <Box bg="white" w="full" h="200px">
          {menuDetails?.images?.length > 0 ? (
            <Image
              source={{ uri: menuDetails.images[0] }}
              alt={menuDetails.name}
              w="full"
              h="full"
              resizeMode="cover"
            />
          ) : (
            <Center flex={1} bg="coolGray.100">
              <Icon
                as={MaterialIcons}
                name="restaurant"
                size={16}
                color="coolGray.300"
              />
            </Center>
          )}
        </Box>

        {/* Menu Details Card */}
        <Box bg="white" mt={4} mx={4} rounded="xl" shadow={2} overflow="hidden">
          <VStack space={4} p={4}>
            {/* Title and Badge */}
            <HStack justifyContent="space-between" alignItems="center">
              <VStack space={1}>
                <Text fontSize="2xl" fontWeight="bold">
                  {menuDetails?.name}
                </Text>
                <Text
                  fontSize="md"
                  color="coolGray.600"
                  textTransform="capitalize"
                >
                  {menuDetails?.category_name}
                </Text>
              </VStack>
              <Badge
                colorScheme={menuDetails?.food_type === "veg" ? "green" : "red"}
                rounded="lg"
                px={3}
                py={1}
                variant="subtle"
              >
                {menuDetails?.food_type?.toUpperCase()}
              </Badge>
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
                {menuDetails?.offer > 0 && (
                  <Badge colorScheme="red" variant="solid" rounded="lg">
                    {menuDetails.offer}% OFF
                  </Badge>
                )}
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
        bottom={4}
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
    </Box>
  );
}
