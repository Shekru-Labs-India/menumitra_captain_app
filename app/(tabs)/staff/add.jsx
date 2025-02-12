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

const API_BASE_URL = getBaseUrl();

export default function AddStaffScreen() {
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

  // Add this function to handle name input with validation
  const handleNameChange = (text) => {
    // Remove special characters and numbers on input
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setFormData({ ...formData, name: sanitizedText });

    // Validate and set error
    if (sanitizedText.trim().length < 2) {
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
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  // Modify handlePhoneChange function
  const handlePhoneChange = (text) => {
    // Only allow digits
    const sanitizedText = text.replace(/[^0-9]/g, "");

    // Always check if first digit is valid (6-9), regardless of input method
    if (sanitizedText.length > 0) {
      const firstDigit = sanitizedText[0];
      if (!["6", "7", "8", "9"].includes(firstDigit)) {
        // Keep the previous valid value if exists, otherwise empty
        setFormData((prev) => ({
          ...prev,
          phone:
            prev.phone && ["6", "7", "8", "9"].includes(prev.phone[0])
              ? prev.phone
              : "",
        }));
        setErrors((prev) => ({
          ...prev,
          phone: "Number must start with 6, 7, 8 or 9",
        }));
        return;
      }
    }

    setFormData({ ...formData, phone: sanitizedText });

    // Validate the phone number length and format
    if (sanitizedText.length === 10 && !/^[6-9]\d{9}$/.test(sanitizedText)) {
      setErrors((prev) => ({ ...prev, phone: "Enter valid 10-digit number" }));
    } else {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  // Add this function to handle address input validation
  const handleAddressChange = (text) => {
    const sanitizedText = text.replace(/[^a-zA-Z0-9\s,.-]/g, "");
    setFormData({ ...formData, address: sanitizedText });

    // Validate address with 5 char minimum
    if (!sanitizedText.trim()) {
      setErrors((prev) => ({ ...prev, address: "Address is required" }));
    } else if (sanitizedText.trim().length < 5) {
      setErrors((prev) => ({
        ...prev,
        address: "Address must be at least 5 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, address: undefined }));
    }
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

      // DOB validationthe
      if (!formData.dob) {
        newErrors.dob = "Date of birth is required";
      }

      // Aadhar validation
      if (!formData.aadharNo) {
        newErrors.aadharNo = "Aadhar number is required";
      } else if (!/^\d{12}$/.test(formData.aadharNo)) {
        newErrors.aadharNo = "Enter valid 12-digit Aadhar number";
      }

      // Updated address validation
      if (!formData.address?.trim()) {
        newErrors.address = "Address is required";
      } else if (formData.address.trim().length < 5) {
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
      const accessToken = await AsyncStorage.getItem("access");

      // Format date to DD Mon YYYY (without hyphens)
      const formatDOB = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
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
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`; // Removed hyphens, using spaces instead
      };

      // Create FormData instance
      const formDataToSend = new FormData();

      const staffData = {
        user_id: parseInt(userId),
        name: formData.name.trim(),
        mobile: formData.phone,
        dob: formatDOB(selectedDate),
        address: formData.address.trim(),
        role: formData.role.toLowerCase(),
        aadhar_number: formData.aadharNo,
        outlet_id: parseInt(outletId),
      };

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

      const response = await fetch(`${getBaseUrl()}/staff_create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formDataToSend,
      });

      const data = await response.json();
      console.log("API Response:", data);

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Staff member added successfully",
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
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(`${getBaseUrl()}/get_staff_role`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
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
      const month = months[selected.getMonth()];
      const year = selected.getFullYear();
      const formattedDate = `${day} ${month} ${year}`;

      setFormData((prev) => ({
        ...prev,
        dob: formattedDate,
      }));
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
                formData.name && !errors.name ? "green.500" : "coolGray.200"
              }
              _focus={{
                borderColor:
                  formData.name && !errors.name ? "green.500" : "blue.500",
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
                  setErrors((prev) => ({ ...prev, role: undefined }));
                }}
                placeholder="Select role"
                isDisabled={isLoadingRoles}
                _selectedItem={{
                  bg: "cyan.600",
                  endIcon: <CheckIcon size="5" color="white" />,
                }}
                borderColor={formData.role ? "green.500" : "coolGray.200"}
                _focus={{
                  borderColor: formData.role ? "green.500" : "blue.500",
                }}
                isReadOnly={true} // Prevent keyboard
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
                formData.phone && !errors.phone ? "green.500" : "coolGray.200"
              }
              _focus={{
                borderColor:
                  formData.phone && !errors.phone ? "green.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>{errors.phone}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"dob" in errors}>
            <FormControl.Label>Date of Birth</FormControl.Label>
            <Pressable onPress={() => setShowDatePicker(true)}>
              <Input
                value={formData.dob || ""}
                isReadOnly
                placeholder="Select date of birth"
                rightElement={
                  <IconButton
                    icon={
                      <MaterialIcons
                        name="calendar-today"
                        size={24}
                        color="gray"
                      />
                    }
                    onPress={() => setShowDatePicker(true)}
                  />
                }
              />
            </Pressable>
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
                if (numbers.length !== 12) {
                  setErrors((prev) => ({
                    ...prev,
                    aadharNo: "Must be 12 digits",
                  }));
                } else {
                  setErrors((prev) => ({ ...prev, aadharNo: undefined }));
                }
              }}
              placeholder="Enter 12-digit Aadhar number"
              keyboardType="numeric"
              maxLength={12}
            />
            <FormControl.ErrorMessage>
              {errors.aadharNo}
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
              borderColor={
                formData.address && !errors.address
                  ? "green.500"
                  : "coolGray.200"
              }
              _focus={{
                borderColor:
                  formData.address && !errors.address
                    ? "green.500"
                    : "blue.500",
              }}
            />
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
            Save Staff Member
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
