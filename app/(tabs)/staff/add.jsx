import { useState, useEffect, useRef } from "react";
import {
  Box,
  ScrollView,
  Heading,
  VStack,
  IconButton,
  Button,
  useToast,
  FormControl,
  Input,
  TextArea,
  Avatar,
  Center,
  Pressable,
  Text,
  HStack,
  Select,
  CheckIcon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, StatusBar } from "react-native";
import * as ImagePicker from "expo-image-picker";
import Header from "../../components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";
import { useAuth } from "../../../context/AuthContext";

const API_BASE_URL = getBaseUrl();

export default function AddStaffScreen() {
  const { logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [image, setImage] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    dob: "",
    aadharNo: "",
    phone: "",
    address: "",
  });
  const [roles, setRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [captainId, setCaptainId] = useState(null);
  const [outletId, setOutletId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [errors, setErrors] = useState({}); // Add this state for form errors
  const selectRef = useRef(null);

  const pickImage = async () => {
    try {
      // Request permission first
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        toast.show({
          description: "Permission to access gallery was denied",
          status: "error",
        });
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        // Updated to handle the new result format
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      toast.show({
        description: "Error picking image",
        status: "error",
      });
    }
  };

  // Update handleNameChange function
  const handleNameChange = (text) => {
    // Remove special characters and numbers on input
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setFormData({ ...formData, name: sanitizedText });

    // Clear error if valid, set error if invalid
    if (!sanitizedText.trim()) {
      setErrors((prev) => ({ ...prev, name: "Name is required" }));
    } else if (sanitizedText.trim().length < 2) {
      setErrors((prev) => ({
        ...prev,
        name: "Name must be at least 2 characters long",
      }));
    } else if (!/^[a-zA-Z\s]+$/.test(sanitizedText)) {
      setErrors((prev) => ({
        ...prev,
        name: "Only letters and spaces allowed",
      }));
    } else {
      // Explicitly remove the name error when input is valid
      setErrors((prev) => {
        const { name, ...rest } = prev;
        return rest;
      });
    }
  };

  // Modify handlePhoneChange function
  const handlePhoneChange = (text) => {
    // Only allow digits
    const sanitizedText = text.replace(/[^0-9]/g, "");
    
    // If this is the first digit
    if (sanitizedText.length === 1) {
      // Check if the first digit is valid (6-9)
      const firstDigit = sanitizedText[0];
      if (!["6", "7", "8", "9"].includes(firstDigit)) {
        // If invalid first digit, don't update the state
        toast.show({
          description: "Mobile number must start with 6, 7, 8 or 9",
          status: "warning",
          duration: 2000,
        });
        return; // Don't update state with invalid first digit
      }
    }
    
    // If we're adding to existing digits
    if (formData.phone === "" && sanitizedText.length > 1) {
      // Check first digit for new input with multiple digits
      const firstDigit = sanitizedText[0];
      if (!["6", "7", "8", "9"].includes(firstDigit)) {
        toast.show({
          description: "Mobile number must start with 6, 7, 8 or 9",
          status: "warning",
          duration: 2000,
        });
        return;
      }
    }
    
    // Update state with valid input
    setFormData({ ...formData, phone: sanitizedText });

    // Clear error if valid, set error if invalid
    if (!sanitizedText) {
      setErrors((prev) => ({ ...prev, phone: "Mobile number is required" }));
    } else if (sanitizedText.length !== 10) {
      setErrors((prev) => ({ ...prev, phone: "Mobile number must be 10 digits" }));
    } else {
      // Explicitly remove the phone error when input is valid
      setErrors((prev) => {
        const { phone, ...rest } = prev;
        return rest;
      });
    }
  };

  // Add this function to handle address input validation
  const handleAddressChange = (text) => {
    const sanitizedText = text.replace(/[^a-zA-Z0-9\s,.-]/g, "");
    setFormData({ ...formData, address: sanitizedText });

    // Validate address - now optional
    if (sanitizedText.trim().length > 0 && sanitizedText.trim().length < 5) {
      setErrors((prev) => ({
        ...prev,
        address: "Address must be at least 5 characters",
      }));
    } else {
      setErrors((prev) => {
        const { address, ...rest } = prev;
        return rest;
      });
    }
  };

  // Clear DOB function
  const clearDOB = () => {
    setFormData({
      ...formData,
      dob: "",
    });
    
    // Clear any DOB error if it exists
    setErrors((prev) => {
      const { dob, ...rest } = prev;
      return rest;
    });
  };

  // Update validateForm function
  const validateForm = () => {
    try {
      const newErrors = {};

      // Validate name (only letters and spaces)
      if (!formData.name?.trim()) {
        newErrors.name = "Name is required";
      } else if (!/^[a-zA-Z\s]{2,50}$/.test(formData.name.trim())) {
        newErrors.name = "Name can only contain letters and spaces";
      }

      // Validate phone number
      if (!formData.phone) {
        newErrors.phone = "Mobile number is required";
      } else if (formData.phone.length !== 10) {
        newErrors.phone = "Mobile number must be 10 digits";
      } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
        newErrors.phone = "Invalid mobile number format";
      }

      // Role validation
      if (!formData.role) {
        newErrors.role = "Role is required";
      }

      // DOB validation - now optional
      // Removed mandatory validation for DOB

      // Aadhar validation
      if (!formData.aadharNo) {
        newErrors.aadharNo = "Aadhar number is required";
      } else if (!/^\d{12}$/.test(formData.aadharNo)) {
        newErrors.aadharNo = "Enter valid 12-digit Aadhar number";
      }

      // Address validation - now optional
      if (formData.address?.trim().length > 0 && formData.address.trim().length < 5) {
        newErrors.address = "Address must be at least 5 characters";
      }

      setErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        toast.show({
          description: "Please fill all required fields before submitting",
          status: "error",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Validation Error:", error);
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const userId = await AsyncStorage.getItem("user_id");

      // Format date to DD Mon YYYY (without hyphens)
      const formatDOB = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const months = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      };

      // Create FormData instance
      const formDataToSend = new FormData();

      const staffData = {
        user_id: parseInt(userId),
        name: formData.name.trim(),
        mobile: formData.phone,
        role: formData.role.toLowerCase(),
        aadhar_number: formData.aadharNo,
        outlet_id: parseInt(outletId),
      };

      // Add optional fields only if they have values
      if (formData.dob) {
        staffData.dob = formatDOB(selectedDate);
      }
      
      if (formData.address && formData.address.trim()) {
        staffData.address = formData.address.trim();
      }

      // Add all fields to FormData
      Object.keys(staffData).forEach((key) => {
        formDataToSend.append(key, staffData[key]);
      });

      // Add the image if it exists
      if (image) {
        const fileName = image.split("/").pop();
        formDataToSend.append("photo", {
          uri: Platform.OS === "android" ? image : image.replace("file://", ""),
          type: "image/jpeg",
          name: fileName,
        });
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/staff_create`, {
        method: "POST",
        headers: {
          // Don't set Content-Type for FormData, let the browser set it with boundary
        },
        body: formDataToSend,
      });

      console.log("API Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Staff member added successfully",
          status: "success",
        });
        router.back();
      } else {
        throw new Error(data.msg || "Failed to add staff member");
      }
    } catch (error) {
      console.error("Save Staff Error:", error);
      toast.show({
        description: error.message || "Something went wrong. Please try again",
        status: "error",
      });
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/get_staff_role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Roles Response:", data);

      if (data.st === 1 && data.role_list) {
        // Convert the role_list object to array
        const roleArray = Object.keys(data.role_list);
        setRoles(roleArray);
      } else {
        toast.show({
          description: "Failed to fetch roles",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Fetch Roles Error:", error);
      toast.show({
        description: "Failed to fetch roles",
        status: "error",
      });
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedCaptainId = await AsyncStorage.getItem("captain_id");
        const storedOutletId = await AsyncStorage.getItem("outlet_id");

        if (storedCaptainId && storedOutletId) {
          setCaptainId(parseInt(storedCaptainId));
          setOutletId(parseInt(storedOutletId));
        } else {
          toast.show({
            description: "Please login again",
            status: "error",
          });
          logout();
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
    fetchRoles();
  }, []);

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

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

    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    return `${day} ${month} ${year}`;
  };

  // Helper function to parse date string
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

  // Update handleDateChange function
  const handleDateChange = (event, selected) => {
    setShowDatePicker(Platform.OS === "ios");

    if (event.type === "set") {
      setSelectedDate(selected);

      const day = String(selected.getDate()).padStart(2, "0");
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const month = months[selected.getMonth()];
      const year = selected.getFullYear();
      const formattedDate = `${day} ${month} ${year}`;

      setFormData((prev) => ({
        ...prev,
        dob: formattedDate,
      }));

      // Clear the dob error when a valid date is selected
      setErrors((prev) => {
        const { dob, ...rest } = prev;
        return rest;
      });
    } else {
      setShowDatePicker(false);
    }
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Add New Staff" />

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          <Center>
            <Pressable onPress={pickImage} _pressed={{ opacity: 0.7 }}>
              <Avatar
                size="2xl"
                bg="cyan.500"
                source={image ? { uri: image } : null}
              >
                {!image && (
                  <MaterialIcons
                    name="camera-alt"
                    size={24}
                    color="coolGray.400"
                  />
                )}
              </Avatar>
              <Text
                fontSize="sm"
                color="coolGray.500"
                mt={2}
                textAlign="center"
              >
                Tap to add photo
              </Text>
            </Pressable>
          </Center>

          <FormControl isRequired isInvalid={"name" in errors}>
            <FormControl.Label>Full Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={handleNameChange}
              placeholder="Enter Full Name"
              autoCapitalize="words"
              maxLength={50}
              borderColor={
                formData.name && !errors.name ? "green.500" : 
                errors.name ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.name && !errors.name ? "green.500" : 
                            errors.name ? "red.500" : "coolGray.500",
              }}
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"role" in errors}>
            <FormControl.Label>Role</FormControl.Label>
            <Pressable
              onPress={() => {
                // Ensure dropdown opens on pressing anywhere in the input area
                if (roles.length > 0) {
                  // Programmatically focus the Select
                  if (selectRef.current) {
                    selectRef.current.focus();
                  }
                }
              }}
            >
              <Select
                ref={selectRef}
                selectedValue={formData.role}
                onValueChange={(value) => {
                  console.log("Selected role:", value);
                  setFormData({ ...formData, role: value });
                  // Clear the role error when a valid selection is made
                  setErrors((prev) => {
                    const { role, ...rest } = prev;
                    return rest;
                  });
                }}
                placeholder="Select role"
                isDisabled={isLoadingRoles}
                _selectedItem={{
                  bg: "cyan.600",
                  endIcon: <CheckIcon size="5" color="white" />,
                }}
                borderColor={
                  formData.role && !errors.role ? "green.500" : 
                  errors.role ? "red.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.role && !errors.role ? "green.500" : 
                              errors.role ? "red.500" : "blue.500",
                }}
                isReadOnly={true}
              >
                {roles.map((role) => (
                  <Select.Item
                    key={role}
                    label={role.charAt(0).toUpperCase() + role.slice(1)}
                    value={role.toLowerCase()}
                  />
                ))}
              </Select>
            </Pressable>
            <FormControl.ErrorMessage>{errors.role}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"phone" in errors}>
            <FormControl.Label>Mobile Number</FormControl.Label>
            <Input
              value={formData.phone}
              onChangeText={handlePhoneChange}
              placeholder="Enter Mobile Number"
              keyboardType="numeric"
              maxLength={10}
              borderColor={
                formData.phone && !errors.phone ? "green.500" : 
                errors.phone ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.phone && !errors.phone ? "green.500" : 
                            errors.phone ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>{errors.phone}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isInvalid={"dob" in errors}>
            <FormControl.Label>Date of Birth (Optional)</FormControl.Label>
            <Pressable onPress={() => setShowDatePicker(true)}>
              <Input
                value={formData.dob || ""}
                isReadOnly
                placeholder="Select date of birth (optional)"
                borderColor={
                  formData.dob && !errors.dob ? "green.500" : 
                  errors.dob ? "red.500" : "coolGray.200"
                }
                _focus={{
                  borderColor: formData.dob && !errors.dob ? "green.500" : 
                              errors.dob ? "red.500" : "blue.500",
                }}
                rightElement={
                  <HStack>
                    {formData.dob && (
                      <IconButton
                        icon={<MaterialIcons name="clear" size={20} color="gray" />}
                        onPress={clearDOB}
                      />
                    )}
                    <IconButton
                      icon={<MaterialIcons name="calendar-today" size={20} color="gray" />}
                      onPress={() => setShowDatePicker(true)}
                    />
                  </HStack>
                }
              />
            </Pressable>
            <FormControl.HelperText>This field is optional</FormControl.HelperText>
            <FormControl.ErrorMessage>{errors.dob}</FormControl.ErrorMessage>

            {showDatePicker && (
              <DateTimePicker
                value={formData.dob ? parseDate(formData.dob) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </FormControl>

          <FormControl isRequired isInvalid={"aadharNo" in errors}>
            <FormControl.Label>Aadhar Number</FormControl.Label>
            <Input
              value={formData.aadharNo}
              onChangeText={(text) => {
                const numbers = text.replace(/[^0-9]/g, "");
                setFormData({ ...formData, aadharNo: numbers });
                if (!numbers) {
                  setErrors((prev) => ({
                    ...prev,
                    aadharNo: "Aadhar number is required",
                  }));
                } else if (numbers.length !== 12) {
                  setErrors((prev) => ({
                    ...prev,
                    aadharNo: "Must be 12 digits",
                  }));
                } else {
                  setErrors((prev) => {
                    const { aadharNo, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              placeholder="Enter 12-digit Aadhar number"
              keyboardType="numeric"
              maxLength={12}
              borderColor={
                formData.aadharNo && !errors.aadharNo ? "green.500" : 
                errors.aadharNo ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.aadharNo && !errors.aadharNo ? "green.500" : 
                            errors.aadharNo ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>
              {errors.aadharNo}
            </FormControl.ErrorMessage>
          </FormControl>

          <FormControl isInvalid={"address" in errors}>
            <FormControl.Label>Address (Optional)</FormControl.Label>
            <TextArea
              value={formData.address}
              onChangeText={handleAddressChange}
              placeholder="Enter complete address (optional)"
              autoCompleteType={undefined}
              h={20}
              borderColor={
                formData.address && !errors.address ? "green.500" : 
                errors.address ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.address && !errors.address ? "green.500" : 
                            errors.address ? "red.500" : "blue.500",
              }}
            />
            <FormControl.HelperText>This field is optional</FormControl.HelperText>
            <FormControl.ErrorMessage>
              {errors.address}
            </FormControl.ErrorMessage>
          </FormControl>

          <Button
            mt={4}
            mb={6}
            onPress={handleSave}
            leftIcon={<MaterialIcons name="save" size={20} color="white" />}
            isLoadingText="Saving..."
          >
            Save 
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
