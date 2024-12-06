import React, { useState, useMemo, useRef, useEffect } from "react";
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
  Center,
  Modal,
  Button,
  Divider,
  Icon,
  FormControl,
  Input,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SectionTablesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const scrollViewRef = useRef(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeSection, setActiveSection] = useState(id);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSection, setEditSection] = useState({
    name: "",
    totalTables: "",
    engagedTables: "",
  });

  // Sample section data with correct counts
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
      id: "3",
      name: "Private Dining",
      totalTables: 4,
      engagedTables: 2,
      color: "#9C27B0",
    },
    {
      id: "4",
      name: "Bar Section",
      totalTables: 6,
      engagedTables: 4,
      color: "#FF9800",
    },
  ]);

  useEffect(() => {
    if (scrollViewRef.current) {
      const activeIndex = sections.findIndex(
        (section) => section.id === activeSection
      );
      if (activeIndex !== -1) {
        const scrollPosition = activeIndex * 120; // Adjust based on your item width
        scrollViewRef.current.scrollTo({ x: scrollPosition, animated: true });
      }
    }
  }, [activeSection]);

  // Add state for current section
  const [currentSection, setCurrentSection] = useState(
    sections.find((s) => s.id === id) || sections[0]
  );

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    const newSection = sections.find((s) => s.id === sectionId);
    setCurrentSection(newSection);
    const sectionTables = tables.filter((t) => t.sectionId === sectionId);
    setFilteredTables(sectionTables);
  };

  // Updated sample tables data
  const [tables, setTables] = useState([
    // Family Section (id: "1") - 3 tables
    {
      id: 1,
      number: "T1",
      status: "AVAILABLE",
      row: 0,
      col: 0,
      sectionId: "1",
    },
    {
      id: 2,
      number: "T2",
      status: "ENGAGED",
      row: 0,
      col: 1,
      sectionId: "1",
      customerName: "John Smith",
      menuCount: 3,
      grandTotal: 850,
      engagedTime: new Date().setHours(13, 30),
    },
    {
      id: 3,
      number: "T3",
      status: "AVAILABLE",
      row: 0,
      col: 2,
      sectionId: "1",
    },

    // Garden Section (id: "2") - 4 tables
    {
      id: 4,
      number: "T1",
      status: "AVAILABLE",
      row: 0,
      col: 0,
      sectionId: "2",
    },
    {
      id: 5,
      number: "T2",
      status: "ENGAGED",
      row: 0,
      col: 1,
      sectionId: "2",
      customerName: "Emily Brown",
      menuCount: 2,
      grandTotal: 450,
      engagedTime: new Date().setHours(14, 0),
    },
    {
      id: 6,
      number: "T3",
      status: "AVAILABLE",
      row: 0,
      col: 2,
      sectionId: "2",
    },
    {
      id: 7,
      number: "T4",
      status: "AVAILABLE",
      row: 0,
      col: 3,
      sectionId: "2",
    },

    // Rooftop Section (id: "3") - 8 tables
    {
      id: 8,
      number: "T1",
      status: "AVAILABLE",
      row: 0,
      col: 0,
      sectionId: "3",
    },
    {
      id: 9,
      number: "T2",
      status: "ENGAGED",
      row: 0,
      col: 1,
      sectionId: "3",
      customerName: "Michael Wilson",
      menuCount: 4,
      grandTotal: 1200,
      engagedTime: new Date().setHours(15, 0),
    },
    {
      id: 10,
      number: "T3",
      status: "AVAILABLE",
      row: 0,
      col: 2,
      sectionId: "3",
    },
    {
      id: 11,
      number: "T4",
      status: "AVAILABLE",
      row: 1,
      col: 0,
      sectionId: "3",
    },
    {
      id: 12,
      number: "T5",
      status: "ENGAGED",
      row: 1,
      col: 1,
      sectionId: "3",
      customerName: "Sarah Johnson",
      menuCount: 3,
      grandTotal: 750,
      engagedTime: new Date().setHours(16, 0),
    },
    {
      id: 13,
      number: "T6",
      status: "AVAILABLE",
      row: 1,
      col: 2,
      sectionId: "3",
    },
    {
      id: 14,
      number: "T7",
      status: "AVAILABLE",
      row: 2,
      col: 0,
      sectionId: "3",
    },
    {
      id: 15,
      number: "T8",
      status: "ENGAGED",
      row: 2,
      col: 1,
      sectionId: "3",
      customerName: "David Lee",
      menuCount: 2,
      grandTotal: 600,
      engagedTime: new Date().setHours(13, 45),
    },
  ]);

  // Add state for filtered tables
  const [filteredTables, setFilteredTables] = useState(
    tables.filter((t) => t.sectionId === id)
  );

  // Add handleTablePress function
  const handleTablePress = (table) => {
    if (table.status === "ENGAGED") {
      setSelectedTable(table);
      setShowModal(true);
    }
  };

  // Update renderTable function to use handleTablePress
  const renderTable = (table) => {
    if (!table) return null;

    return (
      <Pressable
        key={table.id}
        onPress={() => handleTablePress(table)}
        opacity={1}
        _pressed={{
          opacity: table.status === "ENGAGED" ? 0.7 : 1,
        }}
      >
        <Box {...getTableStyle(table.status)} position="relative">
          {/* Price Overlay - adjusted positioning for larger box */}
          {table.status === "ENGAGED" && (
            <Box
              position="absolute"
              top={-14}
              right={-22}
              style={{
                transform: [{ translateX: -20 }],
                flexShrink: 0,
                flexGrow: 0,
              }}
              bg={table.status === "ENGAGED" ? "red.500" : "green.500"}
              px={0}
              py={0}
              alignSelf="center"
              rounded="sm"
              minWidth={20} // Increased minimum width
              height={5}
              justifyContent="center"
            >
              <Text
                fontSize="13px"
                color="white"
                fontWeight="semibold"
                textAlign="center"
                style={{
                  flexShrink: 0,
                }}
              >
                ₹
                {table.grandTotal >= 1000
                  ? `${(table.grandTotal / 1000).toFixed(1)}K`
                  : table.grandTotal.toLocaleString("en-IN", {
                      maximumFractionDigits: 0,
                      minimumFractionDigits: 0,
                    })}
              </Text>
            </Box>
          )}

          <VStack alignItems="center" space={0.5}>
            <Text
              color={getTextColor(table.status)}
              fontSize="10px"
              fontWeight="bold"
            >
              {table.number}
            </Text>

            {table.status === "ENGAGED" && (
              <Text
                fontSize="12px"
                bottom={-4}
                color={getTextColor(table.status)}
                numberOfLines={1}
                style={{ letterSpacing: -0.3 }}
              >
                {new Date(table.engagedTime).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })}
              </Text>
            )}
          </VStack>
        </Box>
      </Pressable>
    );
  };

  // Add new state for filter
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Updated getStatusColor function to handle only AVAILABLE and ENGAGED
  const getStatusColor = (status) => {
    return status === "AVAILABLE" ? "green.500" : "red.500";
  };

  // Simplified filter function for only two states
  const getFilteredTables = () => {
    const sectionTables = tables.filter((t) => t.sectionId === activeSection);

    if (!sectionTables || sectionTables.length === 0) return [];

    switch (activeFilter) {
      case "AVAILABLE":
        return sectionTables.filter((table) => table.status === "AVAILABLE");
      case "ENGAGED":
        return sectionTables.filter((table) => table.status === "ENGAGED");
      default:
        return sectionTables;
    }
  };

  // Group filtered tables by row
  const tablesByRow = useMemo(() => {
    const filteredTables = getFilteredTables();
    const rows = {};

    // Initialize empty grid
    const maxRow = Math.max(...filteredTables.map((t) => t.row));
    const maxCol = Math.max(...filteredTables.map((t) => t.col));

    for (let i = 0; i <= maxRow; i++) {
      rows[i] = Array(maxCol + 1).fill(null);
    }

    // Fill in tables
    filteredTables.forEach((table) => {
      if (!rows[table.row]) {
        rows[table.row] = [];
      }
      rows[table.row][table.col] = table;
    });

    return rows;
  }, [activeSection, activeFilter, tables]);

  // Updated Modal Component with only engaged functionality
  const TableActionModal = () => (
    <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
      <Modal.Content maxWidth="400px">
        <Modal.CloseButton />
        <Modal.Header>
          <HStack space={2} alignItems="center">
            <Text fontSize="lg" fontWeight="bold">
              Table {selectedTable?.number}
            </Text>
            <Badge colorScheme="red" variant="solid" rounded="md">
              OCCUPIED
            </Badge>
          </HStack>
        </Modal.Header>
        <Modal.Body>
          <VStack space={4}>
            {/* Order Details */}
            <Box
              bg="coolGray.50"
              p={4}
              rounded="md"
              borderWidth={1}
              borderColor="coolGray.200"
            >
              <VStack space={3}>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontWeight="bold" color="coolGray.600">
                    Customer Name:
                  </Text>
                  <Text>{selectedTable?.customerName || "N/A"}</Text>
                </HStack>
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontWeight="bold" color="coolGray.600">
                    Menu Count:
                  </Text>
                  <Text>{selectedTable?.menuCount || "0"} items</Text>
                </HStack>
                <Divider my={1} />
                <HStack justifyContent="space-between" alignItems="center">
                  <Text fontWeight="bold" color="coolGray.800" fontSize="md">
                    Grand Total:
                  </Text>
                  <Text fontWeight="bold" color="coolGray.800" fontSize="md">
                    ₹{selectedTable?.grandTotal || "0"}
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Quick Actions */}
            <VStack space={3}>
              <Text fontWeight="bold" color="coolGray.700">
                Quick Actions
              </Text>
              <HStack space={3} justifyContent="space-between">
                <Button
                  flex={1}
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  leftIcon={<Icon as={MaterialIcons} name="cancel" size="sm" />}
                >
                  Cancel Order
                </Button>
                <Button
                  flex={1}
                  size="sm"
                  variant="solid"
                  colorScheme="green"
                  leftIcon={
                    <Icon as={MaterialIcons} name="check-circle" size="sm" />
                  }
                >
                  Complete Order
                </Button>
              </HStack>
            </VStack>
          </VStack>
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );

  // Updated table rendering style
  const getTableStyle = (status) => ({
    p: 3,
    rounded: "lg",
    width: 20, // Changed from 20 to 30
    height: 20, // Changed from 20 to 30
    justifyContent: "center",
    alignItems: "center",
    bg: "white",
    borderWidth: 2,
    borderColor: status === "AVAILABLE" ? "green.500" : "red.500",
  });

  // Simplified text color function
  const getTextColor = (status) => {
    return status === "AVAILABLE" ? "green.500" : "red.500";
  };

  // Add this function to handle section update
  const handleEditSection = () => {
    if (!editSection.name.trim()) {
      toast.show({
        description: "Section name is required",
        placement: "top",
        status: "warning",
      });
      return;
    }

    // Add your API call here
    console.log("Updating section:", editSection);

    toast.show({
      description: "Section updated successfully",
      placement: "top",
      status: "success",
    });

    setShowEditModal(false);
  };

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header */}
      <Box px={4} py={3} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <HStack alignItems="center" justifyContent="center" position="relative">
          <IconButton
            position="absolute"
            left={-9}
            icon={
              <MaterialIcons name="arrow-back" size={24} color="coolGray.500" />
            }
            onPress={() => router.back()}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
            rounded="full"
          />
          <Heading size="md" textAlign="center">
            {currentSection.name}
          </Heading>
          <IconButton
            position="absolute"
            right={-9}
            icon={<MaterialIcons name="edit" size={24} color="coolGray.500" />}
            onPress={() => {
              setEditSection({
                name: currentSection.name,
                totalTables: currentSection.totalTables.toString(),
                engagedTables: currentSection.engagedTables.toString(),
              });
              setShowEditModal(true);
            }}
            variant="ghost"
            _pressed={{ bg: "coolGray.100" }}
            rounded="full"
          />
        </HStack>
      </Box>

      <Box py={8} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
          }}
        >
          <HStack space={3} alignItems="center">
            {sections.map((section) => (
              <Pressable
                key={section.id}
                onPress={() => handleSectionChange(section.id)}
              >
                <Box
                  px={4}
                  py={1.5}
                  bg={activeSection === section.id ? "primary.500" : "white"}
                  borderWidth={1}
                  borderColor="primary.500"
                  rounded="md"
                  minW="120px"
                  alignItems="center"
                >
                  <Text
                    color={
                      activeSection === section.id ? "white" : "primary.500"
                    }
                    fontSize="sm"
                    fontWeight="medium"
                  >
                    {section.name}
                  </Text>
                </Box>
              </Pressable>
            ))}
          </HStack>
        </ScrollView>
      </Box>

      {/* Filter Buttons with adjusted spacing */}
      <Box py={8} borderBottomWidth={1} borderBottomColor="coolGray.200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
          }}
        >
          <HStack space={3} alignItems="center">
            <Pressable onPress={() => setActiveFilter("ALL")}>
              <Box
                px={4}
                py={1.5}
                bg={activeFilter === "ALL" ? "primary.500" : "white"}
                borderWidth={1}
                borderColor="primary.500"
                rounded="md"
              >
                <Text
                  color={activeFilter === "ALL" ? "gray.500" : "primary.500"}
                  fontSize="sm"
                  fontWeight="medium"
                >
                  All
                </Text>
              </Box>
            </Pressable>
            <Pressable onPress={() => setActiveFilter("AVAILABLE")}>
              <Box
                px={4}
                py={1.5}
                bg={activeFilter === "AVAILABLE" ? "green.500" : "white"}
                borderWidth={1}
                borderColor="green.500"
                rounded="md"
              >
                <Text
                  color={activeFilter === "AVAILABLE" ? "white" : "green.700"}
                  fontSize="sm"
                  fontWeight="medium"
                >
                  Available
                </Text>
              </Box>
            </Pressable>
            <Pressable onPress={() => setActiveFilter("ENGAGED")}>
              <Box
                px={4}
                py={1.5}
                bg={activeFilter === "ENGAGED" ? "red.500" : "white"}
                borderWidth={1}
                borderColor="red.500"
                rounded="md"
              >
                <Text
                  color={activeFilter === "ENGAGED" ? "white" : "red.500"}
                  fontSize="sm"
                  fontWeight="medium"
                >
                  Occupied
                </Text>
              </Box>
            </Pressable>
          </HStack>
        </ScrollView>
      </Box>

      {/* Main Content */}
      <ScrollView>
        <Box px={4} py={2}>
          <Center>
            {/* Section Statistics - Adjusted margins and padding */}
            <Box
              mb={4}
              p={4}
              bg="coolGray.50"
              rounded="xl"
              width="100%"
              borderWidth={1}
              borderColor="coolGray.200"
              shadow={2}
            >
              <VStack space={3}>
                <HStack justifyContent="space-around">
                  <VStack alignItems="center" space={1}>
                    <Text color="coolGray.600" fontSize="sm">
                      Total
                    </Text>
                    <Heading size="lg" color="coolGray.700">
                      {currentSection.totalTables}
                    </Heading>
                  </VStack>
                  <VStack alignItems="center" space={1}>
                    <Text color="red.500" fontSize="sm">
                      Occupied
                    </Text>
                    <Heading size="lg" color="red.500">
                      {currentSection.engagedTables}
                    </Heading>
                  </VStack>
                  <VStack alignItems="center" space={1}>
                    <Text color="green.500" fontSize="sm">
                      Available
                    </Text>
                    <Heading size="lg" color="green.500">
                      {currentSection.totalTables -
                        currentSection.engagedTables}
                    </Heading>
                  </VStack>
                </HStack>
              </VStack>
            </Box>
            {/* Tables Grid - Adjusted spacing */}

            <VStack space={1}>
              {Object.entries(tablesByRow).map(([rowIndex, row]) => (
                <HStack
                  key={rowIndex}
                  space={10}
                  px={0}
                  py={3}
                  alignItems="center"
                  justifyContent="flex-start"
                >
                  {Array.from({ length: 3 }).map((_, colIndex) => (
                    <Box key={`${rowIndex}-${colIndex}`} width={20} height={20}>
                      {row[colIndex] ? (
                        renderTable(row[colIndex])
                      ) : (
                        <Box
                          p={3}
                          rounded="lg"
                          width={20}
                          height={20}
                          borderWidth={1}
                          borderStyle="dashed"
                          borderColor="gray.200"
                          opacity={0.5}
                        />
                      )}
                    </Box>
                  ))}
                </HStack>
              ))}
            </VStack>
          </Center>
        </Box>
      </ScrollView>

      <TableActionModal />
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <Modal.Content maxWidth="400px">
          <HStack
            alignItems="center"
            justifyContent="space-between"
            px={1}
            py={2}
          >
            <Modal.Header flex={1} textAlign="center">
              <Text numberOfLines={1} ellipsizeMode="tail">
                Edit {currentSection.name}
              </Text>
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
                value={editSection.name}
                onChangeText={(value) =>
                  setEditSection((prev) => ({ ...prev, name: value }))
                }
                placeholder="Enter section name"
              />
            </FormControl>
          </Modal.Body>
          <Modal.Footer>
            <HStack space={2} width="100%" justifyContent="space-between">
              <Button
                variant="ghost"
                colorScheme="blueGray"
                onPress={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button onPress={handleEditSection}>Save Changes</Button>
            </HStack>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </Box>
  );
}
