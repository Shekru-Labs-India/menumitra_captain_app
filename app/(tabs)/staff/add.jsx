import { useState, useEffect } from "react";
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
import DateTimePicker from '@react-native-community/datetimepicker';

const API_BASE_URL = "https://men4u.xyz/captain_api";

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
  const [restaurantId, setRestaurantId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({}); // Add this state for form errors

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
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, '');
    setFormData({ ...formData, name: sanitizedText });
    
    // Validate and set error
    if (sanitizedText.trim().length < 2) {
      setErrors(prev => ({...prev, name: "Name must be at least 2 characters long"}));
    } else if (!/^[a-zA-Z\s]+$/.test(sanitizedText)) {
      setErrors(prev => ({...prev, name: "Only letters and spaces allowed"}));
    } else {
      setErrors(prev => ({...prev, name: undefined}));
    }
  };

  // Modify handlePhoneChange function
  const handlePhoneChange = (text) => {
    // Prevent entering 0-5 as first digit
    if (text.length === 1 && ['0','1','2','3','4','5'].includes(text)) {
      setErrors(prev => ({...prev, phone: "Number must start with 6, 7, 8 or 9"}));
      return; // Don't update state with invalid first digit
    }

    // Only allow digits
    const sanitizedText = text.replace(/[^0-9]/g, '');
    setFormData({ ...formData, phone: sanitizedText });
    
    // Validate the phone number
    if (sanitizedText.length > 0 && !['6','7','8','9'].includes(sanitizedText[0])) {
      setErrors(prev => ({...prev, phone: "Number must start with 6, 7, 8 or 9"}));
    } else if (sanitizedText.length === 10 && !/^[6-9]\d{9}$/.test(sanitizedText)) {
      setErrors(prev => ({...prev, phone: "Enter valid 10-digit number"}));
    } else {
      setErrors(prev => ({...prev, phone: undefined}));
    }
  };

  // Add this function to handle address input validation
  const handleAddressChange = (text) => {
    // Remove special characters but allow basic punctuation
    const sanitizedText = text.replace(/[^a-zA-Z0-9\s,.-]/g, '');
    setFormData({ ...formData, address: sanitizedText });
    
    // Validate address
    if (!sanitizedText.trim()) {
      setErrors(prev => ({...prev, address: "Address is required"}));
    } else if (sanitizedText.trim().length < 10) {
      setErrors(prev => ({...prev, address: "Address must be at least 10 characters"}));
    } else {
      setErrors(prev => ({...prev, address: undefined}));
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

      // DOB validation
      if (!formData.dob) {
        newErrors.dob = "Date of birth is required";
      }

      // Aadhar validation
      if (!formData.aadharNo) {
        newErrors.aadharNo = "Aadhar number is required";
      } else if (!/^\d{12}$/.test(formData.aadharNo)) {
        newErrors.aadharNo = "Enter valid 12-digit Aadhar number";
      }

      // Address validation
      if (!formData.address?.trim()) {
        newErrors.address = "Address is required";
      } else if (formData.address.trim().length < 10) {
        newErrors.address = "Address must be at least 10 characters";
      }

      setErrors(newErrors);
      
      if (Object.keys(newErrors).length > 0) {
        toast.show({
          description: "Please fix all errors before submitting",
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
      const formDataApi = new FormData();

      // Use the stored IDs
      formDataApi.append("captain_id", captainId);
      formDataApi.append("restaurant_id", restaurantId);

      // Rest of the form data
      formDataApi.append("name", formData.name.trim());
      formDataApi.append("mobile", formData.phone);
      formDataApi.append("dob", formData.dobApi); // Use the API format
      formDataApi.append("address", formData.address.trim());
      formDataApi.append("role", formData.role.toLowerCase());
      formDataApi.append("aadhar_number", formData.aadharNo);

      if (image) {
        const imageFileName = image.split("/").pop();
        const match = /\.(\w+)$/.exec(imageFileName);
        const imageType = match ? `image/${match[1]}` : "image/jpeg";

        formDataApi.append("photo", {
          uri: Platform.OS === "ios" ? image.replace("file://", "") : image,
          name: imageFileName || "photo.jpg",
          type: imageType,
        });
      }

      // Debug log to check what we're sending
      const debugData = {};
      formDataApi.forEach((value, key) => {
        debugData[key] = value;
      });
      console.log("Sending data:", debugData);

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/staff_create`,
        {
          method: "POST",
          body: formDataApi,
        }
      );

      const responseText = await response.text();
      console.log("Raw API Response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response:", e);
        throw new Error("Invalid server response");
      }

      console.log("Parsed API Response:", data);

      if (data.st === 1 && !data.msg.includes("does not exists")) {
        toast.show({
          description: "Staff member added successfully",
          status: "success",
        });
        router.replace({
          pathname: "/(tabs)/staff",
          params: { refresh: Date.now() },
        });
      } else {
        toast.show({
          description: data.msg || "Failed to add staff member",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Save Staff Error:", error);
      toast.show({
        description: "Something went wrong. Please try again",
        status: "error",
      });
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_staff_role`, {
        method: "GET",
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
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");

        if (storedCaptainId && storedRestaurantId) {
          setCaptainId(parseInt(storedCaptainId));
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

    getStoredData();
    fetchRoles();
  }, []);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const formattedDate = formatDate(selectedDate);
      // Also store the YYYY-MM-DD format for API submission
      const apiDate = selectedDate.toISOString().split('T')[0];
      setFormData({ 
        ...formData, 
        dob: formattedDate,
        dobApi: apiDate // Store API format separately
      });
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
            />
            <FormControl.ErrorMessage>
              {errors.name}
            </FormControl.ErrorMessage>
           
          </FormControl>

          <FormControl isRequired isInvalid={"role" in errors}>
            <FormControl.Label>Role</FormControl.Label>
            <Select
              selectedValue={formData.role}
              onValueChange={(value) => {
                setFormData({ ...formData, role: value });
                setErrors(prev => ({...prev, role: undefined}));
              }}
              placeholder="Select role"
              isDisabled={isLoadingRoles}
              _selectedItem={{
                bg: "cyan.600",
                endIcon: <CheckIcon size="5" color="white" />,
              }}
            >
              {roles.map((role) => (
                <Select.Item
                  key={role}
                  label={role.charAt(0).toUpperCase() + role.slice(1)}
                  value={role}
                />
              ))}
            </Select>
            <FormControl.ErrorMessage>{errors.role}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"phone" in errors}>
            <FormControl.Label>Mobile Number</FormControl.Label>
            <Input
              value={formData.phone}
              onChangeText={handlePhoneChange}
              placeholder="Enter Mobile Number (start with 6-9)"
              keyboardType="numeric"
              maxLength={10}
            />
            <FormControl.ErrorMessage>
              {errors.phone}
            </FormControl.ErrorMessage>
      
          </FormControl>

          <FormControl isRequired isInvalid={"dob" in errors}>
            <FormControl.Label>Date of Birth</FormControl.Label>
            <Pressable onPress={() => setShowDatePicker(true)}>
              <Input
                value={formData.dob}
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
          </FormControl>

          {showDatePicker && (
            <DateTimePicker
              value={formData.dob ? new Date(formData.dob) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={new Date()} // Prevents future dates
            />
          )}

          <FormControl isRequired isInvalid={"aadharNo" in errors}>
            <FormControl.Label>Aadhar Number</FormControl.Label>
            <Input
              value={formData.aadharNo}
              onChangeText={(text) => {
                const numbers = text.replace(/[^0-9]/g, '');
                setFormData({ ...formData, aadharNo: numbers });
                if (numbers.length !== 12) {
                  setErrors(prev => ({...prev, aadharNo: "Must be 12 digits"}));
                } else {
                  setErrors(prev => ({...prev, aadharNo: undefined}));
                }
              }}
              placeholder="Enter 12-digit Aadhar number"
              keyboardType="numeric"
              maxLength={12}
            />
            <FormControl.ErrorMessage>{errors.aadharNo}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"address" in errors}>
            <FormControl.Label>Address</FormControl.Label>
            <TextArea
              value={formData.address}
              onChangeText={handleAddressChange}
              placeholder="Enter complete address"
              autoCompleteType={undefined}
              h={20}
            />
            <FormControl.ErrorMessage>{errors.address}</FormControl.ErrorMessage>
           
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
