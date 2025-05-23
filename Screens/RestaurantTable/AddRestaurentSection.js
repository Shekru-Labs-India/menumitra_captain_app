import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import axios from "axios";
import newstyles from "../newstyles";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import RemixIcon from "react-native-remix-icon";
import CustomTabBar from "../CustomTabBar";
import axiosInstance from "../../utils/axiosConfig";

export default function AddRestaurantSection({ route, navigation }) {
  const [sectionName, setSectionName] = useState("");
  const [loading, setLoading] = useState(false);

  const { onSectionAdded } = route.params; // Callback function to refresh the section list.

  // Function to add a new section
  const addSection = async () => {
    if (!sectionName.trim()) {
      Alert.alert("Error", "Please enter a section name.");
      return;
    }

    try {
      let restaurantId = await getRestaurantId();
      setLoading(true);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_create",
        {
          outlet_id: restaurantId,
          section_name: sectionName.trim(),
        }
      );

      if (response.data.st === 1) {
        // Success
        Alert.alert(
          "Success",
          response.data.msg || "Restaurant Section created successfully"
        );
        setSectionName(""); // Clear input field

        if (onSectionAdded) onSectionAdded(); // Refresh section list
        navigation.goBack(); // Go back to the previous screen
      } else {
        // Handle API error
        Alert.alert("Error", response.data.msg || "Failed to create section.");
      }
    } catch (error) {
      console.error("Error creating section:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <TextInput
          label={
            <Text style={styles.label}>
              <Text style={styles.required}>*</Text> Section Name
            </Text>
          }
          value={sectionName}
          onChangeText={setSectionName}
          mode="outlined"
          style={newstyles.input}
        />
        <Button
          mode="contained"
          onPress={addSection}
          loading={loading}
          disabled={loading}
          style={newstyles.submitButton}
          icon={() => (
            <RemixIcon name="ri-checkbox-circle-line" size={20} color="#fff" />
          )}
        >
          Save
        </Button>
      </ScrollView>
      <CustomTabBar />
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
  required: {
    color: "red",
  },
});
