import React, { useState, useMemo } from "react";
import {
  Box,
  ScrollView,
  Heading,
  HStack,
  VStack,
  Text,
  Pressable,
  IconButton,
  Badge,
  useToast,
  Input,
  Menu,
  Select,
  CheckIcon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
export default function TableSectionsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [viewType, setViewType] = useState("list"); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [isAscending, setIsAscending] = useState(true);

  // Sample sections data
  const [sections] = useState([
    {
      id: "1",
      name: "Family Section",
      totalTables: 10,
      engagedTables: 3,
      color: "#4CAF50",
    },
    {
      id: "2",
      name: "Garden Section",
      totalTables: 6,
      engagedTables: 2,
      color: "#2196F3",
    },
    {
      id: 3,
      name: "Private Dining",
      totalTables: 4,
      engagedTables: 2,
      color: "#9C27B0",
    },
    {
      id: 4,
      name: "Bar Section",
      totalTables: 6,
      engagedTables: 4,
      color: "#FF9800",
    },
  ]);

  // Memoized sorting and filtering logic
  const sortedSections = useMemo(() => {
    let filtered = [...sections];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((section) =>
        section.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "totalTables":
          comparison = a.totalTables - b.totalTables;
          break;
        case "engagedTables":
          comparison = a.engagedTables - b.engagedTables;
          break;
      }
      return isAscending ? comparison : -comparison;
    });

    return filtered;
  }, [sections, searchQuery, sortBy, isAscending]);

  const handleSectionPress = (section) => {
    router.push(`/tables/sections/${section.id}`);
  };

  const renderGridView = (sections) => (
    <ScrollView px={4} py={2}>
      <HStack flexWrap="wrap" justifyContent="space-between">
        {sections.map((section) => (
          <Pressable
            key={section.id}
            onPress={() => handleSectionPress(section)}
            width="48%"
            mb={4}
          >
            <Box
              bg="white"
              p={4}
              rounded="lg"
              borderWidth={1}
              borderColor="coolGray.200"
              shadow={2}
            >
              <VStack space={3}>
                <Heading size="sm" color={section.color} fontWeight="bold">
                  {section.name}
                </Heading>
                <HStack justifyContent="space-between">
                  <VStack alignItems="center" flex={1}>
                    <Text fontSize="xs" color="coolGray.500">
                      Total
                    </Text>
                    <Text fontSize="lg" fontWeight="bold">
                      {section.totalTables}
                    </Text>
                  </VStack>
                  <VStack alignItems="center" flex={1}>
                    <Text fontSize="xs" color="red.500">
                      Engaged
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="red.500">
                      {section.engagedTables}
                    </Text>
                  </VStack>
                  <VStack alignItems="center" flex={1}>
                    <Text fontSize="xs" color="green.500">
                      Free
                    </Text>
                    <Text fontSize="lg" fontWeight="bold" color="green.500">
                      {section.totalTables - section.engagedTables}
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </Box>
          </Pressable>
        ))}
      </HStack>
    </ScrollView>
  );

  const renderListView = (sections) => (
    <ScrollView>
      {sections.map((section) => (
        <Pressable
          key={section.id}
          onPress={() => handleSectionPress(section)}
          p={4}
          borderBottomWidth={1}
          borderBottomColor="coolGray.200"
        >
          <HStack justifyContent="space-between" alignItems="center">
            <VStack>
              <Text fontSize="sm" fontWeight="bold">
                {section.name}
              </Text>
              <HStack space={4} mt={1}>
                <Text fontSize="sm" color="coolGray.500">
                  Total: {section.totalTables}
                </Text>
                <Text fontSize="sm" color="red.500">
                  Engaged: {section.engagedTables}
                </Text>
                <Text fontSize="sm" color="green.500">
                  Free: {section.totalTables - section.engagedTables}
                </Text>
              </HStack>
            </VStack>
            <IconButton
              icon={
                <MaterialIcons name="chevron-right" size={24} color="gray" />
              }
            />
          </HStack>
        </Pressable>
      ))}
    </ScrollView>
  );
  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header with back button and centered title */}
      <Box
        px={4}
        py={4}
        bg="gray.50"
        borderBottomWidth={1}
        borderBottomColor="gray.200"
      >
        <HStack alignItems="center" justifyContent="center" position="relative">
          <IconButton
            position="absolute"
            left={0}
            icon={<MaterialIcons name="arrow-back" size={22} />}
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "gray.200" }}
            rounded="full"
          />
          <Heading size="md" textAlign="center">
            Restaurant Sections
          </Heading>
        </HStack>
      </Box>

      {/* Search and Filters with suppliers design */}
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
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          InputLeftElement={
            <MaterialIcons
              name="search"
              size={20}
              color="coolGray.400"
              style={{ marginLeft: 8 }}
            />
          }
        />
        <IconButton
          icon={
            <MaterialIcons
              name={viewType === "grid" ? "view-list" : "grid-view"}
              size={24}
              color="coolGray.600"
            />
          }
          onPress={() => setViewType(viewType === "grid" ? "list" : "grid")}
        />
        <Select
          w="110"
          selectedValue={sortBy}
          onValueChange={setSortBy}
          placeholder="Sort by"
          _selectedItem={{
            endIcon: (
              <MaterialIcons name="check" size={16} color="coolGray.600" />
            ),
          }}
        >
          <Select.Item label="Name" value="name" />
          <Select.Item label="Total Tables" value="totalTables" />
          <Select.Item label="Engaged Tables" value="engagedTables" />
        </Select>
        <IconButton
          icon={
            <MaterialIcons
              name={isAscending ? "arrow-upward" : "arrow-downward"}
              size={24}
              color="coolGray.600"
            />
          }
          onPress={() => setIsAscending(!isAscending)}
        />
      </HStack>

      {/* Content */}
      {viewType === "grid"
        ? renderGridView(sortedSections)
        : renderListView(sortedSections)}

      {/* Floating Action Button */}
      <Pressable
        onPress={() => router.push("/tables/sections/add")}
        position="absolute"
        bottom={8}
        right={8}
      >
        <Box bg="green.500" rounded="full" p={3}>
          <MaterialIcons name="add" size={28} color="white" />
        </Box>
      </Pressable>
    </Box>
  );
}
