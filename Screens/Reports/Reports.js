import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
  RefreshControl,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomTabBar from "../CustomTabBar";
import MainToolBar from "../MainToolbar";
import CustomHeader from "../../components/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState(null); // Changed from "last_month" to null
  const [customDateRange, setCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [fileLink, setFileLink] = useState("");
  const [modalVisible, setModalVisible] = useState(false); // Modal visibility state
  const [activeDate, setActiveDate] = useState("start"); // To track if user is setting start or end date
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  // Helper function to convert to title case
  const toTitleCase = (str) => {
    if (str === "6_months") return "6 Months";
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const timePeriods = [
    "all",
    "today",
    "yesterday",
    "this_week",
    "last_week",
    "this_month",
    "last_month",
    "6_months",
    "date_range",
  ];

  // Function to fetch reports
  const fetchReports = async () => {
    setLoading(true);

    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      // Format dates in DD Mon YYYY format
      const formatDate = (date) => {
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, "0");
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
      };

      let requestData;

      // Strictly separate the two modes
      if (customDateRange) {
        if (!startDate || !endDate) {
          Alert.alert("Error", "Please select both start and end dates");
          setLoading(false);
          return;
        }
        requestData = {
          outlet_id: restaurantId,
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
          time_period: null,
        };
      } else {
        if (!timePeriod) {
          Alert.alert("Error", "Please select a time period");
          setLoading(false);
          return;
        }
        requestData = {
          outlet_id: restaurantId,
          time_period: timePeriod,
          start_date: null,
          end_date: null,
        };
      }

      console.log("Request Data:", requestData);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "report_generate",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setFileLink(response.data.file_link);
        Alert.alert("Success", "Report generated successfully!");
      } else {
        Alert.alert("Error", response.data.msg || "Failed to generate report.");
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      Alert.alert("Error", "An error occurred while generating the report.");
    } finally {
      setLoading(false);
    }
  };

  // Open report file in browser
  const openReport = () => {
    if (fileLink) {
      Linking.openURL(fileLink).catch(() =>
        Alert.alert("Error", "Unable to open the report file.")
      );
    } else {
      Alert.alert("Info", "Report file is not available.");
    }
  };

  const handleTimePeriodSelect = (period) => {
    if (period === "date_range") {
      setCustomDateRange(true);
      setTimePeriod(null); // Ensure time_period is null for date range
    } else {
      setCustomDateRange(false);
      setTimePeriod(period);
      // Reset dates when switching to time period
      setStartDate(new Date());
      setEndDate(new Date());
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    const currentDate = new Date();

    if (selectedDate) {
      // Ensure selected date is not in the future
      if (selectedDate > currentDate) {
        Alert.alert("Error", "Cannot select future dates");
        return;
      }

      if (activeDate === "start") {
        setStartDate(selectedDate);
        // If end date is before new start date, update it
        if (endDate < selectedDate) {
          setEndDate(selectedDate);
        }
      } else {
        // If selected end date is before start date, show error
        if (selectedDate < startDate) {
          Alert.alert("Error", "End date cannot be before start date");
          return;
        }
        setEndDate(selectedDate);
      }
    }
    setShowDatePicker(false);
  };

  return (
    <>
      <CustomHeader title={"Reports"}></CustomHeader>

      <View style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0dcaf0"]}
              tintColor="#0dcaf0"
            />
          }
        >
          <View style={styles.toolbarContainer}>
            <MainToolBar />
          </View>

          {/* Time Period or Custom Date Range */}
          <View>
            <View style={styles.timePeriodContainer}>
              {timePeriods.map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.timePeriodButton,
                    ((timePeriod === period && !customDateRange) ||
                      (period === "date_range" && customDateRange)) &&
                      styles.timePeriodButtonSelected,
                  ]}
                  onPress={() => handleTimePeriodSelect(period)}
                >
                  <Text
                    style={[
                      styles.timePeriodText,
                      ((timePeriod === period && !customDateRange) ||
                        (period === "date_range" && customDateRange)) &&
                        styles.timePeriodTextSelected,
                    ]}
                  >
                    {toTitleCase(period)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date range picker shown below all buttons when Date Range is selected */}
            {customDateRange && (
              <View style={styles.dateRangeSection}>
                <TouchableOpacity
                  style={[styles.datePickerButton, styles.dateButton]}
                  onPress={() => {
                    setActiveDate("start");
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.datePickerText}>
                    Start Date:{" "}
                    {startDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.datePickerButton, styles.dateButton]}
                  onPress={() => {
                    setActiveDate("end");
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.datePickerText}>
                    End Date:{" "}
                    {endDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Toggle Between Time Period and Custom Date Range */}

          {/* Generate Report Button */}
          <TouchableOpacity
            style={styles.generateButton}
            onPress={fetchReports}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>Generate Report</Text>
            )}
          </TouchableOpacity>

          {/* Download Report Button */}
          {fileLink ? (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={openReport}
            >
              <Text style={styles.downloadButtonText}>Download Report</Text>
            </TouchableOpacity>
          ) : null}

          {/* Date Picker Modal */}
          {showDatePicker && (
            <DateTimePicker
              value={activeDate === "start" ? startDate : endDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </ScrollView>
      </View>
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  timePeriodContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 15,
    paddingHorizontal: 8,
    width: "100%",
  },
  timePeriodButton: {
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRadius: 8,
    margin: 4,
    width: "30%",
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  dateRangeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  datePickerButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4caf50",
  },
  dateButton: {
    minHeight: 45,
    justifyContent: "center",
  },
  datePickerText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  timePeriodButtonSelected: {
    backgroundColor: "#4caf50",
  },
  timePeriodText: {
    color: "#000",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
  timePeriodTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  toggleButton: {
    backgroundColor: "#ff9800",
    padding: 12,
    borderRadius: 8,
    marginVertical: 20,
    alignItems: "center",
  },
  toggleButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  generateButton: {
    backgroundColor: "#2196f3",
    padding: 15,
    width: "90%",
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  generateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  downloadButton: {
    backgroundColor: "#4caf50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  closeModalButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#ff1744",
    borderRadius: 8,
  },
  closeModalText: {
    color: "#fff",
    fontWeight: "bold",
  },
  dateRangeContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginVertical: 10,
  },
  dateRangeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#e0e0e0",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  backButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default Reports;
