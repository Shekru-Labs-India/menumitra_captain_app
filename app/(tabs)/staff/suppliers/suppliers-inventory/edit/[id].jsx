import { useState, useEffect } from "react";
import {
  Box,
  ScrollView,
  Heading,
  VStack,
  IconButton,
  Button,
  useToast,
  FormControl,
  Input,
  Select,
  TextArea,
  HStack,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function EditInventoryScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const [formData, setFormData] = useState({
    supplier_id: "",
    name: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
    sr_no: "",
    in_or_out: "in",
    brand_name: "",
    tax: "",
    paymen_status: "",
    order_id: "",
  });

  useEffect(() => {
    Promise.all([fetchInventoryDetails(), fetchSuppliers()]).finally(() => {
      setInitialLoading(false);
    });
  }, [id]);

  const fetchSuppliers = async () => {
    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier/listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(restaurantId),
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1 && Array.isArray(data.data)) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchInventoryDetails = async () => {
    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      if (!restaurantId || !id) {
        throw new Error("Required data missing");
      }

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_inventory/view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplier_inventory_id: parseInt(id),
            restaurant_id: parseInt(restaurantId),
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1 && data.data) {
        setFormData(data.data);
      } else {
        throw new Error(data.msg || "Failed to fetch inventory details");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: error.message,
        status: "error",
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      if (!restaurantId) {
        throw new Error("Restaurant ID not found");
      }

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_inventory/update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            supplier_inventory_id: parseInt(id),
            restaurant_id: parseInt(restaurantId),
            supplier_id: parseInt(formData.supplier_id),
          }),
        }
      );

      const data = await response.json();
      console.log("Update Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Inventory updated successfully",
          status: "success",
        });
        router.back();
      } else {
        throw new Error(data.msg || "Failed to update inventory");
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.show({
        description: error.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header */}
      <Box px={4} py={3} bg="white" shadow={2}>
        <HStack alignItems="center" space={4}>
          <IconButton
            icon={<MaterialIcons name="arrow-back" size={24} color="black" />}
            onPress={() => router.back()}
          />
          <Heading size="lg">Edit Inventory Item</Heading>
        </HStack>
      </Box>

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          {/* Supplier Selection */}
          <FormControl isRequired>
            <FormControl.Label>Select Supplier</FormControl.Label>
            <Select
              selectedValue={formData.supplier_id?.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, supplier_id: value })
              }
            >
              {suppliers.map((supplier) => (
                <Select.Item
                  key={supplier.supplier_id}
                  label={supplier.name}
                  value={supplier.supplier_id.toString()}
                />
              ))}
            </Select>
          </FormControl>

          {/* Basic Information */}
          <FormControl isRequired>
            <FormControl.Label>Item Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(value) =>
                setFormData({ ...formData, name: value })
              }
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Description</FormControl.Label>
            <TextArea
              value={formData.description}
              onChangeText={(value) =>
                setFormData({ ...formData, description: value })
              }
              autoCompleteType={undefined}
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Category</FormControl.Label>
            <Select
              selectedValue={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <Select.Item label="Food" value="Food" />
              <Select.Item label="Beverage" value="Beverage" />
              <Select.Item label="Equipment" value="Equipment" />
              <Select.Item label="Other" value="Other" />
            </Select>
          </FormControl>

          {/* Quantity and Price */}
          <HStack space={4}>
            <FormControl flex={1} isRequired>
              <FormControl.Label>Price</FormControl.Label>
              <Input
                value={formData.price?.toString()}
                onChangeText={(value) =>
                  setFormData({ ...formData, price: value })
                }
                keyboardType="numeric"
              />
            </FormControl>

            <FormControl flex={1} isRequired>
              <FormControl.Label>Quantity</FormControl.Label>
              <Input
                value={formData.quantity?.toString()}
                onChangeText={(value) =>
                  setFormData({ ...formData, quantity: value })
                }
                keyboardType="numeric"
              />
            </FormControl>
          </HStack>

          {/* Additional Details */}
          <FormControl isRequired>
            <FormControl.Label>SR Number</FormControl.Label>
            <Input
              value={formData.sr_no}
              onChangeText={(value) =>
                setFormData({ ...formData, sr_no: value })
              }
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Brand Name</FormControl.Label>
            <Input
              value={formData.brand_name}
              onChangeText={(value) =>
                setFormData({ ...formData, brand_name: value })
              }
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Tax</FormControl.Label>
            <Input
              value={formData.tax}
              onChangeText={(value) => setFormData({ ...formData, tax: value })}
              placeholder="e.g., 18%"
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Payment Status</FormControl.Label>
            <Select
              selectedValue={formData.paymen_status}
              onValueChange={(value) =>
                setFormData({ ...formData, paymen_status: value })
              }
            >
              <Select.Item label="Paid" value="Paid" />
              <Select.Item label="Pending" value="Pending" />
              <Select.Item label="Partial" value="Partial" />
            </Select>
          </FormControl>

          <FormControl>
            <FormControl.Label>Order ID</FormControl.Label>
            <Input
              value={formData.order_id}
              onChangeText={(value) =>
                setFormData({ ...formData, order_id: value })
              }
            />
          </FormControl>

          {/* Submit Button */}
          <Button
            mt={4}
            colorScheme="blue"
            onPress={handleSubmit}
            isLoading={loading}
            isLoadingText="Updating Item"
          >
            Update Inventory Item
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
