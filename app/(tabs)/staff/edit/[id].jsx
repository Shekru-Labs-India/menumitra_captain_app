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
  HStack,
  Spinner,
  Pressable,
  Text,
  Select,
  CheckIcon,
  Icon,
} from "native-base";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../../../components/Header";
import { getBaseUrl } from "../../../../config/api.config";
import { fetchWithAuth } from "../../../../utils/apiInterceptor";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

export default function EditStaffScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [captainId, setCaptainId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [roles, setRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [errors, setErrors] = useState({});
  const [outletId, setOutletId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    mobile: "",
    address: "",
    dob: "",
    aadhar_number: "",
    photo: "",
    existing_photo: "",
  });

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

  const formatDate = (dateString) => {
    if (!dateString) return "";

    // Try to parse the API format first (DD MMM YYYY)
    const apiFormatMatch = dateString.match(/(\d{2}) (\w{3}) (\d{4})/);
    if (apiFormatMatch) {
      const [_, day, month, year] = apiFormatMatch;
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
      const monthIndex = months.indexOf(month);
      if (monthIndex !== -1) {
        return `${day} ${month} ${year}`;
      }
    }

    // Try to parse YYYY-MM-DD format
    const isoFormatMatch = dateString.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoFormatMatch) {
      const [year, month, day] = dateString.split("-");
      const date = new Date(year, month - 1, day);
      const formattedDay = String(date.getDate()).padStart(2, "0");
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
      const formattedMonth = months[date.getMonth()];
      const formattedYear = date.getFullYear();
      return `${formattedDay} ${formattedMonth} ${formattedYear}`;
    }

    return dateString; // Return original string if no format matches
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);

    // If user cancels without selecting a date, keep the existing date
    if (!selectedDate) {
      return;
    }

    // Format the date directly using the date object
    const day = String(selectedDate.getDate()).padStart(2, "0");
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
    const month = months[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();

    setFormData({
      ...formData,
      dob: `${day} ${month} ${year}`,
    });
  };

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedCaptainId = await AsyncStorage.getItem("captain_id");
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedCaptainId && storedOutletId) {
          setCaptainId(parseInt(storedCaptainId));
          setOutletId(parseInt(storedOutletId));
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/get_staff_role`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      console.log("Roles Response:", data);

      if (data.st === 1 && data.role_list) {
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
    const fetchStaffDetails = async () => {
      try {
        const data = await fetchWithAuth(`${getBaseUrl()}/staff_view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_id: parseInt(id),
            outlet_id: outletId,
          }),
        });

        console.log("Staff Details Response:", data);

        if (data.st === 1 && data.data) {
          const formattedDate = formatDate(data.data.dob);
          setFormData({
            name: data.data.name || "",
            role: data.data.role || "",
            mobile: data.data.mobile?.toString() || "",
            address: data.data.address || "",
            dob: formattedDate,
            aadhar_number: data.data.aadhar_number?.toString() || "",
            photo: "",
            existing_photo: data.data.photo || "",
          });
        } else {
          toast.show({
            description: "Failed to fetch staff details",
            status: "error",
          });
          router.back();
        }
      } catch (error) {
        console.error("Fetch Staff Details Error:", error);
        toast.show({
          description: "Failed to fetch staff details",
          status: "error",
        });
        router.back();
      }
    };

    if (id && outletId) {
      fetchStaffDetails();
    }
  }, [id, outletId]);

  const handleNameChange = (text) => {
    // Remove special characters and numbers
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

  const handleMobileChange = (text) => {
    // Only allow digits
    const sanitizedText = text.replace(/[^0-9]/g, "");

    // Always check if first digit is valid (6-9)
    if (sanitizedText.length > 0) {
      const firstDigit = sanitizedText[0];
      if (!["6", "7", "8", "9"].includes(firstDigit)) {
        setFormData({ ...formData, mobile: sanitizedText });
        setErrors((prev) => ({
          ...prev,
          mobile: "Number must start with 6, 7, 8 or 9",
        }));
        return;
      }
    }

    setFormData({ ...formData, mobile: sanitizedText });

    // Clear error if valid, set error if invalid
    if (!sanitizedText) {
      setErrors((prev) => ({ ...prev, mobile: "Mobile number is required" }));
    } else if (sanitizedText.length !== 10) {
      setErrors((prev) => ({ ...prev, mobile: "Mobile number must be 10 digits" }));
    } else if (!/^[6-9]\d{9}$/.test(sanitizedText)) {
      setErrors((prev) => ({ ...prev, mobile: "Invalid mobile number format" }));
    } else {
      // Explicitly remove the mobile error when input is valid
      setErrors((prev) => {
        const { mobile, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleAadharChange = (text) => {
    // Only allow digits
    const sanitizedText = text.replace(/[^0-9]/g, "");
    setFormData({ ...formData, aadhar_number: sanitizedText });

    // Clear error if valid, set error if invalid
    if (!sanitizedText) {
      setErrors((prev) => ({
        ...prev,
        aadhar_number: "Aadhar number is required",
      }));
    } else if (sanitizedText.length !== 12) {
      setErrors((prev) => ({
        ...prev,
        aadhar_number: "Must be 12 digits",
      }));
    } else {
      // Explicitly remove the aadhar_number error when input is valid
      setErrors((prev) => {
        const { aadhar_number, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleAddressChange = (text) => {
    // Allow letters, numbers, spaces, commas, periods, and hyphens
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
    } else if (sanitizedText.trim().length > 50) {
      setErrors((prev) => ({
        ...prev,
        address: "Address must not exceed 50 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, address: undefined }));
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        exif: true,
      });

      if (!result.canceled) {
        // Get file info
        const { uri } = result.assets[0];
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        // Check if fileInfo exists and has size
        if (!fileInfo?.size) {
          throw new Error("Couldn't get file size");
        }
        
        // Convert bytes to MB
        const fileSizeInMB = fileInfo.size / (1024 * 1024);
        
        // Check if file is larger than 3MB
        if (fileSizeInMB > 3) {
          toast.show({
            description: "Image size must be less than 3MB",
            status: "error",
            duration: 3000,
          });
          return;
        }

        setFormData(prev => ({
          ...prev,
          photo: result.assets[0].uri
        }));

        // Show success toast
        toast.show({
          description: "Image selected successfully",
          status: "success",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Image picking error:", error);
      toast.show({
        description: error.message || "Failed to pick image",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleSave = async () => {
    const newErrors = {};

    // Validate all fields
    if (!formData.name?.trim() || !/^[a-zA-Z\s]{2,50}$/.test(formData.name.trim())) {
      newErrors.name = "Enter valid name (only letters and spaces)";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    // Mobile validation
    if (!formData.mobile) {
      newErrors.mobile = "Mobile number is required";
    } else if (formData.mobile.length !== 10) {
      newErrors.mobile = "Mobile number must be 10 digits";
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = "Number must start with 6, 7, 8 or 9";
    }

    if (!formData.aadhar_number || !/^\d{12}$/.test(formData.aadhar_number)) {
      newErrors.aadhar_number = "Enter valid 12-digit Aadhar number";
    }

    // Address validation - optional field
    if (formData.address?.trim().length > 0 && formData.address.trim().length < 5) {
      newErrors.address = "Address must be at least 5 characters";
    } else if (formData.address?.trim().length > 50) {
      newErrors.address = "Address must not exceed 50 characters";
    }

    // No validation for DOB as it's optional

    setErrors(newErrors);

    // If there are errors, return without showing toast
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");

      // Create FormData instance for multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append("user_id", parseInt(userId));
      formDataToSend.append("staff_id", parseInt(id));
      formDataToSend.append("outlet_id", outletId);
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("mobile", formData.mobile);
      formDataToSend.append("role", formData.role.toLowerCase());
      formDataToSend.append("aadhar_number", formData.aadhar_number);
      
      // Only append address if it has a value
      if (formData.address && formData.address.trim()) {
        formDataToSend.append("address", formData.address.trim());
      }
      
      // Only append DOB if it has a value
      if (formData.dob && formData.dob.trim()) {
        formDataToSend.append("dob", formData.dob);
      }

      // Append new image if selected
      if (formData.photo) {
        const filename = formData.photo.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formDataToSend.append("photo", {
          uri: formData.photo,
          name: filename,
          type,
        });
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/staff_update`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formDataToSend,
      });

      console.log("Update Response:", data);

      if (data.st === 1) {
        toast.show({
          description:"Staff details updated successfully",
          status: "success",
        });
        router.replace({
          pathname: `/(tabs)/staff/${parseInt(id)}`,
          params: { refresh: Date.now() },
        });
      } else {
        toast.show({
          description: data.msg || "Failed to update staff details",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Update Staff Error:", error);
      toast.show({
        description: "Failed to update staff details",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Edit Staff Details" />

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          <FormControl>
            <FormControl.Label>Photo</FormControl.Label>
            <VStack space={2}>
              {(formData.photo || formData.existing_photo) && (
                <Image
                  source={{
                    uri: formData.photo || formData.existing_photo
                  }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    alignSelf: "center"
                  }}
                />
              )}
              <Button
                onPress={handleImagePick}
                variant="outline"
                leftIcon={
                  <Icon
                    as={MaterialIcons}
                    name="photo-camera"
                    size={5}
                    color="coolGray.500"
                  />
                }
              >
                {formData.photo || formData.existing_photo ? "Change Photo" : "Add Photo"}
              </Button>
            </VStack>
          </FormControl>

          <FormControl isRequired isInvalid={"name" in errors}>
            <FormControl.Label>Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={handleNameChange}
              placeholder="Enter name"
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

          <FormControl isRequired isInvalid={"role" in errors}>
            <FormControl.Label>Role</FormControl.Label>
            <Select
              selectedValue={formData.role}
              onValueChange={(value) => {
                setFormData({ ...formData, role: value });
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
            >
              {roles.map((role) => (
                <Select.Item
                  key={role}
                  label={role.charAt(0).toUpperCase() + role.slice(1)}
                  value={role}
                />
              ))}
            </Select>
          </FormControl>

          <FormControl isRequired isInvalid={"mobile" in errors}>
            <FormControl.Label>Phone</FormControl.Label>
            <Input
              value={formData.mobile}
              onChangeText={handleMobileChange}
              keyboardType="numeric"
              placeholder="Enter phone number (start with 6-9)"
              maxLength={10}
              borderColor={
                formData.mobile && !errors.mobile ? "green.500" : 
                errors.mobile ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.mobile && !errors.mobile ? "green.500" : 
                            errors.mobile ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>{errors.mobile}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl>
            <FormControl.Label>Date of Birth (Optional)</FormControl.Label>
            <Pressable onPress={() => setShowDatePicker(true)}>
              <Input
                value={formData.dob}
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
                        icon={
                          <MaterialIcons
                            name="clear"
                            size={20}
                            color="gray"
                          />
                        }
                        onPress={() => setFormData({...formData, dob: ""})}
                      />
                    )}
                    <IconButton
                      icon={
                        <MaterialIcons
                          name="calendar-today"
                          size={20}
                          color="gray"
                        />
                      }
                      onPress={() => setShowDatePicker(true)}
                    />
                  </HStack>
                }
              />
            </Pressable>
            <FormControl.HelperText>This field is optional</FormControl.HelperText>
          </FormControl>

          {showDatePicker && (
            <DateTimePicker
              value={
                formData.dob
                  ? new Date(
                      formData.dob.split(" ")[2], // year
                      months.indexOf(formData.dob.split(" ")[1]), // month
                      parseInt(formData.dob.split(" ")[0]) // day
                    )
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <FormControl isRequired isInvalid={"aadhar_number" in errors}>
            <FormControl.Label>Aadhar Number</FormControl.Label>
            <Input
              value={formData.aadhar_number}
              onChangeText={handleAadharChange}
              keyboardType="numeric"
              placeholder="Enter 12-digit Aadhar number"
              maxLength={12}
              borderColor={
                formData.aadhar_number && !errors.aadhar_number ? "green.500" : 
                errors.aadhar_number ? "red.500" : "coolGray.200"
              }
              _focus={{
                borderColor: formData.aadhar_number && !errors.aadhar_number ? "green.500" : 
                            errors.aadhar_number ? "red.500" : "blue.500",
              }}
            />
            <FormControl.ErrorMessage>
              {errors.aadhar_number}
            </FormControl.ErrorMessage>
          </FormControl>

          <FormControl isInvalid={"address" in errors}>
            <FormControl.Label>Address</FormControl.Label>
            <TextArea
              value={formData.address}
              onChangeText={handleAddressChange}
              placeholder="Enter address"
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
            <FormControl.ErrorMessage>
              {errors.address}
            </FormControl.ErrorMessage>
          </FormControl>

          <Button
            mt={4}
            mb={6}
            onPress={handleSave}
            leftIcon={<MaterialIcons name="save" size={20} color="white" />}
            isLoading={isLoading}
            isLoadingText="Saving..."
          >
            Save Changes
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
