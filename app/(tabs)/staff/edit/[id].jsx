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
  Spinner,
  Pressable,
  Text,
  Select,
  CheckIcon,
} from "native-base";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from "../../../components/Header";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function EditStaffScreen() {
  const router = useRouter();
  const { id, restaurant_id } = useLocalSearchParams();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [captainId, setCaptainId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [roles, setRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    mobile: "",
    address: "",
    dob: "",
    aadhar_number: "",
    photo: "",
  });

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFormData({ ...formData, dob: formatDate(selectedDate) });
    }
  };

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedCaptainId = await AsyncStorage.getItem("captain_id");
        if (storedCaptainId) {
          setCaptainId(parseInt(storedCaptainId));
        }
      } catch (error) {
        console.error("Error getting captain ID:", error);
      }
    };

    getStoredData();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_staff_role`, {
        method: "GET",
      });

      const data = await response.json();
      console.log("Roles Response:", data);

      if (data.st === 1 && data.role_list) {
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
    const fetchStaffDetails = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/captain_manage/staff_view`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              staff_id: parseInt(id),
              restaurant_id: parseInt(restaurant_id),
            }),
          }
        );

        const data = await response.json();
        console.log("Staff Details Response:", data);

        if (data.st === 1 && data.data) {
          // Populate form with existing data
          setFormData({
            name: data.data.name || "",
            role: data.data.role || "",
            mobile: data.data.mobile?.toString() || "",
            address: data.data.address || "",
            dob: data.data.dob || "",
            aadhar_number: data.data.aadhar_number?.toString() || "",
            photo: data.data.photo || "",
          });
        } else {
          toast.show({
            description: "Failed to fetch staff details",
            status: "error",
          });
          router.back();
        }
      } catch (error) {
        console.error("Fetch Staff Details Error:", error);
        toast.show({
          description: "Failed to fetch staff details",
          status: "error",
        });
        router.back();
      }
    };

    if (id && restaurant_id) {
      fetchStaffDetails();
    }
  }, [id, restaurant_id]);

  const handleSave = async () => {
    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.mobile)) {
      toast.show({
        description: "Please enter a valid 10-digit phone number",
        status: "error",
      });
      return;
    }

    // Validate aadhar number
    if (formData.aadhar_number && formData.aadhar_number.length !== 12) {
      toast.show({
        description: "Please enter a valid 12-digit Aadhar number",
        status: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/staff_update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            captain_id: captainId,
            staff_id: parseInt(id),
            restaurant_id: parseInt(restaurant_id),
            name: formData.name,
            mobile: parseInt(formData.mobile),
            address: formData.address,
            role: formData.role,
            dob: formData.dob,
            aadhar_number: parseInt(formData.aadhar_number),
            photo: formData.photo,
          }),
        }
      );

      const data = await response.json();
      console.log("Update Response:", data);

      if (data.st === 1) {
        toast.show({
          description: "Staff details updated successfully",
          status: "success",
        });
        router.replace({
         // pathname: "/(tabs)/staff",
          pathname:`/(tabs)/staff/${parseInt(id)}`,
          params: { refresh: Date.now() },
        });
      } else {
        toast.show({
          description: data.msg || "Failed to update staff details",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Update Staff Error:", error);
      toast.show({
        description: "Failed to update staff details",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <Header title="Edit Staff Details" />

      <ScrollView px={4} py={4}>
        <VStack space={4}>
          <FormControl isRequired>
            <FormControl.Label>Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder={formData.name || "Enter name"}
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
            <FormControl.Label>Phone</FormControl.Label>
            <Input
              value={formData.mobile}
              onChangeText={(text) =>
                setFormData({ ...formData, mobile: text })
              }
              keyboardType="phone-pad"
              placeholder={formData.mobile || "Enter phone number"}
            />
          </FormControl>

          <FormControl isRequired>
            <FormControl.Label>Date of Birth</FormControl.Label>
            <Pressable onPress={() => setShowDatePicker(true)}>
              <Input
                value={formData.dob}
                isReadOnly
                placeholder="Select date of birth"
                rightElement={
                  <IconButton
                    icon={
                      <MaterialIcons
                        name="calendar-today"
                        size={24}
                        color="gray"
                      />
                    }
                    onPress={() => setShowDatePicker(true)}
                  />
                }
              />
            </Pressable>
          </FormControl>

          {showDatePicker && (
            <DateTimePicker
              value={formData.dob ? new Date(formData.dob) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={new Date()} // Prevents future dates
            />
          )}

          <FormControl isRequired>
            <FormControl.Label>Aadhar Number</FormControl.Label>
            <Input
              value={formData.aadhar_number}
              onChangeText={(text) =>
                setFormData({ ...formData, aadhar_number: text })
              }
              keyboardType="numeric"
              placeholder={
                formData.aadhar_number || "Enter 12-digit Aadhar number"
              }
            />
          </FormControl>

          <FormControl>
            <FormControl.Label>Address</FormControl.Label>
            <TextArea
              value={formData.address}
              onChangeText={(text) =>
                setFormData({ ...formData, address: text })
              }
              placeholder={formData.address || "Enter address"}
              autoCompleteType={undefined}
            />
          </FormControl>

          <Button
            mt={4}
            mb={6}
            onPress={handleSave}
            leftIcon={<MaterialIcons name="save" size={20} color="white" />}
            isLoading={isLoading}
            isLoadingText="Saving..."
          >
            Save Changes
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
