import { useState, useEffect } from "react";
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
  Icon,
  Fab,
  Pressable,
  Avatar,
  TextArea,
  Divider,
} from "native-base";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";

// Initialize global staff data if it doesn't exist
if (!global.staffData) {
  global.staffData = [];
}

export default function StaffScreen() {
  const router = useRouter();
  const [staffList, setStaffList] = useState(global.staffData);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewType, setViewType] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const toast = useToast();

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

  // Update global data when staffList changes
  useEffect(() => {
    global.staffData = staffList;
  }, [staffList]);

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
      staff.id === staffId ? { ...staff, status: newStatus } : staff
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
          pathname: "/staff/[id]",
          params: { id: item.id },
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
        <HStack space={3} alignItems="center">
          <Avatar size="md" bg="cyan.500">
            {item.name?.charAt(0).toUpperCase()}
          </Avatar>
          <VStack flex={1}>
            <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
              {item.name}
            </Text>
            <Text fontSize="md" color="coolGray.600">
              {item.role}
            </Text>
            <Text fontSize="sm" color="coolGray.500">
              {item.phone}
            </Text>
          </VStack>
          <Button.Group
            size="sm"
            space={1}
            position="absolute"
            top={2}
            right={2}
          >
            <Button
              variant={item.status === "present" ? "solid" : "outline"}
              colorScheme="success"
              onPress={() => handleStatusChange(item.id, "present")}
              isDisabled={item.status === "on leave"}
            >
              Present
            </Button>
            <Button
              variant={item.status === "absent" ? "solid" : "outline"}
              colorScheme="danger"
              onPress={() => handleStatusChange(item.id, "absent")}
              isDisabled={item.status === "on leave"}
            >
              Absent
            </Button>
          </Button.Group>
        </HStack>
      </Box>
    </Pressable>
  );

  const renderGridItem = ({ item }) => (
    <Pressable
      onPress={() => {
        router.push({
          pathname: "/staff/[id]",
          params: { id: item.id },
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
          <Avatar size="lg" bg="cyan.500">
            {item.name?.charAt(0).toUpperCase()}
          </Avatar>
          <VStack space={1} alignItems="center">
            <Text fontSize="md" fontWeight="bold" textAlign="center">
              {item.name}
            </Text>
            <Text fontSize="sm" color="coolGray.600" textAlign="center">
              {item.role}
            </Text>
            <Button.Group size="sm" space={1}>
              <Button
                variant={item.status === "present" ? "solid" : "outline"}
                colorScheme="success"
                onPress={() => handleStatusChange(item.id, "present")}
                isDisabled={item.status === "on leave"}
                size="xs"
              >
                Present
              </Button>
              <Button
                variant={item.status === "absent" ? "solid" : "outline"}
                colorScheme="danger"
                onPress={() => handleStatusChange(item.id, "absent")}
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
          icon={<Icon as={Ionicons} name="arrow-back" size={6} />}
          onPress={() => router.back()}
        />
        <Heading size="lg" flex={1} textAlign="center">
          Staff Management
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
          <IconButton
            icon={
              <Icon
                as={MaterialIcons}
                name={viewType === "list" ? "grid-view" : "view-list"}
                size={6}
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
              <Icon
                as={MaterialIcons}
                name={sortOrder === "asc" ? "arrow-upward" : "arrow-downward"}
                size={6}
                color="coolGray.600"
              />
            }
            onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          />
        </HStack>
      </HStack>

      {/* Search and Filters */}
      <VStack px={4} space={2}>
        <Input
          placeholder="Search staff..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          InputLeftElement={
            <Icon
              as={Ionicons}
              name="search"
              size={5}
              ml={2}
              color="gray.400"
            />
          }
        />
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
      <FlatList
        data={filteredStaff}
        renderItem={viewType === "list" ? renderStaffItem : renderGridItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 8 }}
        numColumns={viewType === "grid" ? 2 : 1}
        key={viewType}
      />

      {/* FAB for adding new staff */}
      <Fab
        renderInPortal={false}
        shadow={3}
        size="sm"
        bottom={10}
        right={4}
        icon={<Icon color="white" as={Ionicons} name="add" size="md" />}
        onPress={() => {
          router.push("/staff/add");
        }}
      />
    </Box>
  );
}