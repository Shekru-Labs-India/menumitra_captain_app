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

export default function EditInventoryItemScreen() {
  const router = useRouter();
  const toast = useToast();
  const { itemId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
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
  });
  const [errors, setErrors] = useState({});

  // Fetch existing item data
  useEffect(() => {
    // Simulate API call - replace with actual API call
    setFormData({
      name: "Sample Item 1",
      supplierId: "SUP123",
      description: "This is a sample inventory item",
      category: "Electronics",
      price: "1500",
      quantity: "10",
      serialNo: "SER001",
      status: "in",
      brandName: "Brand X",
      tax: "18",
      paymentStatus: "paid",
      orderId: "ORD123",
    });
    setLoading(false);
  }, [itemId]);

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

  const handleUpdate = () => {
    if (validateForm()) {
      // Add API call here
      console.log("Updated data:", formData);
      toast.show({
        description: "Item updated successfully",
        placement: "top",
      });
      router.back();
    }
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
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
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

          <FormControl>
            <FormControl.Label>Description</FormControl.Label>
            <TextArea
              h={20}
              value={formData.description}
              onChangeText={(value) =>
                setFormData({ ...formData, description: value })
              }
              placeholder="Enter item description"
            />
          </FormControl>

          <FormControl isRequired isInvalid={"category" in errors}>
            <FormControl.Label>Category</FormControl.Label>
            <Input
              value={formData.category}
              onChangeText={(value) =>
                setFormData({ ...formData, category: value })
              }
              placeholder="Enter category"
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
            _text={{ fontSize: "md", fontWeight: "semibold" }}
          >
            Update Item
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
