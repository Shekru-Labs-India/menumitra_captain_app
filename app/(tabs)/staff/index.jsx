import { useState, useEffect, useCallback } from "react";
import {
  Box,
  FlatList,
  Heading,
  HStack,
  VStack,
  Text,
  IconButton,
  Modal,
  FormControl,
  Input,
  Button,
  useToast,
  Select,
  CheckIcon,
  Badge,
  Fab,
  Pressable,
  Avatar,
  Spinner,
  SimpleGrid,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

const API_BASE_URL = "https://men4u.xyz/captain_api";

// Add this function to handle phone calls
const handlePhonePress = (phoneNumber) => {
  Linking.openURL(`tel:${phoneNumber}`);
};

export default function StaffScreen() {
  const router = useRouter();
  const [staffList, setStaffList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewType, setViewType] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const params = useLocalSearchParams();
  const [restaurantId, setRestaurantId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    salary: "",
    joinDate: new Date().toISOString().split("T")[0],
    status: "present",
    emergencyContact: "",
    address: "",
    notes: "",
  });

  // Filter and sort staff list
  const filteredStaff = staffList
    .filter((staff) => {
      const matchesSearch =
        staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.phone?.includes(searchQuery) ||
        staff.role?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole ? staff.role === filterRole : true;
      const matchesStatus = filterStatus ? staff.status === filterStatus : true;
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      const factor = sortOrder === "asc" ? 1 : -1;
      return a[sortBy] > b[sortBy] ? factor : -factor;
    });

  const uniqueRoles = [...new Set(staffList.map((staff) => staff.role))];

  const validateForm = () => {
    if (!formData.name || !formData.role || !formData.phone) {
      toast.show({
        description: "Please fill all required fields",
        status: "error",
      });
      return false;
    }

    // Validate phone number
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.show({
        description: "Please enter a valid 10-digit phone number",
        status: "error",
      });
      return false;
    }

    // Validate salary if provided
    if (formData.salary && isNaN(formData.salary)) {
      toast.show({
        description: "Please enter a valid salary amount",
        status: "error",
      });
      return false;
    }

    return true;
  };

  const handleAddStaff = () => {
    if (!validateForm()) return;

    const newStaff = {
      id: Date.now().toString(),
      ...formData,
    };

    setStaffList([...staffList, newStaff]);
    setModalVisible(false);
    resetForm();
    toast.show({
      description: "Staff member added successfully",
      status: "success",
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      phone: "",
      salary: "",
      joinDate: new Date().toISOString().split("T")[0],
      status: "present",
      emergencyContact: "",
      address: "",
      notes: "",
    });
  };

  const handleStatusChange = (staffId, newStatus) => {
    const updatedStaffList = staffList.map((staff) =>
      staff.staff_id === staffId ? { ...staff, status: newStatus } : staff
    );
    setStaffList(updatedStaffList);
    toast.show({
      description: `Staff marked as ${newStatus}`,
      status: "success",
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "present":
        return "success";
      case "absent":
        return "danger";
      case "on leave":
        return "warning";
      default:
        return "info";
    }
  };

  const renderStaffItem = ({ item }) => (
    <Pressable
      onPress={() => {
        router.push({
          pathname: `/(tabs)/staff/${item.staff_id}`,
          params: { restaurant_id: item.restaurant_id },
        });
      }}
    >
      <Box
        bg="white"
        rounded="lg"
        shadow={2}
        mb={3}
        mx={3}
        p={4}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <HStack space={3} alignItems="center" justifyContent="space-between">
          <HStack space={3} alignItems="center" flex={1}>
            <Avatar
              size="md"
              bg="cyan.500"
              source={item.photo ? { uri: item.photo } : null}
            >
              {!item.photo && item.name?.charAt(0).toUpperCase()}
            </Avatar>
            <VStack flex={1}>
              <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
                {item.name}
              </Text>
              <Text fontSize="md" color="coolGray.600">
                {item.role}
              </Text>
              <Text fontSize="sm" color="coolGray.500">
                {item.mobile}
              </Text>
            </VStack>
            <VStack alignItems="flex-end" space={2}>
              <Button.Group size="xs" space={1}>
                <Button
                  variant="outline"
                  colorScheme="success"
                  onPress={(e) => {
                    e.stopPropagation();
                    handleStatusChange(item.staff_id, "present");
                  }}
                  size="xs"
                >
                  Present
                </Button>
                <Button
                  variant="outline"
                  colorScheme="danger"
                  onPress={(e) => {
                    e.stopPropagation();
                    handleStatusChange(item.staff_id, "absent");
                  }}
                  size="xs"
                >
                  Absent
                </Button>
              </Button.Group>
            </VStack>
          </HStack>
        </HStack>
      </Box>
    </Pressable>
  );

  const renderGridItem = ({ item }) => (
    <Pressable
      onPress={() => {
        router.push({
          pathname: `/(tabs)/staff/${item.staff_id}`,
          params: { restaurant_id: restaurantId },
        });
      }}
      flex={1}
      m={1}
    >
      <Box
        bg="white"
        rounded="lg"
        shadow={2}
        p={3}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <VStack space={2} alignItems="center">
          <Avatar
            size="lg"
            bg="cyan.500"
            source={item.photo ? { uri: item.photo } : null}
          >
            {item.name?.charAt(0).toUpperCase()}
          </Avatar>
          <VStack space={1} alignItems="center">
            <Text fontSize="md" fontWeight="bold" textAlign="center">
              {item.name}
            </Text>
            <Text fontSize="sm" color="coolGray.600" textAlign="center">
              {item.role}
            </Text>
            <Text fontSize="xs" color="coolGray.500">
              ID: #{item.staff_id}
            </Text>
            <Button.Group size="sm" space={1}>
              <Button
                variant={item.status === "present" ? "solid" : "outline"}
                colorScheme="success"
                onPress={(e) => {
                  e.stopPropagation();
                  handleStatusChange(item.staff_id, "present");
                }}
                isDisabled={item.status === "on leave"}
                size="xs"
              >
                Present
              </Button>
              <Button
                variant={item.status === "absent" ? "solid" : "outline"}
                colorScheme="danger"
                onPress={(e) => {
                  e.stopPropagation();
                  handleStatusChange(item.staff_id, "absent");
                }}
                isDisabled={item.status === "on leave"}
                size="xs"
              >
                Absent
              </Button>
            </Button.Group>
          </VStack>
        </VStack>
      </Box>
    </Pressable>
  );

  const fetchStaffList = async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/staff_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
          }),
        }
      );

      const data = await response.json();
      console.log("Staff List Response:", data);

      if (data.st === 1) {
        const staffWithStatus = (data.lists || []).map((staff) => ({
          ...staff,
          status: staff.status || "present",
        }));
        setStaffList(staffWithStatus);
      } else {
        toast.show({
          description: data.msg || "Failed to fetch staff list",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Fetch Staff List Error:", error);
      toast.show({
        description: "Failed to fetch staff list",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Replace useEffect with useFocusEffect
  useFocusEffect(
    useCallback(() => {
      if (restaurantId) {
        console.log("Screen focused, fetching staff list...");
        fetchStaffList();
      }
    }, [restaurantId])
  );

  // Keep existing useEffect for initial load
  useEffect(() => {
    if (restaurantId) {
      fetchStaffList();
    }
  }, [restaurantId, params.refresh]);

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
        if (storedRestaurantId) {
          setRestaurantId(parseInt(storedRestaurantId));
        } else {
          toast.show({
            description: "Please login again",
            status: "error",
          });
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error getting stored data:", error);
      }
    };

    getStoredData();
  }, []);

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header with Back Button and Title */}
      <HStack
        px={4}
        py={3}
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
      >
        <IconButton
          icon={
            <MaterialIcons name="arrow-back" size={24} color="coolGray.600" />
          }
          onPress={() => router.back()}
        />
        <Heading size="md" flex={1} textAlign="center">
          Staff
        </Heading>
      </HStack>

      {/* Controls Bar */}
      <HStack
        px={4}
        py={2}
        alignItems="center"
        justifyContent="flex-end"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <HStack space={2} alignItems="center">
          <Input
            w="40%"
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            InputLeftElement={
              <MaterialIcons
                name="search"
                size={24}
                color="gray.400"
                style={{ marginLeft: 8 }}
              />
            }
          />
          <IconButton
            icon={
              <MaterialIcons
                name={viewType === "list" ? "grid-view" : "view-list"}
                size={24}
                color="coolGray.600"
              />
            }
            onPress={() => setViewType(viewType === "list" ? "grid" : "list")}
          />
          <Select
            w="110"
            selectedValue={sortBy}
            onValueChange={setSortBy}
            placeholder="Sort by"
            _selectedItem={{
              endIcon: <CheckIcon size={4} />,
            }}
            defaultValue=""
            alignSelf="center"
          >
            <Select.Item label="Name" value="name" />
            <Select.Item label="Role" value="role" />
          </Select>
          <IconButton
            icon={
              <MaterialIcons
                name={sortOrder === "asc" ? "arrow-upward" : "arrow-downward"}
                size={24}
                color="coolGray.600"
              />
            }
            onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          />
        </HStack>
      </HStack>

      {/* Search and Filters */}
      <VStack px={4} space={2}>
        <HStack space={2}>
          <Select
            flex={1}
            selectedValue={filterRole}
            onValueChange={setFilterRole}
            placeholder="Filter by role"
            _selectedItem={{
              endIcon: <CheckIcon size={4} />,
            }}
          >
            <Select.Item label="All Roles" value="" />
            {uniqueRoles.map((role) => (
              <Select.Item key={role} label={role} value={role} />
            ))}
          </Select>
          <Select
            flex={1}
            selectedValue={filterStatus}
            onValueChange={setFilterStatus}
            placeholder="Filter by status"
            _selectedItem={{
              endIcon: <CheckIcon size={4} />,
            }}
          >
            <Select.Item label="All Status" value="" />
            <Select.Item label="Present" value="present" />
            <Select.Item label="Absent" value="absent" />
            <Select.Item label="On Leave" value="on leave" />
          </Select>
        </HStack>
      </VStack>

      {/* Staff List */}
      {isLoading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Spinner size="lg" />
          <Text mt={2}>Loading staff list...</Text>
        </Box>
      ) : (
        <FlatList
          data={filteredStaff}
          renderItem={viewType === "list" ? renderStaffItem : renderGridItem}
          keyExtractor={(item) => item.staff_id?.toString()}
          numColumns={viewType === "grid" ? 2 : 1}
          key={viewType}
          contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 20 }}
          ListEmptyComponent={
            <Box flex={1} justifyContent="center" alignItems="center" py={10}>
              <Text color="gray.500">No staff members found</Text>
            </Box>
          }
        />
      )}

      {/* Add Staff FAB */}
      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/staff/add")}
      />
    </Box>
  );
}
