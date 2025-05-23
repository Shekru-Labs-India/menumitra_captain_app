import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import axiosInstance from "../../utils/axiosConfig";

const RestaurantSectionTable = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchTableData();
    }, [])
  );

  useEffect(() => {
    fetchTableData();
  }, []);

  const fetchTableData = async () => {
    try {
      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_listview",
        {
          restaurant_id: "9",
        }
      );

      if (response.data.st === 1) {
        setSections(response.data.data);
      } else {
        alert("Failed to fetch data");
      }
    } catch (error) {
      console.error(error);
      alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const renderTable = ({ item }) => (
    <View style={styles.tableCard}>
      <Text style={styles.tableNumber}>Table #{item.table_number}</Text>
      <Text style={styles.status}>
        {item.is_occupied === 0 ? "Available" : "Occupied"}
      </Text>
    </View>
  );

  const renderSection = ({ item, index }) => {
    const sectionName = Object.keys(sections)[index]; // Get the section name (e.g., "garden")

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionName.toUpperCase()}</Text>
        <FlatList
          data={item}
          renderItem={renderTable}
          keyExtractor={(item) => item.table_id.toString()}
          numColumns={2} // Display tables in a grid format
          contentContainerStyle={styles.gridContainer}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <FlatList
      horizontal
      data={Object.values(sections)} // Extract the arrays of tables for each section
      renderItem={renderSection}
      keyExtractor={(item, index) => index.toString()}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
    />
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  horizontalList: {
    paddingHorizontal: 10,
  },
  section: {
    marginRight: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  gridContainer: {
    paddingHorizontal: 10,
  },
  tableCard: {
    flex: 1,
    margin: 5,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  status: {
    fontSize: 14,
    color: "#555",
  },
});

export default RestaurantSectionTable;
