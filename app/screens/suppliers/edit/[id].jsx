import { useState, useContext, useEffect } from "react";
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
  Divider,
  HStack,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { SupplierContext } from "../../../../context/SupplierContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Header from "../../../components/Header";
import { getBaseUrl } from "../../../../config/api.config";
import { fetchWithAuth } from "../../../../utils/apiInterceptor";

export default function EditSupplierScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const { suppliers, updateSupplier } = useContext(SupplierContext);

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

  const [errors, setErrors] = useState({});
  const [creditRatings, setCreditRatings] = useState([]);
  const [outletId, setOutletId] = useState(null);

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
      } else {
        console.error("Failed to fetch credit ratings");
      }
    } catch (error) {
      console.error("Error fetching credit ratings:", error);
    }
  };

  useEffect(() => {
    const fetchSupplierDetails = async () => {
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

        setOutletId(storedOutletId);

        const data = await fetchWithAuth(`${getBaseUrl()}/supplier_view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: id.toString(),
            outlet_id: storedOutletId.toString(),
          }),
        });
        console.log("Supplier Details Response:", data);

        if (data.st === 1 && data.data) {
          setFormData({
            name: data.data.name || "",
            status: data.data.supplier_status || "active",
            creditRating: data.data.credit_rating || "",
            creditLimit: data.data.credit_limit?.toString() || "",
            location: data.data.location || "",
            ownerName: data.data.owner_name || "",
            website: data.data.website || "",
            mobileNumber1: data.data.mobile_number1 || "",
            mobileNumber2: data.data.mobile_number2 || "",
            address: data.data.address || "",
          });
        } else {
          throw new Error(data.msg || "Failed to fetch supplier details");
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        toast.show({
          description: error.message || "Failed to fetch supplier details",
          status: "error",
          duration: 3000,
        });
        router.back();
      }
    };

    fetchSupplierDetails();
  }, [id]);

  useEffect(() => {
    fetchCreditRatings();
  }, []);

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
  }, []);

  // Add these input handlers at the top level of the component
  const handleNameChange = (text) => {
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setFormData((prev) => ({ ...prev, name: sanitizedText }));

    if (!sanitizedText.trim()) {
      setErrors((prev) => ({ ...prev, name: "Name is required" }));
    } else if (sanitizedText.trim().length < 2) {
      setErrors((prev) => ({ ...prev, name: "Name must be at least 2 characters" }));
    } else {
      // Explicitly remove the name error
      setErrors((prev) => {
        const { name, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleMobileNumberChange = (field, text) => {
    const sanitizedNumber = text.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, [field]: sanitizedNumber }));

    if (!sanitizedNumber) {
      if (field === "mobileNumber1") {
        setErrors((prev) => ({ ...prev, [field]: "Primary mobile number is required" }));
      } else {
        // Clear error for optional mobile number 2
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } else if (sanitizedNumber.length !== 10) {
      setErrors((prev) => ({ ...prev, [field]: "Mobile number must be 10 digits" }));
    } else if (!["6", "7", "8", "9"].includes(sanitizedNumber[0])) {
      setErrors((prev) => ({ ...prev, [field]: "Number must start with 6, 7, 8 or 9" }));
    } else {
      // Clear error when valid
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleOwnerNameChange = (text) => {
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setFormData((prev) => ({ ...prev, ownerName: sanitizedText }));

    if (sanitizedText && sanitizedText.trim().length < 2) {
      setErrors((prev) => ({ ...prev, ownerName: "Name must be at least 2 characters" }));
    } else {
      // Clear error when valid or empty (optional field)
      setErrors((prev) => {
        const { ownerName, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleCreditLimitChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    setFormData((prev) => ({ ...prev, creditLimit: numericValue }));

    if (!numericValue) {
      setErrors((prev) => ({ ...prev, creditLimit: "Credit limit is required" }));
    } else {
      // Clear error when valid
      setErrors((prev) => {
        const { creditLimit, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleAddressChange = (text) => {
    setFormData((prev) => ({ ...prev, address: text }));

    if (!text.trim()) {
      setErrors((prev) => ({ ...prev, address: "Address is required" }));
    } else if (text.trim().length < 5) {
      setErrors((prev) => ({ ...prev, address: "Address must be at least 5 characters" }));
    } else {
      // Clear error when valid
      setErrors((prev) => {
        const { address, ...rest } = prev;
        return rest;
      });
    }
  };

  // Add this handler function
  const handleLocationChange = (text) => {
    setFormData((prev) => ({ ...prev, location: text }));

    if (text && text.trim().length < 2) {
      setErrors((prev) => ({ ...prev, location: "Location must be at least 2 characters" }));
    } else {
      // Clear error when valid or empty (optional field)
      setErrors((prev) => {
        const { location, ...rest } = prev;
        return rest;
      });
    }
  };

  // Add validation functions
  const validateName = (value) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    return value.trim() !== "" && nameRegex.test(value);
  };

  const validateMobileNumber = (value) => {
    const mobileRegex = /^[0-9]+$/;
    return value.trim() !== "" && mobileRegex.test(value);
  };

  const validateLocation = (value) => {
    const locationRegex = /^[a-zA-Z0-9\s,.-]+$/;
    return value.trim() === "" || locationRegex.test(value);
  };

  const validateWebsite = (value) => {
    const websiteRegex =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return value.trim() === "" || websiteRegex.test(value);
  };

  // Update validateForm function
  const validateForm = () => {
    const newErrors = {};

    // Name validation (Required)
    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    } else if (!validateName(formData.name)) {
      newErrors.name = "Name should only contain letters and spaces";
    }

    // Primary Mobile validation (Required)
    if (!formData.mobileNumber1?.trim()) {
      newErrors.mobileNumber1 = "Primary mobile number is required";
    } else if (!validateMobileNumber(formData.mobileNumber1)) {
      newErrors.mobileNumber1 = "Mobile number should only contain digits";
    } else if (formData.mobileNumber1.length !== 10) {
      newErrors.mobileNumber1 = "Mobile number must be 10 digits";
    } else {
      const firstDigit = formData.mobileNumber1[0];
      if (!["6", "7", "8", "9"].includes(firstDigit)) {
        newErrors.mobileNumber1 = "Number must start with 6, 7, 8 or 9";
      }
    }

    // Secondary Mobile validation (Optional)
    if (formData.mobileNumber2?.trim()) {
      if (!validateMobileNumber(formData.mobileNumber2)) {
        newErrors.mobileNumber2 = "Mobile number should only contain digits";
      } else if (formData.mobileNumber2.length !== 10) {
        newErrors.mobileNumber2 = "Mobile number must be 10 digits";
      } else {
        const firstDigit = formData.mobileNumber2[0];
        if (!["6", "7", "8", "9"].includes(firstDigit)) {
          newErrors.mobileNumber2 = "Number must start with 6, 7, 8 or 9";
        }
      }
    }

    // Credit Limit validation (Required)
    if (!formData.creditLimit?.trim()) {
      newErrors.creditLimit = "Credit limit is required";
    } else {
      const creditLimit = parseFloat(formData.creditLimit);
      if (isNaN(creditLimit) || creditLimit < 0) {
        newErrors.creditLimit = "Credit limit must be a positive number";
      }
    }

    // Location validation (Optional)
    if (formData.location?.trim() && !validateLocation(formData.location)) {
      newErrors.location = "Location contains invalid characters";
    }

    // Website validation (Optional)
    if (formData.website?.trim() && !validateWebsite(formData.website)) {
      newErrors.website = "Please enter a valid website URL";
    }

    // Owner Name validation (Optional)
    if (formData.ownerName?.trim() && !validateName(formData.ownerName)) {
      newErrors.ownerName = "Owner name should only contain letters and spaces";
    }

    // Address validation (Required)
    if (!formData.address?.trim()) {
      newErrors.address = "Address is required";
    } else if (formData.address.trim().length < 5) {
      newErrors.address = "Address must be at least 5 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update handleSubmit function
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.show({
        description: "Please fill all the required fields",
        status: "error",
        duration: 3000,
      });
      return;
    }

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

      const requestBody = {
        user_id: userId.toString(),
        supplier_id: id.toString(),
        outlet_id: outletId.toString(),
        name: formData.name.trim(),
        supplier_status: formData.status || "active",
        credit_rating: formData.creditRating || "",
        credit_limit: formData.creditLimit
          ? formData.creditLimit.toString()
          : "0",
        location: formData.location?.trim() || "",
        owner_name: formData.ownerName?.trim() || "",
        website: formData.website?.trim() || "",
        mobile_number1: formData.mobileNumber1.trim(),
        mobile_number2: formData.mobileNumber2?.trim() || "",
        address: formData.address?.trim() || "",
      };

      console.log("Update Request Body:", requestBody);

      const data = await fetchWithAuth(`${getBaseUrl()}/supplier_update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      console.log("Update Response:", data);

      if (data.st === 1) {
        // After successful update, fetch updated details
        const detailsData = await fetchWithAuth(`${getBaseUrl()}/supplier_view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId.toString(),
            supplier_id: id.toString(),
            outlet_id: outletId.toString(),
          }),
        });

        if (detailsData.st === 1) {
          toast.show({
            description: "Supplier updated successfully",
            status: "success",
            duration: 3000,
          });
          router.back({
            params: {
              updatedSupplier: detailsData.data,
              shouldRefresh: true,
            },
          });
        }
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
          throw new Error(data.msg || "Failed to update supplier");
        }
      }
    } catch (error) {
      console.error("Update Error:", error);
      toast.show({
        description: error.message || "Failed to update supplier",
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <Box flex={1} bg="coolGray.100" safeAreaTop>
      {/* Header */}
      <Header title="Edit Supplier" />

      {/* Content */}
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        bg="coolGray.100"
      >
        <VStack space={4} p={4}>
          {/* Basic Information Card */}
          <Box bg="white" p={4} rounded="lg">
            <VStack space={4}>
              <HStack space={2} alignItems="center">
                <MaterialIcons name="info" size={20} color="coolGray.600" />
                <Heading size="sm" color="coolGray.600">
                  Basic Information
                </Heading>
              </HStack>

              <FormControl isRequired isInvalid={"name" in errors}>
                <FormControl.Label>Name</FormControl.Label>
                <Input
                  value={formData.name}
                  onChangeText={handleNameChange}
                  placeholder="Enter supplier name"
                  bg="white"
                  maxLength={50}
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

              <FormControl>
                <FormControl.Label>Status</FormControl.Label>
                <Select
                  selectedValue={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                  placeholder="Select status"
                  bg="white"
                  borderColor={
                    formData.status ? "green.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.status ? "green.500" : "blue.500",
                  }}
                >
                  <Select.Item label="Active" value="active" />
                  <Select.Item label="Inactive" value="inactive" />
                </Select>
              </FormControl>
            </VStack>
          </Box>

          {/* Contact Information Card */}
          <Box bg="white" p={4} rounded="lg">
            <VStack space={4}>
              <HStack space={2} alignItems="center">
                <MaterialIcons name="contacts" size={20} color="coolGray.600" />
                <Heading size="sm" color="coolGray.600">
                  Contact Information
                </Heading>
              </HStack>

              <FormControl isRequired isInvalid={"mobileNumber1" in errors}>
                <FormControl.Label>Primary Mobile Number</FormControl.Label>
                <Input
                  value={formData.mobileNumber1}
                  onChangeText={(value) =>
                    handleMobileNumberChange("mobileNumber1", value)
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

              <FormControl isInvalid={"mobileNumber2" in errors}>
                <FormControl.Label>Secondary Mobile Number</FormControl.Label>
                <Input
                  value={formData.mobileNumber2}
                  onChangeText={(value) =>
                    handleMobileNumberChange("mobileNumber2", value)
                  }
                  placeholder="Enter secondary mobile number"
                  keyboardType="numeric"
                  maxLength={10}
                  bg="white"
                  borderColor={
                    formData.mobileNumber2 && !errors.mobileNumber2 ? "green.500" : 
                    errors.mobileNumber2 ? "red.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.mobileNumber2 && !errors.mobileNumber2 ? "green.500" : 
                                errors.mobileNumber2 ? "red.500" : "blue.500",
                  }}
                />
                <FormControl.ErrorMessage>
                  {errors.mobileNumber2}
                </FormControl.ErrorMessage>
              </FormControl>

              <FormControl isInvalid={"website" in errors}>
                <FormControl.Label>Website</FormControl.Label>
                <Input
                  value={formData.website}
                  onChangeText={(text) =>
                    setFormData({ ...formData, website: text })
                  }
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
          <Box bg="white" p={4} rounded="lg" mb={20}>
            <VStack space={4}>
              <HStack space={2} alignItems="center">
                <MaterialIcons name="business" size={20} color="coolGray.600" />
                <Heading size="sm" color="coolGray.600">
                  Business Information
                </Heading>
              </HStack>

              <FormControl>
                <FormControl.Label>Credit Rating</FormControl.Label>
                <Select
                  selectedValue={formData.creditRating}
                  onValueChange={(value) =>
                    setFormData({ ...formData, creditRating: value })
                  }
                  placeholder="Select credit rating"
                  bg="white"
                  borderColor={
                    formData.creditRating ? "green.500" : "coolGray.200"
                  }
                  _focus={{
                    borderColor: formData.creditRating ? "green.500" : "blue.500",
                  }}
                  _selectedItem={{
                    bg: "coolGray.100",
                    endIcon: <MaterialIcons name="check" size={20} color="green.500" />
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
              </FormControl>

              <FormControl isRequired isInvalid={"creditLimit" in errors}>
                <FormControl.Label>Credit Limit</FormControl.Label>
                <Input
                  value={formData.creditLimit}
                  onChangeText={handleCreditLimitChange}
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

              <FormControl isInvalid={"ownerName" in errors}>
                <FormControl.Label>Owner Name</FormControl.Label>
                <Input
                  value={formData.ownerName}
                  onChangeText={handleOwnerNameChange}
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
                <FormControl.ErrorMessage>
                  {errors.ownerName}
                </FormControl.ErrorMessage>
              </FormControl>

              <FormControl isInvalid={"location" in errors}>
                <FormControl.Label>Location</FormControl.Label>
                <Input
                  value={formData.location}
                  onChangeText={handleLocationChange}
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
                  onChangeText={handleAddressChange}
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
                mt={4}
                colorScheme="blue"
                onPress={handleSubmit}
                leftIcon={<MaterialIcons name="save" size={20} color="white" />}
              >
                Update Supplier
              </Button>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}
