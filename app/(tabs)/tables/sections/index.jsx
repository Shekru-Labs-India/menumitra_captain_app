import React, { useState } from "react";
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
  const [viewType, setViewType] = useState("grid"); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  // Sample sections data
  const [sections, setSections] = useState([
    {
      id: 1,
      name: "Family Section",
      totalTables: 12,
      engagedTables: 8,
      color: "#4CAF50",
    },
    {
      id: 2,
      name: "Outdoor Garden",
      totalTables: 8,
      engagedTables: 3,
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

  const handleSectionPress = (section) => {
    router.push(`/tables/sections/${section.id}`);
  };

  // Filter sections based on search query
  const filteredSections = sections.filter((section) =>
    section.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort sections based on selected criteria
  const sortedSections = [...filteredSections].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "totalTables":
        return b.totalTables - a.totalTables;
      case "engagedTables":
        return b.engagedTables - a.engagedTables;
      default:
        return 0;
    }
  });
  const renderGridView = () => (
    <ScrollView px={4} py={2}>
      <HStack flexWrap="wrap" justifyContent="space-between">
        {sortedSections.map((section) => (
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

  const renderListView = () => (
    <ScrollView>
      {sortedSections.map((section) => (
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

      {/* Search and Filters with better alignment */}
      <Box py={2} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <HStack
          space={2}
          px={4}
          alignItems="center"
          justifyContent="flex-start"
        >
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            bg="white"
            borderWidth={1}
            borderColor="coolGray.200"
            borderRadius="md"
            fontSize="xs"
            width="32%"
            height="8"
            InputLeftElement={
              <Box pl={2}>
                <MaterialIcons name="search" size={18} color="coolGray.500" />
              </Box>
            }
          />
          <Select
            selectedValue={sortBy}
            onValueChange={setSortBy}
            bg="white"
            borderWidth={1}
            borderColor="coolGray.200"
            borderRadius="md"
            fontSize="xs"
            placeholder="Sort"
            width="24"
            height="8"
            _selectedItem={{
              endIcon: <CheckIcon size={3} />,
            }}
          >
            <Select.Item label="Name" value="name" />
            <Select.Item label="Total Tables" value="totalTables" />
            <Select.Item label="Engaged Tables" value="engagedTables" />
          </Select>
          <Box
            height="8"
            width="8"
            borderWidth={1}
            borderColor="coolGray.200"
            borderRadius="md"
            bg="white"
          >
            <IconButton
              icon={
                <MaterialIcons
                  name={viewType === "grid" ? "view-list" : "grid-view"}
                  size={12}
                  color="coolGray.500"
                />
              }
              onPress={() => setViewType(viewType === "grid" ? "list" : "grid")}
              variant="unstyled"
              _pressed={{ bg: "coolGray.100" }}
              height="8"
              width="8"
              display="flex"
              alignItems="center"
              justifyContent="center"
            />
          </Box>
        </HStack>
      </Box>

      {/* Content */}
      {viewType === "grid" ? renderGridView() : renderListView()}

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
