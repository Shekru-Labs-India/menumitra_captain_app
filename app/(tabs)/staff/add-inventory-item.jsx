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
    unitOfMeasure: "",
    reorderLevel: "",
    expirationDate: "",
    inDate: "",
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
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(`${API_BASE_URL}/get_supplier_list`, {
        method: "POST", // Use POST method as per the API requirement
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: storedRestaurantId, // Include restaurant_id in the request body
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
        setSuppliers(suppliersArray); // Set the suppliers state
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

  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.supplierId) newErrors.supplierId = "Supplier is required";
    if (!formData.category) newErrors.category = "Category is required";

    if (!formData.quantity) {
      newErrors.quantity = "Quantity is required";
    } else if (isNaN(formData.quantity) || Number(formData.quantity) <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }

    if (!formData.price) {
      newErrors.price = "Price is required";
    } else if (isNaN(formData.price) || Number(formData.price) <= 0) {
      newErrors.price = "Please enter a valid price";
    }

    if (!formData.unitOfMeasure)
      newErrors.unitOfMeasure = "Unit of measure is required";
    if (!formData.reorderLevel) {
      newErrors.reorderLevel = "Reorder level is required";
    } else if (
      isNaN(formData.reorderLevel) ||
      Number(formData.reorderLevel) < 0
    ) {
      newErrors.reorderLevel = "Please enter a valid reorder level";
    }

    if (!formData.brandName) newErrors.brandName = "Brand name is required";

    if (!formData.tax) {
      newErrors.tax = "Tax rate is required";
    } else if (isNaN(formData.tax) || Number(formData.tax) < 0) {
      newErrors.tax = "Please enter a valid tax rate";
    }

    if (!formData.inDate) newErrors.inDate = "In date is required";
    if (!formData.expirationDate)
      newErrors.expirationDate = "Expiration date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        const requestBody = {
          supplier_id: formData.supplierId, // Use supplierId from formData
          restaurant_id: restaurantId, // Use the stored restaurantId
          category_id: formData.category, // Use category from formData
          name: formData.name, // Use name from formData
          description: formData.description, // Use description from formData
          unit_price: formData.price, // Use price from formData
          quantity: formData.quantity, // Use quantity from formData
          unit_of_measure: formData.unitOfMeasure, // Use unitOfMeasure from formData
          reorder_level: formData.reorderLevel, // Use reorderLevel from formData
          brand_name: formData.brandName, // Use brandName from formData
          tax_rate: formData.tax, // Use tax from formData
          in_or_out: formData.status, // Use status from formData
          in_date: formData.inDate, // Use inDate from formData
          expiration_date: formData.expirationDate, // Use expirationDate from formData
        };

        console.log("Request Body:", requestBody);

        const response = await fetch(
          `${API_BASE_URL}/captain_manage/inventory_create`, // Ensure this is the correct endpoint
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
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
    } else {
      console.log("Form validation failed.");
    }
  };

  const handleAddCategory = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/inventory_category_create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newCategoryName }),
        }
      );

      const data = await response.json();
      if (data.st === 1) {
        toast.show({
          description: "Inventory Category Created Successfully",
          status: "success",
        });

        // Update categories state
        setCategories((prevCategories) => [
          ...prevCategories,
          { name: newCategoryName, inventory_category_id: data.newCategoryId }, // Assuming newCategoryId is returned
        ]);
        setNewCategoryName(""); // Clear the input
        setAddCategoryModalOpen(false); // Close the modal
      } else {
        toast.show({
          description: data.msg || "Failed to add category",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.show({
        description: "Failed to add category",
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
      setFormData({ ...formData, inDate: formatDate(selectedDate) });
    }
  };

  const handleExpirationDateChange = (event, selectedDate) => {
    setShowExpirationDatePicker(false);
    if (selectedDate && event.type !== "dismissed") {
      setFormData({ ...formData, expirationDate: formatDate(selectedDate) });
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
              onChangeText={(value) =>
                setFormData({ ...formData, name: value })
              }
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
          <FormControl isRequired isInvalid={"category" in errors}>
            <HStack justifyContent="space-between" alignItems="center">
              <FormControl.Label>Category</FormControl.Label>
              <IconButton
                icon={<MaterialIcons name="add" size={24} color="black" />}
                onPress={() => setAddCategoryModalOpen(true)}
              />
            </HStack>
            <Input
              placeholder="Search category"
              value={formData.category}
              onFocus={fetchCategories}
              onChangeText={(value) => {
                setFormData({ ...formData, category: value });
                const filteredCategories = categories.filter((category) =>
                  category.name.toLowerCase().includes(value.toLowerCase())
                );
                setFilteredCategories(filteredCategories);
              }}
            />
            <FormControl.ErrorMessage>
              {errors.category}
            </FormControl.ErrorMessage>

            {/* Autocomplete List */}
            {formData.category && filteredCategories.length > 0 && (
              <VStack
                mt={2}
                borderWidth={1}
                borderColor="gray.300"
                borderRadius="md"
                bg="white"
              >
                {filteredCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    onPress={() => {
                      setFormData({ ...formData, category: category.id });
                      setFilteredCategories([]);
                    }}
                  >
                    {category.name}
                  </Button>
                ))}
              </VStack>
            )}
          </FormControl>

          {/* Price Input */}
          <FormControl isRequired isInvalid={"price" in errors}>
            <FormControl.Label>Unit Price (₹)</FormControl.Label>
            <Input
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={formData.price}
              onChangeText={(value) => {
                // Allow only numbers and decimal point
                const formattedValue = value.replace(/[^0-9.]/g, "");
                setFormData({ ...formData, price: formattedValue });
              }}
            />
            <FormControl.ErrorMessage>{errors.price}</FormControl.ErrorMessage>
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
          <FormControl isRequired isInvalid={"brandName" in errors}>
            <FormControl.Label>Brand Name</FormControl.Label>
            <Input
              placeholder="Enter brand name"
              value={formData.brandName}
              onChangeText={(value) =>
                setFormData({ ...formData, brandName: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.brandName}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Unit of Measure */}
          <FormControl isRequired isInvalid={"unitOfMeasure" in errors}>
            <FormControl.Label>Unit of Measure</FormControl.Label>
            <Input
              placeholder="Enter unit of measure"
              value={formData.unitOfMeasure}
              onChangeText={(value) =>
                setFormData({ ...formData, unitOfMeasure: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.unitOfMeasure}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Reorder Level */}
          <FormControl isRequired isInvalid={"reorderLevel" in errors}>
            <FormControl.Label>Reorder Level</FormControl.Label>
            <Input
              keyboardType="numeric"
              placeholder="Enter reorder level"
              value={formData.reorderLevel}
              onChangeText={(value) =>
                setFormData({ ...formData, reorderLevel: value })
              }
            />
            <FormControl.ErrorMessage>
              {errors.reorderLevel}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* Expiration Date */}
          <FormControl isRequired isInvalid={"expirationDate" in errors}>
            <FormControl.Label>Expiration Date</FormControl.Label>
            <Pressable onPress={() => setShowExpirationDatePicker(true)}>
              <Input
                value={formData.expirationDate}
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
              {errors.expirationDate}
            </FormControl.ErrorMessage>
          </FormControl>

          {/* In Date */}
          <FormControl isRequired isInvalid={"inDate" in errors}>
            <FormControl.Label>In Date</FormControl.Label>
            <Pressable onPress={() => setShowInDatePicker(true)}>
              <Input
                value={formData.inDate}
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
            <FormControl.ErrorMessage>{errors.inDate}</FormControl.ErrorMessage>
          </FormControl>

          {/* Date Pickers */}
          {showInDatePicker && (
            <DateTimePicker
              value={formData.inDate ? new Date(formData.inDate) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleInDateChange}
            />
          )}

          {showExpirationDatePicker && (
            <DateTimePicker
              value={
                formData.expirationDate
                  ? new Date(formData.expirationDate)
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleExpirationDateChange}
              minimumDate={
                formData.inDate ? new Date(formData.inDate) : new Date()
              }
            />
          )}

          {/* Status */}
          <FormControl flex={1}>
            <FormControl.Label>Status</FormControl.Label>
            <Select
              selectedValue={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
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

          {/* Payment Status */}
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

          {/* Tax Rate Input */}
          <FormControl isRequired isInvalid={"tax" in errors}>
            <FormControl.Label>Tax Rate (%)</FormControl.Label>
            <Input
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={formData.tax}
              onChangeText={(value) => {
                // Allow only numbers and decimal point
                const formattedValue = value.replace(/[^0-9.]/g, "");
                setFormData({ ...formData, tax: formattedValue });
              }}
            />
            <FormControl.ErrorMessage>{errors.tax}</FormControl.ErrorMessage>
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
