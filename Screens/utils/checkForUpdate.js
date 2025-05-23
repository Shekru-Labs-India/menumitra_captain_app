// CheckUpdate.js
import React, { useEffect, useState } from "react";
import { Alert, Platform, View, Text, Modal, StyleSheet } from "react-native";
import * as Updates from "expo-updates"; // Expo Updates API
import * as Linking from "expo-linking";
import WebService from "./WebService"; // Expo Linking API
import { ProgressBar, Button } from "react-native-paper";

const CheckUpdate = () => {
  const [updateProgress, setUpdateProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateComplete, setUpdateComplete] = useState(false);

  // Function to simulate progress during update
  const simulateProgress = () => {
    setUpdateProgress(0);
    const interval = setInterval(() => {
      setUpdateProgress((prev) => {
        if (prev >= 0.9) {
          clearInterval(interval);
          return 0.9;
        }
        return prev + 0.1;
      });
    }, 500);
    return interval;
  };

  // Function to check for available OTA updates from Expo
  const checkForUpdate = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        Alert.alert(
          "Update Available",
          "A new version of the app is available. Please update to the latest version.",
          [
            {
              text: "Later",
              onPress: () => console.log("Update Cancelled"),
              style: "cancel",
            },
            {
              text: "Update",
              onPress: async () => {
                try {
                  setIsUpdating(true);
                  const interval = simulateProgress();

                  // Fetch the actual update
                  await Updates.fetchUpdateAsync();

                  // Clear interval and show completion
                  clearInterval(interval);
                  setUpdateProgress(1);
                  setUpdateComplete(true);
                } catch (error) {
                  setIsUpdating(false);
                  Alert.alert("Error", "Failed to download update");
                  console.error("Error downloading update:", error);
                }
              },
            },
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.error("Error checking for update:", error);
    }
  };

  // Function to handle restart after update
  const handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error("Error restarting app:", error);
      Alert.alert("Error", "Failed to restart app");
    }
  };

  // Function to check the app store for updates (Play Store for Android, App Store for iOS)
  const checkStoreForUpdate = () => {
    const storeLink =
      Platform.OS === "ios"
        ? "itms-apps://itunes.apple.com/app/idid310633997"
        : "market://details?id=" + WebService.ANDROID_APP_ID;

    Alert.alert(
      "Update Available",
      "A new version of the app is available. Please update to the latest version.",
      [
        {
          text: "Later",
          style: "cancel",
        },
        {
          text: "Update",
          onPress: () => Linking.openURL(storeLink),
        },
      ]
    );
  };

  // Trigger update checks when the component mounts
  useEffect(() => {
    // First, check for OTA updates from Expo
    checkForUpdate();

    // Optionally, you can also check for app store updates here
    checkStoreForUpdate();
  }, []);

  return (
    <Modal visible={isUpdating} transparent animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.updateCard}>
          <Text style={styles.updateText}>
            {updateComplete ? "Update Complete!" : "Downloading Update..."}
          </Text>
          <ProgressBar
            progress={updateProgress}
            color="#2196F3"
            style={styles.progressBar}
          />
          {updateComplete && (
            <Button
              mode="contained"
              onPress={handleRestart}
              style={styles.restartButton}
            >
              Restart to Apply Updates
            </Button>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  updateCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  updateText: {
    fontSize: 16,
    marginBottom: 15,
    fontWeight: "bold",
  },
  progressBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
  },
  restartButton: {
    marginTop: 20,
    width: "100%",
  },
});

export default CheckUpdate;
