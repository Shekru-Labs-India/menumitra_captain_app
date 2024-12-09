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

  const pickImage = async () => {
    try {
      // Request permission
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
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      toast.show({
        description: "Error picking image",
        status: "error",
      });
      console.log(error);
    }
  };

  const validateForm = () => {
    try {
      // Check if all fields are filled
      if (
        !formData.name ||
        !formData.role ||
        !formData.dob ||
        !formData.aadharNo ||
        !formData.phone ||
        !formData.address
      ) {
        toast.show({
          description: "All fields are mandatory",
          status: "error",
        });
        return false;
      }

      // Validate name (only letters and spaces)
      const nameRegex = /^[a-zA-Z\s]{2,50}$/;
      if (!nameRegex.test(formData.name)) {
        toast.show({
          description: "Please enter a valid name (only letters and spaces)",
          status: "error",
        });
        return false;
      }

      // Validate phone number (10 digits starting with 6-9)
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        toast.show({
          description:
            "Please enter a valid 10-digit mobile number starting with 6-9",
          status: "error",
        });
        return false;
      }

      // Validate Aadhar number (12 digits)
      const aadharRegex = /^\d{12}$/;
      if (!aadharRegex.test(formData.aadharNo)) {
        toast.show({
          description: "Please enter a valid 12-digit Aadhar number",
          status: "error",
        });
        return false;
      }

      // Validate DOB format and age
      const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobRegex.test(formData.dob)) {
        toast.show({
          description: "Please enter date in YYYY-MM-DD format",
          status: "error",
        });
        return false;
      }

      const dob = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }

      if (age < 18 || age > 65 || isNaN(dob.getTime())) {
        toast.show({
          description: "Staff member must be between 18 and 65 years old",
          status: "error",
        });
        return false;
      }

      // Validate address (minimum length)
      if (formData.address.length < 10) {
        toast.show({
          description:
            "Please enter a complete address (minimum 10 characters)",
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
      formDataApi.append("dob", formData.dob);
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

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      <Box
        px={0}
        py={0}
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <Header title="Add New Staff" />
      </Box>

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          <Center>
            <Pressable onPress={pickImage}>
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

          <FormControl isRequired>
            <FormControl.Label>Full Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter Full Name"
              autoCapitalize="words"
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Role</FormControl.Label>
            <Select
              selectedValue={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value })
              }
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
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Mobile Number</FormControl.Label>
            <Input
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter  Mobile Number"
              keyboardType="numeric"
              maxLength={10}
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Date of Birth</FormControl.Label>
            <Input
              value={formData.dob}
              onChangeText={(text) => setFormData({ ...formData, dob: text })}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Aadhar Number</FormControl.Label>
            <Input
              value={formData.aadharNo}
              onChangeText={(text) =>
                setFormData({ ...formData, aadharNo: text })
              }
              placeholder="Enter 12-digit Aadhar number"
              keyboardType="numeric"
              maxLength={12}
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Address</FormControl.Label>
            <TextArea
              value={formData.address}
              onChangeText={(text) =>
                setFormData({ ...formData, address: text })
              }
              placeholder="Enter complete address"
              autoCompleteType={undefined}
              h={20}
            />
          </FormControl>

          <Button
            mt={4}
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
