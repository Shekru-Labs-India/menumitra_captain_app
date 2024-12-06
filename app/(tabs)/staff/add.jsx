import { useState } from "react";
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

  const roles = ["Waiter", "Chef", "Cleaner", "Receptionist"];

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.show({
        description: "Please enter a valid 10-digit phone number",
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

    // Validate DOB (age should be at least 18)
    const dob = new Date(formData.dob);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    if (age < 18 || isNaN(dob.getTime())) {
      toast.show({
        description: "Staff member must be at least 18 years old",
        status: "error",
      });
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const newStaff = {
      id: Date.now().toString(),
      ...formData,
      avatarUrl: image,
      status: "present",
      joinDate: new Date().toISOString().split("T")[0],
    };

    if (!global.staffData) {
      global.staffData = [];
    }
    global.staffData.push(newStaff);

    toast.show({
      description: "Staff member added successfully",
      status: "success",
    });
    router.back();
  };

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      <Box
        px={4}
        py={3}
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <HStack alignItems="center" justifyContent="space-between">
          <IconButton
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "gray.100" }}
            position="absolute"
            left={0}
            zIndex={1}
          />
          <Heading size="md" flex={1} textAlign="center">
            Add New Staff
          </Heading>
        </HStack>
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
            <FormControl.Label>Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter full name"
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
              _selectedItem={{
                bg: "cyan.600",
                endIcon: <CheckIcon size="5" color="white" />,
              }}
            >
              {roles.map((role) => (
                <Select.Item key={role} label={role} value={role} />
              ))}
            </Select>
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
            <FormControl.Label>Mobile Number</FormControl.Label>
            <Input
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter 10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
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
            />
          </FormControl>

          <Button
            mt={4}
            onPress={handleSave}
            leftIcon={<MaterialIcons name="save" size={20} color="white" />}
          >
            Save
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
