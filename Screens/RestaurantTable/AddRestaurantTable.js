import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import axios from "axios";
import newstyles from "../newstyles";
import RemixIcon from "react-native-remix-icon";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomTabBar from "../CustomTabBar";
import axiosInstance from "../../utils/axiosConfig";

export default function AddRestaurantTable({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionModalVisible, setSectionModalVisible] = useState(false);

  const { onTableAdded } = route.params;

  // Fetch sections from the API
  const fetchSections = async () => {
    try {
      let restaurantId = await getRestaurantId();
      console.log("restaurantId--" + restaurantId);
      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_sections",
        {
          outlet_id: restaurantId,
        }
      );

      if (response.data.st === 1) {
        const sectionList = Object.entries(response.data.section_list).map(
          ([key, value]) => ({
            name: key,
            id: value,
          })
        );
        setSections(sectionList); // Convert object to array for rendering
      } else {
        Alert.alert("Error", "Failed to fetch sections.");
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  // Add a new table with the selected section
  const addTable = async () => {
    if (!selectedSection) {
      Alert.alert("Error", "Please select a section.");
      return;
    }

    try {
      let restaurantId = await getRestaurantId();
      setLoading(true);
      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_create",
        {
          outlet_id: restaurantId,
          section_id: selectedSection.id,
        }
      );

      if (response.data.st === 1) {
        setSelectedSection(null);
        if (onTableAdded) onTableAdded();
        navigation.goBack();
      } else {
        Alert.alert("Error", response.data.msg || "Failed to create table.");
      }
    } catch (error) {
      console.error("Error creating table:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle section selection
  const selectSection = (section) => {
    setSelectedSection(section);
    setSectionModalVisible(false); // Close modal after selection
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        {/* Section Selection */}
        <Text style={newstyles.labelText}>
          <Text style={{ color: "red" }}>*</Text>
          Select Section
        </Text>
        <TouchableOpacity
          style={newstyles.pickerContainer}
          onPress={() => setSectionModalVisible(true)}
        >
          <Text style={styles.sectionText}>
            {selectedSection ? selectedSection.name : "Choose a section"}
          </Text>
        </TouchableOpacity>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={addTable}
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

      {/* Modal for Section Selection */}
      <Modal
        visible={sectionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSectionModalVisible(false)}
      >
        <View style={newstyles.modalContainer}>
          <View style={newstyles.modalContent}>
            <View style={newstyles.selectModalHeader}>
              <Text style={newstyles.selectModalTitle}>Select Section</Text>
              <TouchableOpacity onPress={() => setSectionModalVisible(false)}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sections}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => selectSection(item)}>
                  <Text style={newstyles.selectModalItem}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      <CustomTabBar />
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    padding: 20,
  },
  sectionSelector: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionUnselected: {
    borderColor: "#ccc",
    borderWidth: 1,
  },
  sectionSelected: {
    backgroundColor: "#f0f8ff",
  },
  sectionText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  sectionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  sectionItemText: {
    fontSize: 16,
  },
  closeModalButton: {
    marginTop: 20,
  },
});
