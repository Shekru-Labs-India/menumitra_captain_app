import { useState, useContext, useEffect, useRef } from "react";
import {
  Box,
  ScrollView,
  Heading,
  VStack,
  IconButton,
  Button,
  useToast,
  Icon,
  FormControl,
  Input,
  TextArea,
  Select,
  CheckIcon,
  HStack,
  Pressable,
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { SupplierContext } from "../../../context/SupplierContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Header from "../../components/Header";

const API_BASE_URL = "https://men4u.xyz/common_api";

export default function AddSupplierScreen() {
  const router = useRouter();
  const toast = useToast();
  const { addSupplier } = useContext(SupplierContext);

  const [formData, setFormData] = useState({
    name: "",
    status: "",
    creditRating: "",
    creditLimit: "",
    location: "",
    ownerName: "",
    website: "",
    mobileNumber1: "",
    mobileNumber2: "",
    address: "",
  });

  const [creditRatings, setCreditRatings] = useState([]);
  const [statusChoices, setStatusChoices] = useState([]);
  const [errors, setErrors] = useState({});
  const [outletId, setOutletId] = useState(null);

  const creditRatingSelect = useRef(null);
  const statusSelect = useRef(null);

  useEffect(() => {
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

    getStoredData();
    fetchCreditRatings();
    fetchStatusChoices();
  }, []);

  const fetchCreditRatings = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/supplier_credit_rating_choices`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (data.st === 1 && data.credit_rating_choices) {
        const ratingsArray = Object.entries(data.credit_rating_choices).map(
          ([key, value]) => ({
            value: key,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          })
        );
        setCreditRatings(ratingsArray);
      }
    } catch (error) {
      console.error("Error fetching credit ratings:", error);
      toast.show({
        description: "Failed to load credit rating options",
        status: "error",
      });
    }
  };

  const fetchStatusChoices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/supplier_status_choices`, {
        method: "GET",
      });

      const data = await response.json();
      console.log("Status Choices:", data);

      if (data.st === 1 && data.supplier_status_choices) {
        // Convert the choices object to an array of options
        const choices = Object.entries(data.supplier_status_choices).map(
          ([key]) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: key,
          })
        );
        setStatusChoices(choices);
      }
    } catch (error) {
      console.error("Failed to fetch status choices:", error);
      toast.show({
        description: "Failed to load status options",
        status: "error",
      });
    }
  };

  // Add validation functions
  const validateName = (text) => {
    return /^[a-zA-Z\s]+$/.test(text); // Only letters and spaces
  };

  const validateMobileNumber = (text) => {
    return /^[0-9]+$/.test(text); // Only numbers
  };

  const validateLocation = (text) => {
    return /^[a-zA-Z0-9\s,.-]+$/.test(text); // Letters, numbers, spaces, commas, dots, hyphens
  };

  const validateAddress = (text) => {
    return text.trim().length >= 5;
  };

  // Update form change handler
  const handleFormChange = (field, value) => {
    let isValid = true;
    let sanitizedValue = value.trim();

    switch (field) {
      case "name":
        isValid = validateName(sanitizedValue);
        if (!isValid && sanitizedValue.length > 0) {
          toast.show({
            description: "Supplier name should only contain letters",
            status: "error",
          });
          return;
        }
        break;

      case "mobileNumber1":
      case "mobileNumber2":
        // Only validate if there's input and it's not being deleted
        if (sanitizedValue.length > 0) {
          isValid = validateMobileNumber(sanitizedValue);
          if (!isValid) {
            toast.show({
              description: "Mobile number should only contain digits",
              status: "error",
            });
            return;
          }
          // Only show length error when user has finished typing (10+ digits)
          if (sanitizedValue.length > 10) {
            toast.show({
              description: "Mobile number should be 10 digits",
              status: "error",
            });
            return;
          }
        }
        break;

      case "location":
        isValid = validateLocation(sanitizedValue);
        if (!isValid && sanitizedValue.length > 0) {
          // Only show error if there's input
          toast.show({
            description: "Location should not contain special characters",
            status: "error",
          });
          return;
        }
        break;
    }

    // Always update the form data while typing
    setFormData((prev) => ({ ...prev, [field]: value })); // Use original value instead of sanitizedValue
  };

  const handleAddressChange = (text) => {
    setFormData({ ...formData, address: text });

    if (!text.trim()) {
      setErrors((prev) => ({ ...prev, address: "Address is required" }));
    } else if (text.trim().length < 5) {
      setErrors((prev) => ({
        ...prev,
        address: "Address must be at least 5 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, address: undefined }));
    }
  };

  const validateForm = () => {
    // Check required fields
    if (!formData.name) {
      toast.show({
        title: "Required Field",
        description: "Please enter supplier name",
        status: "warning",
        duration: 3000,
      });
      return false;
    }

    if (!formData.mobileNumber1) {
      toast.show({
        title: "Required Field",
        description: "Please enter primary mobile number",
        status: "warning",
        duration: 3000,
      });
      return false;
    }

    // Validate name format
    if (!validateName(formData.name)) {
      toast.show({
        title: "Invalid Input",
        description: "Supplier name should only contain letters",
        status: "error",
        duration: 3000,
      });
      return false;
    }

    // Validate mobile number format and length at submission
    if (formData.mobileNumber1) {
      if (!validateMobileNumber(formData.mobileNumber1)) {
        toast.show({
          title: "Invalid Input",
          description: "Primary mobile number should only contain digits",
          status: "error",
          duration: 3000,
        });
        return false;
      }
      if (formData.mobileNumber1.length !== 10) {
        toast.show({
          title: "Invalid Input",
          description: "Primary mobile number must be 10 digits",
          status: "error",
          duration: 3000,
        });
        return false;
      }
    }

    // Validate secondary mobile number if provided
    if (formData.mobileNumber2) {
      if (!validateMobileNumber(formData.mobileNumber2)) {
        toast.show({
          title: "Invalid Input",
          description: "Secondary mobile number should only contain digits",
          status: "error",
          duration: 3000,
        });
        return false;
      }
      if (formData.mobileNumber2.length !== 10) {
        toast.show({
          title: "Invalid Input",
          description: "Secondary mobile number must be 10 digits",
          status: "error",
          duration: 3000,
        });
        return false;
      }
    }

    // Validate location if provided
    if (formData.location && !validateLocation(formData.location)) {
      toast.show({
        title: "Invalid Input",
        description: "Location contains invalid characters",
        status: "error",
        duration: 3000,
      });
      return false;
    }

    // Add address validation
    if (!formData.address?.trim()) {
      toast.show({
        title: "Required Field",
        description: "Please enter address",
        status: "warning",
        duration: 3000,
      });
      return false;
    }

    if (!validateAddress(formData.address)) {
      toast.show({
        title: "Invalid Input",
        description: "Address must be at least 5 characters long",
        status: "error",
        duration: 3000,
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      if (!storedOutletId) {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/supplier_create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outlet_id: storedOutletId.toString(),
          name: formData.name.trim(),
          supplier_status: formData.status || "active",
          credit_rating: formData.creditRating || "",
          credit_limit: formData.creditLimit
            ? parseInt(formData.creditLimit)
            : 0,
          location: formData.location?.trim() || "",
          owner_name: formData.ownerName?.trim() || "",
          website: formData.website?.trim() || "",
          mobile_number1: formData.mobileNumber1?.trim() || "",
          mobile_number2: formData.mobileNumber2?.trim() || "",
          address: formData.address?.trim() || "",
        }),
      });

      const data = await response.json();
      console.log("Create Supplier Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Supplier created successfully",
          status: "success",
          duration: 3000,
        });
        router.back();
      } else {
        // Handle specific error for duplicate mobile number
        if (data.msg?.toLowerCase().includes("mobile number already exists")) {
          toast.show({
            title: "Duplicate Mobile Number",
            description:
              "This mobile number is already registered with another supplier",
            status: "error",
            duration: 3000,
          });
        } else {
          throw new Error(data.msg || "Failed to create supplier");
        }
      }
    } catch (error) {
      console.error("Create Error:", error);
      toast.show({
        description: error.message || "Failed to create supplier",
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <Box flex={1} bg="coolGray.100" safeAreaTop>
      {/* Header Component */}
      <Header title="Add New Supplier" onBackPress={() => router.back()} />

      {/* Content */}
      <ScrollView
        flex={1}
        bg="coolGray.100"
        showsVerticalScrollIndicator={false}
      >
        <VStack space={4} p={4} mt={2}>
          {/* Basic Information Card */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={4}>
              <HStack space={2} alignItems="center" mb={2}>
                <MaterialIcons name="info" size={20} color="coolGray.600" />
                <Heading size="sm" color="coolGray.600">
                  Basic Information
                </Heading>
              </HStack>

              <FormControl isRequired>
                <FormControl.Label>Name</FormControl.Label>
                <Input
                  value={formData.name}
                  onChangeText={(text) => handleFormChange("name", text)}
                  placeholder="Enter supplier name"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Status</FormControl.Label>
                <Pressable
                  onPress={() => {
                    if (statusSelect.current) {
                      statusSelect.current.focus();
                    }
                  }}
                >
                  <Select
                    ref={statusSelect}
                    selectedValue={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                    placeholder="Select status"
                    bg="white"
                    isReadOnly={true}
                  >
                    {statusChoices.map((status) => (
                      <Select.Item
                        key={status.value}
                        label={status.label}
                        value={status.value}
                      />
                    ))}
                  </Select>
                </Pressable>
              </FormControl>
            </VStack>
          </Box>

          {/* Contact Information Card */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={4}>
              <HStack space={2} alignItems="center" mb={2}>
                <MaterialIcons name="contacts" size={20} color="coolGray.600" />
                <Heading size="sm" color="coolGray.600">
                  Contact Information
                </Heading>
              </HStack>

              <FormControl isRequired>
                <FormControl.Label>Mobile Number 1</FormControl.Label>
                <Input
                  value={formData.mobileNumber1}
                  onChangeText={(text) =>
                    handleFormChange("mobileNumber1", text)
                  }
                  placeholder="Enter primary mobile number"
                  keyboardType="numeric"
                  maxLength={10}
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Mobile Number 2</FormControl.Label>
                <Input
                  value={formData.mobileNumber2}
                  onChangeText={(text) =>
                    handleFormChange("mobileNumber2", text)
                  }
                  placeholder="Enter secondary mobile number"
                  keyboardType="numeric"
                  maxLength={10}
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Website</FormControl.Label>
                <Input
                  value={formData.website}
                  onChangeText={(text) =>
                    setFormData({ ...formData, website: text })
                  }
                  placeholder="Enter website URL"
                  keyboardType="url"
                  bg="white"
                />
              </FormControl>
            </VStack>
          </Box>

          {/* Business Information Card */}
          <Box bg="white" p={4} rounded="lg" shadow={1} mb={6}>
            <VStack space={4}>
              <HStack space={2} alignItems="center" mb={2}>
                <MaterialIcons name="business" size={20} color="coolGray.600" />
                <Heading size="sm" color="coolGray.600">
                  Business Information
                </Heading>
              </HStack>

              <FormControl>
                <FormControl.Label>Credit Rating</FormControl.Label>
                <Pressable
                  onPress={() => {
                    if (creditRatingSelect.current) {
                      creditRatingSelect.current.focus();
                    }
                  }}
                >
                  <Select
                    ref={creditRatingSelect}
                    selectedValue={formData.creditRating}
                    onValueChange={(value) =>
                      setFormData({ ...formData, creditRating: value })
                    }
                    placeholder="Select credit rating"
                    bg="white"
                    isReadOnly={true}
                  >
                    {creditRatings.map((rating) => (
                      <Select.Item
                        key={rating.value}
                        label={rating.label}
                        value={rating.value}
                      />
                    ))}
                  </Select>
                </Pressable>
              </FormControl>

              <FormControl>
                <FormControl.Label>Credit Limit</FormControl.Label>
                <Input
                  value={formData.creditLimit}
                  onChangeText={(text) =>
                    setFormData({ ...formData, creditLimit: text })
                  }
                  placeholder="Enter credit limit"
                  keyboardType="numeric"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Owner Name</FormControl.Label>
                <Input
                  value={formData.ownerName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, ownerName: text })
                  }
                  placeholder="Enter owner name"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Location</FormControl.Label>
                <Input
                  value={formData.location}
                  onChangeText={(text) => handleFormChange("location", text)}
                  placeholder="Enter location"
                  bg="white"
                />
              </FormControl>

              <FormControl isRequired isInvalid={"address" in errors}>
                <FormControl.Label>Address</FormControl.Label>
                <TextArea
                  value={formData.address}
                  onChangeText={handleAddressChange}
                  placeholder="Enter complete address (minimum 5 characters)"
                  autoCompleteType={undefined}
                  h={20}
                  bg="white"
                />
                <FormControl.ErrorMessage>
                  {errors.address}
                </FormControl.ErrorMessage>
              </FormControl>

              <Button
                mt={2}
                colorScheme="blue"
                onPress={handleSave}
                leftIcon={<MaterialIcons name="save" size={20} color="white" />}
              >
                Save Supplier
              </Button>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}
