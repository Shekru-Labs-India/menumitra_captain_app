import React, { useState, useEffect, useCallback } from "react";
import {
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Box,
  HStack,
  VStack,
  Text,
  Heading,
  Input,
  FormControl,
  IconButton,
  Icon,
  useToast,
  Center,
  Switch,
  Button,
  Spinner,
  Modal,
  Pressable,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  FlatList
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";
import DateTimePicker from "@react-native-community/datetimepicker";

const EditRestaurantProfile = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantData, setRestaurantData] = useState(null);
  const [restaurantTypeModalVisible, setRestaurantTypeModalVisible] = useState(false);
  const [vegNonvegModalVisible, setVegNonvegModalVisible] = useState(false);
  const [restaurantTypeList, setRestaurantTypeList] = useState([]);
  const [vegNonvegList, setVegNonvegList] = useState([]);
  const [image, setImage] = useState(null);
  const [imageSelected, setImageSelected] = useState(false);
  const [showOpeningPicker, setShowOpeningPicker] = useState(false);
  const [showClosingPicker, setShowClosingPicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [originalData, setOriginalData] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    outlet_type: "",
    fssainumber: "",
    gstnumber: "",
    mobile: "",
    veg_nonveg: "",
    service_charges: "",
    gst: "",
    address: "",
    is_open: false,
    upi_id: "",
    website: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    google_business_link: "",
    google_review: "",
    opening_time: "",
    closing_time: "",
  });

  useEffect(() => {
    fetchRestaurantData();
    fetchRestaurantTypes();
    fetchVegNonvegList();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRestaurantData().finally(() => {
      setRefreshing(false);
    });
  }, []);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const captain_id = await AsyncStorage.getItem("captain_id");

      if (!outlet_id || !captain_id) {
        throw new Error("Required data missing");
      }

      const response = await fetchWithAuth(`${getBaseUrl()}/view_outlet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: captain_id,
          outlet_id: outlet_id,
        }),
      });

      if (response.st === 1) {
        const data = response.data;
        setRestaurantData(data);
        const formattedData = {
          name: data.name || "",
          outlet_type: data.outlet_type || "",
          fssainumber: data.fssainumber || "",
          gstnumber: data.gstnumber || "",
          mobile: data.mobile || "",
          veg_nonveg: data.veg_nonveg || "",
          service_charges: data.service_charges?.toString() || "",
          gst: data.gst?.toString() || "",
          address: data.address || "",
          is_open: data.is_open || false,
          upi_id: data.upi_id || "",
          website: data.website || "",
          whatsapp: data.whatsapp || "",
          facebook: data.facebook || "",
          instagram: data.instagram || "",
          google_business_link: data.google_business_link || "",
          google_review: data.google_review || "",
          opening_time: data.opening_time || "",
          closing_time: data.closing_time || "",
        };
        setFormData(formattedData);
        setOriginalData(formattedData);
      } else {
        toast.show({
          description: response.msg || "Failed to load restaurant information",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching restaurant info:", error);
      toast.show({
        description: "Error loading restaurant information",
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRestaurantTypes = async () => {
    try {
      const captain_id = await AsyncStorage.getItem("captain_id");
      
      const response = await fetchWithAuth(`${getBaseUrl()}/get_outlet_type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: captain_id,
        }),
      });

      if (response.st === 1) {
        const restaurantTypeList = response.outlet_type_list;
        const types = Object.entries(restaurantTypeList).map(
          ([key, value]) => ({
            key: key,
            name: value,
          })
        );
        setRestaurantTypeList(types);
      } else {
        toast.show({
          description: "Failed to fetch restaurant types",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching restaurant types:", error);
      toast.show({
        description: "Error loading restaurant types",
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    }
  };

  const fetchVegNonvegList = async () => {
    try {
      const captain_id = await AsyncStorage.getItem("captain_id");
      
      const response = await fetchWithAuth(`${getBaseUrl()}/get_veg_or_nonveg_list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: captain_id,
        }),
      });

      if (response.st === 1) {
        const vegNonvegList = Object.entries(
          response.veg_or_nonveg_list
        ).map(([key, value]) => ({
          key: key,
          name: value,
        }));
        setVegNonvegList(vegNonvegList);
      } else {
        toast.show({
          description: "Failed to fetch veg/non-veg options",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching veg/non-veg list:", error);
      toast.show({
        description: "Error loading veg/non-veg options",
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    }
  };

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Restaurant name is required";
      isValid = false;
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
      isValid = false;
    }

    // Restaurant type
    if (!formData.outlet_type) {
      newErrors.outlet_type = "Restaurant type is required";
      isValid = false;
    }

    // Veg/Non-veg
    if (!formData.veg_nonveg) {
      newErrors.veg_nonveg = "Please select veg or non-veg";
      isValid = false;
    }

    // Mobile validation
    if (!formData.mobile) {
      newErrors.mobile = "Mobile number is required";
      isValid = false;
    } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = "Please enter a valid 10 digit mobile number";
      isValid = false;
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
      isValid = false;
    }

    // FSSAI validation (optional)
    if (formData.fssainumber && !/^\d{14}$/.test(formData.fssainumber)) {
      newErrors.fssainumber = "FSSAI number must be 14 digits";
      isValid = false;
    }

    // GST validation (optional)
    if (formData.gstnumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9]{1}Z[0-9A-Z]{1}$/.test(formData.gstnumber)) {
      newErrors.gstnumber = "Please enter a valid GST number";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const hasUnsavedChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const handleBackPress = () => {
    if (hasUnsavedChanges()) {
      // Show confirmation dialog
      if (confirm("You have unsaved changes. Discard changes?")) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        toast.show({
          description: "Permission to access media library is required",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setImageSelected(true);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toast.show({
        description: "Failed to pick image",
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    }
  };

  const handleOpeningTimeChange = (event, selectedTime) => {
    setShowOpeningPicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setFormData((prev) => ({ ...prev, opening_time: timeString }));
    }
  };

  const handleClosingTimeChange = (event, selectedTime) => {
    setShowClosingPicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setFormData((prev) => ({ ...prev, closing_time: timeString }));
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const captain_id = await AsyncStorage.getItem("captain_id");

      if (!outlet_id || !captain_id) {
        throw new Error("Required data missing");
      }

      const formDataToSend = new FormData();
      
      formDataToSend.append("outlet_id", outlet_id);
      formDataToSend.append("user_id", captain_id);
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("outlet_type", formData.outlet_type || "");
      formDataToSend.append("fssainumber", formData.fssainumber || "");
      formDataToSend.append("gstnumber", formData.gstnumber || "");
      formDataToSend.append("mobile", formData.mobile);
      formDataToSend.append("veg_nonveg", formData.veg_nonveg || "");
      formDataToSend.append("service_charges", formData.service_charges || "");
      formDataToSend.append("gst", formData.gst || "");
      formDataToSend.append("address", formData.address.trim());
      formDataToSend.append("is_open", formData.is_open ? "1" : "0");
      formDataToSend.append("upi_id", formData.upi_id || "");
      formDataToSend.append("website", formData.website || "");
      formDataToSend.append("whatsapp", formData.whatsapp || "");
      formDataToSend.append("facebook", formData.facebook || "");
      formDataToSend.append("instagram", formData.instagram || "");
      formDataToSend.append("google_business_link", formData.google_business_link || "");
      formDataToSend.append("google_review", formData.google_review || "");
      formDataToSend.append("opening_time", formData.opening_time || "");
      formDataToSend.append("closing_time", formData.closing_time || "");

      // Append image if selected
      if (imageSelected && image) {
        const imageUri = Platform.OS === 'ios' ? image.replace('file://', '') : image;
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';

        formDataToSend.append("image", {
          uri: imageUri,
          name: filename,
          type
        });
      }

      const response = await fetchWithAuth(`${getBaseUrl()}/update_outlet`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formDataToSend,
      });

      if (response.st === 1) {
        toast.show({
          description: "Restaurant information updated successfully",
          status: "success",
          placement: "bottom",
          duration: 3000,
        });
        router.back();
      } else {
        toast.show({
          description: response.msg || "Failed to update restaurant information",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error updating restaurant info:", error);
      toast.show({
        description: "Error updating restaurant information",
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !restaurantData) {
    return (
      <Center flex={1}>
        <Spinner size="lg" color="#0066FF" />
      </Center>
    );
  }

  const renderTypeItem = ({ item }) => (
    <Pressable
      onPress={() => {
        setFormData(prev => ({ ...prev, outlet_type: item.name }));
        setRestaurantTypeModalVisible(false);
        if (errors.outlet_type) setErrors(prev => ({ ...prev, outlet_type: "" }));
      }}
      py={2}
      px={4}
      _pressed={{ bg: "coolGray.100" }}
    >
      <Text>{item.name}</Text>
    </Pressable>
  );

  const renderVegNonVegItem = ({ item }) => (
    <Pressable
      onPress={() => {
        setFormData(prev => ({ ...prev, veg_nonveg: item.name }));
        setVegNonvegModalVisible(false);
        if (errors.veg_nonveg) setErrors(prev => ({ ...prev, veg_nonveg: "" }));
      }}
      py={2}
      px={4}
      _pressed={{ bg: "coolGray.100" }}
    >
      <Text>{item.name}</Text>
    </Pressable>
  );

  return (
    <Box flex={1} bg="coolGray.50" safeArea>
      {/* Header */}
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        bg="white"
        shadow={1}
      >
        <IconButton
          icon={<Icon as={MaterialIcons} name="arrow-back" size={6} color="gray.500" />}
          onPress={handleBackPress}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          Edit Restaurant Profile
        </Heading>
        <Box width={10} /> {/* Empty box for balanced header */}
      </HStack>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        flex={1}
      >
        <ScrollView
          flex={1}
          px={4}
          py={4}
          bg="white"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0066FF"]}
              tintColor="#0066FF"
            />
          }
        >
          {/* Image Upload */}
          <Center mb={6}>
            <Pressable
              onPress={pickImage}
              position="relative"
              width="120px"
              height="120px"
              borderRadius="full"
              overflow="hidden"
              my={2}
            >
              {image || restaurantData?.image ? (
                <Image
                  source={{ uri: image || restaurantData?.image }}
                  alt="Restaurant Image"
                  width="100%"
                  height="100%"
                />
              ) : (
                <Box 
                  width="100%" 
                  height="100%" 
                  bg="coolGray.200" 
                  justifyContent="center" 
                  alignItems="center"
                >
                  <Icon as={MaterialIcons} name="store" size={12} color="gray.400" />
                </Box>
              )}
              <Box
                position="absolute"
                right={0}
                bottom={0}
                bg="white"
                borderRadius="full"
                width="30px"
                height="30px"
                justifyContent="center"
                alignItems="center"
                borderWidth={1}
                borderColor="coolGray.200"
              >
                <Icon as={MaterialIcons} name="edit" size={5} color="gray.500" />
              </Box>
            </Pressable>
          </Center>

          {/* Form Fields */}
          <VStack space={4} width="100%">
            {/* Restaurant Name */}
            <FormControl isRequired isInvalid={!!errors.name}>
              <FormControl.Label>Restaurant Name</FormControl.Label>
              <Input
                value={formData.name}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, name: text }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                }}
                placeholder="Enter restaurant name"
                borderRadius="md"
              />
              <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
            </FormControl>

            {/* Restaurant Type */}
            <FormControl isRequired isInvalid={!!errors.outlet_type}>
              <FormControl.Label>Restaurant Type</FormControl.Label>
              <Pressable
                onPress={() => setRestaurantTypeModalVisible(true)}
                borderWidth={1}
                borderColor="gray.300"
                borderRadius="md"
                py={2}
                px={3}
              >
                <HStack justifyContent="space-between" alignItems="center">
                  <Text>{formData.outlet_type || "Select Restaurant Type"}</Text>
                  <Icon as={MaterialIcons} name="arrow-drop-down" size={6} color="gray.500" />
                </HStack>
              </Pressable>
              <FormControl.ErrorMessage>{errors.outlet_type}</FormControl.ErrorMessage>
            </FormControl>

            {/* Veg/Non-Veg */}
            <FormControl isRequired isInvalid={!!errors.veg_nonveg}>
              <FormControl.Label>Veg/Non-Veg</FormControl.Label>
              <Pressable
                onPress={() => setVegNonvegModalVisible(true)}
                borderWidth={1}
                borderColor="gray.300"
                borderRadius="md"
                py={2}
                px={3}
              >
                <HStack justifyContent="space-between" alignItems="center">
                  <Text>{formData.veg_nonveg || "Select Veg/Non-Veg"}</Text>
                  <Icon as={MaterialIcons} name="arrow-drop-down" size={6} color="gray.500" />
                </HStack>
              </Pressable>
              <FormControl.ErrorMessage>{errors.veg_nonveg}</FormControl.ErrorMessage>
            </FormControl>

            {/* FSSAI Number */}
            <FormControl isInvalid={!!errors.fssainumber}>
              <FormControl.Label>FSSAI Number</FormControl.Label>
              <Input
                value={formData.fssainumber}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, "");
                  setFormData(prev => ({ ...prev, fssainumber: numericText }));
                  if (errors.fssainumber) setErrors(prev => ({ ...prev, fssainumber: "" }));
                }}
                placeholder="Enter 14-digit FSSAI number"
                keyboardType="numeric"
                maxLength={14}
                borderRadius="md"
              />
              <FormControl.ErrorMessage>{errors.fssainumber}</FormControl.ErrorMessage>
            </FormControl>

            {/* GST Number */}
            <FormControl isInvalid={!!errors.gstnumber}>
              <FormControl.Label>GST Number</FormControl.Label>
              <Input
                value={formData.gstnumber}
                onChangeText={(text) => {
                  const formattedText = text.replace(/[^0-9A-Z]/g, "").toUpperCase();
                  setFormData(prev => ({ ...prev, gstnumber: formattedText }));
                  if (errors.gstnumber) setErrors(prev => ({ ...prev, gstnumber: "" }));
                }}
                placeholder="Example: 29ABCDE1234F1Z5"
                maxLength={15}
                autoCapitalize="characters"
                borderRadius="md"
              />
              <FormControl.ErrorMessage>{errors.gstnumber}</FormControl.ErrorMessage>
            </FormControl>

            {/* Mobile Number */}
            <FormControl isRequired isInvalid={!!errors.mobile}>
              <FormControl.Label>Mobile Number</FormControl.Label>
              <Input
                value={formData.mobile}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, "");
                  setFormData(prev => ({ ...prev, mobile: numericText }));
                  if (errors.mobile) setErrors(prev => ({ ...prev, mobile: "" }));
                }}
                placeholder="Enter 10-digit mobile number"
                keyboardType="numeric"
                maxLength={10}
                borderRadius="md"
              />
              <FormControl.ErrorMessage>{errors.mobile}</FormControl.ErrorMessage>
            </FormControl>

            {/* Service Charges */}
            <FormControl isInvalid={!!errors.service_charges}>
              <FormControl.Label>Service Charges (%)</FormControl.Label>
              <Input
                value={formData.service_charges}
                onChangeText={(text) => {
                  if (/^\d*\.?\d{0,2}$/.test(text) || text === "") {
                    setFormData(prev => ({ ...prev, service_charges: text }));
                    if (errors.service_charges) setErrors(prev => ({ ...prev, service_charges: "" }));
                  }
                }}
                placeholder="Enter service charges (0-100)"
                keyboardType="decimal-pad"
                borderRadius="md"
              />
              <FormControl.ErrorMessage>{errors.service_charges}</FormControl.ErrorMessage>
            </FormControl>

            {/* GST Percentage */}
            <FormControl isInvalid={!!errors.gst}>
              <FormControl.Label>GST (%)</FormControl.Label>
              <Input
                value={formData.gst}
                onChangeText={(text) => {
                  if (/^\d*\.?\d{0,2}$/.test(text) || text === "") {
                    setFormData(prev => ({ ...prev, gst: text }));
                    if (errors.gst) setErrors(prev => ({ ...prev, gst: "" }));
                  }
                }}
                placeholder="Enter GST percentage (0-100)"
                keyboardType="decimal-pad"
                borderRadius="md"
              />
              <FormControl.ErrorMessage>{errors.gst}</FormControl.ErrorMessage>
            </FormControl>

            {/* Address */}
            <FormControl isRequired isInvalid={!!errors.address}>
              <FormControl.Label>Address</FormControl.Label>
              <Input
                value={formData.address}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, address: text }));
                  if (errors.address) setErrors(prev => ({ ...prev, address: "" }));
                }}
                placeholder="Enter restaurant address"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                borderRadius="md"
              />
              <FormControl.ErrorMessage>{errors.address}</FormControl.ErrorMessage>
            </FormControl>

            {/* UPI ID */}
            <FormControl isInvalid={!!errors.upi_id}>
              <FormControl.Label>UPI ID</FormControl.Label>
              <Input
                value={formData.upi_id}
                onChangeText={(text) => {
                  setFormData(prev => ({ ...prev, upi_id: text }));
                  if (errors.upi_id) setErrors(prev => ({ ...prev, upi_id: "" }));
                }}
                placeholder="Example: username@upi"
                borderRadius="md"
              />
              <FormControl.ErrorMessage>{errors.upi_id}</FormControl.ErrorMessage>
            </FormControl>

            {/* Website */}
            <FormControl>
              <FormControl.Label>Website</FormControl.Label>
              <Input
                value={formData.website}
                onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
                placeholder="https://example.com"
                keyboardType="url"
                borderRadius="md"
              />
            </FormControl>

            {/* Social Media Links */}
            <FormControl>
              <FormControl.Label>WhatsApp</FormControl.Label>
              <Input
                value={formData.whatsapp}
                onChangeText={(text) => setFormData(prev => ({ ...prev, whatsapp: text }))}
                placeholder="Enter WhatsApp number"
                borderRadius="md"
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Facebook</FormControl.Label>
              <Input
                value={formData.facebook}
                onChangeText={(text) => setFormData(prev => ({ ...prev, facebook: text }))}
                placeholder="https://facebook.com/your-page"
                borderRadius="md"
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Instagram</FormControl.Label>
              <Input
                value={formData.instagram}
                onChangeText={(text) => setFormData(prev => ({ ...prev, instagram: text }))}
                placeholder="https://instagram.com/your-profile"
                borderRadius="md"
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Google Business Link</FormControl.Label>
              <Input
                value={formData.google_business_link}
                onChangeText={(text) => setFormData(prev => ({ ...prev, google_business_link: text }))}
                placeholder="https://business.google.com/your-business"
                borderRadius="md"
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Google Review Link</FormControl.Label>
              <Input
                value={formData.google_review}
                onChangeText={(text) => setFormData(prev => ({ ...prev, google_review: text }))}
                placeholder="https://g.page/r/your-review-link"
                borderRadius="md"
              />
            </FormControl>

            {/* Operating Hours */}
            <FormControl>
              <FormControl.Label>Operating Hours</FormControl.Label>
              <HStack space={2} alignItems="center">
                <Pressable
                  onPress={() => setShowOpeningPicker(true)}
                  flex={1}
                  borderWidth={1}
                  borderColor="gray.300"
                  borderRadius="md"
                  p={2}
                >
                  <Text fontSize="xs" color="gray.500">Opening Time</Text>
                  <Text>{formData.opening_time || "Select Time"}</Text>
                </Pressable>

                <Text fontSize="md" textAlign="center" px={2}>to</Text>

                <Pressable
                  onPress={() => setShowClosingPicker(true)}
                  flex={1}
                  borderWidth={1}
                  borderColor="gray.300"
                  borderRadius="md"
                  p={2}
                >
                  <Text fontSize="xs" color="gray.500">Closing Time</Text>
                  <Text>{formData.closing_time || "Select Time"}</Text>
                </Pressable>
              </HStack>
            </FormControl>

            {/* Restaurant Open Toggle */}
            <HStack space={2} alignItems="center" justifyContent="space-between" mt={2}>
              <Text>Restaurant Open</Text>
              <Switch
                isChecked={formData.is_open}
                onToggle={(value) => setFormData(prev => ({ ...prev, is_open: value }))}
                colorScheme="blue"
              />
            </HStack>

            {/* Update Button */}
            <Button
              onPress={handleUpdate}
              isLoading={loading}
              isLoadingText="Updating..."
              mt={4}
              mb={10}
              colorScheme="blue"
              borderRadius="md"
              _text={{ fontWeight: "bold" }}
            >
              Save Changes
            </Button>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Restaurant Type Modal */}
      <Modal
        isOpen={restaurantTypeModalVisible}
        onClose={() => setRestaurantTypeModalVisible(false)}
      >
        <Modal.Content maxWidth="90%">
          <Modal.CloseButton />
          <Modal.Header>Select Restaurant Type</Modal.Header>
          <Modal.Body>
            <FlatList
              data={restaurantTypeList}
              keyExtractor={(item) => item.key.toString()}
              renderItem={renderTypeItem}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Veg/Non-veg Modal */}
      <Modal
        isOpen={vegNonvegModalVisible}
        onClose={() => setVegNonvegModalVisible(false)}
      >
        <Modal.Content maxWidth="90%">
          <Modal.CloseButton />
          <Modal.Header>Select Veg/Non-Veg</Modal.Header>
          <Modal.Body>
            <FlatList
              data={vegNonvegList}
              keyExtractor={(item) => item.key.toString()}
              renderItem={renderVegNonVegItem}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>

      {/* Date Time Pickers */}
      {showOpeningPicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleOpeningTimeChange}
        />
      )}

      {showClosingPicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleClosingTimeChange}
        />
      )}
    </Box>
  );
};

export default EditRestaurantProfile;