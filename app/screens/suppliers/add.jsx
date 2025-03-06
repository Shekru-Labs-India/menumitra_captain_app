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
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

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
    mobilleNumber2: "",
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
      const data = await fetchWithAuth(
        `${getBaseUrl()}/supplier_credit_rating_choices`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

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
      const data = await fetchWithAuth(`${getBaseUrl()}/supplier_status_choices`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      console.log("Status Choices:", data);

      if (data.st === 1 && data.supplier_status_choices) {
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
    switch (field) {
      case "name":
        // Only allow letters and spaces
        const nameValue = value.replace(/[^a-zA-Z\s]/g, "");
        setFormData((prev) => ({ ...prev, name: nameValue }));

        if (!nameValue.trim()) {
          setErrors((prev) => ({ ...prev, name: "Supplier name is required" }));
        } else if (nameValue.trim().length < 2) {
          setErrors((prev) => ({ ...prev, name: "Name must be at least 2 characters" }));
        } else {
          setErrors((prev) => {
            const { name, ...rest } = prev;
            return rest;
          });
        }
        break;

      case "mobileNumber1":
      case "mobilleNumber2":
        const sanitizedNumber = value.replace(/[^0-9]/g, "");
        
        if (sanitizedNumber.length > 0) {
          const firstDigit = sanitizedNumber[0];
          if (!["6", "7", "8", "9"].includes(firstDigit)) {
            setErrors((prev) => ({
              ...prev,
              [field]: "Number must start with 6, 7, 8 or 9",
            }));
          } else if (sanitizedNumber.length !== 10) {
            setErrors((prev) => ({
              ...prev,
              [field]: "Mobile number must be 10 digits",
            }));
          } else {
            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[field];
              return newErrors;
            });
          }
        } else if (field === "mobileNumber1") {
          setErrors((prev) => ({
            ...prev,
            [field]: "Primary mobile number is required",
          }));
        } else {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
        
        setFormData((prev) => ({ ...prev, [field]: sanitizedNumber }));
        break;

      case "website":
        // Allow empty website field
        if (!value) {
          setFormData((prev) => ({ ...prev, website: value }));
          setErrors((prev) => {
            const { website, ...rest } = prev;
            return rest;
          });
          break;
        }

        // URL validation pattern
        const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
        setFormData((prev) => ({ ...prev, website: value }));
        
        if (!urlPattern.test(value)) {
          setErrors((prev) => ({ 
            ...prev, 
            website: "Invalid website format (e.g., www.example.com)" 
          }));
        } else {
          setErrors((prev) => {
            const { website, ...rest } = prev;
            return rest;
          });
        }
        break;

      case "creditLimit":
        const numericValue = value.replace(/[^0-9]/g, "");
        setFormData((prev) => ({ ...prev, creditLimit: numericValue }));

        if (!numericValue) {
          setErrors((prev) => ({ ...prev, creditLimit: "Credit limit is required" }));
        } else {
          setErrors((prev) => {
            const { creditLimit, ...rest } = prev;
            return rest;
          });
        }
        break;

      case "ownerName":
        const ownerNameValue = value.replace(/[^a-zA-Z\s]/g, "");
        setFormData((prev) => ({ ...prev, ownerName: ownerNameValue }));

        if (ownerNameValue && ownerNameValue.trim().length < 2) {
          setErrors((prev) => ({ ...prev, ownerName: "Name must be at least 2 characters" }));
        } else {
          setErrors((prev) => {
            const { ownerName, ...rest } = prev;
            return rest;
          });
        }
        break;

      case "location":
        setFormData((prev) => ({ ...prev, location: value }));
        if (value && value.trim().length < 2) {
          setErrors((prev) => ({ ...prev, location: "Location must be at least 2 characters" }));
        } else {
          setErrors((prev) => {
            const { location, ...rest } = prev;
            return rest;
          });
        }
        break;

      case "address":
        setFormData((prev) => ({ ...prev, address: value }));
        if (!value.trim()) {
          setErrors((prev) => ({ ...prev, address: "Address is required" }));
        } else if (value.trim().length < 5) {
          setErrors((prev) => ({ ...prev, address: "Address must be at least 5 characters" }));
        } else {
          setErrors((prev) => {
            const { address, ...rest } = prev;
            return rest;
          });
        }
        break;

      default:
        setFormData((prev) => ({ ...prev, [field]: value }));
    }
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
    const newErrors = {};

    // Check required fields
    if (!formData.name) {
      newErrors.name = "Supplier name is required";
    } else if (!validateName(formData.name)) {
      newErrors.name = "Supplier name should only contain letters";
    }

    if (!formData.mobileNumber1) {
      newErrors.mobileNumber1 = "Primary mobile number is required";
    } else if (!validateMobileNumber(formData.mobileNumber1)) {
      newErrors.mobileNumber1 = "Mobile number should only contain digits";
    } else if (formData.mobileNumber1.length !== 10) {
      newErrors.mobileNumber1 = "Mobile number must be 10 digits";
    }

    if (formData.mobilleNumber2) {
      if (!validateMobileNumber(formData.mobilleNumber2)) {
        newErrors.mobilleNumber2 = "Mobile number should only contain digits";
      } else if (formData.mobilleNumber2.length !== 10) {
        newErrors.mobilleNumber2 = "Mobile number must be 10 digits";
      }
    }

    if (!formData.creditLimit) {
      newErrors.creditLimit = "Credit limit is required";
    }

    if (!formData.address?.trim()) {
      newErrors.address = "Address is required";
    } else if (!validateAddress(formData.address)) {
      newErrors.address = "Address must be at least 5 characters long";
    }

    if (formData.location && !validateLocation(formData.location)) {
      newErrors.location = "Location contains invalid characters";
    }

    // Website validation (if provided)
    if (formData.website) {
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
      if (!urlPattern.test(formData.website)) {
        newErrors.website = "Invalid website format (e.g., www.example.com)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const storedOutletId = await AsyncStorage.getItem("outlet_id");
      const storedUserId = await AsyncStorage.getItem("user_id");

      if (!storedOutletId || !storedUserId) {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
        return;
      }

      const requestBody = {
        outlet_id: storedOutletId.toString(),
        user_id: storedUserId.toString(),
        name: formData.name.trim(),
        supplier_status: formData.status || "active",
        credit_rating: formData.creditRating || "",
        credit_limit: formData.creditLimit ? parseInt(formData.creditLimit) : 0,
        location: formData.location?.trim() || "",
        owner_name: formData.ownerName?.trim() || "",
        website: formData.website?.trim() || "",
        mobile_number1: formData.mobileNumber1?.trim() || "",
        mobille_number2: formData.mobilleNumber2?.trim() || "", // Send empty string if no value
        address: formData.address?.trim() || "",
      };

      console.log("Request Body:", requestBody);

      const data = await fetchWithAuth(`${getBaseUrl()}/supplier_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      console.log("Create Supplier Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Supplier created successfully",
          status: "success",
          duration: 3000,
        });
        router.back();
      } else {
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

              <FormControl isRequired isInvalid={"name" in errors}>
                <FormControl.Label>Name</FormControl.Label>
                <Input
                  value={formData.name}
                  onChangeText={(text) => handleFormChange("name", text)}
                  placeholder="Enter supplier name"
                  bg="white"
                  borderColor={
                    formData.name && !errors.name ? "green.500" : 
                    errors.name ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.name && !errors.name ? "green.500" : 
                                errors.name ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.name}
                </FormControl.ErrorMessage>
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

              <FormControl isRequired isInvalid={"mobileNumber1" in errors}>
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
                  borderColor={
                    formData.mobileNumber1 && !errors.mobileNumber1 ? "green.500" : 
                    errors.mobileNumber1 ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.mobileNumber1 && !errors.mobileNumber1 ? "green.500" : 
                                errors.mobileNumber1 ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.mobileNumber1}
                </FormControl.ErrorMessage>
              </FormControl>

              <FormControl isInvalid={"mobilleNumber2" in errors}>
                <FormControl.Label>Mobile Number 2</FormControl.Label>
                <Input
                  value={formData.mobilleNumber2}
                  onChangeText={(text) =>
                    handleFormChange("mobilleNumber2", text)
                  }
                  placeholder="Enter secondary mobile number"
                  keyboardType="numeric"
                  maxLength={10}
                  bg="white"
                  borderColor={
                    formData.mobilleNumber2 && !errors.mobilleNumber2 ? "green.500" : 
                    errors.mobilleNumber2 ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.mobilleNumber2 && !errors.mobilleNumber2 ? "green.500" : 
                                errors.mobilleNumber2 ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.mobilleNumber2}
                </FormControl.ErrorMessage>
              </FormControl>

              <FormControl isInvalid={"website" in errors}>
                <FormControl.Label>Website</FormControl.Label>
                <Input
                  value={formData.website}
                  onChangeText={(text) => handleFormChange("website", text)}
                  placeholder="Enter website URL"
                  keyboardType="url"
                  bg="white"
                  borderColor={
                    formData.website && !errors.website ? "green.500" : 
                    errors.website ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.website && !errors.website ? "green.500" : 
                                errors.website ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.website}
                </FormControl.ErrorMessage>
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
                    borderColor={
                      formData.creditRating && !errors.creditRating ? "green.500" : 
                      errors.creditRating ? "red.500" : "coolGray.200"
                    }
                    _focus={{
                      borderColor: formData.creditRating && !errors.creditRating ? "green.500" : 
                                  errors.creditRating ? "red.500" : "blue.500",
                    }}
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

              <FormControl isRequired isInvalid={"creditLimit" in errors}>
                <FormControl.Label>Credit Limit</FormControl.Label>
                <Input
                  value={formData.creditLimit}
                  onChangeText={(text) => handleFormChange("creditLimit", text)}
                  placeholder="Enter credit limit"
                  keyboardType="numeric"
                  bg="white"
                  borderColor={
                    formData.creditLimit && !errors.creditLimit ? "green.500" : 
                    errors.creditLimit ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.creditLimit && !errors.creditLimit ? "green.500" : 
                                errors.creditLimit ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.creditLimit}
                </FormControl.ErrorMessage>
              </FormControl>

              <FormControl>
                <FormControl.Label>Owner Name</FormControl.Label>
                <Input
                  value={formData.ownerName}
                  onChangeText={(text) =>
                    handleFormChange("ownerName", text)
                  }
                  placeholder="Enter owner name"
                  bg="white"
                  borderColor={
                    formData.ownerName && !errors.ownerName ? "green.500" : 
                    errors.ownerName ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.ownerName && !errors.ownerName ? "green.500" : 
                                errors.ownerName ? "red.500" : "blue.500",
                  }}
                />
              </FormControl>

              <FormControl isInvalid={"location" in errors}>
                <FormControl.Label>Location</FormControl.Label>
                <Input
                  value={formData.location}
                  onChangeText={(text) => handleFormChange("location", text)}
                  placeholder="Enter location"
                  bg="white"
                  borderColor={
                    formData.location && !errors.location ? "green.500" : 
                    errors.location ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.location && !errors.location ? "green.500" : 
                                errors.location ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.location}
                </FormControl.ErrorMessage>
              </FormControl>

              <FormControl isRequired isInvalid={"address" in errors}>
                <FormControl.Label>Address</FormControl.Label>
                <TextArea
                  value={formData.address}
                  onChangeText={(text) => handleFormChange("address", text)}
                  placeholder="Enter complete address"
                  autoCompleteType={undefined}
                  h={20}
                  bg="white"
                  borderColor={
                    formData.address && !errors.address ? "green.500" : 
                    errors.address ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.address && !errors.address ? "green.500" : 
                                errors.address ? "red.500" : "blue.500",
                  }}
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
