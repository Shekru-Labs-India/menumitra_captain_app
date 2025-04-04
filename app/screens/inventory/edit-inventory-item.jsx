import { useState, useEffect, useRef } from "react";
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
  IconButton,
} from "native-base";
import { Platform, StatusBar } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../components/Header";
import { MaterialIcons } from "@expo/vector-icons";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

export default function EditInventoryItemScreen() {
  const router = useRouter();
  const toast = useToast();
  const { itemId } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [outletId, setOutletId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [formData, setFormData] = useState({
    inventory_id: "",
    outlet_id: "",
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

  const categorySelect = useRef(null);
  const supplierSelect = useRef(null);
  const statusSelect = useRef(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Fetch both categories and suppliers
        const [categoriesData, suppliersData] = await Promise.all([
          fetchCategories(),
          fetchSuppliers(),
        ]);

        // Then get stored data
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          setOutletId(storedOutletId);
          // Pass the categories to fetchInventoryDetails
          await fetchInventoryDetails(storedOutletId, itemId, categoriesData);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();
  }, []);

  const fetchInventoryDetails = async (outId, invId, availableCategories) => {
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/inventory_view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outId.toString(),
          inventory_id: invId.toString(),
        }),
      });

      if (data.st === 1 && data.data) {
        // Find the matching category
        const categoryObj = availableCategories.find(
          (cat) => cat.name.toLowerCase() === data.data.category?.toLowerCase()
        );

        console.log("API Category:", data.data.category);
        console.log("Found Category:", categoryObj);
        console.log("Available Categories:", availableCategories);

        setFormData({
          inventory_id: data.data.inventory_id?.toString() || "",
          outlet_id: data.data.outlet_id?.toString() || "",
          supplier_id: data.data.supplier_id?.toString() || "",
          category_id: categoryObj?.id || "",
          name: data.data.name || "",
          description: data.data.description || "",
          unit_price: data.data.unit_price?.toString() || "",
          quantity: data.data.quantity?.toString() || "",
          unit_of_measure: data.data.unit_of_measure || "",
          reorder_level: data.data.reorder_level?.toString() || "",
          brand_name: data.data.brand_name || "",
          tax_rate: data.data.tax_rate?.toString() || "",
          in_or_out: data.data.in_or_out || "in",
          in_date: data.data.in_date || "",
          out_date: data.data.out_date || "",
          expiration_date: data.data.expiration_date || "",
        });
        setIsInitialized(true);
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
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const data = await fetchWithAuth(`${getBaseUrl()}/get_supplier_list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: storedOutletId,
        }),
      });

      if (data.st === 1) {
        const suppliersArray = Object.entries(data.suppliers_dict).map(
          ([name, id]) => ({
            name,
            id,
          })
        );
        setSuppliers(suppliersArray);
        return suppliersArray;
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.show({
        description: "Error fetching suppliers",
        status: "error",
      });
    }
    return [];
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWithAuth(
        `${getBaseUrl()}/get_inventory_category_list`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (data.st === 1) {
        const categoriesArray = Object.entries(
          data.inventory_categorys_list
        ).map(([name, id]) => ({
          name,
          id: id.toString(),
        }));
        setCategories(categoriesArray);
        return categoriesArray;
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.show({
        description: "Error fetching categories",
        status: "error",
      });
    }
    return [];
  };

  // Add these handlers for name and brand name validation
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

  const handleUnitOfMeasureChange = (text) => {
    // Only allow letters and spaces
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setFormData((prev) => ({ ...prev, unit_of_measure: sanitizedText }));
    
    if (!sanitizedText.trim()) {
      setErrors((prev) => ({ ...prev, unit_of_measure: "Unit of measure is required" }));
    } else if (sanitizedText.trim().length < 2) {
      setErrors((prev) => ({ ...prev, unit_of_measure: "Unit of measure must be at least 2 characters" }));
    } else {
      setErrors((prev) => {
        const { unit_of_measure, ...rest } = prev;
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

  const validateForm = () => {
    const newErrors = {};
    const nameRegex = /^[a-zA-Z\s]+$/;

    // Validate name
    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    } else if (!nameRegex.test(formData.name.trim())) {
      newErrors.name = "Name can only contain letters and spaces";
    }

    // Validate required fields
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
    if (!formData.tax_rate || Number(formData.tax_rate) < 0) {
      newErrors.tax_rate = "Valid tax rate is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Get user_id
      const userId = await AsyncStorage.getItem("user_id");

      // Check if user_id exists
      if (!userId) {
        throw new Error("User ID not found. Please login again.");
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/inventory_update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId.toString(),
          inventory_id: formData.inventory_id.toString(),
          supplier_id: formData.supplier_id.toString(),
          category_id: formData.category_id.toString(),
          name: formData.name,
          description: formData.description,
          unit_price: formData.unit_price.toString(),
          quantity: formData.quantity.toString(),
          unit_of_measure: formData.unit_of_measure,
          reorder_level: formData.reorder_level.toString(),
          brand_name: formData.brand_name,
          tax_rate: formData.tax_rate.toString(),
          in_or_out: formData.in_or_out,
          in_date: formData.in_date,
          out_date: formData.out_date,
          expiration_date: formData.expiration_date,
          user_id: userId.toString(),
        }),
      });

      if (data.st === 1) {
        toast.show({
          description: "Inventory item updated successfully",
          status: "success",
        });
        router.push({
          pathname: "/screens/inventory/inventory-item-details",
          params: {
            itemId: formData.inventory_id,
            refresh: Date.now(),
          },
        });
      } else {
        throw new Error(data.msg || "Failed to update inventory item");
      }
    } catch (error) {
      console.error("Update Error:", error);
      toast.show({
        description: error.message || "Failed to update inventory item",
        status: "error",
      });
    } finally {
      setIsLoading(false);
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
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");

    if (event.type === "set" && selectedDate) {
      setFormData((prev) => ({
        ...prev,
        [currentDateField]: formatDate(selectedDate),
      }));
    }
  };

  const prepareDataForSubmission = (data) => {
    // Convert dates to API expected format if needed
    const prepared = {
      ...data,
      in_date: data.in_date || "",
      out_date: data.out_date || "",
      expiration_date: data.expiration_date || "",
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
              onChangeText={handleNameChange}
              placeholder="Enter item name"
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

          {/* Description */}
          <FormControl>
            <FormControl.Label>Description</FormControl.Label>
            <TextArea
              value={formData.description}
              onChangeText={(value) => {
                setFormData({ ...formData, description: value });
                // Clear any errors
                setErrors((prev) => {
                  const { description, ...rest } = prev;
                  return rest;
                });
              }}
              placeholder="Enter description"
              h={20}
              borderColor={formData.description ? "green.500" : "coolGray.200"}
              _focus={{
                borderColor: formData.description ? "green.500" : "blue.500",
              }}
            />
          </FormControl>

          {/* Unit Price */}
          <FormControl isRequired isInvalid={"unit_price" in errors}>
            <FormControl.Label>Unit Price</FormControl.Label>
            <Input
              value={formData.unit_price}
              onChangeText={handleUnitPriceChange}
              keyboardType="numeric"
              placeholder="Enter unit price"
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

          {/* Quantity */}
          <FormControl isRequired isInvalid={"quantity" in errors}>
            <FormControl.Label>Quantity</FormControl.Label>
            <Input
              value={formData.quantity}
              onChangeText={handleQuantityChange}
              keyboardType="numeric"
              placeholder="Enter quantity"
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

          {/* Unit of Measure */}
          <FormControl isRequired isInvalid={"unit_of_measure" in errors}>
            <FormControl.Label>Unit of Measure</FormControl.Label>
            <Input
              value={formData.unit_of_measure}
              onChangeText={handleUnitOfMeasureChange}
              placeholder="Enter unit of measure"
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
            <FormControl.Label>Reorder Level</FormControl.Label>
            <Input
              value={formData.reorder_level}
              onChangeText={handleReorderLevelChange}
              keyboardType="numeric"
              placeholder="Enter reorder level"
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

          {/* Brand Name */}
          <FormControl isInvalid={"brand_name" in errors}>
            <FormControl.Label>Brand Name</FormControl.Label>
            <Input
              value={formData.brand_name}
              onChangeText={handleBrandNameChange}
              placeholder="Enter brand name"
              autoCapitalize="words"
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

          {/* Tax Rate */}
          <FormControl isRequired isInvalid={"tax_rate" in errors}>
            <FormControl.Label>Tax Rate (%)</FormControl.Label>
            <Input
              value={formData.tax_rate}
              onChangeText={handleTaxRateChange}
              keyboardType="numeric"
              placeholder="Enter tax rate"
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

          {/* Status Selection */}
          <FormControl>
            <FormControl.Label>Status (In/Out)</FormControl.Label>
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
                placeholder="Select status"
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, in_or_out: value }));
                }}
                isReadOnly={true}
                borderColor={formData.in_or_out ? "green.500" : "coolGray.200"}
                _focus={{
                  borderColor: formData.in_or_out ? "green.500" : "blue.500",
                }}
              >
                <Select.Item label="IN" value="in" />
                <Select.Item label="OUT" value="out" />
              </Select>
            </Pressable>
            <FormControl.HelperText>
              {formData.in_or_out === "in" 
                ? "Stock is being added to inventory" 
                : "Stock is being removed from inventory"}
            </FormControl.HelperText>
          </FormControl>

          {/* Dates */}
          <FormControl>
            <FormControl.Label>In Date</FormControl.Label>
            <Pressable onPress={() => showDatepicker("in_date")}>
              <Input
                value={formData.in_date}
                isReadOnly
                placeholder="Select in date"
                borderColor={
                  formData.in_date ? "green.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.in_date ? "green.500" : "blue.500",
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
                    onPress={() => showDatepicker("in_date")}
                  />
                }
              />
            </Pressable>
          </FormControl>

          <FormControl>
            <FormControl.Label>Out Date</FormControl.Label>
            <Pressable onPress={() => showDatepicker("out_date")}>
              <Input
                value={formData.out_date}
                isReadOnly
                placeholder="Select out date"
                borderColor={
                  formData.out_date ? "green.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.out_date ? "green.500" : "blue.500",
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
                    onPress={() => showDatepicker("out_date")}
                  />
                }
              />
            </Pressable>
          </FormControl>

          <FormControl>
            <FormControl.Label>Expiration Date</FormControl.Label>
            <Pressable onPress={() => showDatepicker("expiration_date")}>
              <Input
                value={formData.expiration_date}
                isReadOnly
                placeholder="Select expiration date"
                borderColor={
                  formData.expiration_date ? "green.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.expiration_date ? "green.500" : "blue.500",
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
                    onPress={() => showDatepicker("expiration_date")}
                  />
                }
              />
            </Pressable>
          </FormControl>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={
                formData[currentDateField]
                  ? parseDate(formData[currentDateField])
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
              minimumDate={
                currentDateField === "expiration_date" && formData.in_date
                  ? parseDate(formData.in_date)
                  : undefined
              }
              maximumDate={
                currentDateField === "in_date" && formData.expiration_date
                  ? parseDate(formData.expiration_date)
                  : undefined
              }
            />
          )}

          {/* Category Selection */}
          <FormControl isRequired isInvalid={"category_id" in errors}>
            <FormControl.Label>Category</FormControl.Label>
            <Pressable
              onPress={() => {
                if (categorySelect.current) {
                  categorySelect.current.focus();
                }
              }}
            >
              <Select
                ref={categorySelect}
                selectedValue={formData.category_id}
                placeholder="Select category"
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, category_id: value }));
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

          {/* Supplier Selection */}
          <FormControl isRequired isInvalid={"supplier_id" in errors}>
            <FormControl.Label>Supplier</FormControl.Label>
            <Pressable
              onPress={() => {
                if (supplierSelect.current) {
                  supplierSelect.current.focus();
                }
              }}
            >
              <Select
                ref={supplierSelect}
                selectedValue={formData.supplier_id}
                placeholder="Select supplier"
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, supplier_id: value }));
                  if (value) {
                    setErrors((prev) => {
                      const { supplier_id, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                isReadOnly={true}
                borderColor={
                  formData.supplier_id && !errors.supplier_id ? "green.500" : 
                  errors.supplier_id ? "red.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.supplier_id && !errors.supplier_id ? "green.500" : 
                              errors.supplier_id ? "red.500" : "blue.500",
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
              {errors.supplier_id}
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
