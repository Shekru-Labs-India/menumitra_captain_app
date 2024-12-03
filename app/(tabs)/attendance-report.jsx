import { StyleSheet, View, Text, SafeAreaView, ScrollView } from 'react-native';
import { useState } from 'react';
import { Box, VStack, HStack, Heading, Select, CheckIcon } from 'native-base';

export default function AttendanceReportScreen() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = ["2023", "2024"];

  // Mock data for attendance report
  const attendanceData = [
    {
      employeeName: "John Doe",
      employeeId: "EMP001",
      position: "Waiter",
      presentDays: 22,
      absentDays: 3,
      leaves: 2,
      overtime: 10
    },
    {
      employeeName: "Jane Smith",
      employeeId: "EMP002",
      position: "Chef",
      presentDays: 24,
      absentDays: 1,
      leaves: 1,
      overtime: 15
    },
    // Add more mock data as needed
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Box p={4}>
          <Heading size="lg" mb={4}>Attendance Report</Heading>
          
          {/* Filters */}
          <HStack space={4} mb={6}>
            <Select
              selectedValue={selectedMonth}
              minWidth={150}
              placeholder="Select Month"
              onValueChange={itemValue => setSelectedMonth(itemValue)}
              _selectedItem={{
                bg: "cyan.600",
                endIcon: <CheckIcon size={4} />
              }}
            >
              {months.map((month, index) => (
                <Select.Item key={index} label={month} value={month.toLowerCase()} />
              ))}
            </Select>

            <Select
              selectedValue={selectedYear}
              minWidth={100}
              placeholder="Year"
              onValueChange={itemValue => setSelectedYear(itemValue)}
              _selectedItem={{
                bg: "cyan.600",
                endIcon: <CheckIcon size={4} />
              }}
            >
              {years.map((year, index) => (
                <Select.Item key={index} label={year} value={year} />
              ))}
            </Select>
          </HStack>

          {/* Attendance Cards */}
          <VStack space={4}>
            {attendanceData.map((employee, index) => (
              <Box
                key={index}
                bg="white"
                p={4}
                rounded="lg"
                shadow={2}
              >
                <VStack space={2}>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Heading size="sm">{employee.employeeName}</Heading>
                    <Text color="gray.500">{employee.employeeId}</Text>
                  </HStack>
                  <Text color="gray.500">{employee.position}</Text>
                  
                  <HStack space={4} mt={2}>
                    <VStack alignItems="center">
                      <Text color="green.500" fontWeight="bold">{employee.presentDays}</Text>
                      <Text color="gray.500">Present</Text>
                    </VStack>
                    <VStack alignItems="center">
                      <Text color="red.500" fontWeight="bold">{employee.absentDays}</Text>
                      <Text color="gray.500">Absent</Text>
                    </VStack>
                    <VStack alignItems="center">
                      <Text color="yellow.500" fontWeight="bold">{employee.leaves}</Text>
                      <Text color="gray.500">Leaves</Text>
                    </VStack>
                    <VStack alignItems="center">
                      <Text color="blue.500" fontWeight="bold">{employee.overtime}h</Text>
                      <Text color="gray.500">Overtime</Text>
                    </VStack>
                  </HStack>
                </VStack>
              </Box>
            ))}
          </VStack>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
