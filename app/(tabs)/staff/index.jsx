import { useState, useEffect, useCallback, memo, useMemo } from "react";
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
  ScrollView,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Header from "../../components/Header";
import { getBaseUrl } from "../../../config/api.config";
import { fetchWithAuth } from "../../../utils/apiInterceptor";

// Memoized helper functions
const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Memoized Components
const MemoizedHeader = memo(({ title }) => <Header title={title} />);

const StaffAvatar = memo(({ name, photo, size = "md" }) => (
  <Avatar size={size} bg="cyan.500" source={photo ? { uri: photo } : null}>
    {!photo && name?.charAt(0).toUpperCase()}
  </Avatar>
));

const StatusButtons = memo(({ staffId, status, onStatusChange, size = "xs" }) => (
  <Button.Group size={size} space={1}>
    <Button
      variant={status === "present" ? "solid" : "outline"}
      colorScheme="success"
      borderColor="success.500"
      onPress={(e) => {
        e.stopPropagation();
        onStatusChange(staffId, "present");
      }}
      size={size}
    >
      Present
    </Button>
    <Button
      variant={status === "absent" ? "solid" : "outline"}
      colorScheme="danger"
      borderColor="danger.500"
      onPress={(e) => {
        e.stopPropagation();
        onStatusChange(staffId, "absent");
      }}
      size={size}
    >
      Absent
    </Button>
  </Button.Group>
));

const ListItem = memo(({ item, onPress, onStatusChange, onPhonePress }) => (
  <Pressable onPress={onPress}>
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
        <StaffAvatar name={item.name} photo={item.photo} />
        <VStack flex={1} ml={2}>
          <Text fontSize="lg" fontWeight="bold" color="coolGray.800">
            {toTitleCase(item.name)}
          </Text>
          <Text fontSize="md" color="coolGray.600">
            {toTitleCase(item.role)}
          </Text>
        </VStack>

        <VStack alignItems="flex-end" space={1}>
          <StatusButtons
            staffId={item.staff_id}
            status={item.status}
            onStatusChange={onStatusChange}
          />
          <IconButton
            icon={<MaterialIcons name="phone" size={20} color="white" />}
            onPress={() => onPhonePress(item.mobile)}
            bg="green.500"
            _pressed={{ bg: "green.600" }}
            rounded="full"
            size="sm"
            mt={1}
          />
        </VStack>
      </HStack>
    </Box>
  </Pressable>
));

const GridItem = memo(({ item, onPress, onStatusChange }) => (
  <Pressable onPress={onPress} flex={1} m={1}>
    <Box
      bg="white"
      rounded="lg"
      shadow={2}
      p={3}
      borderWidth={1}
      borderColor="coolGray.200"
    >
      <VStack space={2} alignItems="center">
        <StaffAvatar name={item.name} photo={item.photo} size="lg" />
        <VStack space={1} alignItems="center">
          <Text fontSize="md" fontWeight="bold" textAlign="center">
            {toTitleCase(item.name)}
          </Text>
          <Text fontSize="sm" color="coolGray.600" textAlign="center">
            {toTitleCase(item.role)}
          </Text>
          <StatusButtons
            staffId={item.staff_id}
            status={item.status}
            onStatusChange={onStatusChange}
            size="sm"
          />
        </VStack>
      </VStack>
    </Box>
  </Pressable>
));

const RoleFilter = memo(({ filterRole, setFilterRole, roles }) => (
  <Select
    flex={1}
    selectedValue={filterRole}
    onValueChange={setFilterRole}
    placeholder="Select Role"
    _selectedItem={{
      endIcon: <CheckIcon size={4} />,
    }}
    fontSize="sm"
    py={1}
  >
    {roles.map((role) => (
      <Select.Item
        key={role.role_name}
        label={role.role_name.toLowerCase() === "all" ? "All Roles" : toTitleCase(role.role_name)}
        value={role.role_name.toLowerCase()}
      />
    ))}
  </Select>
));

export default function StaffScreen() {
  const router = useRouter();
  const [staffList, setStaffList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewType, setViewType] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const params = useLocalSearchParams();
  const [outletId, setOutletId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [filterRole, setFilterRole] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

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

  // Memoized handlers
  const handlePhonePress = useCallback((phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  }, []);

  const handleStatusChange = useCallback((staffId, newStatus) => {
    setStaffList(prev => 
      prev.map(staff =>
        staff.staff_id === staffId ? { ...staff, status: newStatus } : staff
      )
    );
    toast.show({
      description: `Staff marked as ${newStatus}`,
      status: "success",
    });
  }, [toast]);

  const handleItemPress = useCallback((staffId, restaurantId) => {
    router.push({
      pathname: `/(tabs)/staff/${staffId}`,
      params: { restaurant_id: restaurantId },
    });
  }, [router]);

  // Memoized list renderers
  const renderStaffItem = useCallback(({ item }) => (
    <ListItem
      item={item}
      onPress={() => handleItemPress(item.staff_id, item.restaurant_id)}
      onStatusChange={handleStatusChange}
      onPhonePress={handlePhonePress}
    />
  ), [handleItemPress, handleStatusChange, handlePhonePress]);

  const renderGridItem = useCallback(({ item }) => (
    <GridItem
      item={item}
      onPress={() => handleItemPress(item.staff_id, item.restaurant_id)}
      onStatusChange={handleStatusChange}
    />
  ), [handleItemPress, handleStatusChange]);

  // Memoized filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList
      .filter((staff) => {
        const matchesSearch =
          staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          staff.mobile?.includes(searchQuery) ||
          staff.role?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === "all" ? true : staff.role === filterRole;
        const matchesStatus = filterStatus ? staff.status === filterStatus : true;
        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        const factor = sortOrder === "asc" ? 1 : -1;
        return sortBy === "name"
          ? a.name.localeCompare(b.name) * factor
          : a.role.localeCompare(b.role) * factor;
      });
  }, [staffList, searchQuery, filterRole, filterStatus, sortBy, sortOrder]);

  // Optimized fetch functions
  const fetchStaffList = useCallback(async () => {
    if (!outletId) return;

    setIsLoading(true);
    try {
      const data = await fetchWithAuth(
        `${getBaseUrl()}/get_staff_list_with_role`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: outletId,
            staff_role: filterRole === "all" ? "all" : filterRole,
          }),
        }
      );

      if (data.st === 1 && Array.isArray(data.lists)) {
        setStaffList(data.lists);
      } else {
        setStaffList([]);
        toast.show({
          description: "Failed to fetch staff list",
          status: "error",
        });
      }
    } catch (error) {
      console.error("Fetch Staff Error:", error);
      setStaffList([]);
      toast.show({
        description: "Failed to fetch staff list",
        status: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [outletId, filterRole, toast]);

  const fetchRoles = async () => {
    if (!outletId) return;

    try {
      const data = await fetchWithAuth(`${getBaseUrl()}/staff_role_list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
        }),
      });

      console.log("Roles Response:", data);

      if (data.st === 1 && Array.isArray(data.role_list)) {
        // Filter out any existing "all" role
        const filteredRoles = data.role_list.filter(
          (role) => role.role_name.toLowerCase() !== "all"
        );
        // Add "All" role at the beginning
        const allRoles = [
          {
            role_name: "all",
            staff_count:
              data.role_list.find((r) => r.role_name === "all")?.staff_count ||
              0,
          },
          ...filteredRoles,
        ];
        setRoles(allRoles);

        // Set initial role to "all"
        if (!filterRole) {
          setFilterRole("all");
        }
      }
    } catch (error) {
      console.error("Fetch Roles Error:", error);
    }
  };

  const handleRoleSelect = (value) => {
    console.log("Selected role value:", value);
    setFilterRole(value);
  };

  useEffect(() => {
    if (outletId) {
      fetchRoles();
      // Set default role to "all" and fetch initial staff list
      setFilterRole("all");
    }
  }, [outletId]);

  useEffect(() => {
    const getStoredData = async () => {
      try {
        const storedOutletId = await AsyncStorage.getItem("outlet_id");
        if (storedOutletId) {
          setOutletId(parseInt(storedOutletId));
          fetchStaffList();
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

  useEffect(() => {
    if (outletId && filterRole) {
      fetchStaffList();
    }
  }, [outletId, filterRole]);

  // Add refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchStaffList();
      await fetchRoles();
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.show({
        description: "Failed to refresh staff list",
        status: "error",
      });
    } finally {
      setRefreshing(false);
    }
  }, [outletId, filterRole]);

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, refreshing data...");
      fetchStaffList();
      fetchRoles();
    }, [outletId, filterRole])
  );

  return (
    <Box flex={1} bg="white" safeArea>
      <MemoizedHeader title="Staff" />

      <VStack flex={1}>
        <HStack
          px={4}
          py={3}
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
                  style={{ marginLeft: 15 }}
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
              defaultValue="name"
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

        <VStack px={3} space={4} mt={2}>
          <HStack space={1}>
            <RoleFilter
              filterRole={filterRole}
              setFilterRole={handleRoleSelect}
              roles={roles}
            />
            <Select
              flex={1}
              selectedValue={filterStatus}
              onValueChange={setFilterStatus}
              placeholder="Filter by status"
              _selectedItem={{
                endIcon: <CheckIcon size={4} />,
              }}
              fontSize="sm"
              py={1}
            >
              <Select.Item label="All Status" value="" />
              <Select.Item label="Present" value="present" />
              <Select.Item label="Absent" value="absent" />
            </Select>
          </HStack>
        </VStack>

        {isLoading && !refreshing ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Spinner size="lg" />
            <Text mt={2}>Loading staff list...</Text>
          </Box>
        ) : (
          <Box flex={1}>
            <FlatList
              data={filteredStaff}
              renderItem={
                viewType === "list" ? renderStaffItem : renderGridItem
              }
              keyExtractor={(item) => item.staff_id?.toString()}
              numColumns={viewType === "grid" ? 2 : 1}
              key={viewType}
              contentContainerStyle={{
                padding: 4,
                flexGrow: 1,
              }}
              refreshing={refreshing}
              onRefresh={onRefresh}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={8}
              ListEmptyComponent={
                <Box
                  flex={1}
                  justifyContent="center"
                  alignItems="center"
                  py={10}
                >
                  <Text color="gray.500">No staff members found</Text>
                </Box>
              }
            />
          </Box>
        )}
      </VStack>

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        colorScheme="green"
        icon={<MaterialIcons name="add" size={24} color="white" />}
        onPress={() => router.push("/staff/add")}
        position="absolute"
        bottom={4}
        right={4}
      />
    </Box>
  );
}
