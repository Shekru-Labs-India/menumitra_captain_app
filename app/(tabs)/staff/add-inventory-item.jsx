import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Text,
  ScrollView,
  HStack,
  Input,
  Select,
  Button,
  FormControl,
  TextArea,
  useToast,
  Spinner,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function AddInventoryItemScreen() {
  const router = useRouter();
  const toast = useToast();
  const [restaurantId, setRestaurantId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    supplierId: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
    serialNo: "",
    status: "in",
    brandName: "",
    tax: "",
    paymentStatus: "pending",
    orderId: "",
    type: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    getStoredData();
  }, []);

  const getStoredData = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (storedRestaurantId) {
        setRestaurantId(parseInt(storedRestaurantId));
      } else {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error getting stored data:", error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.supplierId) newErrors.supplierId = "Supplier ID is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.serialNo) newErrors.serialNo = "Serial No. is required";
    if (!formData.type) newErrors.type = "Type is required";

    // Price validation
    if (!formData.price) {
      newErrors.price = "Price is required";
    } else if (isNaN(formData.price) || Number(formData.price) <= 0) {
      newErrors.price = "Please enter a valid price";
    }

    // Quantity validation
    if (!formData.quantity) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(formData.quantity) || Number(formData.quantity) < 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }

    // Tax validation
    if (
      formData.tax &&
      (isNaN(formData.tax) ||
        Number(formData.tax) < 0 ||
        Number(formData.tax) > 100)
    ) {
      newErrors.tax = "Please enter a valid tax percentage (0-100)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/captain_manage/inventory_create`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              restaurant_id: restaurantId,
              name: formData.name,
              quantity: parseInt(formData.quantity),
              type: formData.type || formData.category,
            }),
          }
        );

        const data = await response.json();
        console.log("Create Inventory Response:", data);

        if (data.st === 1) {
          toast.show({
            description: "Inventory item added successfully",
            status: "success",
          });
          router.push({
            pathname: "/(tabs)/staff/inventory-items",
            params: { refresh: Date.now() },
          });
        } else {
          toast.show({
            description: data.msg || "Failed to add inventory item",
            status: "error",
          });
        }
      } catch (error) {
        console.error("Create Inventory Error:", error);
        toast.show({
          description: "Failed to add inventory item",
          status: "error",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const typeField = (
    <FormControl isRequired isInvalid={"type" in errors}>
      <FormControl.Label>Type</FormControl.Label>
      <Select
        selectedValue={formData.type}
        onValueChange={(value) => setFormData({ ...formData, type: value })}
        placeholder="Select type"
      >
        <Select.Item label="Furniture" value="furniture" />
        <Select.Item label="Crockery" value="crockery" />
        <Select.Item label="Cutlery" value="cutlery" />
      </Select>
      <FormControl.ErrorMessage>{errors.type}</FormControl.ErrorMessage>
    </FormControl>
  );

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      <Box px={4} py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "gray.100" }}
            position="absolute"
            left={0}
            zIndex={1}
          />
          <Heading size="md" flex={1} textAlign="center">
            Add Inventory Item
          </Heading>
        </HStack>
      </Box>

      <ScrollView px={4} showsVerticalScrollIndicator={false}>
        <VStack space={4} mt={4} mb={6}>
          {/* Basic Information */}
          <FormControl isRequired isInvalid={"name" in errors}>
            <FormControl.Label>Item Name</FormControl.Label>
            <Input
              placeholder="Enter item name"
              value={formData.name}
              onChangeText={(value) =>
                setFormData({ ...formData, name: value })
              }
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"supplierId" in errors}>
            <FormControl.Label>Supplier ID</FormControl.Label>
            <Input
              placeholder="Enter supplier ID"
              value={formData.supplierId}
              onChangeText={(value) =>
                setFormData({ ...formData, supplierId: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.supplierId}
            </FormControl.ErrorMessage>
          </FormControl>

          <FormControl>
            <FormControl.Label>Description</FormControl.Label>
            <TextArea
              h={20}
              placeholder="Enter item description"
              value={formData.description}
              onChangeText={(value) =>
                setFormData({ ...formData, description: value })
              }
            />
          </FormControl>

          <FormControl isRequired isInvalid={"category" in errors}>
            <FormControl.Label>Category</FormControl.Label>
            <Input
              placeholder="Enter category"
              value={formData.category}
              onChangeText={(value) =>
                setFormData({ ...formData, category: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.category}
            </FormControl.ErrorMessage>
          </FormControl>

          {typeField}

          {/* Price and Quantity */}
          <HStack space={4}>
            <FormControl flex={1} isRequired isInvalid={"price" in errors}>
              <FormControl.Label>Price</FormControl.Label>
              <Input
                keyboardType="numeric"
                placeholder="Enter price"
                value={formData.price}
                onChangeText={(value) =>
                  setFormData({ ...formData, price: value })
                }
              />
              <FormControl.ErrorMessage>
                {errors.price}
              </FormControl.ErrorMessage>
            </FormControl>

            <FormControl flex={1} isRequired isInvalid={"quantity" in errors}>
              <FormControl.Label>Quantity</FormControl.Label>
              <Input
                keyboardType="numeric"
                placeholder="Enter quantity"
                value={formData.quantity}
                onChangeText={(value) =>
                  setFormData({ ...formData, quantity: value })
                }
              />
              <FormControl.ErrorMessage>
                {errors.quantity}
              </FormControl.ErrorMessage>
            </FormControl>
          </HStack>

          {/* Serial Number and Brand */}
          <HStack space={4}>
            <FormControl flex={1} isRequired isInvalid={"serialNo" in errors}>
              <FormControl.Label>Serial No.</FormControl.Label>
              <Input
                placeholder="Enter serial number"
                value={formData.serialNo}
                onChangeText={(value) =>
                  setFormData({ ...formData, serialNo: value })
                }
              />
              <FormControl.ErrorMessage>
                {errors.serialNo}
              </FormControl.ErrorMessage>
            </FormControl>

            <FormControl flex={1}>
              <FormControl.Label>Brand Name</FormControl.Label>
              <Input
                placeholder="Enter brand name"
                value={formData.brandName}
                onChangeText={(value) =>
                  setFormData({ ...formData, brandName: value })
                }
              />
            </FormControl>
          </HStack>

          {/* Status and Payment Status */}
          <HStack space={4}>
            <FormControl flex={1}>
              <FormControl.Label>Status</FormControl.Label>
              <Select
                selectedValue={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <Select.Item label="In" value="in" />
                <Select.Item label="Out" value="out" />
              </Select>
            </FormControl>

            <FormControl flex={1}>
              <FormControl.Label>Payment Status</FormControl.Label>
              <Select
                selectedValue={formData.paymentStatus}
                onValueChange={(value) =>
                  setFormData({ ...formData, paymentStatus: value })
                }
              >
                <Select.Item label="Pending" value="pending" />
                <Select.Item label="Paid" value="paid" />
              </Select>
            </FormControl>
          </HStack>

          {/* Tax and Order ID */}
          <HStack space={4}>
            <FormControl flex={1} isInvalid={"tax" in errors}>
              <FormControl.Label>Tax (%)</FormControl.Label>
              <Input
                keyboardType="numeric"
                placeholder="Enter tax percentage"
                value={formData.tax}
                onChangeText={(value) =>
                  setFormData({ ...formData, tax: value })
                }
              />
              <FormControl.ErrorMessage>{errors.tax}</FormControl.ErrorMessage>
            </FormControl>

            <FormControl flex={1}>
              <FormControl.Label>Order ID</FormControl.Label>
              <Input
                placeholder="Enter order ID"
                value={formData.orderId}
                onChangeText={(value) =>
                  setFormData({ ...formData, orderId: value })
                }
              />
            </FormControl>
          </HStack>

          <Button
            mt={4}
            colorScheme="blue"
            onPress={handleSubmit}
            isLoading={isLoading}
            isLoadingText="Adding Item..."
            _text={{ fontSize: "md", fontWeight: "semibold" }}
          >
            Add Item
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
