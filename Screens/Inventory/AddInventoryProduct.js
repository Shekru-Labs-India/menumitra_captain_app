import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Pressable,
  Modal,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";
import axios from "axios";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import RemixIcon from "react-native-remix-icon";
import newstyles from "../newstyles";
import CustomTabBar from "../CustomTabBar";
import CustomHeader from "../../components/CustomHeader";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "../utils/WebService";
import axiosInstance from "../../utils/axiosConfig";
export default function AddInventoryProduct({ navigation, route }) {
  const getCurrentFormattedDate = () => {
    const date = new Date();
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    unit_price: "",
    quantity: "",
    unit_of_measure: "",
    reorder_level: "",
    expiration_date: "",
    brand_name: "",
    tax_rate: "",
    in_or_out: "",
    in_date: "",
    out_date: "",
    supplier_id: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [openSupplier, setOpenSupplier] = useState(false);
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    supplier_id: false,
    category_id: false,
    unit_price: false,
    quantity: false,
    unit_of_measure: false,
  });
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [inOutModalVisible, setInOutModalVisible] = useState(false);
  const [inOutOptions, setInOutOptions] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    fetchInOutOptions();
  }, []);

  const fetchCategories = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const response = await axiosInstance.post(
        `${onGetProductionUrl()}get_inventory_category_list`,
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.st === 1) {
        const categoryList = Object.entries(
          response.data.inventory_categorys_list
        ).map(([label, value]) => ({
          label,
          value: value.toString(),
        }));
        setCategories(categoryList);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };


  const fetchSuppliers = async () => {
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        `${onGetProductionUrl()}get_supplier_list`,
        { outlet_id: restaurantId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        const suppliersList = Object.entries(response.data.suppliers_dict).map(
          ([label, value]) => ({
            label,
            value: value.toString(),
          })
        );
        setSuppliers(suppliersList);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchInOutOptions = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const response = await axiosInstance.post(
        `${onGetProductionUrl()}get_in_or_out_list`,
        {}, // Empty request body
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const optionsList = Object.entries(response.data.in_out_list).map(
          ([value, label]) => ({
            label: label.toUpperCase(),
            value: value,
          })
        );
        setInOutOptions(optionsList);
      }
    } catch (error) {
      console.error("Error fetching in/out options:", error);
    }
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      category_id: value,
    }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    
    if (event.type === 'set' && selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      setFormData((prev) => ({
        ...prev,
        [activeDateField]: formattedDate
      }));
    }
  };

  const getFieldError = (fieldName) => {
    if (!touchedFields[fieldName]) return false;

    switch (fieldName) {
      case "name":
        if (!formData.name?.trim()) {
          return "Name is required";
        }
        if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
          return "Only letters and spaces allowed";
        }
        return "";
      case "supplier_id":
        return !formData.supplier_id ? "Supplier is required" : "";
      case "category_id":
        return !formData.category_id ? "Category is required" : "";
      case "unit_price":
        return !formData.unit_price || parseFloat(formData.unit_price) <= 0
          ? "Unit price must be greater than 0"
          : "";
      case "quantity":
        return !formData.quantity || parseInt(formData.quantity) <= 0
          ? "Quantity must be greater than 0"
          : "";
      case "unit_of_measure":
        if (!formData.unit_of_measure?.trim()) {
          return "Unit of measure is required";
        }
        if (!/^[a-zA-Z\s]+$/.test(formData.unit_of_measure)) {
          return "Only letters and spaces allowed";
        }
        return "";
      case "tax_rate":
        return !formData.tax_rate || parseFloat(formData.tax_rate) <= 0
          ? "Tax rate must be greater than 0"
          : "";
      default:
        return "";
    }
  };

  const handleSubmit = async () => {
    // Mark all fields as touched
    setTouchedFields({
      name: true,
      supplier_id: true,
      category_id: true,
      unit_price: true,
      quantity: true,
      unit_of_measure: true,
    });

    // Check for validation errors
    const hasErrors = [
      "name",
      "supplier_id",
      "category_id",
      "unit_price",
      "quantity",
      "unit_of_measure",
    ].some((field) => !!getFieldError(field));

    if (hasErrors) {
      return;
    }

    setLoading(true);
    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem(WebService.USER_ID),
        AsyncStorage.getItem("access_token"),
      ]);

      // If status is "out" and no out_date is selected, set current date
      if (formData.in_or_out === "out" && !formData.out_date) {
        const currentDate = new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        setFormData(prev => ({
          ...prev,
          out_date: currentDate
        }));
      }

      const response = await axiosInstance.post(
        `${onGetProductionUrl()}inventory_create`,
        {
          ...formData,
          outlet_id: restaurantId,
          user_id: userId,
          out_date: formData.in_or_out === "out" ? (formData.out_date || getCurrentFormattedDate()) : formData.out_date,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Inventory created successfully", [
          {
            text: "OK",
            onPress: () => {
              // Call the success callback if provided
              if (route.params?.onSuccess) {
                route.params.onSuccess();
              }
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert("Error", response.data.msg || "Failed to create inventory");
      }
    } catch (error) {
      console.error("Error creating inventory:", error);
      Alert.alert(
        "Error",
        error.response?.data?.msg ||
          "Failed to create inventory. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CustomHeader title="Add Inventory" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            <TextInput
              style={styles.inputContainer}
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text> Inventory Name{" "}
                </Text>
              }
              value={formData.name}
              onChangeText={(text) => {
                // Only allow letters and spaces
                const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
                setFormData((prev) => ({ ...prev, name: formattedText }));
                setTouchedFields((prev) => ({ ...prev, name: true }));
              }}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, name: true }))
              }
              mode="outlined"
              error={!!getFieldError("name")}
            />

            {getFieldError("name") && (
              <Text style={styles.errorText}>{getFieldError("name")}</Text>
            )}

            {/* Add Supplier Dropdown after name input */}

            <TouchableOpacity 
              onPress={() => setSupplierModalVisible(true)}
              activeOpacity={0.7}
            >
              <TextInput
                style={styles.inputContainer}
                label={
                  <Text style={styles.label}>
                    <Text style={styles.required}>*</Text> Supplier
                  </Text>
                }
                value={
                  suppliers.find((s) => s.value === formData.supplier_id)
                    ?.label || ""
                }
                editable={false}
                mode="outlined"
                right={
                  <TextInput.Icon 
                    icon="chevron-down" 
                    onPress={() => setSupplierModalVisible(true)}
                  />
                }
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setCategoryModalVisible(true)}
              activeOpacity={0.7}
            >
              <TextInput
                style={styles.inputContainer}
                label={
                  <Text style={styles.label}>
                    <Text style={styles.required}>*</Text> Category
                  </Text>
                }
                value={
                  categories.find((c) => c.value === formData.category_id)
                    ?.label || ""
                }
                editable={false}
                mode="outlined"
                right={
                  <TextInput.Icon 
                    icon="chevron-down" 
                    onPress={() => setCategoryModalVisible(true)}
                  />
                }
              />
            </TouchableOpacity>

            <TextInput
              style={[styles.inputContainer, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              multiline
              numberOfLines={4}
              mode="outlined"
              label={<Text style={styles.label}> Description </Text>}
            />

            <TextInput
              style={styles.inputContainer}
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text> Unit Price
                </Text>
              }
              value={formData.unit_price}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9.]/g, "");
                setFormData((prev) => ({ ...prev, unit_price: numericValue }));
                setTouchedFields((prev) => ({ ...prev, unit_price: true }));
              }}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, unit_price: true }))
              }
              keyboardType="decimal-pad"
              mode="outlined"
              error={getFieldError("unit_price")}
            />

            <TextInput
              style={styles.inputContainer}
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text> Quantity
                </Text>
              }
              value={formData.quantity}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, "");
                setFormData((prev) => ({ ...prev, quantity: numericValue }));
                setTouchedFields((prev) => ({ ...prev, quantity: true }));
              }}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, quantity: true }))
              }
              keyboardType="numeric"
              mode="outlined"
              error={getFieldError("quantity")}
            />

            <TextInput
              style={styles.inputContainer}
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text> Unit of Measure
                </Text>
              }
              value={formData.unit_of_measure}
              onChangeText={(text) => {
                // Only allow letters and spaces
                const formattedText = text.replace(/[^a-zA-Z\s]/g, "");
                setFormData((prev) => ({
                  ...prev,
                  unit_of_measure: formattedText,
                }));
                setTouchedFields((prev) => ({
                  ...prev,
                  unit_of_measure: true,
                }));
              }}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, unit_of_measure: true }))
              }
              mode="outlined"
              error={!!getFieldError("unit_of_measure")}
            />

            {getFieldError("unit_of_measure") && (
              <Text style={styles.errorText}>
                {getFieldError("unit_of_measure")}
              </Text>
            )}

            <TextInput
              style={styles.inputContainer}
              label={<Text style={styles.label}> Reorder Level</Text>}
              value={formData.reorder_level}
              onChangeText={(text) => {
                // Only allow numbers
                const numericValue = text.replace(/[^0-9]/g, "");
                setFormData((prev) => ({
                  ...prev,
                  reorder_level: numericValue,
                }));
              }}
              keyboardType="numeric"
              mode="outlined"
            />

            <TextInput
              style={styles.inputContainer}
              label={<Text style={styles.label}> Brand Name</Text>}
              value={formData.brand_name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, brand_name: text }))
              }
              mode="outlined"
            />

            <TextInput
              style={styles.inputContainer}
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text> Tax Rate (%)
                </Text>
              }
              value={formData.tax_rate}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9.]/g, "");
                setFormData((prev) => ({ ...prev, tax_rate: numericValue }));
                setTouchedFields((prev) => ({ ...prev, tax_rate: true }));
              }}
              onBlur={() =>
                setTouchedFields((prev) => ({ ...prev, tax_rate: true }))
              }
              keyboardType="decimal-pad"
              mode="outlined"
              error={getFieldError("tax_rate")}
            />

            <Pressable
              onPress={() => {
                setActiveDateField("expiration_date");
                setShowDatePicker(true);
              }}
            >
              <TextInput
                style={styles.inputContainer}
                label={<Text style={styles.label}> Expiration Date</Text>}
                value={formData.expiration_date}
                editable={false}
                mode="outlined"
                right={
                  <TextInput.Icon
                    icon="calendar"
                    onPress={() => {
                      setActiveDateField("expiration_date");
                      setShowDatePicker(true);
                    }}
                  />
                }
              />
            </Pressable>

            <Pressable
              onPress={() => {
                setActiveDateField("in_date");
                setShowDatePicker(true);
              }}
            >
              <TextInput
                style={styles.inputContainer}
                label={<Text style={styles.label}> In Date</Text>}
                value={formData.in_date}
                editable={false}
                mode="outlined"
                right={
                  <TextInput.Icon
                    icon="calendar"
                    onPress={() => {
                      setActiveDateField("in_date");
                      setShowDatePicker(true);
                    }}
                  />
                }
              />
            </Pressable>

            <Pressable
              onPress={() => {
                setActiveDateField("out_date");
                setShowDatePicker(true);
              }}
            >
              <TextInput
                style={styles.inputContainer}
                label={<Text style={styles.label}> Out Date</Text>}
                value={formData.out_date}
                editable={false}
                mode="outlined"
                right={
                  <TextInput.Icon
                    icon="calendar"
                    onPress={() => {
                      setActiveDateField("out_date");
                      setShowDatePicker(true);
                    }}
                  />
                }
              />
            </Pressable>

            <TouchableOpacity 
              onPress={() => setInOutModalVisible(true)}
              activeOpacity={0.7}
            >
              <TextInput
                style={styles.inputContainer}
                label={
                  <Text style={styles.label}>
                    <Text style={styles.required}>*</Text> In/Out Status
                  </Text>
                }
                value={
                  formData.in_or_out ? formData.in_or_out.toUpperCase() : ""
                }
                editable={false}
                mode="outlined"
                right={
                  <TextInput.Icon 
                    icon="chevron-down" 
                    onPress={() => setInOutModalVisible(true)}
                  />
                }
                error={getFieldError("in_or_out")}
              />
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={[newstyles.submitButton, { marginTop: 20 }]}
              icon={() => (
                <RemixIcon name="checkbox-circle-line" size={20} color="#fff" />
              )}
            >
              Save
            </Button>
          </View>
        </ScrollView>
        <CustomTabBar />

        {showDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <Modal
          transparent={true}
          animationType="fade"
          visible={supplierModalVisible}
          onRequestClose={() => setSupplierModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setSupplierModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Supplier</Text>
                <TouchableOpacity
                  onPress={() => setSupplierModalVisible(false)}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {suppliers.map((supplier) => (
                  <TouchableOpacity
                    key={supplier.value}
                    style={styles.modalItem}
                    onPress={() => {
                      setFormData((prev) => ({
                        ...prev,
                        supplier_id: supplier.value,
                      }));
                      setSupplierModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{supplier.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          transparent={true}
          animationType="fade"
          visible={categoryModalVisible}
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setCategoryModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity
                  onPress={() => setCategoryModalVisible(false)}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    style={styles.modalItem}
                    onPress={() => {
                      handleCategoryChange(category.value);
                      setCategoryModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{category.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          transparent={true}
          animationType="fade"
          visible={inOutModalVisible}
          onRequestClose={() => setInOutModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={() => setInOutModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Status</Text>
                <TouchableOpacity onPress={() => setInOutModalVisible(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {inOutOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.modalItem}
                    onPress={() => {
                      setFormData((prev) => {
                        // Only update the in_or_out status without modifying dates
                        return { ...prev, in_or_out: option.value };
                      });
                      
                      setInOutModalVisible(false);
                      setTouchedFields((prev) => ({
                        ...prev,
                        in_or_out: true,
                      }));
                    }}
                  >
                    <Text style={styles.modalItemText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    marginBottom: 100,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  inputContainer: {
    marginTop: 16,
    backgroundColor: "#fff",
  },
  required: {
    color: "red",
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 16,
    height: 45,
    borderRadius: 0,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  dropdown: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 14,
    marginBottom: 16,
    position: "relative", // Add this
  },
  dropDownContainerStyle: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
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
});
