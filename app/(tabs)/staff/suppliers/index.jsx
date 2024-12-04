import { useState, useContext } from "react";
import {
  Box,
  Heading,
  VStack,
  IconButton,
  Icon,
  Text,
  FlatList,
  HStack,
  Avatar,
  Fab,
  Pressable,
  Input,
  Select,
  CheckIcon,
} from "native-base";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { SupplierContext } from "../../../../context/SupplierContext";

export default function SuppliersScreen() {
  const router = useRouter();
  const { suppliers } = useContext(SupplierContext);
  const [viewType, setViewType] = useState("list");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSort = (a, b) => {
    if (sortBy === "name") {
      return sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortBy === "type") {
      return sortOrder === "asc"
        ? a.type?.localeCompare(b.type)
        : b.type?.localeCompare(a.type);
    }
    if (sortBy === "status") {
      return sortOrder === "asc"
        ? a.status?.localeCompare(b.status)
        : b.status?.localeCompare(a.status);
    }
    return 0;
  };

  const filteredSuppliers = suppliers
    ? suppliers
        .filter((supplier) =>
          supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort(handleSort)
    : [];

  const renderListItem = ({ item }) => (
    <Pressable onPress={() => router.push(`/staff/suppliers/${item.id}`)}>
      <Box
        bg="white"
        rounded="lg"
        shadow={1}
        mb={3}
        mx={4}
        p={4}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <HStack space={3} alignItems="center">
          <Avatar size="md" bg="cyan.500">
            {item.name.charAt(0)}
          </Avatar>
          <VStack flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              {item.name}
            </Text>
            <Text fontSize="sm" color="coolGray.600">
              {item.type || "Not specified"}
            </Text>
            <HStack space={2} mt={1}>
              <Text fontSize="sm" color="coolGray.500">
                {item.mobileNumber1}
              </Text>
              <Text fontSize="sm" color="coolGray.500">
                •
              </Text>
              <Text
                fontSize="sm"
                color={item.status === "active" ? "green.500" : "red.500"}
              >
                {item.status
                  ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                  : "Not specified"}
              </Text>
            </HStack>
          </VStack>
          <IconButton
            icon={
              <Icon
                as={MaterialIcons}
                name="arrow-forward-ios"
                size={5}
                color="coolGray.400"
              />
            }
          />
        </HStack>
      </Box>
    </Pressable>
  );

  const renderGridItem = ({ item }) => (
    <Pressable
      onPress={() => router.push(`/staff/suppliers/${item.id}`)}
      flex={1}
      m={1}
    >
      <Box
        bg="white"
        rounded="lg"
        shadow={1}
        p={4}
        borderWidth={1}
        borderColor="coolGray.200"
      >
        <VStack space={2} alignItems="center">
          <Avatar size="lg" bg="cyan.500">
            {item.name.charAt(0)}
          </Avatar>
          <VStack space={1} alignItems="center">
            <Text fontSize="md" fontWeight="bold" textAlign="center">
              {item.name}
            </Text>
            <Text fontSize="sm" color="coolGray.600" textAlign="center">
              {item.type || "Not specified"}
            </Text>
            <Text fontSize="sm" color="coolGray.500" textAlign="center">
              {item.mobileNumber1}
            </Text>
            <Text
              fontSize="sm"
              color={item.status === "active" ? "green.500" : "red.500"}
              textAlign="center"
            >
              {item.status
                ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                : "Not specified"}
            </Text>
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
        <Heading textAlign="center">Suppliers</Heading>
      </Box>

      <HStack
        px={4}
        py={2}
        space={2}
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="coolGray.200"
        bg="coolGray.50"
      >
        <Input
          flex={1}
          placeholder="Search suppliers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          InputLeftElement={
            <Icon
              as={Ionicons}
              name="search"
              size={5}
              ml={2}
              color="coolGray.400"
            />
          }
        />
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
        >
          <Select.Item label="Name" value="name" />
          <Select.Item label="Type" value="type" />
          <Select.Item label="Status" value="status" />
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

      {suppliers && suppliers.length > 0 ? (
        <FlatList
          data={filteredSuppliers}
          renderItem={viewType === "list" ? renderListItem : renderGridItem}
          keyExtractor={(item) => item.id}
          key={viewType}
          numColumns={viewType === "grid" ? 2 : 1}
          contentContainerStyle={{ padding: 16 }}
        />
      ) : (
        <Box flex={1} justifyContent="center" alignItems="center">
          <Text color="coolGray.400">No suppliers found</Text>
        </Box>
      )}

      <Fab
        renderInPortal={false}
        shadow={2}
        size="sm"
        icon={<Icon color="white" as={Ionicons} name="add" size="sm" />}
        onPress={() => router.push("/staff/suppliers/add")}
        position="absolute"
        bottom={4}
        right={4}
      />
    </Box>
  );
}
