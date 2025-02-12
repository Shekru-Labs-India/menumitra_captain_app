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
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(
        `${getBaseUrl()}/supplier_credit_rating_choices`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
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
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${getBaseUrl()}/supplier_status_choices`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
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
        } else {
          setErrors((prev) => ({ ...prev, name: undefined }));
        }
        break;

      case "mobileNumber1":
      case "mobileNumber2":
        // Only allow digits
        const sanitizedNumber = value.replace(/[^0-9]/g, "");

        if (field === "mobileNumber1" && !sanitizedNumber) {
          setErrors((prev) => ({
            ...prev,
            [field]: "Primary mobile number is required",
          }));
        } else if (sanitizedNumber.length > 0) {
          const firstDigit = sanitizedNumber[0];
          if (!["6", "7", "8", "9"].includes(firstDigit)) {
            setFormData((prev) => ({
              ...prev,
              [field]:
                prev[field] && ["6", "7", "8", "9"].includes(prev[field][0])
                  ? prev[field]
                  : "",
            }));
            setErrors((prev) => ({
              ...prev,
              [field]: "Number must start with 6, 7, 8 or 9",
            }));
            return;
          } else if (sanitizedNumber.length !== 10) {
            setErrors((prev) => ({
              ...prev,
              [field]: "Mobile number must be 10 digits",
            }));
          } else {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
          }
        } else {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }

        setFormData((prev) => ({ ...prev, [field]: sanitizedNumber }));
        break;

      case "ownerName":
        // Only allow letters and spaces
        if (!/^[a-zA-Z\s]*$/.test(value)) {
          return; // Don't update state if anything other than letters and spaces are entered
        }
        setFormData((prev) => ({ ...prev, ownerName: value }));
        break;

      case "address":
        // Only allow letters, numbers, and spaces
        if (!/^[a-zA-Z0-9\s]*$/.test(value)) {
          return; // Don't update state if invalid characters are entered
        }
        setFormData((prev) => ({ ...prev, address: value }));
        break;

      case "location":
        // Only allow letters, numbers, and spaces
        if (!/^[a-zA-Z0-9\s]*$/.test(value)) {
          return; // Don't update state if invalid characters are entered
        }
        setFormData((prev) => ({ ...prev, location: value }));
        break;

      case "creditLimit":
        // Only allow numbers
        if (!/^\d*$/.test(value)) {
          return; // Don't update state if non-numeric characters are entered
        }
        setFormData((prev) => ({ ...prev, creditLimit: value }));
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

    if (formData.mobileNumber2) {
      if (!validateMobileNumber(formData.mobileNumber2)) {
        newErrors.mobileNumber2 = "Mobile number should only contain digits";
      } else if (formData.mobileNumber2.length !== 10) {
        newErrors.mobileNumber2 = "Mobile number must be 10 digits";
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
      const accessToken = await AsyncStorage.getItem("access");

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
        mobile_number2: formData.mobileNumber2?.trim() || "", // Send empty string if no value
        address: formData.address?.trim() || "",
      };

      console.log("Request Body:", requestBody);

      const response = await fetch(`${getBaseUrl()}/supplier_create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
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
                  borderColor={errors.name ? "red.500" : "coolGray.200"}
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
                    errors.mobileNumber1 ? "red.500" : "coolGray.200"
                  }
                />
                <FormControl.ErrorMessage>
                  {errors.mobileNumber1}
                </FormControl.ErrorMessage>
              </FormControl>

              <FormControl isInvalid={"mobileNumber2" in errors}>
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
                  borderColor={
                    errors.mobileNumber2 ? "red.500" : "coolGray.200"
                  }
                />
                <FormControl.ErrorMessage>
                  {errors.mobileNumber2}
                </FormControl.ErrorMessage>
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

              <FormControl isRequired isInvalid={"creditLimit" in errors}>
                <FormControl.Label>Credit Limit</FormControl.Label>
                <Input
                  value={formData.creditLimit}
                  onChangeText={(text) => handleFormChange("creditLimit", text)}
                  placeholder="Enter credit limit"
                  keyboardType="numeric"
                  bg="white"
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
                    setFormData({ ...formData, ownerName: text })
                  }
                  placeholder="Enter owner name"
                  bg="white"
                />
              </FormControl>

              <FormControl isInvalid={"location" in errors}>
                <FormControl.Label>Location</FormControl.Label>
                <Input
                  value={formData.location}
                  onChangeText={(text) => handleFormChange("location", text)}
                  placeholder="Enter location"
                  bg="white"
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
                  borderColor={errors.address ? "red.500" : "coolGray.200"}
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
