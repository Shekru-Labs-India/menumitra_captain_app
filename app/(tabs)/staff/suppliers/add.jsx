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
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { SupplierContext } from "../../../../context/SupplierContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  const [creditRatingChoices, setCreditRatingChoices] = useState([]);
  const [statusChoices, setStatusChoices] = useState([]);

  useEffect(() => {
    fetchCreditRatingChoices();
    fetchStatusChoices();
  }, []);

  const fetchCreditRatingChoices = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/supplier_credit_rating_choices`,
        {
          method: "GET",
        }
      );

      const data = await response.json();
      console.log("Credit Rating Choices:", data);

      if (data.st === 1 && data.credit_rating_choices) {
        // Convert the choices object to an array of options
        const choices = Object.entries(data.credit_rating_choices).map(
          ([key]) => ({
            label:
              key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
            value: key,
          })
        );
        setCreditRatingChoices(choices);
      }
    } catch (error) {
      console.error("Failed to fetch credit rating choices:", error);
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
        <IconButton
          position="absolute"
          left={2}
          top={2}
          icon={<Icon as={Ionicons} name="arrow-back" size={6} />}
          onPress={() => router.back()}
        />
        <Heading textAlign="center">Add New Supplier</Heading>
      </Box>

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          <FormControl isRequired>
            <FormControl.Label>Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter supplier name"
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
              _selectedItem={{
                endIcon: <CheckIcon size={4} />,
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
            <FormControl.Label>Credit Rating</FormControl.Label>
            <Select
              selectedValue={formData.creditRating}
              onValueChange={(value) =>
                setFormData({ ...formData, creditRating: value })
              }
              placeholder="Select credit rating"
              _selectedItem={{
                endIcon: <CheckIcon size={4} />,
              }}
            >
              {creditRatingChoices.map((choice) => (
                <Select.Item
                  key={choice.value}
                  label={choice.label}
                  value={choice.value}
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
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Supplier Code</FormControl.Label>
            <Input
              value={formData.supplierCode}
              onChangeText={(text) =>
                setFormData({ ...formData, supplierCode: text })
              }
              placeholder="Enter supplier code"
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
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Mobile Number 1</FormControl.Label>
            <Input
              value={formData.mobileNumber1}
              onChangeText={(text) =>
                setFormData({ ...formData, mobileNumber1: text })
              }
              placeholder="Enter primary mobile number"
              keyboardType="phone-pad"
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
            />
          </FormControl>

          <Button mt={4} mb={8} onPress={handleSave}>
            Save Supplier
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
