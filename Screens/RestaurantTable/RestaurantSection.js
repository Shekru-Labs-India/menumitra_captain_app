import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import axiosInstance from "../../utils/axiosConfig";

const RestaurantSection = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  // Function to fetch sections from the API
  const fetchSections = async () => {
    setLoading(true);
    try {
      let restaurantId = await getRestaurantId();
      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_listview",
        {
          restaurant_id: restaurantId,
        }
      );
      if (response.data.st === 1) {
        setSections(response.data.data);
      } else {
        alert("Failed to fetch sections");
      }
    } catch (error) {
      console.error(error);
      alert("Error fetching sections");
    } finally {
      setLoading(false);
    }
  };

  // Load sections on component mount
  useEffect(() => {
    fetchSections();
  }, []);

  // Render a single section item
  const renderSection = ({ item }) => (
    <View style={styles.listItem}>
      <Text style={styles.sectionName}>{item.section_name}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Show loader while fetching data */}
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <>
          {/* FlatList to display sections */}
          <FlatList
            data={sections}
            keyExtractor={(item) => item.section_id.toString()}
            renderItem={renderSection}
            contentContainerStyle={styles.listContainer}
          />

          {/* Button below the list */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => alert("Button Pressed")}
          >
            <Text style={styles.buttonText}>Click Me</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default RestaurantSection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  listItem: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  button: {
    backgroundColor: "#007bff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
