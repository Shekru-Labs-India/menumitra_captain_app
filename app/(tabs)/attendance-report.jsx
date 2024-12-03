import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
  ScrollView,
  Select,
  Modal,
  Button,
  Icon,
  Heading,
  Divider,
  IconButton,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function AttendanceReportScreen() {
  const router = useRouter();
  const [filterType, setFilterType] = useState('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState('start');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [employeeInfo] = useState([
    {
      id: 1,
      name: 'John Doe',
      image: null,
      totalPresent: 22,
      totalAbsent: 3
    },
    {
      id: 2,
      name: 'Jane Smith',
      image: null,
      totalPresent: 18,
      totalAbsent: 7
    },
    {
      id: 3,
      name: 'Mike Johnson',
      image: null,
      totalPresent: 20,
      totalAbsent: 5
    },
    {
      id: 4,
      name: 'Sarah Williams',
      image: null,
      totalPresent: 25,
      totalAbsent: 0
    }
  ]);
  const [attendanceData, setAttendanceData] = useState([
    { id: 1, name: 'John Doe', date: '2024-03-01', status: 'present', checkIn: '09:00 AM', checkOut: '05:00 PM' },
    { id: 2, name: 'Jane Smith', date: '2024-03-01', status: 'absent', checkIn: '-', checkOut: '-' },
    // Add more mock data as needed
  ]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedDays, setSelectedDays] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  const filterOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this_week' },
    { label: 'Last Week', value: 'last_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'This Quarter', value: 'this_quarter' },
    { label: 'Last 6 Months', value: 'last_6_months' },
    { label: 'Custom Date', value: 'custom' },
  ];

  const handleFilterChange = (value) => {
    setFilterType(value);
    if (value === 'custom') {
      setShowCustomDateModal(true);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }
    
    const currentDate = selectedDate || (dateType === 'start' ? startDate : endDate);
    
    if (selectedDate) {
      if (dateType === 'start') {
        if (selectedDate > endDate) {
          setEndDate(selectedDate);
        }
        setStartDate(selectedDate);
      } else {
        if (selectedDate < startDate) {
          setStartDate(selectedDate);
        }
        setEndDate(selectedDate);
      }
    }
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const showDateSelection = (type) => {
    setDateType(type);
    setShowDatePicker(true);
  };

  const applyCustomDateFilter = () => {
    setShowCustomDateModal(false);
    // Filter attendance data based on selected date range
    const filteredData = attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      // Set hours to 0 for proper date comparison
      const start = new Date(startDate.setHours(0, 0, 0, 0));
      const end = new Date(endDate.setHours(23, 59, 59, 999));
      return recordDate >= start && recordDate <= end;
    });
    setFilteredData(filteredData);
  };

  const calculateTotalDays = (start, end) => {
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Including both start and end days
  };

  const generateReport = () => {
    const today = new Date();
    let startFilterDate = new Date();
    let endFilterDate = new Date();

    switch (filterType) {
      case 'today':
        startFilterDate.setHours(0, 0, 0, 0);
        endFilterDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startFilterDate.setDate(today.getDate() - 1);
        startFilterDate.setHours(0, 0, 0, 0);
        endFilterDate = new Date(startFilterDate);
        endFilterDate.setHours(23, 59, 59, 999);
        break;
      case 'this_week':
        startFilterDate.setDate(today.getDate() - today.getDay());
        startFilterDate.setHours(0, 0, 0, 0);
        endFilterDate = new Date();
        break;
      case 'last_week':
        startFilterDate.setDate(today.getDate() - today.getDay() - 7);
        startFilterDate.setHours(0, 0, 0, 0);
        endFilterDate.setDate(today.getDate() - today.getDay() - 1);
        endFilterDate.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        startFilterDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endFilterDate = new Date();
        break;
      case 'last_month':
        startFilterDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endFilterDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endFilterDate.setHours(23, 59, 59, 999);
        break;
      case 'this_quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startFilterDate = new Date(today.getFullYear(), quarter * 3, 1);
        endFilterDate = new Date();
        break;
      case 'last_6_months':
        startFilterDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        endFilterDate = new Date();
        break;
      case 'custom':
        startFilterDate = new Date(startDate);
        startFilterDate.setHours(0, 0, 0, 0);
        endFilterDate = new Date(endDate);
        endFilterDate.setHours(23, 59, 59, 999);
        break;
    }

    const days = calculateTotalDays(startFilterDate, endFilterDate);
    setTotalDays(days);
    setSelectedDays(days);

    const filtered = attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startFilterDate && recordDate <= endFilterDate;
    });

    setFilteredData(filtered);
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download functionality
    console.log('Downloading PDF...');
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <VStack space={4} flex={1}>
        {/* Header */}
        <Box 
          px={4} 
          py={3} 
          bg="white" 
          shadow={2}
          mb={1}
          borderBottomWidth={1}
          borderBottomColor="gray.100"
        >
          <HStack alignItems="center" justifyContent="space-between">
            <IconButton
              icon={<Icon as={Ionicons} name="arrow-back" size={6} color="gray.800" />}
              onPress={() => router.back()}
              variant="ghost"
              _pressed={{ bg: "gray.100" }}
              position="absolute"
              left={0}
              zIndex={1}
            />
            <Heading size="lg" flex={1} textAlign="center">
              Attendance Report
            </Heading>
          </HStack>
        </Box>

        {/* Filter Section */}
        <Box px={4}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack space={2} py={2}>
              {filterOptions.map((option) => (
                option.value !== 'custom' ? (
                  <Pressable
                    key={option.value}
                    onPress={() => handleFilterChange(option.value)}
                  >
                    <Box
                      px={4}
                      py={2}
                      rounded="full"
                      bg={filterType === option.value ? "blue.500" : "gray.100"}
                    >
                      <Text
                        color={filterType === option.value ? "white" : "gray.800"}
                        fontWeight={filterType === option.value ? "bold" : "normal"}
                      >
                        {option.label}
                      </Text>
                    </Box>
                  </Pressable>
                ) : null
              ))}
            </HStack>
          </ScrollView>
          
          <HStack space={2} mt={2} alignItems="center" justifyContent="space-between">
            {/* Custom Date Button */}
            <Box flex={1}>
              <Pressable onPress={() => handleFilterChange('custom')}>
                <Box
                  px={4}
                  py={3}
                  rounded="lg"
                  bg={filterType === 'custom' ? "blue.500" : "blue.100"}
                  flexDirection="row"
                  alignItems="center"
                >
                  <Icon
                    as={Ionicons}
                    name="calendar-outline"
                    size={5}
                    color={filterType === 'custom' ? "white" : "blue.500"}
                    mr={2}
                  />
                  <Text
                    color={filterType === 'custom' ? "white" : "blue.500"}
                    fontWeight="semibold"
                  >
                    Custom Date Range
                  </Text>
                </Box>
              </Pressable>
            </Box>

            {/* Apply Button */}
          
          </HStack>
        </Box>
        <Box alignItems="flex-end" px={4}>
          <Button
            w="40%"
            onPress={generateReport}
            bg="primary.500"
            _pressed={{ bg: "primary.600" }}
            leftIcon={<Icon as={Ionicons} name="checkmark" size={5} color="white" />}
          >
            Apply
          </Button>
        </Box>

        {/* Total Days Section */}
        <Box px={4} py={2}>
          <VStack space={3}>
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="md" fontWeight="semibold" color="gray.700">Total Days: {totalDays}</Text>
              <Pressable onPress={handleDownloadPDF}>
                <HStack space={1} alignItems="center">
                  <Icon as={Ionicons} name="download-outline" size={5} color="blue.500" />
                  <Text fontSize="md" fontWeight="bold" color="blue.500">Download</Text>
                </HStack>
              </Pressable>
            </HStack>
          </VStack>
        </Box>

        {/* Employee Cards */}
        <ScrollView flex={1} px={4}>
          <VStack space={3}>
            {employeeInfo.map((employee) => (
              <Box key={employee.id} bg="white" shadow={2} rounded="lg" p={4}>
                <HStack space={4} alignItems="center">
                  <Box>
                    <Box 
                      bg="gray.200" 
                      rounded="full" 
                      size={16} 
                      alignItems="center" 
                      justifyContent="center"
                    >
                      <Icon 
                        as={Ionicons} 
                        name="person" 
                        size={8} 
                        color="gray.500"
                      />
                    </Box>
                  </Box>
                  <VStack flex={1}>
                    <Text fontSize="lg" fontWeight="bold" color="gray.800">
                      {employee.name}
                    </Text>
                    <HStack space={4} mt={2}>
                      <VStack alignItems="center">
                        <Text fontSize="sm" color="gray.500">Present</Text>
                        <Text fontSize="lg" fontWeight="bold" color="green.500">{employee.totalPresent}</Text>
                      </VStack>
                      <VStack alignItems="center">
                        <Text fontSize="sm" color="gray.500">Absent</Text>
                        <Text fontSize="lg" fontWeight="bold" color="red.500">{employee.totalAbsent}</Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        </ScrollView>

        {/* Custom Date Modal */}
        <Modal isOpen={showCustomDateModal} onClose={() => setShowCustomDateModal(false)}>
          <Modal.Content>
            <Modal.Header>Select Date Range</Modal.Header>
            <Modal.Body>
              <VStack space={4}>
                <Pressable onPress={() => showDateSelection('start')}>
                  <HStack justifyContent="space-between" alignItems="center" bg="gray.100" p={3} rounded="md">
                    <Text>Start Date</Text>
                    <Text>{startDate.toLocaleDateString()}</Text>
                  </HStack>
                </Pressable>
                <Pressable onPress={() => showDateSelection('end')}>
                  <HStack justifyContent="space-between" alignItems="center" bg="gray.100" p={3} rounded="md">
                    <Text>End Date</Text>
                    <Text>{endDate.toLocaleDateString()}</Text>
                  </HStack>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={dateType === 'start' ? startDate : endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    style={Platform.OS === 'ios' ? { width: '100%', backgroundColor: 'white' } : {}}
                  />
                )}
              </VStack>
            </Modal.Body>
            <Modal.Footer>
              <Button.Group space={2}>
                <Button
                  variant="ghost"
                  onPress={() => setShowCustomDateModal(false)}
                >
                  Cancel
                </Button>
                <Button onPress={applyCustomDateFilter}>
                  Apply
                </Button>
              </Button.Group>
            </Modal.Footer>
          </Modal.Content>
        </Modal>
      </VStack>
    </Box>
  );
}
