import React, { useState, useEffect } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import axios from "axios";
import newstyles from "../newstyles";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import RemixIcon from "react-native-remix-icon";
import axiosInstance from "../../utils/axiosConfig";

export default function UpdateRestaurantSection({ route, navigation }) {
  const { sectionId, onSectionUpdated } = route.params; // Receive section ID and callback
  const [sectionName, setSectionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); // State to show loading spinner while fetching

  // Function to fetch section details
  const fetchSectionDetails = async () => {
    try {
      console.log("section_id--" + sectionId);
      const restaurantId = await getRestaurantId();
      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_view",
        {
          restaurant_id: restaurantId,
          section_id: sectionId,
        }
      );

      if (response.data.st === 1) {
        // Success - Set the section name from the response
        setSectionName(response.data.data.section_name || "");
      } else {
        Alert.alert(
          "Error",
          response.data.msg || "Failed to fetch section details."
        );
      }
    } catch (error) {
      console.error("Error fetching section details:", error);
      Alert.alert(
        "Error",
        "Something went wrong while fetching section details."
      );
    } finally {
      setFetching(false); // Stop showing the spinner
    }
  };

  // Fetch section details on component mount
  useEffect(() => {
    fetchSectionDetails();
  }, []);

  // Function to update the section
  const updateSection = async () => {
    if (!sectionName.trim()) {
      Alert.alert("Error", "Please enter a section name.");
      return;
    }

    try {
      let restaurantId = await getRestaurantId();
      setLoading(true);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_update",
        {
          restaurant_id: restaurantId,
          section_id: sectionId,
          section_name: sectionName.trim(),
        }
      );

      if (response.data.st === 1) {
        // Success
        Alert.alert(
          "Success",
          response.data.msg || "Section updated successfully"
        );
        if (onSectionUpdated) onSectionUpdated(); // Refresh section list
        navigation.goBack(); // Go back to the previous screen
      } else {
        // Handle API error
        Alert.alert("Error", response.data.msg || "Failed to update section.");
      }
    } catch (error) {
      console.error("Error updating section:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    // Show loading spinner while fetching section details
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={newstyles.labelText}>
          <Text style={{ color: "red" }}>*</Text>Section Name
        </Text>
        <TextInput
          placeholder="Enter Section Name"
          value={sectionName}
          onChangeText={setSectionName}
          mode="outlined"
          style={newstyles.input}
        />
        <Button
          mode="contained"
          onPress={updateSection}
          loading={loading}
          disabled={loading}
          style={newstyles.submitButton}
          icon={() => (
            <RemixIcon name="ri-checkbox-circle-line" size={20} color="#fff" />
          )}
        >
          Update
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    padding: 20,
    justifyContent: "center",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
