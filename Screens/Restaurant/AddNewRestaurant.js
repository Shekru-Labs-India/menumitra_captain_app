import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import axios from "axios";
import { getUserId, getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl, onGetOwnerUrl } from "../utils/ConstantFunctions";
import newstyles from "../newstyles";
import { Button, TextInput } from "react-native-paper";
import RemixIcon from "react-native-remix-icon";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "../utils/WebService";
import axiosInstance from "../../utils/axiosConfig";

const AddNewRestaurant = ({ navigation, route }) => {
  const [btnLoading, setBtnLoading] = useState(false);

  const [name, setName] = useState("");
  const [fssaiNumber, setFssaiNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [serviceCharges, setServiceCharges] = useState("");
  const [gst, setGst] = useState("");
  const [address, setAddress] = useState("");
  const [isOpen, setIsOpen] = useState("True");
  const [upiId, setUpiId] = useState("");
  const [website, setWebsite] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [google_business_link, setGoogleBusinessLink] = useState("");
  const [google_review, setGoogleReview] = useState("");

  const [image, setImage] = useState(null);
  const [imageSelected, setImageSelected] = useState(false);

  const [vegNonvegList, setVegNonvegList] = useState([]);
  const [vegModalVisible, setVegModalVisible] = useState(false);
  const [vegNonveg, setVegNonveg] = useState("nonveg");

  const [restaurantTypeList, setRestaurantTypeList] = useState([]);
  const [restaurantTypeModalVisible, setRestaurantTypeModalVisible] =
    useState(false);
  const [restaurantType, setRestaurantType] = useState("restaurant");

  const [restaurantIsOpen, setRestaurantIsOpen] = useState(true);
  const [restaurantIsOpenModalVisible, setRestaurantIsOpenModalVisible] =
    useState(false);

  const [mobileError, setMobileError] = useState("");

  const fetchRestaurantTypes = async () => {
    try {
      const response = await axiosInstance.get(
        onGetProductionUrl() + "outlet_type"
      );

      if (response.data.st === 1) {
        // Map the response data to a list of types.
        const restaurantTypeList = response.data.outlet_type_list;
        const restaurantTypes = Object.entries(restaurantTypeList).map(
          ([key, value]) => ({
            key: key,
            name: value,
          })
        );
        console.log("restaurantTypes-" + JSON.stringify(restaurantTypes));
        setRestaurantTypeList(restaurantTypes);
      } else {
        Alert.alert("Error", "Failed to fetch restaurant types.");
        return [];
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "An error occurred while fetching restaurant types: " + error.message
      );
      console.log("Error fetching restaurant types:", error);
      return [];
    }
  };
  const fetchVegNonvegList = async () => {
    try {
      const response = await axiosInstance.get(
        onGetProductionUrl() + "get_veg_or_nonveg_list"
      );
      if (response.data.st === 1) {
        const vegNonvegList = Object.entries(
          response.data.veg_or_nonveg_list
        ).map(([key, value]) => ({
          name: value,
          key: key,
        }));
        setVegNonvegList(vegNonvegList);
      } else {
        Alert.alert("Error", "Failed to fetch veg/non-veg options.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const validateForm = () => {
    // Check only mandatory fields
    if (
      !name ||
      !fssaiNumber ||
      !gstNumber ||
      !mobile ||
      !vegNonveg ||
      !serviceCharges ||
      !gst ||
      !restaurantType ||
      !upiId
    ) {
      Alert.alert(
        "Required Fields Missing",
        "Please fill all mandatory fields including UPI ID"
      );
      return false;
    }

    // Validate mobile number (must be 10 digits)
    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert("Error", "Mobile number must be 10 digits");
      return false;
    }

    // Validate FSSAI number (must be 14 digits)
    if (!/^\d{14}$/.test(fssaiNumber)) {
      Alert.alert("Error", "FSSAI number must be 14 digits");
      return false;
    }

    // Validate GST number (must be 15 characters)
    if (gstNumber.length !== 15) {
      Alert.alert("Error", "GST number must be 15 characters");
      return false;
    }

    return true;
  };
  const handleAddNewRestaurantProfile = async () => {
    if (!validateForm()) return; // Stop if form validation fails
    setBtnLoading(true); // Show loading indicator
    try {
      const restaurantId = await getRestaurantId();
      const userId = await getUserId();

      // Create FormData object for file upload
      const formData = new FormData();

      // Append the fields from restaurantData to FormData
      formData.append("user_id", userId);
      formData.append("is_open", restaurantIsOpen);
      formData.append("name", name);
      formData.append("outlet_type", restaurantType);
      formData.append("fssainumber", fssaiNumber);
      formData.append("gstnumber", gstNumber);
      formData.append("mobile", mobile);
      formData.append("veg_nonveg", vegNonveg);
      formData.append("service_charges", serviceCharges);
      formData.append("gst", gst);
      // Always append address, even if empty
      formData.append("address", address || ""); // Send empty string if address is null/undefined

      formData.append("website", website);
      formData.append("whatsapp", whatsapp); // Fixed: was sending website instead of whatsapp
      formData.append("facebook", facebook); // Fixed: was sending website instead of facebook
      formData.append("instagram", instagram); // Fixed: was sending website instead of instagram
      formData.append("google_business_link", google_business_link); // Fixed: was sending website
      formData.append("google_review", google_review); // Fixed: was sending website
      formData.append("upi_id", upiId);

      // If there is a profile image, append it to the FormData
      if (imageSelected) {
        formData.append("image", {
          uri: image,
          type: "image/jpeg",
          name: "profile.jpg",
        });
      }

      console.log("Form Data--" + JSON.stringify(formData));
      // Send the request with formData
      const response = await axios.post(
        onGetOwnerUrl() + "restaurant_create",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data", // Important for file uploads
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Restaurant Profile created successfully", [
          {
            text: "OK",
            onPress: () => {
              if (route.params?.refresh) {
                route.params.refresh();
              }
              navigation.goBack(); // Navigate back to RestaurantList
            },
          },
        ]);
      } else {
        console.log("Create Error:", response.data.msg);
        Alert.alert(
          "Error",
          response.data.msg || "Failed to create restaurant"
        );
      }
    } catch (error) {
      Alert.alert("Error ---", error.message);
      console.log("Error updating restaurant data:", error);
    } finally {
      setBtnLoading(false); // Hide loading indicator
    }
  };

  const pickImage = async () => {
    if (Platform.OS === "web") {
      // Web-specific logic for file selection
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const fileReader = new FileReader();
          fileReader.onload = () => {
            setImage(fileReader.result); // Base64 encoded image
            setImageSelected(true);
          };
          fileReader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      try {
        // Check current permission status
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          // Ask for permission if not granted
          const { status: newStatus } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

          if (newStatus !== "granted") {
            Alert.alert(
              "Permission required",
              "You need to grant gallery access to select an image."
            );
            return;
          }
        }

        // Launch the image picker with updated MediaType
        const pickedImage = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: [ImagePicker.MediaType.IMAGE], // Use updated MediaType
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });

        if (!pickedImage.canceled) {
          setImage(pickedImage.assets[0].uri); // URI of the selected image
          setImageSelected(true);
        }
      } catch (error) {
        console.error("Error picking image:", error);
        Alert.alert("Error", "Something went wrong while selecting an image.");
      }
    }
  };

  const validateMobile = (number) => {
    if (number.length === 0) {
      setMobileError("");
      return true;
    }

    if (number.length !== 10) {
      setMobileError("Mobile number must be 10 digits");
      return false;
    }

    const firstDigit = parseInt(number.charAt(0));
    if (firstDigit < 6 || firstDigit > 9) {
      setMobileError("Mobile number should start with 6, 7, 8, or 9");
      return false;
    }

    setMobileError("");
    return true;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={newstyles.inner}>
          <TouchableOpacity
            onPress={pickImage}
            style={newstyles.imagePickerContainer}
          >
            <Image
              source={image ? { uri: image } : require("../../assets/edit.png")}
              style={newstyles.profileImage}
            />
            <RemixIcon
              name="ri-edit-line" // Use the appropriate icon name for edit
              size={20}
              color="#000"
              style={styles.editIcon}
            />
          </TouchableOpacity>
          <View style={styles.header}>
            <Text style={styles.headerText}>Restaurant Profile</Text>
          </View>

          <Text style={newstyles.labelText}>
            <Text style={{ color: "red" }}>*</Text>
            Select Restaurant Open
          </Text>
          <TouchableOpacity
            style={[
              newstyles.selectModalPicker,
              // Apply this style only when isEditable is true
            ]}
            onPress={() => {
              setRestaurantIsOpenModalVisible(true);
            }}
          >
            <Text
              style={{
                color: "rgb(0,0,0)",
              }}
            >
              {restaurantIsOpen === true
                ? `Restaurant: OPEN`
                : "Restaurant: CLOSE"}
            </Text>
          </TouchableOpacity>

          <TextInput
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>Name
              </Text>
            }
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={newstyles.input}
          />

          <Text style={newstyles.labelText}>
            <Text style={{ color: "red" }}>*</Text>
            Select Restaurant Type
          </Text>
          <TouchableOpacity
            style={[
              newstyles.selectModalPicker, // Apply this style only when isEditable is true
            ]}
            onPress={() => {
              fetchRestaurantTypes();
              setRestaurantTypeModalVisible(true);
            }}
          >
            <Text
              style={{
                color: "rgb(0,0,0)",
              }}
            >
              {restaurantType
                ? `Selected: ${restaurantType}`
                : "Select Restaurant Type"}
            </Text>
          </TouchableOpacity>

          <TextInput
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>FSSAI Number
              </Text>
            }
            value={fssaiNumber}
            onChangeText={(text) => {
              // Allow only numeric input and limit to 15 characters
              if (/^\d{0,14}$/.test(text)) {
                setFssaiNumber(text);
              }
            }}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>GST Number
              </Text>
            }
            value={gstNumber}
            onChangeText={(text) => {
              // Convert input to uppercase and check if it contains only alphanumeric characters with a max length of 12
              const upperCaseText = text.toUpperCase();
              if (/^[A-Z0-9]{0,15}$/.test(upperCaseText)) {
                setGstNumber(upperCaseText);
              }
            }}
            mode="outlined"
            style={newstyles.input}
          />

          <View style={styles.inputContainer}>
            <TextInput
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text>Mboile Number
                </Text>
              }
              value={mobile}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9]/g, "");
                setMobile(numericValue);
                validateMobile(numericValue);
              }}
              mode="outlined"
              style={[styles.input, { marginBottom: mobileError ? 4 : 16 }]}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {mobileError ? (
              <Text style={styles.errorText}>{mobileError}</Text>
            ) : null}
          </View>

          <Text style={newstyles.labelText}>
            <Text style={{ color: "red" }}>*</Text>
            Select Veg/Non-Veg
          </Text>
          <TouchableOpacity
            style={[
              newstyles.selectModalPicker, // Apply this style only when isEditable is true
            ]}
            onPress={() => {
              fetchVegNonvegList();
              setVegModalVisible(true);
            }}
          >
            <Text
              style={{
                color: "rgb(0,0,0)",
              }}
            >
              {vegNonveg ? `Selected: ${vegNonveg}` : "Select Veg/Non-Veg"}
            </Text>
          </TouchableOpacity>

          <TextInput
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>UPI ID
              </Text>
            }
            value={upiId}
            onChangeText={setUpiId}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            label={<Text style={styles.label}>Website</Text>}
            value={website}
            onChangeText={setWebsite}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            label={<Text style={styles.label}>Whatsapp</Text>}
            value={whatsapp}
            onChangeText={setWhatsapp}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            label={<Text style={styles.label}>Facebook</Text>}
            value={facebook}
            onChangeText={setFacebook}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            label={<Text style={styles.label}>Instagram</Text>}
            value={instagram}
            onChangeText={setInstagram}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            label={<Text style={styles.label}>Google Business Link</Text>}
            value={google_business_link}
            onChangeText={setGoogleBusinessLink}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            label={<Text style={styles.label}>Google Review</Text>}
            value={google_review}
            onChangeText={setGoogleReview}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            keyboardType={"numeric"}
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>Service Charges
              </Text>
            }
            value={serviceCharges}
            onChangeText={(text) => {
              // Allow only numeric input
              const numericValue = text.replace(/[^0-9]/g, "");
              setServiceCharges(numericValue);
            }}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            keyboardType={"numeric"}
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>GST
              </Text>
            }
            value={gst}
            onChangeText={(text) => {
              // Allow only numeric input
              const numericValue = text.replace(/[^0-9]/g, "");
              setGst(numericValue);
            }}
            mode="outlined"
            style={newstyles.input}
          />

          <TextInput
            label={
              <Text style={styles.label}>
                <Text style={styles.required}>*</Text>Address
              </Text>
            }
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            style={newstyles.input}
          />
          <Button
            mode="contained"
            onPress={handleAddNewRestaurantProfile}
            loading={btnLoading}
            disabled={btnLoading}
            style={[newstyles.submitButton, { marginBottom: 80 }]}
            icon={() => (
              <RemixIcon
                name="ri-checkbox-circle-line"
                size={20}
                color="#fff"
              />
            )}
          >
            Save changes
          </Button>
          {/* Footer */}
          {/* <View style={newstyles.footerTextContainer}>
              <Text style={newstyles.footerText}>Shekru Labs Pvt Ltd</Text>
              <Text style={newstyles.footerText}>v1.0</Text>
            </View> */}

          {/* Modal for veg/non-veg selection */}
          <Modal
            transparent={true}
            animationType="slide"
            visible={vegModalVisible}
            onRequestClose={() => setVegModalVisible(false)}
          >
            <View style={newstyles.selectModalContainer}>
              <View style={newstyles.selectModalContent}>
                {/* Modal Header with Title and Close Button */}
                <View style={newstyles.selectModalHeader}>
                  <Text style={newstyles.selectModalTitle}>
                    Select Veg/Non-Veg
                  </Text>
                  <TouchableOpacity onPress={() => setVegModalVisible(false)}>
                    <Icon name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={vegNonvegList}
                  keyExtractor={(item) => item.key.toString()}
                  renderItem={({ item }) => (
                    <TouchableWithoutFeedback
                      onPress={() => {
                        setVegNonveg(item.name);

                        setVegModalVisible(false);
                      }}
                    >
                      <View style={newstyles.selectModalItem}>
                        <Text>{item.name}</Text>
                      </View>
                    </TouchableWithoutFeedback>
                  )}
                />
              </View>
            </View>
          </Modal>
          <Modal
            transparent={true}
            animationType="slide"
            visible={restaurantTypeModalVisible}
            onRequestClose={() => setRestaurantTypeModalVisible(false)}
          >
            <View style={newstyles.selectModalContainer}>
              <View style={newstyles.selectModalContent}>
                {/* Modal Header with Title and Close Button */}
                <View style={newstyles.selectModalHeader}>
                  <Text style={newstyles.selectModalTitle}>
                    Select Restaurant Type
                  </Text>
                  <TouchableOpacity
                    onPress={() => setRestaurantTypeModalVisible(false)}
                  >
                    <Icon name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={restaurantTypeList}
                  keyExtractor={(item) => item.key.toString()}
                  renderItem={({ item }) => (
                    <TouchableWithoutFeedback
                      onPress={() => {
                        setRestaurantType(item.name);
                        setRestaurantTypeModalVisible(false);
                      }}
                    >
                      <View style={newstyles.selectModalItem}>
                        <Text>{item.name}</Text>
                      </View>
                    </TouchableWithoutFeedback>
                  )}
                />
              </View>
            </View>
          </Modal>
          <Modal
            transparent={true}
            visible={restaurantIsOpenModalVisible}
            animationType="slide"
            onRequestClose={() => setRestaurantIsOpenModalVisible(false)}
          >
            <View style={newstyles.selectModalContainer}>
              <View style={newstyles.selectModalContent}>
                <View style={newstyles.selectModalHeader}>
                  <Text style={newstyles.selectModalTitle}>
                    Select Quantity Type
                  </Text>
                  <TouchableOpacity
                    onPress={() => setRestaurantIsOpenModalVisible(false)}
                  >
                    <Icon name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>

                <TouchableWithoutFeedback
                  onPress={() => {
                    setRestaurantIsOpen(true);
                    setRestaurantIsOpenModalVisible(false);
                  }}
                >
                  <View style={newstyles.selectModalItem}>
                    <Text>OPEN</Text>
                  </View>
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback
                  onPress={() => {
                    setRestaurantIsOpen(false);
                    setRestaurantIsOpenModalVisible(false);
                  }}
                >
                  <View style={newstyles.selectModalItem}>
                    <Text>CLOSE</Text>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 8,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "red",
  },
  editableStyle: {
    color: "rgb(94,255,85)",
    // Styles to apply only when isEditable is true
    height: 45,
    backgroundColor: "rgb(255,255,255)",
    width: "100%",
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "rgba(183,183,183,0.51)",
    borderRadius: 3,
  },
  editIcon: {
    position: "absolute",
    bottom: -5, // Adjust to move below the image
    right: 0, // Adjust to move to the right of the image
  },
  required: {
    color: "red",
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  labelSpacing: {
    marginLeft: 2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 16,
    marginLeft: 4,
  },
});

export default AddNewRestaurant;
