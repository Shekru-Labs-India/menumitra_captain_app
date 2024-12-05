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
  Center,
  Modal,
  Button,
  Divider,
  Icon,
} from "native-base";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SectionTablesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const toast = useToast();
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Sample section data with correct counts
  const [section] = useState({
    id: id,
    name: "Family Section",
    totalTables: 12,
    engagedTables: 4, // Updated to match actual engaged tables
  });

  // Updated sample tables data with realistic information
  const [tables, setTables] = useState([
    { id: 1, number: "T1", capacity: 4, status: "AVAILABLE", row: 0, col: 0 },
    {
      id: 2,
      number: "T2",
      capacity: 4,
      status: "ENGAGED",
      row: 0,
      col: 1,
      customerName: "John Smith",
      menuCount: 3,
      grandTotal: 850,
    },
    { id: 3, number: "T3", capacity: 6, status: "AVAILABLE", row: 0, col: 2 },
    { id: 4, number: "T4", capacity: 4, status: "AVAILABLE", row: 0, col: 3 },
    {
      id: 5,
      number: "T5",
      capacity: 2,
      status: "ENGAGED",
      row: 1,
      col: 0,
      customerName: "Sarah Wilson",
      menuCount: 2,
      grandTotal: 450,
    },
    { id: 6, number: "T6", capacity: 8, status: "AVAILABLE", row: 1, col: 1 },
    { id: 7, number: "T7", capacity: 4, status: "AVAILABLE", row: 1, col: 2 },
    { id: 8, number: "T8", capacity: 4, status: "AVAILABLE", row: 1, col: 3 },
    { id: 9, number: "T9", capacity: 6, status: "AVAILABLE", row: 2, col: 0 },
    {
      id: 10,
      number: "T10",
      capacity: 4,
      status: "ENGAGED",
      row: 2,
      col: 1,
      customerName: "Mike Johnson",
      menuCount: 4,
      grandTotal: 1200,
    },
    { id: 11, number: "T11", capacity: 2, status: "AVAILABLE", row: 2, col: 2 },
    {
      id: 12,
      number: "T12",
      capacity: 8,
      status: "ENGAGED",
      row: 2,
      col: 3,
      customerName: "David Brown",
      menuCount: 6,
      grandTotal: 1650,
    },
  ]);

  // Add handleTablePress function
  const handleTablePress = (table) => {
    if (table.status === "ENGAGED") {
      setSelectedTable(table);
      setShowModal(true);
    }
  };

  // Update renderTable function to use handleTablePress
  const renderTable = (table) => (
    <Pressable
      key={table.id}
      onPress={() => handleTablePress(table)}
      opacity={1}
      _pressed={{
        opacity: table.status === "ENGAGED" ? 0.7 : 1,
      }}
    >
      <Box {...getTableStyle(table.status)}>
        <VStack alignItems="center" space={1}>
          <Text color={getTextColor(table.status)} fontWeight="bold">
            {table.number}
          </Text>
          <Text color={getTextColor(table.status)} fontSize="xs">
            {table.capacity}P
          </Text>
        </VStack>
      </Box>
    </Pressable>
  );

  // Add new state for filter
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Updated getStatusColor function to handle only AVAILABLE and ENGAGED
  const getStatusColor = (status) => {
    return status === "AVAILABLE" ? "green.500" : "red.500";
  };

  // Simplified filter function for only two states
  const getFilteredTables = () => {
    switch (activeFilter) {
      case "AVAILABLE":
        return tables.filter((table) => table.status === "AVAILABLE");
      case "ENGAGED":
        return tables.filter((table) => table.status === "ENGAGED");
      default:
        return tables;
    }
  };

  // Group filtered tables by row
  const tablesByRow = getFilteredTables().reduce((acc, table) => {
    if (!acc[table.row]) {
      acc[table.row] = [];
    }
    acc[table.row][table.col] = table;
    return acc;
  }, {});

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
              ENGAGED
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
                  Cancel
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
                  Complete
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
    width: 16,
    height: 16,
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

  return (
    <Box
      flex={1}
      bg="white"
      safeArea
      pt={Platform.OS === "android" ? StatusBar.currentHeight : 0}
    >
      {/* Header - Reduced vertical padding */}
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
            {section.name}
          </Heading>
        </HStack>
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
                  color={activeFilter === "ALL" ? "white" : "primary.500"}
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
                  Engaged
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
                      {section.totalTables}
                    </Heading>
                  </VStack>
                  <VStack alignItems="center" space={1}>
                    <Text color="red.500" fontSize="sm">
                      Engaged
                    </Text>
                    <Heading size="lg" color="red.500">
                      {section.engagedTables}
                    </Heading>
                  </VStack>
                  <VStack alignItems="center" space={1}>
                    <Text color="green.500" fontSize="sm">
                      Available
                    </Text>
                    <Heading size="lg" color="green.500">
                      {section.totalTables - section.engagedTables}
                    </Heading>
                  </VStack>
                </HStack>
              </VStack>
            </Box>

            {/* Tables Grid - Adjusted spacing */}
            <VStack space={4}>
              {Object.values(tablesByRow).map((row, rowIndex) => (
                <HStack
                  key={rowIndex}
                  space={7}
                  justifyContent="center"
                  alignItems="center"
                >
                  {row.map((table) => (
                    <Pressable
                      key={table.id}
                      onPress={() => handleTablePress(table)}
                      opacity={table.status === "MAINTENANCE" ? 0.7 : 1}
                      _pressed={{
                        opacity: table.status === "ENGAGED" ? 0.7 : 1,
                      }}
                    >
                      <Box {...getTableStyle(table.status)}>
                        <VStack alignItems="center" space={1}>
                          <Text
                            color={getTextColor(table.status)}
                            fontWeight="bold"
                          >
                            {table.number}
                          </Text>
                          <Text
                            color={getTextColor(table.status)}
                            fontSize="xs"
                          >
                            {table.capacity}P
                          </Text>
                        </VStack>
                      </Box>
                    </Pressable>
                  ))}
                </HStack>
              ))}
            </VStack>
          </Center>
        </Box>
      </ScrollView>

      <TableActionModal />
    </Box>
  );
}
