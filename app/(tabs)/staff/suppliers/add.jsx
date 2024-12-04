import { useState, useContext } from "react";
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

  const handleSave = () => {
    if (!formData.name || !formData.mobileNumber1) {
      toast.show({
        description: "Please fill in all required fields",
        status: "error",
      });
      return;
    }

    addSupplier(formData);
    toast.show({
      description: "Supplier added successfully",
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
              <Select.Item label="Active" value="active" />
              <Select.Item label="Inactive" value="inactive" />
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
              <Select.Item label="Excellent" value="excellent" />
              <Select.Item label="Good" value="good" />
              <Select.Item label="Bad" value="bad" />
              <Select.Item label="Very Bad" value="very_bad" />
              <Select.Item label="Not Rated" value="not_rated" />
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
