import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import newstyles from "../newstyles";
import RemixIcon from "react-native-remix-icon";
import { Button } from "react-native-paper";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { getRestaurantId } from "../utils/getOwnerData";
import { useNavigation } from "@react-navigation/native";
import axiosInstance from "../../utils/axiosConfig";

const ViewRestaurantTable = ({ route }) => {
  const { table_id } = route.params; // Get table_id from the previous screen
  const [tableDetails, setTableDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation(); // Initialize navigation

  // Function to fetch table details from API
  const fetchTableDetails = async () => {
    try {
      let restaurantId = await getRestaurantId();
      setLoading(true);
      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_view",
        {
          restaurant_id: restaurantId,
          table_id: table_id,
        }
      );
      if (response.data.st === 1) {
        console.log(JSON.stringify(response.data.data));
        setTableDetails(response.data.data); // Set table details
      } else {
        alert("Failed to fetch table details");
      }
    } catch (error) {
      console.error("Error fetching table details:", error);
      alert("Error fetching table details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableDetails();
  }, []);

  // Function to download QR code image
  const downloadQR = async () => {
    try {
      // Request storage permissions for Android 11 and above
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "You need to enable media permissions to download the QR code."
        );
        return;
      }

      const uri = tableDetails.qr_code_url;
      const fileUri = `${
        FileSystem.documentDirectory
      }QR_Code_${Date.now()}.png`;

      // Download the file using FileSystem.downloadAsync()
      const downloadResult = await FileSystem.downloadAsync(uri, fileUri);

      if (downloadResult.status === 200) {
        // Save file to custom album "MenuMitra"
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync("MenuMitra", asset, false);

        Alert.alert("Download complete", "QR code saved to your gallery.");
      } else {
        Alert.alert("Download failed", "Unable to download QR code.");
      }
    } catch (error) {
      console.error("Error downloading QR code:", error);
      Alert.alert("Error", `Failed to download QR code: ${error.message}`);
    }
  };

  // Function to share QR code
  const shareQR = async () => {
    try {
      const uri = tableDetails.qr_code_url;
      const fileUri = FileSystem.documentDirectory + "QR_Code.png";
      const downloadObject = FileSystem.createDownloadResumable(uri, fileUri);
      const response = await downloadObject.downloadAsync();

      if (response.status === 200 && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(response.uri);
      } else {
        Alert.alert("Error", "Failed to share QR code.");
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
      Alert.alert("Error", "Failed to share QR code.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!tableDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text>Error fetching table details</Text>
      </View>
    );
  }

  const handleDeleteTable = () => {
    // Show confirmation alert before deletion
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this table?",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Delete canceled"),
          style: "cancel",
        },
        {
          text: "OK",
          onPress: async () => {
            try {
              let restaurantId = await getRestaurantId(); // Get the restaurant id
              setLoading(true);
              const response = await axiosInstance.post(
                onGetProductionUrl() + "table_delete",
                {
                  restaurant_id: restaurantId,
                  table_id: table_id, // Pass the table_id from route params
                }
              );

              if (response.data.st === 1) {
                // If successful, show success message and navigate back
                // Alert.alert('Success', 'Restaurant table deleted successfully');
                navigation.goBack(); // Navigate back to the previous screen
              } else {
                // If not successful, show error message
                Alert.alert(
                  "Error",
                  response.data.msg || "Failed to delete table"
                );
              }
            } catch (error) {
              console.error("Error deleting table:", error);
              Alert.alert("Error", "Failed to delete table. Please try again.");
            } finally {
              setLoading(false); // Stop loading indicator
            }
          },
        },
      ],
      { cancelable: false } // Prevent closing the alert by tapping outside
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.tableText}>
        Table Number: {tableDetails.table_number}
      </Text>
      {tableDetails.qr_code_url && (
        <>
          <Image
            source={{ uri: tableDetails.qr_code_url }}
            style={styles.qrCodeImage}
          />

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Button
              labelStyle={styles.buttonLabel}
              mode="contained"
              onPress={downloadQR}
              loading={loading}
              disabled={loading}
              style={[styles.downloadButton, { flex: 1 }]}
              icon={() => (
                <RemixIcon
                  name="ri-download-2-line"
                  size={20}
                  color="#0000FF7F"
                />
              )}
            >
              Download QR
            </Button>
            <Button
              labelStyle={styles.buttonLabel}
              mode="contained"
              onPress={shareQR}
              loading={loading}
              disabled={loading}
              style={[styles.downloadButton, { flex: 1, marginLeft: 10 }]}
              icon={() => (
                <RemixIcon name="ri-share-line" size={20} color="#0000FF7F" />
              )}
            >
              Share QR
            </Button>
          </View>
        </>
      )}

      <Button
        mode="outlined"
        onPress={handleDeleteTable}
        style={[newstyles.submitButton, styles.hollowDeleteButton]}
        contentStyle={{ borderColor: "#FF0000" }}
        labelStyle={{ color: "#FF0000" }}
        icon={() => (
          <RemixIcon name="ri-delete-bin-line" size={20} color="#FF0000" />
        )}
      >
        Delete
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "top",
    alignItems: "center",
    padding: 20,
  },
  tableText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  qrCodeImage: {
    width: "100%",
    height: 500,
    resizeMode: "contain",
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 20,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  downloadButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "blue",
    backgroundColor: "#ffffff",
    width: "80%",
    margin: 20,
  },
  buttonLabel: {
    color: "blue", // Blue text color
  },
  hollowDeleteButton: {
    backgroundColor: "transparent",
    borderColor: "#FF0000",
    borderWidth: 1,
    width: "40%",
    margin: 20,
    alignSelf: "flex-end",
  },
});

export default ViewRestaurantTable;
