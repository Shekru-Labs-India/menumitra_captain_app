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
  Divider,
  HStack,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { SupplierContext } from "../../../../../context/SupplierContext";

export default function EditSupplierScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams();
  const { suppliers, updateSupplier } = useContext(SupplierContext);

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

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const supplier = suppliers.find((s) => s.id === id);
    if (supplier) {
      setFormData(supplier);
    } else {
      toast.show({
        description: "Supplier not found",
        status: "error",
      });
      router.back();
    }
  }, [id]);

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.mobileNumber1?.trim()) {
      newErrors.mobileNumber1 = "Primary contact is required";
    } else if (!/^\d{10}$/.test(formData.mobileNumber1.trim())) {
      newErrors.mobileNumber1 = "Enter valid 10-digit number";
    }

    // Optional field validations
    if (
      formData.mobileNumber2?.trim() &&
      !/^\d{10}$/.test(formData.mobileNumber2.trim())
    ) {
      newErrors.mobileNumber2 = "Enter valid 10-digit number";
    }

    if (
      formData.website?.trim() &&
      !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(
        formData.website.trim()
      )
    ) {
      newErrors.website = "Enter valid website URL";
    }

    if (formData.creditLimit?.trim() && isNaN(formData.creditLimit.trim())) {
      newErrors.creditLimit = "Credit limit must be a number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = () => {
    if (validateForm()) {
      updateSupplier(id, {
        ...formData,
        name: formData.name.trim(),
        mobileNumber1: formData.mobileNumber1.trim(),
        mobileNumber2: formData.mobileNumber2?.trim(),
        website: formData.website?.trim(),
        creditLimit: formData.creditLimit?.trim(),
        address: formData.address?.trim(),
      });

      toast.show({
        description: "Supplier updated successfully",
        status: "success",
      });
      router.back();
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
          icon={
            <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
          }
          onPress={() => router.back()}
        />
        <Heading textAlign="center">Edit Supplier</Heading>
      </Box>

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          {/* Basic Information */}
          <HStack space={2} alignItems="center">
            <MaterialIcons name="info" size={20} color="coolGray.600" />
            <Heading size="sm" color="coolGray.600">
              Basic Information
            </Heading>
          </HStack>

          <FormControl isRequired isInvalid={"name" in errors}>
            <FormControl.Label>Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter supplier name"
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
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
              <Select.Item label="Active" value="active" />
              <Select.Item label="Inactive" value="inactive" />
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
            />
          </FormControl>

          <Divider my={2} />

          {/* Contact Information */}
          <HStack space={2} alignItems="center">
            <MaterialIcons name="contacts" size={20} color="coolGray.600" />
            <Heading size="sm" color="coolGray.600">
              Contact Information
            </Heading>
          </HStack>

          <FormControl isRequired isInvalid={"mobileNumber1" in errors}>
            <FormControl.Label>Primary Contact</FormControl.Label>
            <Input
              value={formData.mobileNumber1}
              onChangeText={(text) =>
                setFormData({ ...formData, mobileNumber1: text })
              }
              placeholder="Enter primary mobile number"
              keyboardType="phone-pad"
            />
            <FormControl.ErrorMessage>
              {errors.mobileNumber1}
            </FormControl.ErrorMessage>
          </FormControl>

          <FormControl isInvalid={"mobileNumber2" in errors}>
            <FormControl.Label>Secondary Contact</FormControl.Label>
            <Input
              value={formData.mobileNumber2}
              onChangeText={(text) =>
                setFormData({ ...formData, mobileNumber2: text })
              }
              placeholder="Enter secondary mobile number"
              keyboardType="phone-pad"
            />
            <FormControl.ErrorMessage>
              {errors.mobileNumber2}
            </FormControl.ErrorMessage>
          </FormControl>

          <FormControl isInvalid={"website" in errors}>
            <FormControl.Label>Website</FormControl.Label>
            <Input
              value={formData.website}
              onChangeText={(text) =>
                setFormData({ ...formData, website: text })
              }
              placeholder="Enter website URL"
              keyboardType="url"
            />
            <FormControl.ErrorMessage>
              {errors.website}
            </FormControl.ErrorMessage>
          </FormControl>

          <Divider my={2} />

          {/* Business Information */}
          <HStack space={2} alignItems="center">
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
              _selectedItem={{
                endIcon: (
                  <MaterialIcons name="check" size={16} color="coolGray.600" />
                ),
              }}
            >
              <Select.Item label="Excellent" value="excellent" />
              <Select.Item label="Good" value="good" />
              <Select.Item label="Bad" value="bad" />
              <Select.Item label="Very Bad" value="very_bad" />
              <Select.Item label="Not Rated" value="not_rated" />
            </Select>
          </FormControl>

          <FormControl isInvalid={"creditLimit" in errors}>
            <FormControl.Label>Credit Limit</FormControl.Label>
            <Input
              value={formData.creditLimit}
              onChangeText={(text) =>
                setFormData({ ...formData, creditLimit: text })
              }
              placeholder="Enter credit limit"
              keyboardType="numeric"
            />
            <FormControl.ErrorMessage>
              {errors.creditLimit}
            </FormControl.ErrorMessage>
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
            mb={8}
            colorScheme="blue"
            onPress={handleUpdate}
            leftIcon={<MaterialIcons name="save" size={20} color="white" />}
          >
            Update Supplier
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
