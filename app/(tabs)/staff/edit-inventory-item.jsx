import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  ScrollView,
  FormControl,
  Input,
  TextArea,
  Button,
  Select,
  useToast,
  Spinner,
  Pressable,
  Text,
} from "native-base";
import { Platform, StatusBar } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function EditInventoryItemScreen() {
  const router = useRouter();
  const toast = useToast();
  const { itemId } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);

  const [formData, setFormData] = useState({
    inventory_id: "",
    restaurant_id: "",
    supplier_id: "",
    category_id: "",
    name: "",
    description: "",
    unit_price: "",
    quantity: "",
    unit_of_measure: "",
    reorder_level: "",
    brand_name: "",
    tax_rate: "",
    in_or_out: "in",
    in_date: "",
    out_date: "",
    expiration_date: "",
  });

  useEffect(() => {
    getStoredData();
    fetchSuppliers();
    fetchCategories();
  }, []);

  const getStoredData = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (storedRestaurantId) {
        setRestaurantId(storedRestaurantId);
        fetchInventoryDetails(storedRestaurantId, itemId);
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

  const fetchInventoryDetails = async (restId, invId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/inventory_view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restId,
            inventory_id: invId,
          }),
        }
      );

      const data = await response.json();
      if (data.st === 1 && data.data) {
        setFormData({
          inventory_id: data.data.inventory_id?.toString() || "",
          restaurant_id: data.data.restaurant_id?.toString() || "",
          supplier_id: data.data.supplier_id?.toString() || "",
          category_id: data.data.category_id?.toString() || "",
          name: data.data.name || "",
          description: data.data.description || "",
          unit_price: data.data.unit_price?.toString() || "",
          quantity: data.data.quantity?.toString() || "",  // Convert to string
          unit_of_measure: data.data.unit_of_measure || "",
          reorder_level: data.data.reorder_level?.toString() || "",  // Convert to string
          brand_name: data.data.brand_name || "",
          tax_rate: data.data.tax_rate?.toString() || "",
          in_or_out: data.data.in_or_out || "in",
          in_date: parseDate(data.data.in_date),
          out_date: parseDate(data.data.out_date),
          expiration_date: parseDate(data.data.expiration_date),
        });
      }
    } catch (error) {
      console.error("Error fetching inventory details:", error);
      toast.show({
        description: "Error fetching inventory details",
        status: "error",
      });
    }
  };

  const fetchSuppliers = async () => {
    try {
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(`${API_BASE_URL}/get_supplier_list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: storedRestaurantId,
        }),
      });

      const data = await response.json();
      console.log("Suppliers Response:", data);

      if (data.st === 1) {
        // Convert suppliers_dict to an array of objects
        const suppliersArray = Object.entries(data.suppliers_dict).map(
          ([name, id]) => ({
            name,
            id,
          })
        );
        setSuppliers(suppliersArray);
      } else {
        throw new Error(data.msg || "Failed to fetch suppliers");
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.show({
        description: "Error fetching suppliers",
        status: "error",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/get_inventory_category_list`
      );
      const data = await response.json();

      if (data.st === 1) {
        // Convert the category list from object to array format
        const categoriesArray = Object.entries(
          data.inventory_categorys_list
        ).map(([name, id]) => ({
          name,
          id: id.toString(),
        }));
        setCategories(categoriesArray);
      } else {
        toast.show({
          description: data.msg || "Failed to fetch categories",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.show({
        description: "Error fetching categories",
        status: "error",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.supplier_id) newErrors.supplier_id = "Supplier is required";
    if (!formData.category_id) newErrors.category_id = "Category is required";
    if (!formData.unit_price || Number(formData.unit_price) <= 0) {
      newErrors.unit_price = "Valid price is required";
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      newErrors.quantity = "Valid quantity is required";
    }
    if (!formData.unit_of_measure) {
      newErrors.unit_of_measure = "Unit of measure is required";
    }
    if (!formData.reorder_level || Number(formData.reorder_level) < 0) {
      newErrors.reorder_level = "Valid reorder level is required";
    }
    if (!formData.brand_name) newErrors.brand_name = "Brand name is required";
    if (!formData.tax_rate || Number(formData.tax_rate) < 0) {
      newErrors.tax_rate = "Valid tax rate is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        const preparedData = prepareDataForSubmission(formData);
        const response = await fetch(
          `${API_BASE_URL}/captain_manage/inventory_update`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(preparedData),
          }
        );

        const data = await response.json();
        if (data.st === 1) {
          toast.show({
            description: "Inventory updated successfully",
            status: "success",
          });
          router.push({
            pathname: "/(tabs)/staff/inventory-items",
            params: { refresh: Date.now() },
          });
        } else {
          throw new Error(data.msg || "Failed to update inventory");
        }
      } catch (error) {
        console.error("Update Error:", error);
        toast.show({
          description: error.message || "Failed to update inventory",
          status: "error",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return ''; // Return empty string if invalid date
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const parseDate = (dateString) => {
    if (!dateString) return '';
    // Handle different date formats that might come from the API
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return formatDate(d);
    }
    return dateString; // Return original string if parsing fails
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFormData({
        ...formData,
        [currentDateField]: formatDate(selectedDate),
      });
    }
  };

  const prepareDataForSubmission = (data) => {
    // Convert dates to API expected format if needed
    const prepared = {
      ...data,
      in_date: data.in_date || '',
      out_date: data.out_date || '',
      expiration_date: data.expiration_date || '',
    };
    return prepared;
  };

  const showDatepicker = (fieldName) => {
    setCurrentDateField(fieldName);
    setShowDatePicker(true);
  };

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Edit Inventory " />

      <ScrollView px={4} showsVerticalScrollIndicator={false}>
        <VStack space={4} py={4}>
          {/* Name */}
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

          {/* Description */}
          <FormControl>
            <FormControl.Label>Description</FormControl.Label>
            <TextArea
              value={formData.description}
              onChangeText={(value) =>
                setFormData({ ...formData, description: value })
              }
              placeholder="Enter description"
              h={20}
            />
          </FormControl>

          {/* Unit Price */}
          <FormControl isRequired isInvalid={"unit_price" in errors}>
            <FormControl.Label>Unit Price</FormControl.Label>
            <Input
              value={formData.unit_price}
              onChangeText={(value) =>
                setFormData({ ...formData, unit_price: value })
              }
              keyboardType="numeric"
              placeholder="Enter unit price"
            />
            <FormControl.ErrorMessage>
              {errors.unit_price}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Quantity */}
          <FormControl isRequired isInvalid={"quantity" in errors}>
            <FormControl.Label>Quantity</FormControl.Label>
            <Input
              value={formData.quantity}
              onChangeText={(value) =>
                setFormData({ ...formData, quantity: value })
              }
              keyboardType="numeric"
              placeholder="Enter quantity"
            />
            <FormControl.ErrorMessage>
              {errors.quantity}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Unit of Measure */}
          <FormControl isRequired isInvalid={"unit_of_measure" in errors}>
            <FormControl.Label>Unit of Measure</FormControl.Label>
            <Input
              value={formData.unit_of_measure}
              onChangeText={(value) =>
                setFormData({ ...formData, unit_of_measure: value })
              }
              placeholder="Enter unit of measure"
            />
            <FormControl.ErrorMessage>
              {errors.unit_of_measure}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Reorder Level */}
          <FormControl isRequired isInvalid={"reorder_level" in errors}>
            <FormControl.Label>Reorder Level</FormControl.Label>
            <Input
              value={formData.reorder_level}
              onChangeText={(value) =>
                setFormData({ ...formData, reorder_level: value })
              }
              keyboardType="numeric"
              placeholder="Enter reorder level"
            />
            <FormControl.ErrorMessage>
              {errors.reorder_level}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Brand Name */}
          <FormControl isRequired isInvalid={"brand_name" in errors}>
            <FormControl.Label>Brand Name</FormControl.Label>
            <Input
              value={formData.brand_name}
              onChangeText={(value) =>
                setFormData({ ...formData, brand_name: value })
              }
              placeholder="Enter brand name"
            />
            <FormControl.ErrorMessage>
              {errors.brand_name}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Tax Rate */}
          <FormControl isRequired isInvalid={"tax_rate" in errors}>
            <FormControl.Label>Tax Rate (%)</FormControl.Label>
            <Input
              value={formData.tax_rate}
              onChangeText={(value) =>
                setFormData({ ...formData, tax_rate: value })
              }
              keyboardType="numeric"
              placeholder="Enter tax rate"
            />
            <FormControl.ErrorMessage>
              {errors.tax_rate}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Dates */}
          <FormControl>
            <FormControl.Label>In Date</FormControl.Label>
            <Pressable onPress={() => showDatepicker('in_date')}>
              <Input
                value={formData.in_date}
                isReadOnly
                placeholder="Select in date"
                rightElement={
                  <Text px={2} color="gray.400">📅</Text>
                }
              />
            </Pressable>
          </FormControl>

          <FormControl>
            <FormControl.Label>Out Date</FormControl.Label>
            <Pressable onPress={() => showDatepicker('out_date')}>
              <Input
                value={formData.out_date}
                isReadOnly
                placeholder="Select out date"
                rightElement={
                  <Text px={2} color="gray.400">📅</Text>
                }
              />
            </Pressable>
          </FormControl>

          <FormControl>
            <FormControl.Label>Expiration Date</FormControl.Label>
            <Pressable onPress={() => showDatepicker('expiration_date')}>
              <Input
                value={formData.expiration_date}
                isReadOnly
                placeholder="Select expiration date"
                rightElement={
                  <Text px={2} color="gray.400">📅</Text>
                }
              />
            </Pressable>
          </FormControl>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={new Date(formData[currentDateField] || Date.now())}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}

          {/* Category Selection */}
          <FormControl isRequired isInvalid={"category_id" in errors}>
            <FormControl.Label>Category</FormControl.Label>
            <Select
              selectedValue={formData.category_id}
              placeholder="Select category"
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
            >
              {categories.map((category) => (
                <Select.Item
                  key={category.id}
                  label={category.name}
                  value={category.id}
                />
              ))}
            </Select>
            <FormControl.ErrorMessage>
              {errors.category_id}
            </FormControl.ErrorMessage>
          </FormControl>

          <Button
            colorScheme="blue"
            onPress={handleSubmit}
            isLoading={isLoading}
            isLoadingText="Updating..."
            mb={4}
          >
            Update Item
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
