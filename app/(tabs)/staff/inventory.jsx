import { useState } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  FlatList,
  HStack,
  Avatar,
  Fab,
  Pressable,
  AlertDialog,
  Button,
  Input,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import Header from "../../components/Header";

export default function InventoryScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([
    {
      id: "1",
      name: "Suppliers",
      icon: "people",
      description: "Manage all suppliers",
      route: "/(tabs)/staff/suppliers",
    },
    {
      id: "2",
      name: "Inventory",
      icon: "inventory",
      description: "Manage inventory items",
      route: "/(tabs)/staff/inventory-items",
    },
    // Add more categories if needed
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const handleAddCategory = () => {
    if (!newCategoryName) {
      return; // Do not show any alert, just return if the category name is empty
    }

    const newCategory = {
      id: (categories.length + 1).toString(),
      name: newCategoryName,
      icon: "category", // You can change this to any icon you want
      description: newCategoryDescription,
      route: "/(tabs)/staff/inventory-items", // Adjust the route as needed
    };
    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setIsDialogOpen(false);
  };

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      <Header title="Inventory" onBackPress={() => router.back()} />

      <FlatList
        data={categories}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(item.route)}>
            <Box
              bg="white"
              rounded="lg"
              shadow={1}
              mb={3}
              mx={4}
              p={4}
              borderWidth={1}
              borderColor="coolGray.200"
            >
              <HStack space={3} alignItems="center">
                <Avatar size="md" bg="cyan.500">
                  <MaterialIcons name={item.icon} size={24} color="white" />
                </Avatar>
                <VStack flex={1}>
                  <Text fontSize="lg" fontWeight="bold">
                    {item.name}
                  </Text>
                  <Text fontSize="sm" color="coolGray.600">
                    {item.description}
                  </Text>
                </VStack>
                <MaterialIcons
                  name="arrow-forward-ios"
                  size={20}
                  color="coolGray.400"
                />
              </HStack>
            </Box>
          </Pressable>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      {/* Add Category FAB */}
      <Fab
        renderInPortal={false}
        shadow={3}
        size="sm"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => setIsDialogOpen(true)}
        bg="green.500"
        position="absolute"
        bottom={10}
        right={4}
      />

      {/* Add Category Dialog */}
      <AlertDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        closeOnOverlayClick={true}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>Add Inventory Category</AlertDialog.Header>
          <AlertDialog.Body>
            <VStack space={4}>
              <VStack>
                <Text fontWeight="bold">
                  Category Name <Text color="red.500">*</Text>
                </Text>
                <Input
                  placeholder="Category Name"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
              </VStack>
              <VStack>
                <Text fontWeight="bold">Category Description</Text>
                <Input
                  placeholder="Category Description"
                  value={newCategoryDescription}
                  onChangeText={setNewCategoryDescription}
                />
              </VStack>
            </VStack>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              variant="outline"
              colorScheme="coolGray"
              onPress={() => setIsDialogOpen(false)}
              flex={1}
              size="xs" // Make the Cancel button smaller
              _text={{ fontSize: "xs" }} // Adjust text size for the button
            >
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onPress={handleAddCategory}
              flex={1}
              size="xs"
              _text={{ fontSize: "xs" }}
            >
              Add Category
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Box>
  );
}
