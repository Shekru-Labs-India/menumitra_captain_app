import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Pressable,
  Modal,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomHeader from "../../components/CustomHeader";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import WebService from "../utils/WebService";
import CustomTabBar from "../CustomTabBar";
import { Picker } from "@react-native-picker/picker";
import { TextInput } from "react-native-paper";
import MainToolBar from "../MainToolbar";
import Icon from "react-native-vector-icons/Ionicons";
import axiosInstance from "../../utils/axiosConfig";

const EditSupplier = ({ route, navigation }) => {
  const { supplier } = route.params;
  const [formData, setFormData] = useState({
    name: supplier.name || "",
    credit_rating: supplier.credit_rating || "",
    credit_limit: supplier.credit_limit?.toString() || "",
    location: supplier.location || "",
    owner_name: supplier.owner_name || "",
    website: supplier.website || "",
    mobile_number1: supplier.mobile_number1 || "",
    mobille_number2: supplier.mobille_number2 || "",
    address: supplier.address || "",
    supplier_status: supplier.supplier_status || "active",
  });
  const [statusChoices, setStatusChoices] = useState({});
  const [creditRatingChoices, setCreditRatingChoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({}); // Add validationErrors state
  const [creditRatingModalVisible, setCreditRatingModalVisible] =
    useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  useEffect(() => {
    fetchChoices();
  }, []);

  const fetchSupplierDetails = async () => {
    try {
      const [outletId, accessToken] = await Promise.all([
        AsyncStorage.getItem(WebService.OUTLET_ID),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "supplier_view",
        {
          supplier_id: supplier.supplier_id,
          outlet_id: outletId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        setFormData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching supplier details:", error);
      Alert.alert("Error", "Failed to fetch supplier details");
    }
  };

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
    // Check if the first digit is between 6-9
    const firstDigit = number.charAt(0);
    return /^[6-9]/.test(firstDigit);
  };

  const validateSupplierName = (text) => {
    return /^[a-zA-Z\s]*$/.test(text);
  };

  const validateOwnerName = (text) => {
    return /^[a-zA-Z\s]*$/.test(text);
  };

  const validateCreditLimit = (text) => {
    return /^\d*\.?\d*$/.test(text);
  };

  const validateLocation = (text) => {
    return /^[a-zA-Z0-9\s]*$/.test(text);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Supplier Name is required";
    if (!formData.credit_limit.trim())
      errors.credit_limit = "Credit Limit is required";

    // Credit Rating validation
    if (!formData.credit_rating) {
      errors.credit_rating = "Credit Rating is required";
    }

    // Mobile number validation
    if (!formData.mobile_number1.trim()) {
      errors.mobile_number1 = "Primary Mobile Number is required";
    } else if (formData.mobile_number1.length !== 10) {
      errors.mobile_number1 = "Mobile number must be 10 digits";
    } else if (!validateMobileNumber(formData.mobile_number1)) {
      errors.mobile_number1 = "Mobile number must start with 6-9";
    }

    // Secondary mobile validation (only if provided)
    if (
      formData.mobille_number2 &&
      (formData.mobille_number2.length !== 10 ||
        !validateMobileNumber(formData.mobille_number2))
    ) {
      errors.mobille_number2 = "Invalid secondary mobile number";
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const [outletId, userId, accessToken] = await Promise.all([
        AsyncStorage.getItem(WebService.OUTLET_ID),
        AsyncStorage.getItem(WebService.USER_ID),
        AsyncStorage.getItem("access_token"),
      ]);

      // Create payload with explicit mobile_number2 handling
      const payload = {
        ...formData,
        supplier_id: supplier.supplier_id,
        outlet_id: outletId,
        user_id: userId,
        mobille_number2: formData.mobille_number2 || "", // Explicitly set empty string if null/undefined
      };

      const response = await axiosInstance.post(
        onGetProductionUrl() + "supplier_update",
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Supplier updated successfully");
        navigation.navigate("ViewSupplier", {
          supplierId: supplier.supplier_id,
          refresh: Date.now(),
        });
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update supplier");
      }
    } catch (error) {
      console.error("Error updating supplier:", error);
      Alert.alert("Error", "Failed to update supplier");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  return (
    <>
      <CustomHeader title="Edit Supplier" />
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
            error={!!validationErrors.name}
          />
          {validationErrors.name && (
            <Text style={styles.errorText}>{validationErrors.name}</Text>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              <Text style={styles.requiredStar}>*</Text>
              Credit Rating
            </Text>
            <TouchableOpacity 
              onPress={() => setCreditRatingModalVisible(true)}
              activeOpacity={0.7}
            >
              <TextInput
                mode="outlined"
                style={[
                  styles.input,
                  { height: 45 },
                  validationErrors.credit_rating && styles.inputError,
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
            </TouchableOpacity>
            {validationErrors.credit_rating && (
              <Text style={styles.errorText}>
                {validationErrors.credit_rating}
              </Text>
            )}
          </View>

          <TextInput
            mode="outlined"
            label={
              <Text>
                <Text style={styles.required}>*</Text> Credit Limit
              </Text>
            }
            value={formData.credit_limit}
            style={styles.input}
            onChangeText={(text) => {
              // Only allow numbers and one decimal point
              if (validateCreditLimit(text)) {
                if (text.split(".").length - 1 <= 1) {
                  if (text.includes(".")) {
                    const [whole, decimal] = text.split(".");
                    if (decimal?.length <= 2) {
                      setFormData({ ...formData, credit_limit: text });
                    }
                  } else {
                    setFormData({ ...formData, credit_limit: text });
                  }
                }
              }
            }}
            keyboardType="decimal-pad"
            error={!!validationErrors.credit_limit}
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
              // Only allow letters, numbers, and spaces
              const formattedText = text.replace(/[^a-zA-Z0-9\s]/g, "");
              setFormData({ ...formData, location: formattedText });
              if (validationErrors.location) {
                setValidationErrors({ ...validationErrors, location: null });
              }
            }}
            onBlur={() => {
              if (formData.location && !validateLocation(formData.location)) {
                setValidationErrors((prev) => ({
                  ...prev,
                  location: "Only letters, numbers, and spaces allowed",
                }));
              }
            }}
            error={!!validationErrors.location}
          />
          {validationErrors.location && (
            <Text style={styles.errorText}>{validationErrors.location}</Text>
          )}

          <TextInput
            mode="outlined"
            label="Owner Name"
            value={formData.owner_name}
            style={styles.input}
            onChangeText={(text) => {
              // Only allow letters and spaces
              const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
              setFormData({ ...formData, owner_name: formattedText });
            }}
          />

          <TextInput
            mode="outlined"
            label="Website"
            value={formData.website}
            style={styles.input}
            onChangeText={(text) => setFormData({ ...formData, website: text })}
          />

          <TextInput
            mode="outlined"
            label={
              <Text>
                <Text style={styles.required}>*</Text> Primary Mobile Number
              </Text>
            }
            value={formData.mobile_number1}
            style={styles.input}
            onChangeText={(text) => {
              // Only allow if empty or starts with valid digit
              if (text === "" || validateMobileNumber(text)) {
                setFormData({ ...formData, mobile_number1: text });
              }
            }}
            keyboardType="phone-pad"
            maxLength={10}
            error={!!validationErrors.mobile_number1}
          />
          {validationErrors.mobile_number1 && (
            <Text style={styles.errorText}>
              {validationErrors.mobile_number1}
            </Text>
          )}

          <TextInput
            mode="outlined"
            label="Secondary Mobile Number"
            maxLength={10}
            value={formData.mobille_number2}
            style={styles.input}
            onChangeText={(text) => {
              // Allow empty string or valid mobile number
              if (text === "" || validateMobileNumber(text)) {
                setFormData({ ...formData, mobille_number2: text });
                // Clear validation errors when field is emptied
                if (text === "") {
                  setValidationErrors((prev) => ({
                    ...prev,
                    mobille_number2: null,
                  }));
                }
              }
            }}
            keyboardType="phone-pad"
            error={!!validationErrors.mobille_number2}
          />
          {validationErrors.mobille_number2 && (
            <Text style={styles.errorText}>
              {validationErrors.mobille_number2}
            </Text>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              
              Address
            </Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              value={formData.address}
              style={[styles.input, styles.textArea]}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, address: text }));
              }}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}><Text style={styles.required}>*</Text> Status</Text>
            <TouchableOpacity 
              onPress={() => setStatusModalVisible(true)}
              activeOpacity={0.7}
            >
              <TextInput
                mode="outlined"
                style={[styles.input, { height: 45 }]}
                value={
                  statusChoices[formData.supplier_status]
                    ?.charAt(0)
                    .toUpperCase() +
                    statusChoices[formData.supplier_status]?.slice(1) || ""
                }
                placeholder="Select Status"
                editable={false}
                right={
                  <TextInput.Icon 
                    icon="chevron-down" 
                    onPress={() => setStatusModalVisible(true)}
                  />
                }
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Update Supplier</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <CustomTabBar />
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
      <Modal
        transparent={true}
        animationType="fade"
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity
                onPress={() => setStatusModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {Object.entries(statusChoices).map(([key, value]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.modalItem}
                  onPress={() => {
                    setFormData({ ...formData, supplier_status: key });
                    setStatusModalVisible(false);
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
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  form: {
    padding: 16,
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  requiredStar: {
    color: "#dc3545",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 12,
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
  picker: {
    height: 50,
    width: "100%",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#0dcaf0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 100,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  required: {
    color: "red",
  },
  errorText: {
    color: "red",
    marginBottom: 8,
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
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  modalItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontSize: 16,
  },
});

export default EditSupplier;
