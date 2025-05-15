import { useState, useEffect, useRef } from "react";
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
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

export default function AddInventoryItemScreen() {
  const router = useRouter();
  const toast = useToast();
  const [outletId, setOutletId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    supplierId: "",
    description: "",
    category_id: "", // Changed from category
    unit_price: "", // Changed from price
    quantity: "",
    unit_of_measure: "", // Changed from unitOfMeasure
    reorder_level: "", // Changed from reorderLevel
    brand_name: "", // Changed from brandName
    tax_rate: "", // Changed from tax
    in_or_out: "in", // Changed from status
    in_date: "", // Changed from inDate
    out_date: "", // Added out_date field
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
  const [showOutDatePicker, setShowOutDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] =
    useState(false);
  const supplierSelect = useRef(null);
  const categorySelect = useRef(null);
  const statusSelect = useRef(null);

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
      const data = await fetchWithAuth(
        `${getBaseUrl()}/get_inventory_category_list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}) // Empty body to ensure device_token is added
        }
      );
      console.log("Categories Response:", data);

      if (data.st === 1) {
        const categoriesArray = Object.entries(
          data.inventory_categorys_list
        ).map(([name, id]) => ({ name, id }));
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

  const fetchStatusOptions = async () => {
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/get_in_or_out_list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) // Empty body to ensure device_token is added
      });
      console.log("Status Options Response:", data);

      if (data.st === 1 && data.in_out_list) {
        const statusArray = Object.entries(data.in_out_list).map(
          ([key, value]) => ({
            key: key,
            value: value,
          })
        );

        setStatusOptions(statusArray);
        setFormData((prev) => ({
          ...prev,
          in_or_out: "in",
        }));
      } else {
        throw new Error("Failed to fetch status options");
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
      const data = await fetchWithAuth(`${getBaseUrl()}/get_supplier_list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId,
        }),
      });
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
    const sanitizedText = text.replace(/[^a-zA-Z0-9\s]/g, "");
    setFormData((prev) => ({ ...prev, name: sanitizedText }));

    if (!sanitizedText.trim()) {
      setErrors((prev) => ({ ...prev, name: "Item name is required" }));
    } else if (sanitizedText.trim().length < 2) {
      setErrors((prev) => ({ ...prev, name: "Name must be at least 2 characters" }));
    } else {
      setErrors((prev) => {
        const { name, ...rest } = prev;
        return rest;
      });
    }
  };

  // Update validateForm to include stricter name validation
  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = "Name can only contain letters and spaces";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

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

    if (!formData.unit_of_measure) {
      newErrors.unit_of_measure = "Unit of measure is required";
    }

    // Optional field validations (only validate if value is provided)
    if (
      formData.reorder_level &&
      (isNaN(formData.reorder_level) || Number(formData.reorder_level) < 0)
    ) {
      newErrors.reorder_level = "Please enter a valid reorder level";
    }

    if (formData.brand_name && formData.brand_name.length < 2) {
      newErrors.brand_name = "Brand name must be at least 2 characters";
    }

    if (!formData.tax_rate) {
      newErrors.tax_rate = "Tax rate is required";
    } else if (isNaN(formData.tax_rate) || Number(formData.tax_rate) < 0) {
      newErrors.tax_rate = "Please enter a valid tax rate";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");

      if (!userId) {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
        return;
      }

      // Set current date as in_date if status is "in" and no date selected
      let inDate = formData.in_date;
      if (formData.in_or_out === "in" && !formData.in_date) {
        inDate = formatDate(new Date());
      }
      
      // Set current date as out_date if status is "out" and no date selected
      let outDate = formData.out_date;
      if (formData.in_or_out === "out" && !formData.out_date) {
        outDate = formatDate(new Date());
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/inventory_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId.toString(),
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
          in_date: inDate, // Use the potentially modified inDate
          out_date: outDate, // Add out_date to API request
          expiration_date: formData.expiration_date,
        }),
      });
      console.log("Create Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Inventory item created successfully",
          status: "success",
        });
        router.push({
          pathname: "/screens/inventory/inventory-items",
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
      const requestPayload = {
        outlet_id: outletId.toString(),
        name: newCategoryName.trim(),
      };
      console.log("Category Create Request:", requestPayload);

      const data = await fetchWithAuth(
        `${getBaseUrl()}/inventory_category_create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        }
      );
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

  const parseDate = (dateString) => {
    if (!dateString) return new Date();

    const [day, month, year] = dateString.split(" ");
    const months = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    return new Date(year, months[month], parseInt(day));
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
    setShowInDatePicker(Platform.OS === "ios");

    if (event.type === "set" && selectedDate) {
      setFormData((prev) => ({
        ...prev,
        in_date: formatDate(selectedDate),
      }));
    }
  };

  const handleOutDateChange = (event, selectedDate) => {
    setShowOutDatePicker(Platform.OS === "ios");

    if (event.type === "set" && selectedDate) {
      setFormData((prev) => ({
        ...prev,
        out_date: formatDate(selectedDate),
      }));
    }
  };

  const handleExpirationDateChange = (event, selectedDate) => {
    setShowExpirationDatePicker(Platform.OS === "ios");

    if (event.type === "set" && selectedDate) {
      setFormData((prev) => ({
        ...prev,
        expiration_date: formatDate(selectedDate),
      }));
    }
  };

  // Add this handler function at component level
  const handleCategoryNameChange = (text) => {
    // Only allow letters and spaces
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setNewCategoryName(sanitizedText);
  };

  // Add this handler function at component level
  const handleBrandNameChange = (text) => {
    setFormData((prev) => ({ ...prev, brand_name: text }));
    if (text && text.trim().length < 2) {
      setErrors((prev) => ({ ...prev, brand_name: "Brand name must be at least 2 characters" }));
    } else {
      setErrors((prev) => {
        const { brand_name, ...rest } = prev;
        return rest;
      });
    }
  };

  // Add this handler function at component level
  const handleUnitOfMeasureChange = (text) => {
    setFormData((prev) => ({ ...prev, unit_of_measure: text }));
    if (!text.trim()) {
      setErrors((prev) => ({ ...prev, unit_of_measure: "Unit of measure is required" }));
    } else {
      setErrors((prev) => {
        const { unit_of_measure, ...rest } = prev;
        return rest;
      });
    }
  };

  // Add validation function for units
  const isValidUnit = (unit) => {
    const validUnits = [
      "kg",
      "gm",
      "ml",
      "l",
      "pieces",
      "piece",
      "pcs",
      "box",
      "boxes",
    ];
    return validUnits.includes(unit.toLowerCase());
  };

  const handleUnitPriceChange = (value) => {
    const formattedValue = value.replace(/[^0-9.]/g, "");
    setFormData((prev) => ({ ...prev, unit_price: formattedValue }));

    if (!formattedValue) {
      setErrors((prev) => ({ ...prev, unit_price: "Unit price is required" }));
    } else if (isNaN(parseFloat(formattedValue))) {
      setErrors((prev) => ({ ...prev, unit_price: "Please enter a valid price" }));
    } else {
      setErrors((prev) => {
        const { unit_price, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleQuantityChange = (value) => {
    const formattedValue = value.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, quantity: formattedValue }));

    if (!formattedValue) {
      setErrors((prev) => ({ ...prev, quantity: "Quantity is required" }));
    } else if (parseInt(formattedValue) <= 0) {
      setErrors((prev) => ({ ...prev, quantity: "Quantity must be greater than 0" }));
    } else {
      setErrors((prev) => {
        const { quantity, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleReorderLevelChange = (value) => {
    const formattedValue = value.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, reorder_level: formattedValue }));

    if (formattedValue && parseInt(formattedValue) < 0) {
      setErrors((prev) => ({ ...prev, reorder_level: "Reorder level cannot be negative" }));
    } else {
      setErrors((prev) => {
        const { reorder_level, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleTaxRateChange = (value) => {
    const formattedValue = value.replace(/[^0-9.]/g, "");
    setFormData((prev) => ({ ...prev, tax_rate: formattedValue }));

    if (!formattedValue) {
      setErrors((prev) => ({ ...prev, tax_rate: "Tax rate is required" }));
    } else if (isNaN(parseFloat(formattedValue))) {
      setErrors((prev) => ({ ...prev, tax_rate: "Please enter a valid tax rate" }));
    } else if (parseFloat(formattedValue) < 0 || parseFloat(formattedValue) > 100) {
      setErrors((prev) => ({ ...prev, tax_rate: "Tax rate must be between 0 and 100" }));
    } else {
      setErrors((prev) => {
        const { tax_rate, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
     
    >
      <Header title="Add Inventory Item" onBackPress={() => router.back()} />

      <ScrollView px={4} showsVerticalScrollIndicator={false}>
        <VStack space={4} mt={4} mb={6}>
          {/* Item Name */}
          <FormControl isRequired={false} isInvalid={"name" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>
              <Text color="red.500">*</Text> Item Name
            </FormControl.Label>
            <Input
              placeholder="Enter item name"
              value={formData.name}
              onChangeText={handleNameChange}
              autoCapitalize="words"
              borderColor={
                formData.name && !errors.name ? "green.500" : 
                errors.name ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.name && !errors.name ? "green.500" : 
                            errors.name ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
          </FormControl>

          {/* Supplier Name */}
          <FormControl isRequired={false} isInvalid={"supplierId" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>
              <Text color="red.500">*</Text> Supplier Name
            </FormControl.Label>
            <Pressable
              onPress={() => {
                if (supplierSelect.current) {
                  supplierSelect.current.focus();
                }
              }}
            >
              <Select
                ref={supplierSelect}
                placeholder="Select supplier"
                selectedValue={formData.supplierId}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, supplierId: value }));
                  // Clear error when a supplier is selected
                  if (value) {
                    setErrors((prev) => {
                      const { supplierId, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                isReadOnly={true}
                borderColor={
                  formData.supplierId && !errors.supplierId ? "green.500" : 
                  errors.supplierId ? "red.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.supplierId && !errors.supplierId ? "green.500" : 
                              errors.supplierId ? "red.500" : "blue.500",
                }}
              >
                {suppliers.map((supplier) => (
                  <Select.Item
                    key={supplier.id}
                    label={supplier.name}
                    value={supplier.id.toString()}
                  />
                ))}
              </Select>
            </Pressable>
            <FormControl.ErrorMessage>
              {errors.supplierId}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Description */}
          <FormControl>
            <FormControl.Label _text={{ fontWeight: "bold" }}>Description</FormControl.Label>
            <TextArea
              h={20}
              placeholder="Enter item description"
              value={formData.description}
              onChangeText={(value) =>
                setFormData({ ...formData, description: value })
              }
              borderColor={
                formData.description ? "green.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.description ? "green.500" : "blue.500",
              }}
            />
          </FormControl>

          {/* Category */}
          <FormControl isRequired={false} isInvalid={"category_id" in errors}>
            <HStack justifyContent="space-between" alignItems="center">
              <FormControl.Label _text={{ fontWeight: "bold" }}>
                <Text color="red.500">*</Text> Category
              </FormControl.Label>
              <IconButton
                icon={<MaterialIcons name="add" size={24} color="black" />}
                onPress={() => setAddCategoryModalOpen(true)}
              />
            </HStack>
            <Pressable
              onPress={() => {
                if (categorySelect.current) {
                  categorySelect.current.focus();
                }
              }}
            >
              <Select
                ref={categorySelect}
                placeholder="Select category"
                selectedValue={formData.category_id}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, category_id: value }));
                  // Clear error when a category is selected
                  if (value) {
                    setErrors((prev) => {
                      const { category_id, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                isReadOnly={true}
                borderColor={
                  formData.category_id && !errors.category_id ? "green.500" : 
                  errors.category_id ? "red.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.category_id && !errors.category_id ? "green.500" : 
                              errors.category_id ? "red.500" : "blue.500",
                }}
              >
                {categories.map((category) => (
                  <Select.Item
                    key={category.id}
                    label={category.name}
                    value={category.id}
                  />
                ))}
              </Select>
            </Pressable>
            <FormControl.ErrorMessage>
              {errors.category_id}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Price Input */}
          <FormControl isRequired={false} isInvalid={"unit_price" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>
              <Text color="red.500">*</Text> Unit Price (₹)
            </FormControl.Label>
            <Input
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={formData.unit_price}
              onChangeText={handleUnitPriceChange}
              borderColor={
                formData.unit_price && !errors.unit_price ? "green.500" : 
                errors.unit_price ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.unit_price && !errors.unit_price ? "green.500" : 
                            errors.unit_price ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>
              {errors.unit_price}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Quantity Input */}
          <FormControl isRequired={false} isInvalid={"quantity" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>
              <Text color="red.500">*</Text> Quantity
            </FormControl.Label>
            <Input
              keyboardType="number-pad"
              placeholder="0"
              value={formData.quantity}
              onChangeText={handleQuantityChange}
              borderColor={
                formData.quantity && !errors.quantity ? "green.500" : 
                errors.quantity ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.quantity && !errors.quantity ? "green.500" : 
                            errors.quantity ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>
              {errors.quantity}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Brand Name */}
          <FormControl isInvalid={"brand_name" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>Brand Name</FormControl.Label>
            <Input
              placeholder="Enter brand name"
              value={formData.brand_name}
              onChangeText={handleBrandNameChange}
              borderColor={
                formData.brand_name && !errors.brand_name ? "green.500" : 
                errors.brand_name ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.brand_name && !errors.brand_name ? "green.500" : 
                            errors.brand_name ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>
              {errors.brand_name}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Unit of Measure */}
          <FormControl isRequired={false} isInvalid={"unit_of_measure" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>
              <Text color="red.500">*</Text> Unit of Measure
            </FormControl.Label>
            <Input
              placeholder="Enter unit of measure"
              value={formData.unit_of_measure}
              onChangeText={handleUnitOfMeasureChange}
              borderColor={
                formData.unit_of_measure && !errors.unit_of_measure ? "green.500" : 
                errors.unit_of_measure ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.unit_of_measure && !errors.unit_of_measure ? "green.500" : 
                            errors.unit_of_measure ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>
              {errors.unit_of_measure}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Reorder Level */}
          <FormControl isInvalid={"reorder_level" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>Reorder Level</FormControl.Label>
            <Input
              keyboardType="numeric"
              placeholder="Enter reorder level"
              value={formData.reorder_level}
              onChangeText={handleReorderLevelChange}
              borderColor={
                formData.reorder_level && !errors.reorder_level ? "green.500" : 
                errors.reorder_level ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.reorder_level && !errors.reorder_level ? "green.500" : 
                            errors.reorder_level ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>
              {errors.reorder_level}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Expiration Date */}
          <FormControl isInvalid={"expiration_date" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>Expiration Date</FormControl.Label>
            <Pressable onPress={() => setShowExpirationDatePicker(true)}>
              <Input
                value={formData.expiration_date}
                placeholder="Select expiration date"
                isReadOnly
                borderColor={
                  formData.expiration_date && !errors.expiration_date ? "green.500" : 
                  errors.expiration_date ? "red.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.expiration_date && !errors.expiration_date ? "green.500" : 
                              errors.expiration_date ? "red.500" : "blue.500",
                }}
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
          <FormControl isInvalid={"in_date" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>In Date</FormControl.Label>
            <Pressable onPress={() => setShowInDatePicker(true)}>
              <Input
                value={formData.in_date}
                placeholder="Select in date"
                isReadOnly
                borderColor={
                  formData.in_date && !errors.in_date ? "green.500" : 
                  errors.in_date ? "red.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.in_date && !errors.in_date ? "green.500" : 
                              errors.in_date ? "red.500" : "blue.500",
                }}
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

          {/* Out Date */}
          <FormControl isInvalid={"out_date" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>Out Date</FormControl.Label>
            <Pressable onPress={() => setShowOutDatePicker(true)}>
              <Input
                value={formData.out_date}
                placeholder="Select out date"
                isReadOnly
                borderColor={
                  formData.out_date && !errors.out_date ? "green.500" : 
                  errors.out_date ? "red.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.out_date && !errors.out_date ? "green.500" : 
                              errors.out_date ? "red.500" : "blue.500",
                }}
                rightElement={
                  <IconButton
                    icon={
                      <MaterialIcons
                        name="calendar-today"
                        size={24}
                        color="gray"
                      />
                    }
                    onPress={() => setShowOutDatePicker(true)}
                  />
                }
              />
            </Pressable>
            <FormControl.ErrorMessage>
              {errors.out_date}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Date Pickers */}
          {showInDatePicker && (
            <DateTimePicker
              value={
                formData.in_date ? parseDate(formData.in_date) : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleInDateChange}
              maximumDate={
                formData.expiration_date
                  ? parseDate(formData.expiration_date)
                  : undefined
              }
            />
          )}

          {showOutDatePicker && (
            <DateTimePicker
              value={
                formData.out_date ? parseDate(formData.out_date) : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleOutDateChange}
              minimumDate={
                formData.in_date ? parseDate(formData.in_date) : undefined
              }
            />
          )}

          {showExpirationDatePicker && (
            <DateTimePicker
              value={
                formData.expiration_date
                  ? parseDate(formData.expiration_date)
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleExpirationDateChange}
              minimumDate={
                formData.in_date ? parseDate(formData.in_date) : new Date()
              }
            />
          )}

          {/* Status */}
          <FormControl flex={1}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>Status</FormControl.Label>
            <Pressable
              onPress={() => {
                if (statusSelect.current) {
                  statusSelect.current.focus();
                }
              }}
            >
              <Select
                ref={statusSelect}
                selectedValue={formData.in_or_out}
                onValueChange={(value) =>
                  setFormData({ ...formData, in_or_out: value })
                }
                isReadOnly={true}
                borderColor={
                  formData.in_or_out ? "green.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.in_or_out ? "green.500" : "blue.500",
                }}
              >
                {statusOptions.map((option) => (
                  <Select.Item
                    key={option.key}
                    label={option.value}
                    value={option.key}
                  />
                ))}
              </Select>
            </Pressable>
          </FormControl>

          {/* Tax Rate Input */}
          <FormControl isRequired={false} isInvalid={"tax_rate" in errors}>
            <FormControl.Label _text={{ fontWeight: "bold" }}>
              <Text color="red.500">*</Text> Tax Rate (%)
            </FormControl.Label>
            <Input
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={formData.tax_rate}
              onChangeText={handleTaxRateChange}
              borderColor={
                formData.tax_rate && !errors.tax_rate ? "green.500" : 
                errors.tax_rate ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.tax_rate && !errors.tax_rate ? "green.500" : 
                            errors.tax_rate ? "red.500" : "blue.500",
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
                <FormControl isRequired={false}>
                  <FormControl.Label _text={{ fontWeight: "bold" }}>Category Name</FormControl.Label>
                  <Input
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChangeText={handleCategoryNameChange}
                  />
                </FormControl>
              </Modal.Body>
              <Modal.Footer>
                <HStack flex={1} justifyContent="space-between">
                  <Button onPress={() => setAddCategoryModalOpen(false)} px={6}>
                    Cancel
                  </Button>
                  <Button
                    onPress={handleAddCategory}
                    px={6}
                    isDisabled={!newCategoryName.trim()}
                  >
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
