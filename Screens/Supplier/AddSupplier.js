import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  Modal,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomHeader from "../../components/CustomHeader";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import WebService from "../utils/WebService";
import { Picker } from "@react-native-picker/picker";
import CustomTabBar from "../CustomTabBar";
import RemixIcon from "react-native-remix-icon";
import MainToolBar from "../MainToolbar";
import Icon from "react-native-vector-icons/Ionicons";
import axiosInstance from "../../utils/axiosConfig";

const AddSupplier = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: "",
    credit_rating: "",
    credit_limit: "",
    location: "",
    owner_name: "",
    website: "",
    mobile_number1: "",
    mobille_number2: "",
    address: "",
    // supplier_status: "",
  });
  const [statusChoices, setStatusChoices] = useState({});
  const [creditRatingChoices, setCreditRatingChoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({}); // Add validationErrors state
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    credit_rating: false,
    credit_limit: false,
    mobile_number1: false,
    mobille_number2: false,
    address: false,
  });
  const [creditRatingModalVisible, setCreditRatingModalVisible] =
    useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  useEffect(() => {
    fetchChoices();
  }, []);

  const fetchChoices = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");

      const [statusResponse, creditResponse] = await Promise.all([
        axiosInstance.post(
          onGetProductionUrl() + "supplier_status_choices",
          {}, // Empty request body
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
        }),
        axiosInstance.post(
          onGetProductionUrl() + "supplier_credit_rating_choices",
          {}, // Empty request body
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        ),
      ]);

      if (statusResponse.data.st === 1) {
        setStatusChoices(statusResponse.data.supplier_status_choices);
      }

      if (creditResponse.data.st === 1) {
        setCreditRatingChoices(creditResponse.data.credit_rating_choices);
      }
    } catch (error) {
      console.error("Error fetching choices:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateMobileNumber = (number) => {
    // If it's the first digit, only allow 6-9
    if (number.length === 1) {
      return /^[6-9]$/.test(number);
    }
    // For subsequent digits, allow any number
    return /^[6-9]\d*$/.test(number);
  };

  // Add input validation functions
  const validateInputs = {
    name: (text) => {
      const nameRegex = /^[a-zA-Z\s]+$/;
      return (
        (text.length >= 3 && text.length <= 20 && nameRegex.test(text)) ||
        text === ""
      );
    },
    credit_limit: (text) => /^\d+$/.test(text) || text === "", // Only integers
    website: (text) => {
      if (text === "") return true; // Allow empty input
      const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
      return urlPattern.test(text);
    },
    owner_name: (text) => /^[a-zA-Z\s]+$/.test(text) || text === "", // Only letters and spaces
    location: (text) => /^[a-zA-Z0-9\s,.-]+$/.test(text) || text === "", // Alphanumeric with basic punctuation
  };

  const validateSupplierName = (text) => {
    return /^[a-zA-Z\s]*$/.test(text);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    if (!formData.mobile_number1.trim()) {
      errors.mobile_number1 = "Mobile number is required";
    }
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const [outletId, userId, accessToken] = await Promise.all([
        AsyncStorage.getItem(WebService.OUTLET_ID),
        AsyncStorage.getItem(WebService.USER_ID),
        AsyncStorage.getItem("access_token"),
      ]);

      console.log("Sending supplier data:", {
        ...formData,
        outlet_id: outletId,
        user_id: userId,
      });

      const response = await axiosInstance.post(
        onGetProductionUrl() + "supplier_create",
        {
          ...formData,
          outlet_id: outletId,
          user_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("Supplier create API response:", response.data);

      if (response.data.st === 1) {
        Alert.alert("Success", "Supplier added successfully");
        navigation.navigate("SupplierList", { refresh: Date.now() });
      } else {
        console.error("API Error:", response.data);
        Alert.alert("Error", response.data.msg || "Failed to add supplier");
      }
    } catch (error) {
      console.error("Error adding supplier:", error.response?.data || error);
      Alert.alert("Error", "Failed to add supplier");
    }
  };

  // Helper function to check if field should show error
  const shouldShowError = (fieldName) => {
    if (!touchedFields[fieldName]) return false;

    switch (fieldName) {
      case "name":
        return (
          !formData.name.trim() ||
          formData.name.length < 3 ||
          formData.name.length > 20 ||
          !validateSupplierName(formData.name)
        );
      case "address":
        return !formData.address.trim() || formData.address.length < 5;
      // ... other cases
      default:
        return false;
    }
  };

  return (
    <>
      <CustomHeader title="Add Supplier" />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label={
              <Text>
                <Text style={styles.required}>*</Text> Supplier Name
              </Text>
            }
            value={formData.name}
            style={styles.input}
            onChangeText={(text) => {
              // Only allow letters and spaces
              const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
              setFormData({ ...formData, name: formattedText });
              setValidationErrors({ ...validationErrors, name: null });
            }}
            onBlur={() => {
              setTouchedFields((prev) => ({ ...prev, name: true }));
              // Validate on blur
              if (!validateSupplierName(formData.name)) {
                setValidationErrors((prev) => ({
                  ...prev,
                  name: "Only letters and spaces allowed",
                }));
              } else if (formData.name.trim().length < 3) {
                setValidationErrors((prev) => ({
                  ...prev,
                  name: "Name must be at least 3 characters",
                }));
              } else if (formData.name.trim().length > 20) {
                setValidationErrors((prev) => ({
                  ...prev,
                  name: "Name cannot exceed 20 characters",
                }));
              }
            }}
            error={
              shouldShowError("name") ||
              (formData.name && !validateSupplierName(formData.name))
            }
            maxLength={20}
          />
          {validationErrors.name && (
            <Text style={styles.errorText}>{validationErrors.name}</Text>
          )}

          <View style={styles.pickerContainer}>
            <Text style={styles.inputLabel}>
              <Text style={styles.required}>*</Text> Credit Rating
            </Text>
            <Pressable onPress={() => setCreditRatingModalVisible(true)}>
              <TextInput
                mode="outlined"
                style={[
                  styles.input,
                  { height: 50 },
                  touchedFields.credit_rating &&
                    !formData.credit_rating &&
                    styles.inputError,
                ]}
                value={
                  creditRatingChoices[formData.credit_rating]
                    ?.charAt(0)
                    .toUpperCase() +
                    creditRatingChoices[formData.credit_rating]?.slice(1) || ""
                }
                placeholder="Select Credit Rating"
                editable={false}
                right={
                  <TextInput.Icon 
                    icon="chevron-down" 
                    onPress={() => setCreditRatingModalVisible(true)}
                  />
                }
              />
            </Pressable>
            {validationErrors.credit_rating && (
              <Text style={styles.errorText}>
                {validationErrors.credit_rating}
              </Text>
            )}
          </View>

          <Modal
            transparent={true}
            animationType="fade"
            visible={creditRatingModalVisible}
            onRequestClose={() => setCreditRatingModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalContainer}
              activeOpacity={1}
              onPress={() => setCreditRatingModalVisible(false)}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Credit Rating</Text>
                  <TouchableOpacity
                    onPress={() => setCreditRatingModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {Object.entries(creditRatingChoices).map(([key, value]) => (
                    <TouchableOpacity
                      key={key}
                      style={styles.modalItem}
                      onPress={() => {
                        setFormData({ ...formData, credit_rating: key });
                        setValidationErrors({
                          ...validationErrors,
                          credit_rating: null,
                        });
                        setTouchedFields((prev) => ({
                          ...prev,
                          credit_rating: true,
                        }));
                        setCreditRatingModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          <TextInput
            mode="outlined"
            label={
              <Text>
                <Text style={styles.required}>*</Text> Credit Limit
              </Text>
            }
            keyboardType="numeric"
            value={formData.credit_limit}
            style={styles.input}
            onChangeText={(text) => {
              if (/^\d*$/.test(text)) {
                setFormData({ ...formData, credit_limit: text });
                setValidationErrors({
                  ...validationErrors,
                  credit_limit: null,
                });
              }
            }}
            onBlur={() =>
              setTouchedFields((prev) => ({ ...prev, credit_limit: true }))
            }
            error={shouldShowError("credit_limit")}
          />
          {validationErrors.credit_limit && (
            <Text style={styles.errorText}>
              {validationErrors.credit_limit}
            </Text>
          )}

          <TextInput
            mode="outlined"
            label="Location"
            value={formData.location}
            style={styles.input}
            onChangeText={(text) => {
              if (validateInputs.location(text)) {
                setFormData({ ...formData, location: text });
              }
            }}
          />

          <TextInput
            mode="outlined"
            label="Owner Name"
            value={formData.owner_name}
            style={styles.input}
            onChangeText={(text) => {
              if (validateInputs.owner_name(text)) {
                setFormData({ ...formData, owner_name: text });
              }
            }}
          />

          <TextInput
            mode="outlined"
            label="Website"
            value={formData.website}
            style={styles.input}
            onChangeText={(text) => {
              setFormData({ ...formData, website: text });
            }}
            onBlur={() => {
              if (
                formData.website &&
                !validateInputs.website(formData.website)
              ) {
                setValidationErrors({
                  ...validationErrors,
                  website: "Please enter a valid website URL",
                });
              } else {
                setValidationErrors({
                  ...validationErrors,
                  website: null,
                });
              }
            }}
            error={!!validationErrors.website}
          />
          {validationErrors.website && (
            <Text style={styles.errorText}>{validationErrors.website}</Text>
          )}

          <TextInput
            mode="outlined"
            label={
              <Text>
                <Text style={styles.required}>*</Text> Primary Mobile Number
              </Text>
            }
            keyboardType="phone-pad"
            value={formData.mobile_number1}
            style={styles.input}
            onChangeText={(text) => {
              // Only allow valid mobile numbers
              if (text === '' || (validateMobileNumber(text) && text.length <= 10)) {
                setFormData({ ...formData, mobile_number1: text });
                setValidationErrors({
                  ...validationErrors,
                  mobile_number1: null,
                });
              }
            }}
            onBlur={() => {
              setTouchedFields((prev) => ({ ...prev, mobile_number1: true }));
              if (formData.mobile_number1 && formData.mobile_number1.length < 10) {
                setValidationErrors((prev) => ({
                  ...prev,
                  mobile_number1: "Mobile number must be 10 digits",
                }));
              }
            }}
            error={shouldShowError("mobile_number1")}
            maxLength={10}
          />
          {validationErrors.mobile_number1 && (
            <Text style={styles.errorText}>
              {validationErrors.mobile_number1}
            </Text>
          )}

          <TextInput
            mode="outlined"
            label="Secondary Mobile Number"
            keyboardType="phone-pad"
            value={formData.mobille_number2}
            style={styles.input}
            maxLength={10}
            onChangeText={(text) => {
              if (text === "" || validateMobileNumber(text)) {
                setFormData({ ...formData, mobille_number2: text });
                console.log("Updated secondary number:", text);
              }
            }}
          />

          <TextInput
            mode="outlined"
            label="Address"
            multiline
            numberOfLines={4}
            value={formData.address}
            style={[styles.input, styles.textArea]}
            onChangeText={(text) => {
              setFormData({ ...formData, address: text });
              setValidationErrors({ ...validationErrors, address: null });
            }}
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <View style={styles.buttonContent}>
              <RemixIcon name="checkbox-circle-line" size={20} color="#fff" />
              <Text style={styles.buttonText}>Save</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  form: {
    padding: 16,
  },
  required: {
    color: "red",
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#0dcaf0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 80,
    flexDirection: "row", // Ensures icon and text are side by side
  },
  buttonContent: {
    flexDirection: "row", // Aligns icon and text horizontally
    alignItems: "center", // Ensures both are vertically aligned
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8, // Adds space between the icon and text
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  picker: {
    height: 50,
    width: "100%",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 8,
  },
  pickerError: {
    borderColor: "red",
    borderWidth: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 20,
    width: "80%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  inputError: {
    borderColor: "red",
  },
});

export default AddSupplier;
