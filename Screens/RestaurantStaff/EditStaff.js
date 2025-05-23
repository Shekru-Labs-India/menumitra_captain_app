import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePickerAndroid from "@react-native-community/datetimepicker";
import newstyles from "../newstyles";
import { getRestaurantId } from "../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomHeader from "../../components/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const EditStaff = ({ route, navigation }) => {
  const { staffData, staffId, restaurantId } = route.params;
  console.log("Staff Data being passed:", JSON.stringify(staffData, null, 2));

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(staffData?.name || "");
  const [role, setRole] = useState(staffData?.role || "");
  const [mobileNumber, setMobileNumber] = useState(
    staffData?.mobile?.toString() || ""
  );
  const [dob, setDob] = useState(staffData?.dob || ""); // Set DOB directly without formatting
  const [aadhar, setAadhar] = useState(
    staffData?.aadhar_number?.toString() || ""
  );
  const [address, setAddress] = useState(staffData?.address || "");
  const [profileImage, setProfileImage] = useState(staffData?.photo || null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    const fetchStaffDetails = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("access_token");
        const response = await axiosInstance.post(
          onGetProductionUrl() + "staff_view",
          {
            outlet_id: restaurantId,
            staff_id: staffId,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.data.st === 1) {
          const fetchedStaffData = response.data.data;
          console.log("Fetched staff data:", fetchedStaffData);

          setName(fetchedStaffData.name);
          setRole(fetchedStaffData.role);
          setMobileNumber(fetchedStaffData.mobile.toString());
          setAadhar(fetchedStaffData.aadhar_number.toString());
          setAddress(fetchedStaffData.address);
          setProfileImage(fetchedStaffData.photo);
          setDob(fetchedStaffData.dob);
        }
      } catch (error) {
        console.error("Error in fetchStaffDetails:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRoles = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("access_token");

        const response = await axiosInstance.get(
          onGetProductionUrl() + "get_staff_role",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Role list response:", response.data); // Debug log

        if (response.data.st === 1) {
          const roleList = response.data.role_list;
          const formattedRoles = Object.entries(roleList).map(
            ([key, value]) => ({
              label: value.charAt(0).toUpperCase() + value.slice(1),
              value: value.toLowerCase(),
            })
          );

          console.log("Formatted roles:", formattedRoles); // Debug log
          setRoles(formattedRoles);
        } else {
          console.error("Failed to fetch roles:", response.data);
        }
      } catch (error) {
        console.error("Error fetching roles:", error.response?.data || error);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchStaffDetails();
    fetchRoles();
  }, [staffId, restaurantId]);

  const pickImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const fileReader = new FileReader();
          fileReader.onload = () => {
            setProfileImage(fileReader.result);
          };
          fileReader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      let result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!result.granted) {
        alert("Permission to access gallery is required!");
        return;
      }
      let pickedImage = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!pickedImage.canceled) {
        setProfileImage(pickedImage.assets[0].uri);
      }
    }
  };

  const handleSaveStaff = async () => {
    if (!name || !role || !mobileNumber || !aadhar || !address || !dob) {
      Alert.alert("Error", "Please fill out all fields with valid values.");
      return;
    }

    setLoading(true);
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      console.log("Sending DOB to API:", dob);

      const formData = new FormData();
      formData.append("staff_id", staffId);
      formData.append("name", name);
      formData.append("mobile", mobileNumber);
      formData.append("dob", dob);
      formData.append("address", address);
      formData.append("role", role);
      formData.append("aadhar_number", aadhar);
      formData.append("outlet_id", restaurantId);

      if (profileImage === null) {
        formData.append("remove_photo", "1");
      } else if (profileImage) {
        formData.append("photo", {
          uri: profileImage,
          type: "image/jpeg",
          name: "profile.jpg",
        });
      }

      const response = await axiosInstance.post(
        onGetProductionUrl() + "staff_update",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Staff updated successfully.");
        navigation.goBack();
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update staff.");
      }
    } catch (error) {
      console.error("Staff update error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading || rolesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  const handleDobChange = (event, selectedDate) => {
    if (event.type === "set") {
      const currentDate = selectedDate || dob;
      setDob(currentDate);
      setShowDatePicker(false);
    } else {
      setShowDatePicker(false);
    }
  };

  const handleDeleteStaff = async () => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this staff member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            setLoading(true);
            try {
              const [restaurantId, accessToken] = await Promise.all([
                getRestaurantId(),
                AsyncStorage.getItem("access_token"),
              ]);

              const response = await axiosInstance.post(
                onGetProductionUrl() + "staff_delete",
                {
                  outlet_id: restaurantId,
                  staff_id: staffId,
                },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );

              if (response.data.st === 1) {
                Alert.alert("Success", "Staff deleted successfully.");
                navigation.goBack();
              } else {
                Alert.alert(
                  "Error",
                  "Failed to delete staff. Please try again."
                );
              }
            } catch (error) {
              Alert.alert("Error", "Something went wrong. Please try again.");
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const day = String(selected.getDate()).padStart(2, "0");
      const month = months[selected.getMonth()];
      const year = selected.getFullYear();

      const formattedDate = `${day} ${month} ${year}`;
      console.log("New formatted date:", formattedDate);

      setSelectedDate(selected);
      setDob(formattedDate);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor="#fff"
        barStyle="dark-content"
        translucent={true}
      />
      <CustomHeader title="Edit Staff" showBackButton={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <View style={styles.imageContainer}>
            <TouchableOpacity
              onPress={pickImage}
              style={newstyles.imagePickerContainer}
            >
              <Image
                source={
                  profileImage
                    ? { uri: profileImage }
                    : require("../../assets/icons/person.png")
                }
                style={newstyles.profileImage}
              />
              <RemixIcon
                name="ri-edit-line"
                size={20}
                color="#000"
                style={styles.editIcon}
              />
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  Alert.alert(
                    "Remove Image",
                    "Are you sure you want to remove the profile image?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        onPress: () => setProfileImage(null),
                        style: "destructive",
                      },
                    ]
                  );
                }}
              >
                <RemixIcon
                  name="ri-close-circle-fill"
                  size={24}
                  color="#FF0000"
                />
              </TouchableOpacity>
            )}
          </View>
          <Text style={newstyles.labelText}>
            <Text style={{ color: "red" }}>*</Text>Na{" "}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={newstyles.input}
          />
          <Text style={[newstyles.labelText, { marginTop: 3 }]}>
            <Text style={{ color: "red" }}>*</Text>
            Select Role
          </Text>
          <Pressable onPress={() => setShowRoleModal(true)}>
            <TextInput
              mode="outlined"
              style={[newstyles.input, { height: 45 }]}
              value={role || ""}
              placeholder="Select Role"
              editable={false}
              right={<TextInput.Icon icon="chevron-down" />}
            />
          </Pressable>

          <Modal
            transparent={true}
            visible={showRoleModal}
            animationType="fade"
            onRequestClose={() => setShowRoleModal(false)}
          >
            <TouchableOpacity
              style={styles.modalContainer}
              activeOpacity={1}
              onPress={() => setShowRoleModal(false)}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Role</Text>
                  <TouchableOpacity
                    onPress={() => setShowRoleModal(false)}
                    style={styles.closeButton}
                  >
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  {roles.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.modalItem}
                      onPress={() => {
                        setRole(item.value);
                        setShowRoleModal(false);
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          <Text style={newstyles.labelText}>
            <Text style={{ color: "red" }}>*</Text>
            Date of Birth
          </Text>
          <TextInput
            placeholder="DD Mon YYYY"
            value={dob}
            mode="outlined"
            style={newstyles.input}
            editable={false}
            right={
              <TextInput.Icon
                icon="calendar"
                onPress={() => {
                  console.log("Opening date picker with date:", selectedDate);
                  setShowDatePicker(true);
                }}
              />
            }
          />

          {showDatePicker && (
            <DateTimePickerAndroid
              testID="dateTimePicker"
              value={selectedDate || new Date()}
              mode="date"
              display="calendar"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
          <Text style={newstyles.labelText}>
            <Text style={{ color: "red" }}>*</Text>
            Mobile Number
          </Text>
          <TextInput
            placeholder="Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
            maxLength={10}
            mode="outlined"
            style={newstyles.input}
          />
          <Text style={newstyles.labelText}>
            <Text style={{ color: "red" }}>*</Text>
            Aadhar Number
          </Text>
          <TextInput
            placeholder="Aadhar Number"
            value={aadhar}
            onChangeText={setAadhar}
            keyboardType="number-pad"
            maxLength={12}
            mode="outlined"
            style={newstyles.input}
          />
          <Text style={newstyles.labelText}>
            <Text style={{ color: "red" }}>*</Text>
            Address
          </Text>
          <TextInput
            placeholder="Address"
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={newstyles.textArea}
          />

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Button
              mode="contained"
              onPress={handleDeleteStaff}
              style={[newstyles.submitButton, styles.deleteButton, { flex: 1 }]}
              icon={() => (
                <RemixIcon name="ri-delete-bin-line" size={20} color="#fff" />
              )}
            >
              Delete
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveStaff}
              style={[newstyles.submitButton, { flex: 1, marginLeft: 10 }]}
              icon={() => (
                <RemixIcon
                  name="ri-checkbox-circle-line"
                  size={20}
                  color="#fff"
                />
              )}
            >
              Save
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: "bold",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    zIndex: 1,
  },

  button: {
    marginTop: 16,
    width: width - 32,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "red",
  },
  editIcon: {
    position: "absolute",
    bottom: -5,
    right: 0,
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
  imageContainer: {
    position: "relative",
    alignItems: "center",
    marginBottom: 20,
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default EditStaff;
