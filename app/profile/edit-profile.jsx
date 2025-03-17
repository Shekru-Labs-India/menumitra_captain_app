import { useState } from "react";
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
import * as ImagePicker from "expo-image-picker";

export default function EditProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  
  // Static user data for now (will be replaced with API data later)
  const [formData, setFormData] = useState({
    name: "Cafe HashTag",
    email: "cafe.hashtag@example.com",
    phone: "+91 9876543210",
    address: "123 Cafe Street, Food District, City - 400001",
  });
  
  const [profileImage, setProfileImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      toast.show({
        description: "Permission to access photos is required!",
        status: "error",
      });
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    // Mock API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast.show({
        description: "Profile updated successfully",
        status: "success",
      });
      router.back();
    }, 1000);
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
          icon={<MaterialIcons name="close" size={24} color="gray" />}
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
        {/* Profile Image Picker */}
        <Center mt={6} mb={4}>
          <Pressable onPress={pickImage}>
            <Avatar 
              size="xl" 
              source={profileImage ? {uri: profileImage} : {uri: "https://via.placeholder.com/150"}}
              bg="blue.500"
            >
              {formData.name.charAt(0)}
              <Avatar.Badge bg="blue.500">
                <Icon
                  as={MaterialIcons}
                  name="camera-alt"
                  color="white"
                  size="sm"
                />
              </Avatar.Badge>
            </Avatar>
          </Pressable>
          <Text mt={2} fontSize="sm" color="blue.500">
            Tap to change photo
          </Text>
        </Center>

        {/* Form */}
        <Box bg="white" rounded="lg" shadow={1} mx={4} mb={8} p={4}>
          <VStack space={4}>
            <FormControl>
              <FormControl.Label>Full Name</FormControl.Label>
              <Input
                value={formData.name}
                onChangeText={(value) => handleChange("name", value)}
                placeholder="Enter your full name"
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Email</FormControl.Label>
              <Input
                value={formData.email}
                onChangeText={(value) => handleChange("email", value)}
                placeholder="Enter your email"
                keyboardType="email-address"
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Phone Number</FormControl.Label>
              <Input
                value={formData.phone}
                onChangeText={(value) => handleChange("phone", value)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Address</FormControl.Label>
              <Input
                value={formData.address}
                onChangeText={(value) => handleChange("address", value)}
                placeholder="Enter your address"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </FormControl>

            <Button
              mt={4}
              colorScheme="blue"
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