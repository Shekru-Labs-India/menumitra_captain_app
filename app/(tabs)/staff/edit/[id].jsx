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
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../../../components/Header";
import { getBaseUrl } from "../../../../config/api.config";

export default function EditStaffScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [captainId, setCaptainId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [roles, setRoles] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [errors, setErrors] = useState({});
  const [outletId, setOutletId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    mobile: "",
    address: "",
    dob: "",
    aadhar_number: "",
    photo: "",
  });

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const formatDate = (dateString) => {
    if (!dateString) return "";

    // Try to parse the API format first (DD MMM YYYY)
    const apiFormatMatch = dateString.match(/(\d{2}) (\w{3}) (\d{4})/);
    if (apiFormatMatch) {
      const [_, day, month, year] = apiFormatMatch;
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthIndex = months.indexOf(month);
      if (monthIndex !== -1) {
        return `${day} ${month} ${year}`;
      }
    }

    // Try to parse YYYY-MM-DD format
    const isoFormatMatch = dateString.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoFormatMatch) {
      const [year, month, day] = dateString.split("-");
      const date = new Date(year, month - 1, day);
      const formattedDay = String(date.getDate()).padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const formattedMonth = months[date.getMonth()];
      const formattedYear = date.getFullYear();
      return `${formattedDay} ${formattedMonth} ${formattedYear}`;
    }

    return dateString; // Return original string if no format matches
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);

    // If user cancels without selecting a date, keep the existing date
    if (!selectedDate) {
      return;
    }

    // Format the date directly using the date object
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();

    setFormData({
      ...formData,
      dob: `${day} ${month} ${year}`,
    });
  };

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedCaptainId = await AsyncStorage.getItem("captain_id");
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedCaptainId && storedOutletId) {
          setCaptainId(parseInt(storedCaptainId));
          setOutletId(parseInt(storedOutletId));
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access");
      const response = await fetch(`${getBaseUrl()}/get_staff_role`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
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
        const accessToken = await AsyncStorage.getItem("access");
        const response = await fetch(`${getBaseUrl()}/staff_view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            staff_id: parseInt(id),
            outlet_id: outletId,
          }),
        });

        const data = await response.json();
        console.log("Staff Details Response:", data);

        if (data.st === 1 && data.data) {
          const formattedDate = formatDate(data.data.dob);
          setFormData({
            name: data.data.name || "",
            role: data.data.role || "",
            mobile: data.data.mobile?.toString() || "",
            address: data.data.address || "",
            dob: formattedDate,
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

    if (id && outletId) {
      fetchStaffDetails();
    }
  }, [id, outletId]);

  const handleNameChange = (text) => {
    // Remove special characters and numbers
    const sanitizedText = text.replace(/[^a-zA-Z\s]/g, "");
    setFormData({ ...formData, name: sanitizedText });

    if (sanitizedText.trim().length < 2) {
      setErrors((prev) => ({
        ...prev,
        name: "Name must be at least 2 characters long",
      }));
    } else if (!/^[a-zA-Z\s]+$/.test(sanitizedText)) {
      setErrors((prev) => ({
        ...prev,
        name: "Only letters and spaces allowed",
      }));
    } else {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleMobileChange = (text) => {
    // Prevent entering 0-5 as first digit
    if (text.length === 1 && ["0", "1", "2", "3", "4", "5"].includes(text)) {
      setErrors((prev) => ({
        ...prev,
        mobile: "Number must start with 6, 7, 8 or 9",
      }));
      return;
    }

    // Only allow digits
    const sanitizedText = text.replace(/[^0-9]/g, "");
    setFormData({ ...formData, mobile: sanitizedText });

    if (
      sanitizedText.length > 0 &&
      !["6", "7", "8", "9"].includes(sanitizedText[0])
    ) {
      setErrors((prev) => ({
        ...prev,
        mobile: "Number must start with 6, 7, 8 or 9",
      }));
    } else if (
      sanitizedText.length === 10 &&
      !/^[6-9]\d{9}$/.test(sanitizedText)
    ) {
      setErrors((prev) => ({ ...prev, mobile: "Enter valid 10-digit number" }));
    } else {
      setErrors((prev) => ({ ...prev, mobile: undefined }));
    }
  };

  const handleAadharChange = (text) => {
    // Only allow digits
    const sanitizedText = text.replace(/[^0-9]/g, "");
    setFormData({ ...formData, aadhar_number: sanitizedText });

    if (sanitizedText && sanitizedText.length !== 12) {
      setErrors((prev) => ({ ...prev, aadhar_number: "Must be 12 digits" }));
    } else {
      setErrors((prev) => ({ ...prev, aadhar_number: undefined }));
    }
  };

  const handleSave = async () => {
    const newErrors = {};

    // Validate all fields
    if (
      !formData.name?.trim() ||
      !/^[a-zA-Z\s]{2,50}$/.test(formData.name.trim())
    ) {
      newErrors.name = "Enter valid name (only letters and spaces)";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    if (!formData.mobile || !/^[6-9]\d{9}$/.test(formData.mobile)) {
      newErrors.mobile = "Enter valid 10-digit number starting with 6-9";
    }

    if (!formData.aadhar_number || !/^\d{12}$/.test(formData.aadhar_number)) {
      newErrors.aadhar_number = "Enter valid 12-digit Aadhar number";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.show({
        description: "Please fix all errors before submitting",
        status: "error",
      });
      return;
    }

    setIsLoading(true);
    try {
      const userId = await AsyncStorage.getItem("user_id");
      const accessToken = await AsyncStorage.getItem("access");

      const response = await fetch(`${getBaseUrl()}/staff_update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: parseInt(userId),
          staff_id: parseInt(id),
          outlet_id: outletId,
          name: formData.name.trim(),
          mobile: formData.mobile,
          address: formData.address.trim(),
          role: formData.role.toLowerCase(),
          dob: formData.dob,
          aadhar_number: formData.aadhar_number,
          photo: formData.photo || "",
        }),
      });

      const data = await response.json();
      console.log("Update Response:", data);

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Staff details updated successfully",
          status: "success",
        });
        router.replace({
          pathname: `/(tabs)/staff/${parseInt(id)}`,
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
          <FormControl isRequired isInvalid={"name" in errors}>
            <FormControl.Label>Name</FormControl.Label>
            <Input
              value={formData.name}
              onChangeText={handleNameChange}
              placeholder="Enter name"
              autoCapitalize="words"
            />
            <FormControl.ErrorMessage>{errors.name}</FormControl.ErrorMessage>
          </FormControl>

          <FormControl isRequired isInvalid={"role" in errors}>
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

          <FormControl isRequired isInvalid={"mobile" in errors}>
            <FormControl.Label>Phone</FormControl.Label>
            <Input
              value={formData.mobile}
              onChangeText={handleMobileChange}
              keyboardType="numeric"
              placeholder="Enter phone number (start with 6-9)"
              maxLength={10}
            />
            <FormControl.ErrorMessage>{errors.mobile}</FormControl.ErrorMessage>
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
              value={
                formData.dob
                  ? new Date(
                      formData.dob.split(" ")[2], // year
                      months.indexOf(formData.dob.split(" ")[1]), // month
                      parseInt(formData.dob.split(" ")[0]) // day
                    )
                  : new Date()
              }
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          <FormControl isRequired isInvalid={"aadhar_number" in errors}>
            <FormControl.Label>Aadhar Number</FormControl.Label>
            <Input
              value={formData.aadhar_number}
              onChangeText={handleAadharChange}
              keyboardType="numeric"
              placeholder="Enter 12-digit Aadhar number"
              maxLength={12}
            />
            <FormControl.ErrorMessage>
              {errors.aadhar_number}
            </FormControl.ErrorMessage>
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
