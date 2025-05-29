import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Modal,
  BackHandler,
  Linking,
  TouchableOpacity,
} from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "./utils/ConstantFunctions";
import * as Updates from 'expo-updates';
import axiosInstance from "../utils/axiosConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const CURRENT_APP_VERSION = "1.3";

const STORAGE_KEYS = {
  UPDATE_NEEDED: 'update_needed',
  UPDATE_TYPE: 'update_type'
};

export default function LoginScreen({ navigation }) {
  const isWeb = Platform.OS === "web";
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateType, setUpdateType] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState('');
  const [availableVersion, setAvailableVersion] = useState(null);

  useEffect(() => {
    checkPendingUpdates();
  }, []);

  const setUpdateStatus = async (type) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UPDATE_NEEDED, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.UPDATE_TYPE, type);
      if (availableVersion) {
        await AsyncStorage.setItem('server_version', availableVersion);
      }
    } catch (error) {
      console.error('Error saving update status:', error);
    }
  };

  const clearUpdateStatus = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.UPDATE_NEEDED);
      await AsyncStorage.removeItem(STORAGE_KEYS.UPDATE_TYPE);
      await AsyncStorage.removeItem('server_version');
    } catch (error) {
      console.error('Error clearing update status:', error);
    }
  };

  const checkPendingUpdates = async () => {
    try {
      const updateNeeded = await AsyncStorage.getItem(STORAGE_KEYS.UPDATE_NEEDED);
      if (updateNeeded === 'true') {
        const type = await AsyncStorage.getItem(STORAGE_KEYS.UPDATE_TYPE);
        const serverVersion = await AsyncStorage.getItem('server_version');
        
        // Only show modal if we have both type and server version
        if (type && serverVersion) {
          // Double check version comparison
          const serverVersionNum = parseFloat(serverVersion);
          const currentVersionNum = parseFloat(CURRENT_APP_VERSION);
          
          if (serverVersionNum > currentVersionNum) {
            setAvailableVersion(serverVersion);
            setUpdateType(type);
            setShowUpdateModal(true);
          } else {
            // If versions now match, clear the update status
            await clearUpdateStatus();
            setShowUpdateModal(false);
          }
        } else {
          // If we don't have complete information, clear the status
          await clearUpdateStatus();
          await checkAppVersion();
        }
      } else {
        await checkAppVersion();
      }
    } catch (error) {
      console.error('Error checking pending updates:', error);
      await checkAppVersion();
    }
  };

  const checkAppVersion = async () => {
    try {
      const response = await axiosInstance.post(
        onGetProductionUrl() + "check_version",
        {
          app_type: "captain_app"
        }
      );

      if (response?.data?.st === 1 && response?.data?.version) {
        const serverVersion = response.data.version;
        console.log('Server Version:', serverVersion);
        console.log('Current Version:', CURRENT_APP_VERSION);

        const serverVersionNum = parseFloat(serverVersion);
        const currentVersionNum = parseFloat(CURRENT_APP_VERSION);

        if (serverVersionNum > currentVersionNum) {
          setAvailableVersion(serverVersion);
          await setUpdateStatus('store');
          setUpdateType('store');
          setShowUpdateModal(true);
        } else {
          // Clear any existing update status if versions are equal or current is higher
          await clearUpdateStatus();
          setShowUpdateModal(false);
          checkExpoUpdates();
        }
      } else {
        console.log('Invalid response format:', response?.data);
        checkExpoUpdates();
      }
    } catch (error) {
      console.error("Version check error:", error);
      checkExpoUpdates();
    }
  };

  const checkExpoUpdates = async () => {
    if (!__DEV__) {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setIsUpdating(true);
          setUpdateProgress('A minor update is available. Updating automatically...');
          
          try {
            await Updates.fetchUpdateAsync();
            setUpdateProgress('Installing update...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await Updates.reloadAsync();
          } catch (error) {
            console.error("Error updating app:", error);
            setIsUpdating(false);
          }
        }
      } catch (error) {
        console.error("Error checking Expo updates:", error);
        setIsUpdating(false);
      }
    }
  };

  const handleMobileNumberChange = (text) => {
    const filteredText = text.replace(/[^0-9]/g, "");
    if (filteredText.length === 1 && parseInt(filteredText, 10) < 6) {
      // Prevent starting digit less than 6
      return;
    }
    setMobileNumber(filteredText);

    // Clear the error when the user starts typing
    if (mobileError) {
      setMobileError("");
    }
  };

  const handlePress = () => {
    if (Platform.OS === "web") return;
    Keyboard.dismiss();
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

    const firstDigit = parseInt(number.charAt(0), 10);
    if (firstDigit < 6 || firstDigit > 9) {
      setMobileError("Mobile number should start with 6, 7, 8, or 9");
      return false;
    }

    setMobileError("");
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateMobile(mobileNumber)) {
      return;
    }

    setLoading(true);
    console.log("Sending OTP request for mobile:", mobileNumber);

    try {
      const response = await fetch(onGetProductionUrl() + "user_login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: mobileNumber,
          // Don't send role in the request, let server determine it
        }),
      });

      const json = await response.json();
      console.log("Login API Response:", json);

      if (json.st === 1) {
        // Check if the returned role is "owner" before navigating
        if (json.role === "captain") {
          // Only navigate to OTP screen if the user is an owner
          navigation.navigate("VerifyOTP", {
            mobile: mobileNumber,
          });
          console.log("Navigated to VerifyOTP with mobile:", mobileNumber);
        } else {
          // Show error if user is not an owner
          setMobileError("This mobile number is not registered as an captain. Please contact support.");
        }
      } else {
        console.log("API Error:", json.msg);
        setMobileError(json.msg || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Login API Error:", error);
      setMobileError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const StoreUpdateModal = ({ visible }) => {
    if (!visible || !availableVersion) return null;
    
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => BackHandler.exitApp()}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <RemixIcon name="refresh-line" size={50} color="#FF9A6C" />
              <Text style={styles.modalTitle}>Update Required</Text>
            </View>

            <View style={styles.versionInfoContainer}>
              <View style={styles.versionRow}>
                <View style={styles.versionLabelContainer}>
                  <RemixIcon name="smartphone-line" size={20} color="#666" />
                  <Text style={styles.versionLabel}>Current Version</Text>
                </View>
                <Text style={styles.versionNumber}>{CURRENT_APP_VERSION}</Text>
              </View>
              
              <View style={styles.versionDivider} />
              
              <View style={styles.versionRow}>
                <View style={styles.versionLabelContainer}>
                  <RemixIcon name="arrow-up-circle-line" size={20} color="#FF9A6C" />
                  <Text style={styles.versionLabel}>Available Version</Text>
                </View>
                <Text style={[styles.versionNumber, { color: '#FF9A6C' }]}>{availableVersion}</Text>
              </View>
            </View>

            <Text style={styles.modalText}>
              A new version is available in the store. You must update the app to continue using it.
            </Text>

            <View style={styles.supportContainer}>
              <Text style={styles.supportText}>Need help? Contact support:</Text>
              <TouchableOpacity 
                style={styles.supportLink}
                onPress={() => Linking.openURL('tel:9527279639')}
              >
                <RemixIcon name="phone-line" size={16} color="#666" />
                <Text style={styles.supportLinkText}>+91 9527279639</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.supportLink}
                onPress={() => Linking.openURL('mailto:menumitra.info@gmail.com')}
              >
                <RemixIcon name="mail-line" size={16} color="#666" />
                <Text style={styles.supportLinkText}>menumitra.info@gmail.com</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.updateButtonsContainer}>
              <TouchableOpacity 
                style={styles.updateButton}
                onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.menumitra.ownerapp')}
              >
                <RemixIcon name="google-play-line" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.updateButtonText}>Update Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.updateButton, styles.exitButton]}
                onPress={() => BackHandler.exitApp()}
              >
                <RemixIcon name="close-circle-line" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.updateButtonText}>Exit App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const UpdateLoadingOverlay = () => (
    <Modal
      visible={isUpdating}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color="#FF9A6C" />
          </View>
          <Text style={styles.loadingTitle}>Updating App</Text>
          <Text style={styles.loadingText}>{updateProgress}</Text>
          <View style={styles.progressDots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.inner}>
          <Image
            source={require("../assets/icon.png")}
            style={isWeb ? styles.logoWeb : styles.logo}
          />
          <Text style={styles.appName}>Captain App</Text>
          <Text style={styles.loginText}>Login</Text>
          <Text style={styles.instructions}>
            Enter your mobile number to receive OTP
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              maxLength={10}
              value={mobileNumber}
              onChangeText={handleMobileNumberChange}
              label={
                <Text style={styles.label}>
                  <Text style={styles.required}>*</Text> Mobile Number
                </Text>
              }
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              theme={{
                colors: {
                  primary: mobileError ? "red" : "#6200ee",
                  outline: mobileError ? "red" : "#ccc",
                },
              }}
              left={
                <TextInput.Icon
                  icon={() => (
                    <RemixIcon
                      name="ri-smartphone-line"
                      size={25}
                      color="black"
                    />
                  )}
                />
              }
            />

            {mobileError ? (
              <Text style={styles.errorText}>{mobileError}</Text>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6200ee" />
          ) : (
            <Button
              mode="contained"
              onPress={handleSendOTP}
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    mobileNumber.length === 10 ? "#0dcaf0" : "#cccccc",
                },
              ]}
              disabled={mobileNumber.length !== 10}
              icon={() => (
                <RemixIcon
                  name="ri-checkbox-circle-line"
                  size={20}
                  color={mobileNumber.length === 10 ? "#fff" : "#666666"}
                />
              )}
              labelStyle={{
                color: mobileNumber.length === 10 ? "#fff" : "#666666",
              }}
            >
              Send OTP
            </Button>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <View style={styles.logoRow}>
          <Image
            source={require("../assets/MenuMitraLOGO.png")}
            style={styles.footerLogo}
          />
          <Text style={styles.footerTitle}>MenuMitra</Text>
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() =>
              Linking.openURL(
                "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
              )
            }
          >
            <MaterialCommunityIcons
              name="facebook"
              size={28}
              color="#1877F2"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() =>
              Linking.openURL("https://www.instagram.com/menumitra/")
            }
          >
            <MaterialCommunityIcons
              name="instagram"
              size={28}
              color="#E4405F"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() =>
              Linking.openURL("https://www.youtube.com/@menumitra")
            }
          >
            <MaterialCommunityIcons
              name="youtube"
              size={28}
              color="#FF0000"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => Linking.openURL("https://x.com/MenuMitra")}
          >
            <MaterialCommunityIcons
              name="twitter"
              size={28}
              color="#000000"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.footerTextContainer}>
          <View style={styles.poweredByContainer}>
            <MaterialCommunityIcons name="flash" size={14} color="#666" />
            <Text style={styles.poweredByText}>Powered by</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://www.shekruweb.com")}
          >
            <Text style={styles.companyText}>
              Shekru Labs India Pvt. Ltd.
            </Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>version 1.3</Text>
        </View>
      </View>

      <StoreUpdateModal visible={showUpdateModal && updateType === 'store'} />
      <UpdateLoadingOverlay />
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 32,
    resizeMode: "contain",
  },
  logoWeb: {
    width: 100,
    height: 100,
    marginBottom: 32,
    resizeMode: "contain",
  },
  loginText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  instructions: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    marginHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 16,
    width: "80%",
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 16,
  },

  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  submitButton: {
    width: "80%",
    marginTop: 16,
    backgroundColor: "#0dcaf0",
    opacity: 1,
  },
  label: {
    fontSize: 14,
    color: "#333",
  },
  required: {
    color: "red",
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  versionInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    width: '100%',
    padding: 20,
    marginBottom: 20,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  versionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionLabel: {
    fontSize: 16,
    color: '#666',
  },
  versionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  versionDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    width: '100%',
    marginVertical: 8,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 22,
  },
  updateButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  updateButton: {
    backgroundColor: '#FF9A6C',
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exitButton: {
    backgroundColor: '#dc3545',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    elevation: 5,
  },
  loaderWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 154, 108, 0.1)',
    borderRadius: 30,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#FF9A6C',
    width: 16,
    height: 8,
    borderRadius: 4,
  },
  supportContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    width: '100%',
  },
  supportLinkText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  footerContainer: {
    alignItems: "center",
    paddingVertical: 20,
    // backgroundColor: "#f5f5f5",
    borderTopColor: "#e0e0e0",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    marginTop: 20,
    width: '100%',
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  footerLogo: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    marginBottom: 5,
  },
  socialIcon: {
    padding: 4,
    marginHorizontal: 8,
  },
  footerTextContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  poweredByContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  poweredByText: {
    fontSize: 12,
    color: "#666666",
  },
  companyText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    textAlign: "center",
  },
  versionText: {
    fontSize: 10,
    color: "#666666",
    marginTop: 4,
    textAlign: "center",
    paddingBottom: 4,
  },
});
