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
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function AttendanceReportScreen() {
  const [filterType, setFilterType] = useState('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState('start'); // 'start' or 'end'
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  // Mock data for attendance records
  const [attendanceData, setAttendanceData] = useState([
    { id: 1, name: 'John Doe', date: '2024-03-01', status: 'present', checkIn: '09:00 AM', checkOut: '05:00 PM' },
    { id: 2, name: 'Jane Smith', date: '2024-03-01', status: 'absent', checkIn: '-', checkOut: '-' },
    // Add more mock data as needed
  ]);

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
    setShowDatePicker(false);
    if (selectedDate) {
      if (dateType === 'start') {
        if (selectedDate > endDate) {
          // If selected start date is after end date, update end date too
          setEndDate(selectedDate);
        }
        setStartDate(selectedDate);
      } else {
        if (selectedDate < startDate) {
          // If selected end date is before start date, update start date too
          setStartDate(selectedDate);
        }
        setEndDate(selectedDate);
      }
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
    setAttendanceData(filteredData);
  };

  return (
    <Box flex={1} bg="white" safeArea>
      <VStack space={4} flex={1}>
        {/* Header */}
        <Box px={4} py={3}>
          <Heading size="lg">Attendance Report</Heading>
        </Box>

        {/* Filter Section */}
        <Box px={4}>
          <Select
            selectedValue={filterType}
            onValueChange={handleFilterChange}
            _selectedItem={{
              bg: "primary.100",
              endIcon: <Icon as={Ionicons} name="checkmark" size={4} />
            }}
          >
            {filterOptions.map((option) => (
              <Select.Item 
                key={option.value} 
                label={option.label} 
                value={option.value}
              />
            ))}
          </Select>
        </Box>

        {/* Report Content */}
        <ScrollView flex={1} px={4}>
          <VStack space={3}>
            {attendanceData.map((record) => (
              <Box
                key={record.id}
                bg="white"
                p={4}
                rounded="lg"
                shadow={2}
                borderWidth={1}
                borderColor="gray.100"
              >
                <VStack space={2}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="md" fontWeight="bold">{record.name}</Text>
                    <Text
                      fontSize="sm"
                      color={record.status === 'present' ? 'success.500' : 'danger.500'}
                    >
                      {record.status.toUpperCase()}
                    </Text>
                  </HStack>
                  <Divider />
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.500">Date</Text>
                    <Text fontSize="sm">{record.date}</Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.500">Check In</Text>
                    <Text fontSize="sm">{record.checkIn}</Text>
                  </HStack>
                  <HStack justifyContent="space-between">
                    <Text fontSize="sm" color="gray.500">Check Out</Text>
                    <Text fontSize="sm">{record.checkOut}</Text>
                  </HStack>
                </VStack>
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
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text>Start Date</Text>
                    <Text>{startDate.toLocaleDateString()}</Text>
                  </HStack>
                </Pressable>
                <Pressable onPress={() => showDateSelection('end')}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text>End Date</Text>
                    <Text>{endDate.toLocaleDateString()}</Text>
                  </HStack>
                </Pressable>
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

        {/* Date Picker */}
        {showDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={dateType === 'start' ? startDate : endDate}
            mode="date"
            onChange={handleDateChange}
          />
        )}
      </VStack>
    </Box>
  );
}
