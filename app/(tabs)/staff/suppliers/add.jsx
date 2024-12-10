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
  HStack,
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { SupplierContext } from "../../../../context/SupplierContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import Header from "../../../components/Header";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function AddSupplierScreen() {
  const router = useRouter();
  const toast = useToast();
  const { addSupplier } = useContext(SupplierContext);

  const [formData, setFormData] = useState({
    name: "",
    status: "",
    creditRating: "",
    creditLimit: "",
    location: "",
    ownerName: "",
    supplierCode: "",
    website: "",
    mobileNumber1: "",
    mobileNumber2: "",
    address: "",
  });

  const [creditRatings, setCreditRatings] = useState([]);
  const [statusChoices, setStatusChoices] = useState([]);

  useEffect(() => {
    fetchCreditRatings();
    fetchStatusChoices();
  }, []);

  const fetchCreditRatings = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_credit_rating_choices`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (data.st === 1 && data.credit_rating_choices) {
        const ratingsArray = Object.entries(data.credit_rating_choices).map(
          ([key, value]) => ({
            value: key,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          })
        );
        setCreditRatings(ratingsArray);
      }
    } catch (error) {
      console.error("Error fetching credit ratings:", error);
      toast.show({
        description: "Failed to load credit rating options",
        status: "error",
      });
    }
  };

  const fetchStatusChoices = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_status_choices`,
        {
          method: "GET",
        }
      );

      const data = await response.json();
      console.log("Status Choices:", data);

      if (data.st === 1 && data.supplier_status_choices) {
        // Convert the choices object to an array of options
        const choices = Object.entries(data.supplier_status_choices).map(
          ([key]) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: key,
          })
        );
        setStatusChoices(choices);
      }
    } catch (error) {
      console.error("Failed to fetch status choices:", error);
      toast.show({
        description: "Failed to load status options",
        status: "error",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.mobileNumber1) {
      toast.show({
        description: "Please fill in all required fields",
        status: "error",
      });
      return;
    }

    try {
      const restaurantId = await AsyncStorage.getItem("restaurant_id");

      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: parseInt(restaurantId),
            name: formData.name,
            supplier_status: formData.status || "active",
            credit_rating: formData.creditRating,
            credit_limit: parseInt(formData.creditLimit),
            location: formData.location,
            owner_name: formData.ownerName,
            website: formData.website,
            mobile_number1: formData.mobileNumber1,
            mobile_number2: formData.mobileNumber2,
            address: formData.address,
          }),
        }
      );

      const data = await response.json();

      if (data.st === 1) {
        toast.show({
          description: "Supplier created successfully",
          status: "success",
        });
        router.back();
      } else {
        throw new Error(data.msg || "Failed to create supplier");
      }
    } catch (error) {
      toast.show({
        description: error.message,
        status: "error",
      });
    }
  };

  return (
    <Box flex={1} bg="coolGray.100" safeAreaTop>
      {/* Header Component */}
      <Header title="Add New Supplier" onBackPress={() => router.back()} />

      {/* Content */}
      <ScrollView
        flex={1}
        bg="coolGray.100"
        showsVerticalScrollIndicator={false}
      >
        <VStack space={4} p={4} mt={2}>
          {/* Basic Information Card */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={4}>
              <HStack space={2} alignItems="center" mb={2}>
                <MaterialIcons name="info" size={20} color="coolGray.600" />
                <Heading size="sm" color="coolGray.600">
                  Basic Information
                </Heading>
              </HStack>

              <FormControl isRequired>
                <FormControl.Label>Name</FormControl.Label>
                <Input
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter supplier name"
                  bg="white"
                />
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
                  _selectedItem={{
                    bg: "coolGray.100",
                    endIcon: (
                      <MaterialIcons name="check" size={20} color="green.500" />
                    ),
                  }}
                >
                  {statusChoices.map((choice) => (
                    <Select.Item
                      key={choice.value}
                      label={choice.label}
                      value={choice.value}
                    />
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormControl.Label>Supplier Code</FormControl.Label>
                <Input
                  value={formData.supplierCode}
                  onChangeText={(text) =>
                    setFormData({ ...formData, supplierCode: text })
                  }
                  placeholder="Enter supplier code"
                  bg="white"
                />
              </FormControl>
            </VStack>
          </Box>

          {/* Contact Information Card */}
          <Box bg="white" p={4} rounded="lg" shadow={1}>
            <VStack space={4}>
              <HStack space={2} alignItems="center" mb={2}>
                <MaterialIcons name="contacts" size={20} color="coolGray.600" />
                <Heading size="sm" color="coolGray.600">
                  Contact Information
                </Heading>
              </HStack>

              <FormControl isRequired>
                <FormControl.Label>Mobile Number 1</FormControl.Label>
                <Input
                  value={formData.mobileNumber1}
                  onChangeText={(text) =>
                    setFormData({ ...formData, mobileNumber1: text })
                  }
                  placeholder="Enter primary mobile number"
                  keyboardType="phone-pad"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Mobile Number 2</FormControl.Label>
                <Input
                  value={formData.mobileNumber2}
                  onChangeText={(text) =>
                    setFormData({ ...formData, mobileNumber2: text })
                  }
                  placeholder="Enter secondary mobile number"
                  keyboardType="phone-pad"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Website</FormControl.Label>
                <Input
                  value={formData.website}
                  onChangeText={(text) =>
                    setFormData({ ...formData, website: text })
                  }
                  placeholder="Enter website URL"
                  keyboardType="url"
                  bg="white"
                />
              </FormControl>
            </VStack>
          </Box>

          {/* Business Information Card */}
          <Box bg="white" p={4} rounded="lg" shadow={1} mb={6}>
            <VStack space={4}>
              <HStack space={2} alignItems="center" mb={2}>
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
                  _selectedItem={{
                    bg: "coolGray.100",
                    endIcon: (
                      <MaterialIcons name="check" size={20} color="green.500" />
                    ),
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

              <FormControl>
                <FormControl.Label>Credit Limit</FormControl.Label>
                <Input
                  value={formData.creditLimit}
                  onChangeText={(text) =>
                    setFormData({ ...formData, creditLimit: text })
                  }
                  placeholder="Enter credit limit"
                  keyboardType="numeric"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Owner Name</FormControl.Label>
                <Input
                  value={formData.ownerName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, ownerName: text })
                  }
                  placeholder="Enter owner name"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Location</FormControl.Label>
                <Input
                  value={formData.location}
                  onChangeText={(text) =>
                    setFormData({ ...formData, location: text })
                  }
                  placeholder="Enter location"
                  bg="white"
                />
              </FormControl>

              <FormControl>
                <FormControl.Label>Address</FormControl.Label>
                <TextArea
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  placeholder="Enter complete address"
                  autoCompleteType={undefined}
                  h={20}
                  bg="white"
                />
              </FormControl>

              <Button
                mt={2}
                colorScheme="blue"
                onPress={handleSave}
                leftIcon={<MaterialIcons name="save" size={20} color="white" />}
              >
                Save Supplier
              </Button>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}
