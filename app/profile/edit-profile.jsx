import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  HStack,
  VStack,
  Text,
  Heading,
  IconButton,
  ScrollView,
  FormControl,
  Input,
  Button,
  useToast,
  Avatar,
  Center,
  Pressable,
  Icon,
} from "native-base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Platform } from "react-native";

export default function EditProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    dob: "",
    aadhar_number: "",
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const userId = await AsyncStorage.getItem("user_id");
      if (!userId) {
        toast.show({
          description: "User ID not found. Please login again.",
          status: "error",
        });
        return;
      }

      const data = await fetchWithAuth(`${getBaseUrl()}/view_profile_detail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (data.st === 1 && data.Data?.user_details) {
        const userDetails = data.Data.user_details;
        setFormData({
          name: userDetails.name || "",
          email: userDetails.email || "",
          dob: userDetails.dob || "",
          aadhar_number: userDetails.aadhar_number || "",
        });
      }
    } catch (error) {
      toast.show({
        description: "Error fetching profile data",
        status: "error",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = "Name is required";
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const userId = await AsyncStorage.getItem("user_id");
      const mobileNumber = await AsyncStorage.getItem("mobile");

      const data = await fetchWithAuth(`${getBaseUrl()}/update_profile_detail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          update_user_id: userId,
          mobile_number: mobileNumber,
          ...formData
        }),
      });

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Profile updated successfully",
          status: "success",
        });
        
        // Navigate back to personal info screen with profileUpdated parameter
        router.push({
          pathname: "/profile/personal-info",
          params: { profileUpdated: true }
        });
      } else {
        toast.show({
          description: data.msg || "Failed to update profile",
          status: "error",
        });
      }
    } catch (error) {
      toast.show({
        description: "Error updating profile",
        status: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = selectedDate.toLocaleString('default', { month: 'short' });
      const year = selectedDate.getFullYear();
      const formattedDate = `${day} ${month} ${year}`;
      setFormData(prev => ({ ...prev, dob: formattedDate }));
    }
  };

  return (
    <Box flex={1} bg="coolGray.100" safeArea>
      {/* Header */}
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        bg="white"
        shadow={2}
      >
        <IconButton
          icon={<MaterialIcons name="arrow-back" size={24} color="gray" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          Edit Profile
        </Heading>
        <IconButton
          icon={<MaterialIcons name="check" size={24} color="green" />}
          onPress={handleSubmit}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
          isDisabled={isSubmitting}
        />
      </HStack>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Box bg="white" rounded="lg" shadow={1} mx={4} my={4} p={4}>
          <VStack space={4}>
            <FormControl isRequired isInvalid={"name" in errors}>
              <FormControl.Label>Full Name</FormControl.Label>
              <Input
                value={formData.name}
                onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
                placeholder="Enter your full name"
              />
              <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
            </FormControl>

            <FormControl isInvalid={"email" in errors}>
              <FormControl.Label>Email</FormControl.Label>
              <Input
                value={formData.email}
                onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
                placeholder="Enter your email"
                keyboardType="email-address"
              />
              <FormControl.ErrorMessage>{errors.email}</FormControl.ErrorMessage>
            </FormControl>

            <FormControl>
              <FormControl.Label>Aadhar Number</FormControl.Label>
              <Input
                value={formData.aadhar_number}
                onChangeText={(value) => setFormData(prev => ({ ...prev, aadhar_number: value }))}
                placeholder="Enter your Aadhar Number"
                keyboardType="numeric"
                maxLength={12}
              />
              <FormControl.HelperText>
                Enter your 12-digit Aadhar number
              </FormControl.HelperText>
            </FormControl>

            <FormControl isInvalid={"dob" in errors}>
              <FormControl.Label>Date of Birth</FormControl.Label>
              <Pressable onPress={() => setShowDatePicker(true)}>
                <Input
                  value={formData.dob}
                  placeholder="Select date of birth"
                  isReadOnly
                  rightElement={
                    <IconButton
                      icon={<MaterialIcons name="calendar-today" size={24} color="gray" />}
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
                maximumDate={new Date()}
              />
            )}

            <Button
              mt={4}
              onPress={handleSubmit}
              isLoading={isSubmitting}
              isLoadingText="Updating..."
            >
              Update Profile
            </Button>
          </VStack>
        </Box>
      </ScrollView>
    </Box>
  );
} 