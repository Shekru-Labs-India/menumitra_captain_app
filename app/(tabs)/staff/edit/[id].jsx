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
} from "native-base";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function EditStaffScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    salary: "",
    emergencyContact: "",
    address: "",
  });
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    const staffMember = global.staffData.find((s) => s.id === id);
    if (staffMember) {
      setStaff(staffMember);
      setFormData({
        name: staffMember.name,
        role: staffMember.role,
        phone: staffMember.phone,
        salary: staffMember.salary,
        emergencyContact: staffMember.emergencyContact,
        address: staffMember.address,
      });
    }
  }, [id]);

  const handleSave = () => {
    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.show({
        description: "Please enter a valid 10-digit phone number",
        status: "error",
      });
      return;
    }

    // Validate salary
    if (formData.salary && isNaN(formData.salary)) {
      toast.show({
        description: "Please enter a valid salary amount",
        status: "error",
      });
      return;
    }

    const updatedStaffData = global.staffData.map((item) =>
      item.id === id ? { ...item, ...formData } : item
    );
    global.staffData = updatedStaffData;

    toast.show({
      description: "Staff details updated successfully",
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
            Edit Staff Details
          </Heading>
        </HStack>
      </Box>

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          <FormControl isRequired>
            <FormControl.Label>Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter name"
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Role</FormControl.Label>
            <Input
              value={formData.role}
              onChangeText={(text) => setFormData({ ...formData, role: text })}
              placeholder="Enter role"
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Phone</FormControl.Label>
            <Input
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
              placeholder="Enter phone number"
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Salary</FormControl.Label>
            <Input
              value={formData.salary}
              onChangeText={(text) =>
                setFormData({ ...formData, salary: text })
              }
              keyboardType="numeric"
              placeholder="Enter salary"
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Emergency Contact</FormControl.Label>
            <Input
              value={formData.emergencyContact}
              onChangeText={(text) =>
                setFormData({ ...formData, emergencyContact: text })
              }
              placeholder="Enter emergency contact"
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Address</FormControl.Label>
            <TextArea
              value={formData.address}
              onChangeText={(text) =>
                setFormData({ ...formData, address: text })
              }
              placeholder="Enter address"
              autoCompleteType={undefined}
            />
          </FormControl>

          <Button
            mt={4}
            onPress={handleSave}
            leftIcon={<MaterialIcons name="save" size={20} color="white" />}
          >
            Save Changes
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
