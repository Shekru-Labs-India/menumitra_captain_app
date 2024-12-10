import React, { useState, useMemo, useEffect } from "react";
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
  FormControl,
  Modal,
  Button,
  Spinner,
  Fab,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import Header from "../../../components/Header";

const API_BASE_URL = "https://men4u.xyz/captain_api";

export default function TableSectionsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [viewType, setViewType] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [isAscending, setIsAscending] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    getStoredData();
  }, []);

  // Update the useFocusEffect to use the same fetchSections function
  useFocusEffect(
    useCallback(() => {
      const refreshSections = async () => {
        try {
          const storedRestaurantId = await AsyncStorage.getItem(
            "restaurant_id"
          );
          if (!storedRestaurantId) {
            toast.show({
              description: "Please login again",
              status: "error",
            });
            router.replace("/login");
            return;
          }

          await fetchSections(parseInt(storedRestaurantId));
        } catch (error) {
          console.error("Refresh Sections Error:", error);
          toast.show({
            description: "Failed to refresh sections",
            status: "error",
          });
        }
      };

      refreshSections();
    }, [])
  );

  const getStoredData = async () => {
    try {
      setLoading(true);
      const storedRestaurantId = await AsyncStorage.getItem("restaurant_id");
      if (storedRestaurantId) {
        setRestaurantId(parseInt(storedRestaurantId));
        await fetchSections(parseInt(storedRestaurantId));
      } else {
        toast.show({
          description: "Please login again",
          status: "error",
        });
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error getting stored data:", error);
      toast.show({
        description: "Failed to load data",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (restId) => {
    try {
      setLoading(true);

      // Get the detailed section list first
      const sectionListResponse = await fetch(
        `${API_BASE_URL}/captain_manage/section_listview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restId,
          }),
        }
      );

      const sectionListData = await sectionListResponse.json();
      console.log("Section List View Response:", sectionListData);

      // Get all tables in one call
      const tablesResponse = await fetch(
        `${API_BASE_URL}/captain_manage/get_table_list`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restId,
          }),
        }
      );

      const tablesData = await tablesResponse.json();
      console.log("Tables Response:", tablesData);

      if (sectionListData.st === 1 && tablesData.st === 1) {
        // Modified section to properly handle the table data
        const formattedSections = sectionListData.data.map((section) => {
          // Get tables for this section from tablesData
          const sectionTables = tablesData.data.filter(
            (table) => table.section_id === section.section_id
          );

          return {
            id: section.section_id.toString(),
            name: section.section_name,
            totalTables: sectionTables.length,
            engagedTables: sectionTables.filter(
              (table) => table.is_occupied === 1
            ).length,
            color: getRandomColor(),
          };
        });

        console.log("Formatted Sections:", formattedSections);
        setSections(formattedSections);
      } else {
        throw new Error("Failed to fetch sections");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.show({
        description: error.message || "Failed to fetch sections",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate random colors for sections
  const getRandomColor = () => {
    const colors = [
      "#4CAF50",
      "#2196F3",
      "#9C27B0",
      "#FF9800",
      "#F44336",
      "#009688",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

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
    router.push({
      pathname: `/tables/sections/${section.id}`,
      params: { sectionName: section.name },
    });
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      toast.show({
        description: "Section name is required",
        placement: "top",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/captain_manage/section_create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            section_name: newSectionName.trim(),
          }),
        }
      );

      const data = await response.json();
      console.log("Create Section Response:", data);

      if (data.st === 1) {
        toast.show({
          description: data.msg || "Section added successfully",
          placement: "top",
          status: "success",
        });

        // Clear form and close modal
        setNewSectionName("");
        setShowAddModal(false);

        // Refresh sections list
        await fetchSections(restaurantId);
      } else {
        throw new Error(data.msg || "Failed to create section");
      }
    } catch (error) {
      console.error("Create Section Error:", error);
      toast.show({
        description: error.message || "Failed to create section",
        placement: "top",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderGridView = (sections) => (
    <ScrollView px={2} py={2}>
      <HStack flexWrap="wrap" justifyContent="space-between">
        {sections.map((section) => (
          <Pressable
            key={section.id}
            onPress={() => handleSectionPress(section)}
            width="49%" // Slightly less than 50% to ensure spacing
            mb={2} // Reduced margin bottom
          >
            <Box
              bg="white"
              p={3} // Reduced padding
              rounded="lg"
              borderWidth={1}
              borderColor="coolGray.200"
              shadow={1}
            >
              <VStack space={3} alignItems="center">
                {" "}
                {/* Reduced space */}
                {/* Centered Title */}
                <Box w="full" alignItems="center">
                  <Heading
                    size="xs" // Smaller heading
                    color={section.color}
                    fontWeight="bold"
                    textAlign="center"
                  >
                    {section.name}
                  </Heading>
                </Box>
                {/* Stats Row */}
                <HStack
                  w="full"
                  justifyContent="space-between"
                  space={1} // Reduced space between stats
                  px={1} // Reduced padding
                >
                  {/* Total */}
                  <VStack
                    alignItems="center"
                    flex={1}
                    bg="coolGray.50"
                    p={1.5} // Reduced padding
                    rounded="md"
                  >
                    <Text
                      fontSize="2xs" // Smaller font
                      color="coolGray.500"
                      fontWeight="medium"
                    >
                      Total
                    </Text>
                    <Text fontSize="md" fontWeight="bold">
                      {" "}
                      {/* Smaller font */}
                      {section.totalTables}
                    </Text>
                  </VStack>

                  {/* Occupied */}
                  <VStack
                    alignItems="center"
                    flex={1}
                    bg="red.50"
                    p={1.5}
                    rounded="md"
                  >
                    <Text fontSize="2xs" color="red.500" fontWeight="medium">
                      Occ
                    </Text>
                    <Text fontSize="md" fontWeight="bold" color="red.500">
                      {section.engagedTables}
                    </Text>
                  </VStack>

                  {/* Free */}
                  <VStack
                    alignItems="center"
                    flex={1}
                    bg="green.50"
                    p={1.5}
                    rounded="md"
                  >
                    <Text fontSize="2xs" color="green.500" fontWeight="medium">
                      Free
                    </Text>
                    <Text fontSize="md" fontWeight="bold" color="green.500">
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
                  Occupied: {section.engagedTables}
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
    <Box flex={1} bg="coolGray.100" safeAreaTop>
      {/* Header Component */}
      <Header title="Sections" onBackPress={() => router.back()} />

      {/* Search and Filters */}
      <Box bg="white" px={4} py={2} shadow={1}>
        <HStack space={2} alignItems="center">
          <Input
            flex={1}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            bg="coolGray.50"
            borderRadius="lg"
            py={2}
            InputLeftElement={
              <Box pl={2}>
                <MaterialIcons name="search" size={20} color="coolGray.400" />
              </Box>
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
            variant="ghost"
          />
          <Select
            w="110"
            selectedValue={sortBy}
            onValueChange={setSortBy}
            bg="coolGray.50"
            borderRadius="lg"
            _selectedItem={{
              bg: "coolGray.100",
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
            variant="ghost"
          />
        </HStack>
      </Box>

      {/* Content */}
      <Box flex={1} bg="coolGray.100">
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Spinner size="lg" />
          </Box>
        ) : (
          <>
            {viewType === "grid"
              ? renderGridView(sortedSections)
              : renderListView(sortedSections)}

            {/* FAB */}
            <Fab
              renderInPortal={false}
              shadow={2}
              size="sm"
              colorScheme="green"
              icon={<MaterialIcons name="add" size={24} color="white" />}
              onPress={() => setShowAddModal(true)}
              position="absolute"
              bottom={4}
              right={4}
            />
          </>
        )}
      </Box>

      {/* Add Section Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <Modal.Content maxWidth="400px">
          <HStack
            alignItems="center"
            justifyContent="space-between"
            px={1}
            py={2}
          >
            <Modal.Header flex={1} textAlign="center">
              Add New Section
            </Modal.Header>
            <Modal.CloseButton position="absolute" right={2} />
          </HStack>
          <Modal.Body>
            <FormControl isRequired>
              <FormControl.Label>
                <HStack space={1} alignItems="center">
                  <Text>Section Name </Text>
                </HStack>
              </FormControl.Label>
              <Input
                value={newSectionName}
                onChangeText={setNewSectionName}
                placeholder="Enter section name"
                autoFocus
              />
            </FormControl>
          </Modal.Body>
          <Modal.Footer>
            <HStack space={2} width="100%" justifyContent="space-between">
              <Button
                variant="ghost"
                colorScheme="blueGray"
                onPress={() => {
                  setNewSectionName("");
                  setShowAddModal(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onPress={handleAddSection}
                isLoading={loading}
                isLoadingText="Adding..."
              >
                Add Section
              </Button>
            </HStack>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </Box>
  );
}
