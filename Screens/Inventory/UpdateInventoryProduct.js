import React, { useEffect, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from "react-native";
import { TextInput, Button } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";
import axios from "axios";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import RemixIcon from "react-native-remix-icon";
import newstyles from "../newstyles";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "../utils/WebService";
import axiosInstance from "../../utils/axiosConfig";

export default function UpdateInventoryProduct({ navigation, route }) {
  const { inventoryId } = route.params;
  const [refreshing, setRefreshing] = useState(false);
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
    in_or_out: "in",
    in_date: "",
    out_date: "",
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState(null);
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState({});
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [openSupplier, setOpenSupplier] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    quantity: "",
    unit_price: "",
    unit_of_measure: "",
    supplier_id: "",
    reorder_level: "",
  });
  const [inOutModalVisible, setInOutModalVisible] = useState(false);
  const [inOutOptions, setInOutOptions] = useState([]);

  useEffect(() => {
    fetchProductDetails();
    fetchInOutOptions();
  }, []);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchProductDetails().finally(() => setRefreshing(false));
  }, []);

  const fetchProductDetails = async () => {
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");

      const response = await axiosInstance.post(
        `${onGetProductionUrl()}inventory_view`,
        {
          outlet_id: restaurantId,
          inventory_id: inventoryId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        const data = response.data.data;
        console.log("Product Details:", data);

        setFormData({
          name: data.name || "",
          description: data.description || "",
          category_id: data.category_id?.toString() || "",
          unit_price: data.unit_price?.toString() || "",
          quantity: data.quantity?.toString() || "",
          unit_of_measure: data.unit_of_measure || "",
          reorder_level: data.reorder_level?.toString() || "",
          expiration_date: data.expiration_date || "",
          brand_name: data.brand_name || "",
          tax_rate: data.tax_rate?.toString() || "",
          in_or_out: data.in_or_out || "in",
          in_date: data.in_date || "",
          out_date: data.out_date || "",
        });

        setSelectedCategory(data.category_id?.toString());
        setSelectedSupplier(data.supplier_id?.toString());

        await Promise.all([fetchCategories(), fetchSuppliers()]);
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      Alert.alert("Error", "Failed to fetch product details");
    }
  };

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
        console.log("Categories Response:", response.data);
        const categoryList = Object.entries(
          response.data.inventory_categorys_list
        ).map(([name, id]) => ({
          label: name,
          value: id.toString(),
        }));
        setCategoryOptions(categoryList);
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
        console.log("Suppliers Response:", response.data);
        const suppliersList = Object.entries(response.data.suppliers_dict).map(
          ([name, id]) => ({
            label: name,
            value: id.toString(),
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

  const handleDateSelect = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === "set" && selectedDate && activeDateField) {
      const formattedDate = selectedDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      setFormData((prev) => ({
        ...prev,
        [activeDateField]: formattedDate,
      }));
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: "",
      quantity: "",
      unit_price: "",
      unit_of_measure: "",
      supplier_id: "",
      reorder_level: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Item name is required";
      isValid = false;
    }

    if (!formData.quantity) {
      newErrors.quantity = "Quantity is required";
      isValid = false;
    } else if (isNaN(formData.quantity) || parseInt(formData.quantity) < 0) {
      newErrors.quantity = "Please enter a valid quantity";
      isValid = false;
    }

    if (!formData.unit_price) {
      newErrors.unit_price = "Unit price is required";
      isValid = false;
    } else if (
      isNaN(formData.unit_price) ||
      parseFloat(formData.unit_price) <= 0
    ) {
      newErrors.unit_price = "Please enter a valid price";
      isValid = false;
    }

    if (!formData.unit_of_measure) {
      newErrors.unit_of_measure = "Unit of measure is required";
      isValid = false;
    }

    if (!selectedSupplier) {
      newErrors.supplier_id = "Please select a supplier";
      isValid = false;
    }

    if (
      formData.reorder_level &&
      (isNaN(formData.reorder_level) || parseInt(formData.reorder_level) < 0)
    ) {
      newErrors.reorder_level = "Please enter a valid reorder level";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleUpdate = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem(WebService.USER_ID),
        AsyncStorage.getItem("access_token"),
      ]);
      const category_id = selectedCategory ? parseInt(selectedCategory) : null;

      const payload = {
        inventory_id: inventoryId,
        supplier_id: parseInt(selectedSupplier),
        outlet_id: restaurantId,
        name: formData.name.trim(),
        description: formData.description,
        category_id: category_id,
        unit_price: parseFloat(formData.unit_price) || 0,
        quantity: parseInt(formData.quantity) || 0,
        unit_of_measure: formData.unit_of_measure,
        reorder_level: parseInt(formData.reorder_level) || 0,
        expiration_date: formData.expiration_date,
        brand_name: formData.brand_name,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        in_or_out: formData.in_or_out,
        in_date: formData.in_date,
        out_date: formData.out_date,
        user_id: userId,
      };

      const response = await axiosInstance.post(
        `${onGetProductionUrl()}inventory_update`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Inventory updated successfully", [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
              route.params?.onSuccess?.();
            },
          },
        ]);
      } else {
        Alert.alert("Error", response.data.msg);
        
        setErrors((prev) => ({
          ...prev,
          apiError: response.data.msg,
        }));
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      
      let errorMessage = "Failed to update inventory. Please try again.";
      if (error.response && error.response.data && error.response.data.msg) {
        errorMessage = error.response.data.msg;
      }
      
      Alert.alert("Error", errorMessage);
      
      setErrors((prev) => ({
        ...prev,
        apiError: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  };

  // Add input validation functions
  const validateName = (text) => {
    // Only allow letters and spaces
    return /^[a-zA-Z\s]*$/.test(text);
  };

  const validateNumber = (text) => {
    // Only allow positive numbers
    return /^\d*$/.test(text);
  };

  const validatePrice = (text) => {
    // Allow decimal numbers with up to 2 decimal places
    return /^\d*\.?\d{0,2}$/.test(text);
  };

  const validateUnitOfMeasure = (text) => {
    // Only allow letters
    return /^[a-zA-Z]*$/.test(text);
  };

  // Add this validation function
  const validateTaxRate = (text) => {
    // Allows numbers and one decimal point
    return /^\d*\.?\d*$/.test(text);
  };

  return (
    <>
      <CustomHeader title="Update Inventory" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#00BCD4"]} // Android
              tintColor="#00BCD4" // iOS
            />
          }
        >
          <View style={styles.formContainer}>
            <TextInput
              mode="outlined"
              label={
                <Text>
                  Name <Text style={styles.required}>*</Text>
                </Text>
              }
              value={formData.name}
              onChangeText={(text) => {
                if (validateName(text)) {
                  setFormData((prev) => ({ ...prev, name: text }));
                  setErrors((prev) => ({ ...prev, name: "" }));
                }
              }}
              style={styles.input}
              error={!!errors.name}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>
                Supplier
              </Text>
              <TouchableOpacity 
                onPress={() => setSupplierModalVisible(true)}
                activeOpacity={0.7}
              >
                <TextInput
                  style={styles.input}
                  value={
                    suppliers.find((s) => s.value === selectedSupplier)
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
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>
                Category
              </Text>
              <TouchableOpacity 
                onPress={() => setCategoryModalVisible(true)}
                activeOpacity={0.7}
              >
                <TextInput
                  style={styles.input}
                  value={
                    categoryOptions.find((c) => c.value === selectedCategory)
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
            </View>

            <TextInput
              style={[styles.inputContainer, styles.textArea]}
              label={<Text style={styles.label}> Description </Text>}
              value={formData.description}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              multiline
              numberOfLines={4}
              mode="outlined"
            />

            <View style={styles.rowContainer}>
              <View style={styles.halfWidth}>
                <TextInput
                  mode="outlined"
                  label={
                    <Text>
                      Unit Price <Text style={styles.required}>*</Text>
                    </Text>
                  }
                  value={formData.unit_price}
                  onChangeText={(text) => {
                    if (validatePrice(text)) {
                      setFormData((prev) => ({ ...prev, unit_price: text }));
                      setErrors((prev) => ({ ...prev, unit_price: "" }));
                    }
                  }}
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!errors.unit_price}
                />
                {errors.unit_price && (
                  <Text style={styles.errorText}>{errors.unit_price}</Text>
                )}
              </View>

              <View style={styles.halfWidth}>
                <TextInput
                  mode="outlined"
                  label={
                    <Text>
                      Unit of Measure <Text style={styles.required}>*</Text>
                    </Text>
                  }
                  value={formData.unit_of_measure}
                  onChangeText={(text) => {
                    if (validateUnitOfMeasure(text)) {
                      setFormData((prev) => ({
                        ...prev,
                        unit_of_measure: text,
                      }));
                      setErrors((prev) => ({ ...prev, unit_of_measure: "" }));
                    }
                  }}
                  style={styles.input}
                  error={!!errors.unit_of_measure}
                />
                {errors.unit_of_measure && (
                  <Text style={styles.errorText}>{errors.unit_of_measure}</Text>
                )}
              </View>
            </View>

            <View style={styles.halfWidth}>
              <TextInput
                mode="outlined"
                label={
                  <Text>
                    Quantity <Text style={styles.required}>*</Text>
                  </Text>
                }
                value={formData.quantity}
                onChangeText={(text) => {
                  if (validateNumber(text)) {
                    setFormData((prev) => ({ ...prev, quantity: text }));
                    setErrors((prev) => ({ ...prev, quantity: "" }));
                  }
                }}
                keyboardType="numeric"
                style={styles.input}
                error={!!errors.quantity}
              />
              {errors.quantity && (
                <Text style={styles.errorText}>{errors.quantity}</Text>
              )}
            </View>

            <TextInput
              mode="outlined"
              label="Reorder Level"
              value={formData.reorder_level}
              onChangeText={(text) => {
                if (validateNumber(text)) {
                  setFormData((prev) => ({ ...prev, reorder_level: text }));
                  setErrors((prev) => ({ ...prev, reorder_level: "" }));
                }
              }}
              keyboardType="numeric"
              style={styles.input}
              error={!!errors.reorder_level}
            />
            {errors.reorder_level && (
              <Text style={styles.errorText}>{errors.reorder_level}</Text>
            )}

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
              label={<Text style={styles.label}> Tax Rate (%)</Text>}
              value={formData.tax_rate}
              onChangeText={(text) => {
                // Only allow numbers and one decimal point
                if (validateTaxRate(text)) {
                  // Prevent multiple decimal points
                  if (text.split(".").length - 1 <= 1) {
                    // Limit to 2 decimal places
                    if (text.includes(".")) {
                      const [whole, decimal] = text.split(".");
                      if (decimal?.length <= 2) {
                        setFormData((prev) => ({ ...prev, tax_rate: text }));
                      }
                    } else {
                      setFormData((prev) => ({ ...prev, tax_rate: text }));
                    }
                  }
                }
              }}
              keyboardType="decimal-pad"
              mode="outlined"
              error={formData.tax_rate && !validateTaxRate(formData.tax_rate)}
              helperText={
                formData.tax_rate && !validateTaxRate(formData.tax_rate)
                  ? "Only numbers and decimals allowed"
                  : ""
              }
              maxLength={5} // Limit total length to prevent unreasonable values
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
                error={!!errors.in_or_out}
              />
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleUpdate}
              loading={loading}
              disabled={loading}
              style={[
                newstyles.submitButton,
                { marginTop: 20, marginBottom: 80, width: "100%" },
              ]}
              icon={() => (
                <RemixIcon name="checkbox-circle-line" size={20} color="#fff" />
              )}
            >
              Save
            </Button>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={handleDateSelect}
          />
        )}
      </KeyboardAvoidingView>

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
                style={styles.closeButton}
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
                    setSelectedSupplier(supplier.value);
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
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {categoryOptions.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCategory(category.value);
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
              <TouchableOpacity
                onPress={() => setInOutModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {inOutOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalItem}
                  onPress={() => {
                    setFormData((prev) => ({
                      ...prev,
                      in_or_out: option.value,
                    }));
                    setInOutModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomTabBar />
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
  },
  formContainer: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },

  label: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  required: {
    color: "red",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 4,
  },
  dropDownContainerStyle: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  errorText: {
    color: "#FF0000",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 8,
  },
  required: {
    color: "#FF0000",
  },
  apiErrorText: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  errorBorder: {
    borderColor: "#FF0000",
    borderWidth: 1,
  },
  dropdownButton: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginBottom: 16,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#000",
  },
});
