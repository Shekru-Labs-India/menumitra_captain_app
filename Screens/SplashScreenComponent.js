import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  Linking,
  BackHandler,
  Modal,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import * as Updates from 'expo-updates';

const { width, height } = Dimensions.get("window");
const CURRENT_APP_VERSION = "1.3";

// Immediately hide the splash screen
SplashScreen.preventAutoHideAsync()
  .then(() => {
    SplashScreen.hideAsync();
  })
  .catch(console.warn);

const SplashScreenComponent = ({ navigation }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      // First check for Expo OTA updates
      await checkExpoUpdates();
      
      // Then proceed with normal app flow
      if (!isUpdating) {
        await checkInitialRoute();
      }
    };
    
    initializeApp();
  }, []);

  const checkExpoUpdates = async () => {
    if (!__DEV__) {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setIsUpdating(true);
          setUpdateProgress('A new update is available. Updating automatically...');
          
          try {
            await Updates.fetchUpdateAsync();
            setUpdateProgress('Installing update...');
            // Small delay to show the "Installing" message
            await new Promise(resolve => setTimeout(resolve, 1000));
            await Updates.reloadAsync();
          } catch (error) {
            console.error("Error updating app:", error);
            setIsUpdating(false);
            // Continue with normal app flow if update fails
            checkInitialRoute();
          }
        }
      } catch (error) {
        console.error("Error checking Expo updates:", error);
        setIsUpdating(false);
      }
    }
  };

  const checkInitialRoute = async () => {
    try {
      // First try to get the new structured user data
      const userData = await AsyncStorage.getItem("user_data");
      
      // If new format exists, use it
      if (userData) {
        console.log("Found user data in new format");
        navigation.reset({
          index: 0,
          routes: [{ name: "RestaurantTables" }],
        });
        return;
      }

      // Fallback: Check for legacy owner_data
      const ownerData = await AsyncStorage.getItem("owner_data");
      if (ownerData) {
        console.log("Found legacy owner data format");
        
        // Migrate old data to new format for future use
        try {
          const parsedOwnerData = JSON.parse(ownerData);
          const userIdentification = {
            primary_id: parsedOwnerData.user_id || parsedOwnerData.owner_id,
            user_id: parsedOwnerData.user_id,
            role: "captain",
            mobile: parsedOwnerData.mobile,
            captain_details: {
              captain_id: parsedOwnerData.captain_id,
              captain_name: parsedOwnerData.captain_name || ""
            },
            created_at: new Date().toISOString()
          };
          
          // Store the migrated data in new format
          await AsyncStorage.setItem("user_data", JSON.stringify(userIdentification));
          console.log("Successfully migrated legacy data to new format");
        } catch (migrationError) {
          console.warn("Error migrating legacy data:", migrationError);
          // Even if migration fails, we can still proceed with navigation
        }

        navigation.reset({
          index: 0,
          routes: [{ name: "RestaurantTables" }],
        });
        return;
      }

      // If no auth data found in either format, go to login
      console.log("No authentication data found, redirecting to login");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });

    } catch (error) {
      console.error("Error checking authentication state:", error);
      // On critical error, redirect to login for safety
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  };

  // Update Loading Overlay component
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
            {/* <View style={styles.dot} />
            <View style={styles.dot} /> */}
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.centerContainer}>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
      </View>

      <View style={styles.footerContainer}>
        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() =>
              Linking.openURL(
                "https://www.facebook.com/people/Menu-Mitra/61565082412478/"
              )
            }
          >
            <MaterialCommunityIcons name="facebook" size={28} color="#1877F2" />
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
            <MaterialCommunityIcons name="youtube" size={28} color="#FF0000" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => Linking.openURL("https://x.com/MenuMitra")}
          >
            <MaterialCommunityIcons name="twitter" size={28} color="#000000" />
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
            <Text style={styles.companyText}>Shekru Labs India Pvt. Ltd.</Text>
          </TouchableOpacity>
          <View style={styles.versionContainer}>
            <Text style={styles.versionLabel}>version {CURRENT_APP_VERSION}</Text>
          </View>
        </View>
      </View>
      
      {/* Render update loading overlay */}
      <UpdateLoadingOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    width: width,
    height: height,
    justifyContent: "space-between",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
  },
  footerContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
    marginBottom: 15,
  },
  socialIcon: {
    padding: 4,
    marginHorizontal: 8,
  },
  footerTextContainer: {
    alignItems: 'center',
    paddingBottom: 20,
    width: '100%',
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
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    paddingHorizontal: 15,
  },
  versionLabel: {
    fontSize: 12,
    color: "#666666",
    marginRight: 4,
  },
  versionNumber: {
    fontSize: 12,
    color: "#666666",
    fontWeight: '500',
  },
  // Adding only Modal styles needed for update overlay
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
});

export default SplashScreenComponent;
