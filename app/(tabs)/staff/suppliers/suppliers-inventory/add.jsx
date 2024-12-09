import { useState } from "react";
import {
  Box,
  ScrollView,
  Heading,
  VStack,
  IconButton,
  Button,
  FormControl,
  Input,
  Select,
  TextArea,
  useToast,
  HStack,
  Text,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function AddInventoryScreen() {
  const { supplierId, supplierName } = useLocalSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: supplierId,
    name: "",
    description: "",
    category: "",
    price: "",
    quantity: "",
    sr_no: "",
    in_or_out: "in",
    brand_name: "",
    tax: "",
    paymen_status: "Pending",
    order_id: "",
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.price) newErrors.price = "Price is required";
    if (!formData.quantity) newErrors.quantity = "Quantity is required";
    if (!formData.sr_no) newErrors.sr_no = "Serial number is required";
    if (!formData.brand_name) newErrors.brand_name = "Brand name is required";
    if (!formData.tax) newErrors.tax = "Tax is required";
    if (!formData.order_id) newErrors.order_id = "Order ID is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.show({
        description: "Please fill all required fields",
        status: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_inventory/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(restaurantId),
            ...formData,
            supplier_id: parseInt(formData.supplier_id),
            price: formData.price.toString(),
            quantity: formData.quantity.toString(),
          }),
        }
      );

      const data = await response.json();

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Inventory created successfully",
          status: "success",
        });
        router.back({
          params: { shouldRefresh: true },
        });
      } else {
        throw new Error(data.msg || "Failed to create inventory");
      }
    } catch (error) {
      console.error("Submit Error:", error);
      toast.show({
        description: error.message || "Failed to create inventory",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      <Box px={4} py={3} bg="white" shadow={2}>
        <HStack alignItems="center" space={4}>
          <IconButton
            icon={<MaterialIcons name="arrow-back" size={24} color="black" />}
            onPress={() => router.back()}
          />
          <Heading size="lg">Add Inventory</Heading>
        </HStack>
      </Box>

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          <FormControl isRequired isInvalid={"name" in errors}>
            <FormControl.Label>Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(value) =>
                setFormData({ ...formData, name: value })
              }
              placeholder={
                supplierName ? `${supplierName}'s Item` : "Enter item name"
              }
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
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

          <FormControl isRequired isInvalid={"category" in errors}>
            <FormControl.Label>Category</FormControl.Label>
            <Input
              value={formData.category}
              onChangeText={(value) =>
                setFormData({ ...formData, category: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.category}
            </FormControl.ErrorMessage>
          </FormControl>

          <HStack space={4}>
            <FormControl flex={1} isRequired isInvalid={"price" in errors}>
              <FormControl.Label>Price</FormControl.Label>
              <Input
                keyboardType="numeric"
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

          <FormControl isRequired isInvalid={"sr_no" in errors}>
            <FormControl.Label>Serial Number</FormControl.Label>
            <Input
              value={formData.sr_no}
              onChangeText={(value) =>
                setFormData({ ...formData, sr_no: value })
              }
            />
            <FormControl.ErrorMessage>{errors.sr_no}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>In/Out Status</FormControl.Label>
            <Select
              selectedValue={formData.in_or_out}
              onValueChange={(value) =>
                setFormData({ ...formData, in_or_out: value })
              }
            >
              <Select.Item label="In" value="in" />
              <Select.Item label="Out" value="out" />
            </Select>
          </FormControl>

          <FormControl isRequired isInvalid={"brand_name" in errors}>
            <FormControl.Label>Brand Name</FormControl.Label>
            <Input
              value={formData.brand_name}
              onChangeText={(value) =>
                setFormData({ ...formData, brand_name: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.brand_name}
            </FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"tax" in errors}>
            <FormControl.Label>Tax</FormControl.Label>
            <Input
              value={formData.tax}
              onChangeText={(value) => setFormData({ ...formData, tax: value })}
              placeholder="e.g., 18%"
            />
            <FormControl.ErrorMessage>{errors.tax}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Payment Status</FormControl.Label>
            <Select
              selectedValue={formData.paymen_status}
              onValueChange={(value) =>
                setFormData({ ...formData, paymen_status: value })
              }
            >
              <Select.Item label="Pending" value="Pending" />
              <Select.Item label="Paid" value="Paid" />
            </Select>
          </FormControl>

          <FormControl isRequired isInvalid={"order_id" in errors}>
            <FormControl.Label>Order ID</FormControl.Label>
            <Input
              value={formData.order_id}
              onChangeText={(value) =>
                setFormData({ ...formData, order_id: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.order_id}
            </FormControl.ErrorMessage>
          </FormControl>

          <Button
            mt={4}
            colorScheme="blue"
            onPress={handleSubmit}
            isLoading={loading}
            isLoadingText="Creating"
          >
            Create Inventory
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
