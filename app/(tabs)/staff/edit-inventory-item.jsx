import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  ScrollView,
  HStack,
  FormControl,
  Input,
  Select,
  TextArea,
  Button,
  useToast,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function EditInventoryItemScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams();
  const itemId = params?.itemId;
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);

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
    console.log("Received params:", params); // Debug log
    console.log("Received itemId:", itemId); // Debug log
    if (!itemId) {
      toast.show({
        description: "No item ID provided",
        status: "error",
      });
      router.back();
      return;
    }
    getStoredData();
  }, [itemId]);

  const getStoredData = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (storedRestaurantId) {
        console.log("Restaurant ID:", storedRestaurantId); // Debug log
        setRestaurantId(parseInt(storedRestaurantId));
        await fetchInventoryDetails(
          parseInt(storedRestaurantId),
          parseInt(itemId)
        );
      } else {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error getting stored data:", error);
      setLoading(false);
    }
  };

  const fetchInventoryDetails = async (restId, invId) => {
    try {
      console.log("Fetching with params:", {
        restaurant_id: restId.toString(),
        inventory_id: parseInt(invId),
      });

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/inventory_view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restId.toString(),
            inventory_id: parseInt(invId),
          }),
        }
      );

      const data = await response.json();
      console.log("API Response:", data);

      if (data.st === 1 && data.data) {
        setFormData((prevData) => ({
          ...prevData,
          name: data.data.name || "",
          category: data.data.type || "",
          quantity: data.data.quantity?.toString() || "0",
          type: data.data.type || "",
          // Keep other fields with their default values
          supplierId: prevData.supplierId,
          description: prevData.description,
          price: prevData.price,
          serialNo: prevData.serialNo,
          status: prevData.status,
          brandName: prevData.brandName,
          tax: prevData.tax,
          paymentStatus: prevData.paymentStatus,
          orderId: prevData.orderId,
        }));

        toast.show({
          description: "Item details loaded successfully",
          status: "success",
        });
      } else {
        throw new Error(data.msg || "Failed to fetch item details");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: error.message || "Failed to fetch item details",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (validateForm()) {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/captain_manage/inventory_update`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inventory_id: parseInt(itemId),
              restaurant_id: restaurantId.toString(),
              name: formData.name,
              quantity: parseInt(formData.quantity),
              type: formData.type || formData.category,
            }),
          }
        );

        const data = await response.json();
        if (data.st === 1) {
          toast.show({
            description: "Item updated successfully",
            status: "success",
          });
          router.push({
            pathname: "/(tabs)/staff/inventory-items",
            params: { refresh: Date.now() },
          });
        } else {
          toast.show({
            description: data.msg || "Failed to update item",
            status: "error",
          });
        }
      } catch (error) {
        console.error("Update Error:", error);
        toast.show({
          description: "Failed to update item",
          status: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.supplierId) newErrors.supplierId = "Supplier ID is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.serialNo) newErrors.serialNo = "Serial No. is required";

    if (!formData.price) {
      newErrors.price = "Price is required";
    } else if (isNaN(formData.price) || Number(formData.price) <= 0) {
      newErrors.price = "Please enter a valid price";
    }

    if (!formData.quantity) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(formData.quantity) || Number(formData.quantity) < 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }

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
            _pressed={{ bg: "coolGray.100" }}
          />
          <Heading size="md" flex={1} textAlign="center">
            Edit Item
          </Heading>
          <IconButton
            icon={<MaterialIcons name="check" size={24} color="coolGray.600" />}
            onPress={handleUpdate}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
          />
        </HStack>
      </Box>

      <ScrollView px={4} showsVerticalScrollIndicator={false}>
        <VStack space={4} mt={4} mb={6}>
          {/* Basic Information */}
          <FormControl isRequired isInvalid={"name" in errors}>
            <FormControl.Label>Item Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(value) =>
                setFormData({ ...formData, name: value })
              }
              placeholder="Enter item name"
              isReadOnly={loading}
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"category" in errors}>
            <FormControl.Label>Category/Type</FormControl.Label>
            <Input
              value={formData.category}
              onChangeText={(value) => {
                setFormData({
                  ...formData,
                  category: value,
                  type: value, // Update both category and type
                });
              }}
              placeholder="Enter category"
              isReadOnly={loading}
            />
            <FormControl.ErrorMessage>
              {errors.category}
            </FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"quantity" in errors}>
            <FormControl.Label>Quantity</FormControl.Label>
            <Input
              keyboardType="numeric"
              value={formData.quantity}
              onChangeText={(value) =>
                setFormData({ ...formData, quantity: value })
              }
              placeholder="Enter quantity"
              isReadOnly={loading}
            />
            <FormControl.ErrorMessage>
              {errors.quantity}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Keep other form fields but mark them as optional */}
          <FormControl>
            <FormControl.Label>Description (Optional)</FormControl.Label>
            <TextArea
              h={20}
              value={formData.description}
              onChangeText={(value) =>
                setFormData({ ...formData, description: value })
              }
              placeholder="Enter item description"
              isReadOnly={loading}
            />
          </FormControl>

          <FormControl isRequired isInvalid={"supplierId" in errors}>
            <FormControl.Label>Supplier ID</FormControl.Label>
            <Input
              value={formData.supplierId}
              onChangeText={(value) =>
                setFormData({ ...formData, supplierId: value })
              }
              placeholder="Enter supplier ID"
            />
            <FormControl.ErrorMessage>
              {errors.supplierId}
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
                placeholder="Enter price"
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
                placeholder="Enter quantity"
              />
              <FormControl.ErrorMessage>
                {errors.quantity}
              </FormControl.ErrorMessage>
            </FormControl>
          </HStack>

          <HStack space={4}>
            <FormControl flex={1} isRequired isInvalid={"serialNo" in errors}>
              <FormControl.Label>Serial No.</FormControl.Label>
              <Input
                value={formData.serialNo}
                onChangeText={(value) =>
                  setFormData({ ...formData, serialNo: value })
                }
                placeholder="Enter serial number"
              />
              <FormControl.ErrorMessage>
                {errors.serialNo}
              </FormControl.ErrorMessage>
            </FormControl>

            <FormControl flex={1}>
              <FormControl.Label>Brand Name</FormControl.Label>
              <Input
                value={formData.brandName}
                onChangeText={(value) =>
                  setFormData({ ...formData, brandName: value })
                }
                placeholder="Enter brand name"
              />
            </FormControl>
          </HStack>

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

          <HStack space={4}>
            <FormControl flex={1} isInvalid={"tax" in errors}>
              <FormControl.Label>Tax (%)</FormControl.Label>
              <Input
                keyboardType="numeric"
                value={formData.tax}
                onChangeText={(value) =>
                  setFormData({ ...formData, tax: value })
                }
                placeholder="Enter tax percentage"
              />
              <FormControl.ErrorMessage>{errors.tax}</FormControl.ErrorMessage>
            </FormControl>

            <FormControl flex={1}>
              <FormControl.Label>Order ID</FormControl.Label>
              <Input
                value={formData.orderId}
                onChangeText={(value) =>
                  setFormData({ ...formData, orderId: value })
                }
                placeholder="Enter order ID"
              />
            </FormControl>
          </HStack>

          <Button
            mt={4}
            colorScheme="blue"
            onPress={handleUpdate}
            isLoading={loading}
            isLoadingText="Updating..."
            _text={{ fontSize: "md", fontWeight: "semibold" }}
          >
            Update Item
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
