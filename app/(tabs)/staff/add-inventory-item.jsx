import { useState, useEffect } from "react";
import {
  Box,
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
  CheckIcon,
  Modal,
  Pressable,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header"; // Adjust the import path as necessary
import DateTimePicker from "@react-native-community/datetimepicker";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function AddInventoryItemScreen() {
  const router = useRouter();
  const toast = useToast();
  const [outletId, setOutletId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    supplierId: "",
    description: "",
    category_id: "", // Changed from category to category_id
    unit_price: "", // Changed from price
    quantity: "",
    unit_of_measure: "", // Changed from unitOfMeasure
    reorder_level: "", // Changed from reorderLevel
    brand_name: "", // Changed from brandName
    tax_rate: "", // Changed from tax
    in_or_out: "in", // Changed from status
    in_date: "", // Changed from inDate
    expiration_date: "", // Changed from expirationDate
  });
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [isAddCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [statusOptions, setStatusOptions] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showInDatePicker, setShowInDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] =
    useState(false);

  useEffect(() => {
    getStoredData();
    fetchStatusOptions(); // Fetch status options when the component mounts
    fetchCategories(); // Fetch categories when the component mounts
    fetchSuppliers(); // Fetch suppliers when the component mounts
  }, []);

  const getStoredData = async () => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (storedOutletId) {
        setOutletId(storedOutletId);
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

  // Fetch categories from the API
  const fetchCategories = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/get_inventory_category_list`
      );
      const data = await response.json();

      if (data.st === 1) {
        const categoriesArray = Object.entries(
          data.inventory_categorys_list
        ).map(([name, id]) => ({ name, id }));
        setCategories(categoriesArray);
      } else {
        toast.show({
          description: "Failed to fetch categories",
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

  const fetchStatusOptions = async () => {
    try {
      const response = await fetch(
        "https://men4u.xyz/captain_api/get_in_or_out_list"
      );
      const data = await response.json();

      if (data.st === 1) {
        setStatusOptions(
          Object.entries(data.in_out_list).map(([key, value]) => ({
            key,
            value,
          }))
        );
      } else {
        toast.show({
          description: "Failed to fetch status options",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching status options:", error);
      toast.show({
        description: "Error fetching status options",
        status: "error",
      });
    }
  };

  const fetchSuppliers = async () => {
    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");

      const response = await fetch(`${API_BASE_URL}/get_supplier_list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outlet_id: storedOutletId,
        }),
      });

      const data = await response.json();
      console.log("Suppliers Response:", data);

      if (data.st === 1) {
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

  useEffect(() => {
    fetchSuppliers(); // Call the function to fetch suppliers
  }, []);

  // Add name validation handler
  const handleNameChange = (text) => {
    // Only allow letters and spaces
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setFormData({ ...formData, name: sanitizedText });

    if (!sanitizedText.trim()) {
      setErrors((prev) => ({ ...prev, name: "Name is required" }));
    } else if (sanitizedText.trim().length < 2) {
      setErrors((prev) => ({
        ...prev,
        name: "Name must be at least 2 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  // Update validateForm to include stricter name validation
  const validateForm = () => {
    const newErrors = {};

    // Updated name validation
    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = "Name can only contain letters and spaces";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Required field validations
    if (!formData.supplierId) newErrors.supplierId = "Supplier is required";
    if (!formData.category_id) newErrors.category_id = "Category is required";

    if (!formData.quantity) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(formData.quantity) || Number(formData.quantity) <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }

    if (!formData.unit_price) {
      newErrors.unit_price = "Price is required";
    } else if (isNaN(formData.unit_price) || Number(formData.unit_price) <= 0) {
      newErrors.unit_price = "Please enter a valid price";
    }

    if (!formData.unit_of_measure)
      newErrors.unit_of_measure = "Unit of measure is required";
    if (!formData.reorder_level) {
      newErrors.reorder_level = "Reorder level is required";
    } else if (
      isNaN(formData.reorder_level) ||
      Number(formData.reorder_level) < 0
    ) {
      newErrors.reorder_level = "Please enter a valid reorder level";
    }

    if (!formData.brand_name) newErrors.brand_name = "Brand name is required";

    if (!formData.tax_rate) {
      newErrors.tax_rate = "Tax rate is required";
    } else if (isNaN(formData.tax_rate) || Number(formData.tax_rate) < 0) {
      newErrors.tax_rate = "Please enter a valid tax rate";
    }

    if (!formData.in_date) newErrors.in_date = "In date is required";
    if (!formData.expiration_date)
      newErrors.expiration_date = "Expiration date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/inventory_create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            outlet_id: outletId.toString(),
            name: formData.name,
            supplier_id: formData.supplierId.toString(),
            description: formData.description,
            category_id: formData.category_id.toString(),
            unit_price: formData.unit_price.toString(),
            quantity: formData.quantity.toString(),
            unit_of_measure: formData.unit_of_measure,
            reorder_level: formData.reorder_level.toString(),
            brand_name: formData.brand_name,
            tax_rate: formData.tax_rate.toString(),
            in_or_out: formData.in_or_out,
            in_date: formData.in_date,
            expiration_date: formData.expiration_date,
          }),
        }
      );

      const data = await response.json();
      console.log("Create Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Inventory item created successfully",
          status: "success",
        });
        router.push({
          pathname: "/(tabs)/staff/inventory-items",
          params: { refresh: Date.now() },
        });
      } else {
        throw new Error(data.msg || "Failed to create inventory item");
      }
    } catch (error) {
      console.error("Create Error:", error);
      toast.show({
        description: error.message || "Failed to create inventory item",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.show({
        description: "Category name is required",
        status: "error",
      });
      return;
    }

    try {
      // Log the request payload for debugging
      const requestPayload = {
        outlet_id: outletId.toString(),
        name: newCategoryName.trim(), // Changed from inventory_category_name to name
      };
      console.log("Category Create Request:", requestPayload);

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/inventory_category_create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
        }
      );

      const data = await response.json();
      console.log("Add Category Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Category added successfully",
          status: "success",
        });
        setNewCategoryName("");
        setAddCategoryModalOpen(false);
        await fetchCategories();
      } else {
        throw new Error(data.msg || "Failed to add category");
      }
    } catch (error) {
      console.error("Add Category Error:", error);
      toast.show({
        description: error.message || "Failed to add category",
        status: "error",
      });
    }
  };

  const formatDate = (date) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = date.getDate().toString().padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleInDateChange = (event, selectedDate) => {
    setShowInDatePicker(false);
    if (selectedDate && event.type !== "dismissed") {
      setFormData({ ...formData, in_date: formatDate(selectedDate) });
    }
  };

  const handleExpirationDateChange = (event, selectedDate) => {
    setShowExpirationDatePicker(false);
    if (selectedDate && event.type !== "dismissed") {
      setFormData({ ...formData, expiration_date: formatDate(selectedDate) });
    }
  };

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      <Header title="Add Inventory Item" onBackPress={() => router.back()} />

      <ScrollView px={4} showsVerticalScrollIndicator={false}>
        <VStack space={4} mt={4} mb={6}>
          {/* Item Name */}
          <FormControl isRequired isInvalid={"name" in errors}>
            <FormControl.Label>Item Name</FormControl.Label>
            <Input
              placeholder="Enter item name"
              value={formData.name}
              onChangeText={handleNameChange}
              autoCapitalize="words"
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
          </FormControl>

          {/* Supplier Name */}
          <FormControl isRequired isInvalid={"supplierId" in errors}>
            <FormControl.Label>Supplier Name</FormControl.Label>
            <Select
              placeholder="Select supplier"
              selectedValue={formData.supplierId}
              onValueChange={(value) =>
                setFormData({ ...formData, supplierId: value })
              }
            >
              {suppliers.map((supplier) => (
                <Select.Item
                  key={supplier.id}
                  label={supplier.name}
                  value={supplier.id.toString()}
                />
              ))}
            </Select>
            <FormControl.ErrorMessage>
              {errors.supplierId}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Description */}
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

          {/* Category */}
          <FormControl isRequired isInvalid={"category_id" in errors}>
            <HStack justifyContent="space-between" alignItems="center">
              <FormControl.Label>Category</FormControl.Label>
              <IconButton
                icon={<MaterialIcons name="add" size={24} color="black" />}
                onPress={() => setAddCategoryModalOpen(true)}
              />
            </HStack>
            <Select
              placeholder="Select category"
              selectedValue={formData.category_id}
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

          {/* Price Input */}
          <FormControl isRequired isInvalid={"unit_price" in errors}>
            <FormControl.Label>Unit Price (₹)</FormControl.Label>
            <Input
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={formData.unit_price}
              onChangeText={(value) => {
                // Allow only numbers and decimal point
                const formattedValue = value.replace(/[^0-9.]/g, "");
                setFormData({ ...formData, unit_price: formattedValue });
              }}
            />
            <FormControl.ErrorMessage>
              {errors.unit_price}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Quantity Input */}
          <FormControl isRequired isInvalid={"quantity" in errors}>
            <FormControl.Label>Quantity</FormControl.Label>
            <Input
              keyboardType="number-pad"
              placeholder="0"
              value={formData.quantity}
              onChangeText={(value) => {
                // Allow only numbers
                const formattedValue = value.replace(/[^0-9]/g, "");
                setFormData({ ...formData, quantity: formattedValue });
              }}
            />
            <FormControl.ErrorMessage>
              {errors.quantity}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Brand Name */}
          <FormControl isRequired isInvalid={"brand_name" in errors}>
            <FormControl.Label>Brand Name</FormControl.Label>
            <Input
              placeholder="Enter brand name"
              value={formData.brand_name}
              onChangeText={(value) =>
                setFormData({ ...formData, brand_name: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.brand_name}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Unit of Measure */}
          <FormControl isRequired isInvalid={"unit_of_measure" in errors}>
            <FormControl.Label>Unit of Measure</FormControl.Label>
            <Input
              placeholder="Enter unit of measure"
              value={formData.unit_of_measure}
              onChangeText={(value) =>
                setFormData({ ...formData, unit_of_measure: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.unit_of_measure}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Reorder Level */}
          <FormControl isRequired isInvalid={"reorder_level" in errors}>
            <FormControl.Label>Reorder Level</FormControl.Label>
            <Input
              keyboardType="numeric"
              placeholder="Enter reorder level"
              value={formData.reorder_level}
              onChangeText={(value) =>
                setFormData({ ...formData, reorder_level: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.reorder_level}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Expiration Date */}
          <FormControl isRequired isInvalid={"expiration_date" in errors}>
            <FormControl.Label>Expiration Date</FormControl.Label>
            <Pressable onPress={() => setShowExpirationDatePicker(true)}>
              <Input
                value={formData.expiration_date}
                placeholder="Select expiration date"
                isReadOnly
                rightElement={
                  <IconButton
                    icon={
                      <MaterialIcons
                        name="calendar-today"
                        size={24}
                        color="gray"
                      />
                    }
                    onPress={() => setShowExpirationDatePicker(true)}
                  />
                }
              />
            </Pressable>
            <FormControl.ErrorMessage>
              {errors.expiration_date}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* In Date */}
          <FormControl isRequired isInvalid={"in_date" in errors}>
            <FormControl.Label>In Date</FormControl.Label>
            <Pressable onPress={() => setShowInDatePicker(true)}>
              <Input
                value={formData.in_date}
                placeholder="Select in date"
                isReadOnly
                rightElement={
                  <IconButton
                    icon={
                      <MaterialIcons
                        name="calendar-today"
                        size={24}
                        color="gray"
                      />
                    }
                    onPress={() => setShowInDatePicker(true)}
                  />
                }
              />
            </Pressable>
            <FormControl.ErrorMessage>
              {errors.in_date}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Date Pickers */}
          {showInDatePicker && (
            <DateTimePicker
              value={formData.in_date ? new Date(formData.in_date) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleInDateChange}
            />
          )}

          {showExpirationDatePicker && (
            <DateTimePicker
              value={
                formData.expiration_date
                  ? new Date(formData.expiration_date)
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleExpirationDateChange}
              minimumDate={
                formData.in_date ? new Date(formData.in_date) : new Date()
              }
            />
          )}

          {/* Status */}
          <FormControl flex={1}>
            <FormControl.Label>Status</FormControl.Label>
            <Select
              selectedValue={formData.in_or_out}
              onValueChange={(value) =>
                setFormData({ ...formData, in_or_out: value })
              }
            >
              {statusOptions.map((option) => (
                <Select.Item
                  key={option.key}
                  label={option.value}
                  value={option.key}
                />
              ))}
            </Select>
          </FormControl>

          {/* Tax Rate Input */}
          <FormControl isRequired isInvalid={"tax_rate" in errors}>
            <FormControl.Label>Tax Rate (%)</FormControl.Label>
            <Input
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={formData.tax_rate}
              onChangeText={(value) => {
                // Allow only numbers and decimal point
                const formattedValue = value.replace(/[^0-9.]/g, "");
                setFormData({ ...formData, tax_rate: formattedValue });
              }}
            />
            <FormControl.ErrorMessage>
              {errors.tax_rate}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Modal for adding new category */}
          <Modal
            isOpen={isAddCategoryModalOpen}
            onClose={() => setAddCategoryModalOpen(false)}
          >
            <Modal.Content>
              <Modal.CloseButton />
              <Modal.Header>Add New Category</Modal.Header>
              <Modal.Body>
                <FormControl isRequired>
                  <FormControl.Label>Category Name</FormControl.Label>
                  <Input
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                  />
                </FormControl>
              </Modal.Body>
              <Modal.Footer>
                <HStack flex={1} justifyContent="space-between">
                  <Button onPress={() => setAddCategoryModalOpen(false)} px={6}>
                    Cancel
                  </Button>
                  <Button onPress={handleAddCategory} px={6}>
                    Add
                  </Button>
                </HStack>
              </Modal.Footer>
            </Modal.Content>
          </Modal>

          {/* Add Item Button */}
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
