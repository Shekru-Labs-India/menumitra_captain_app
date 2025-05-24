import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Image,
  Pressable,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { getUserId, getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import newstyles from "../newstyles";
import { Button, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RemixIcon from "react-native-remix-icon";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import WebService from "../utils/WebService";
import MainToolBar from "../MainToolbar";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomTabBar from "../CustomTabBar";
import CustomHeader from "../../components/CustomHeader";
import { storeRestaurantConfig } from "../utils/RestaurantConfig";
import axiosInstance from "../../utils/axiosConfig";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { Asset } from "expo-asset";
import { getSettings } from '../../utils/getSettings';
import ViewShot from 'react-native-view-shot';

const RESTAURANT_CONFIG = {
  GST: "restaurant_gst",
  SERVICE_CHARGE: "restaurant_service_charge",
};

const RestaurantInfo = ({ navigation }) => {
  const [restaurantData, setRestaurantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [image, setImage] = useState(null);
  const [imageSelected, setImageSelected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vegNonvegList, setVegNonvegList] = useState([]);
  const [vegModalVisible, setVegModalVisible] = useState(false);
  const [vegNonveg, setVegNonveg] = useState("");
  const [restaurantTypeList, setRestaurantTypeList] = useState([]);
  const [restaurantTypeModalVisible, setRestaurantTypeModalVisible] =
    useState(false);
  const [restaurantType, setRestaurantType] = useState("");
  const [restaurantIsOpen, setRestaurantIsOpen] = useState(false);
  const [restaurantIsOpenModalVisible, setRestaurantIsOpenModalVisible] =
    useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [selectedQRData, setSelectedQRData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [outletName, setOutletName] = useState("");

  const qrViewRef = useRef();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Only refresh settings
      const appSettings = await getSettings();
      setSettings(appSettings);
      console.log("Settings refreshed on pull-to-refresh in RestaurantInfo");
    } catch (error) {
      console.error("Error refreshing settings in RestaurantInfo:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchRestaurantInfo = async () => {
    try {
      setLoading(true);
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "view_outlet",
        {
          user_id: userId,
          outlet_id: restaurantId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        console.log("response.data", response.data);
        const restaurantData = response.data.data;
        setRestaurantData(restaurantData);
        setVegNonveg(restaurantData.veg_nonveg);
        setRestaurantType(restaurantData.outlet_type);
        setImage(restaurantData.image);
        setRestaurantIsOpen(restaurantData.is_open);
        setOutletName(restaurantData.name);

        // Store GST and service charge
        if (
          restaurantData.gst !== undefined &&
          restaurantData.service_charges !== undefined
        ) {
          await storeRestaurantConfig(
            restaurantData.gst,
            restaurantData.service_charges
          );
        }

        // Update restaurant config in AsyncStorage with fresh data
        try {
          await AsyncStorage.setItem(
            WebService.OUTLET_NAME,
            restaurantData.name
          );
          await AsyncStorage.setItem(
            RESTAURANT_CONFIG.GST,
            restaurantData.gst?.toString() || "0"
          );
          await AsyncStorage.setItem(
            RESTAURANT_CONFIG.SERVICE_CHARGE,
            restaurantData.service_charges?.toString() || "0"
          );
          await AsyncStorage.setItem(
            "outlet_address",
            restaurantData.address || ""
          );
          await AsyncStorage.setItem("website_url", restaurantData.website);
        } catch (storageError) {
          console.error("Error saving to AsyncStorage:", storageError);
        }
      }
    } catch (error) {
      console.error("Error fetching restaurant info:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantQRCode = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "send_qr_link",
        {
          outlet_id: restaurantId,
          // No table_id needed for restaurant-level QR
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        // UPDATED: Generate URL in the required format with counter suffix
        const appDataUrl = `${response.data.user_app_url}o${response.data.outlet_code}`;
        
        // Use QR Server API with different parameters for better logo visibility
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(appDataUrl)}&ecc=H&color=0066FF&bgcolor=FFFFFF&margin=1&qzone=1&size=400x400&logo=https://menumitra.com/assets/images/logo-icon.png&logosize=100`;
        
        const qrData = {
          userAppUrl: response.data.user_app_url,
          outletCode: response.data.outlet_code,
          sectionId: response.data.section_id, // Keep this for reference, even though we don't use it in URL
          tableNumber: response.data.table_number, // Keep this for reference, even though we don't use it in URL
          qrCodeUrl: qrCodeUrl,
          rawUrl: appDataUrl
        };
        setSelectedQRData(qrData);
        setIsQRModalVisible(true);
      }
    } catch (error) {
      console.error("Error fetching QR code:", error);
      Alert.alert("Error", "Failed to fetch QR code");
    }
  };

  // Helper functions for QR code generation and download
  const imageToBase64 = async (imageSource) => {
    try {
      if (!imageSource) {
        console.warn("Image source is undefined, using fallback");
        return null;
      }
      
      // If it's a require'd image, we need to get its uri
      const asset = Asset.fromModule(imageSource);
      await asset.downloadAsync();
      
      // Read the file and convert to base64
      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return null;
    }
  };

  // Get common HTML content for QR code generation
  const getCommonHtmlContent = async () => {
    // Get restaurant name from AsyncStorage
    const restaurantName = await AsyncStorage.getItem("restaurant_name") || "Restaurant";
    
    // Get the logo using the same method as invoice
    const asset = Asset.fromModule(require('../../assets/icon.png'));
    await asset.downloadAsync();
    const logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background-color: white;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .container {
              width: 100%;
              max-width: 400px;
              padding: 20px;
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
              margin-bottom: 20px;
              width: 100%;
              text-align: center;
            }
            .qr-wrapper {
              position: relative;
              width: 250px;
              height: 250px;
              padding: 15px;
              background-color: white;
              border-radius: 12px;
              border: 3px solid #FF7043;
              margin: 0 auto;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .qr-image {
              width: 100%;
              height: 100%;
              border-radius: 8px;
              object-fit: contain;
            }
            .logo-container {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 60px;
              height: 60px;
              background-color: white;
              border-radius: 30px;
              display: flex;
              justify-content: center;
              align-items: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo {
              width: 45px;
              height: 45px;
              object-fit: contain;
            }
            .footer {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
              width: 100%;
              text-align: center;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="subtitle">COUNTER QR Code</div>
            
            <div class="qr-wrapper">
              <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(selectedQRData.rawUrl)}&ecc=H&color=0066FF&bgcolor=FFFFFF&margin=1&qzone=1" />
              <div class="logo-container">
                <img class="logo" src="data:image/png;base64,${logoBase64}" />
              </div>
            </div>
            
            <div class="footer">
              <p>Scan this QR code with your smartphone to place your order</p>
              <p>Powered by MenuMitra</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Update the downloadAsPNG function to use the correct loading state
  const downloadAsPNG = async () => {
    try {
      setIsDownloading(true);
      
      // Request permissions if not already granted
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'App needs permission to save files');
        setIsDownloading(false);
        return;
      }
  
      // Get restaurant name for filename
      const restaurantName = await AsyncStorage.getItem("restaurant_name") || "Restaurant";
      const cleanRestaurantName = restaurantName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRestaurantName}_QR.png`;
      
      let uri;
      
      try {
        // Try to capture the QR view with ViewShot
        uri = await qrViewRef.current.capture();
      } catch (captureError) {
        console.log("ViewShot capture failed, using fallback method:", captureError);
        
        // Fallback: Download the QR code directly from the URL
        const qrUrl = selectedQRData.qrCodeUrl;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        const downloadResult = await FileSystem.downloadAsync(qrUrl, fileUri);
        uri = downloadResult.uri;
      }
      
      // Save to media library with proper metadata
      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(uri);
          const album = await MediaLibrary.getAlbumAsync('MenuMitra');
          
          if (album === null) {
            await MediaLibrary.createAlbumAsync('MenuMitra', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
          
          Alert.alert("Success", "QR Code saved to your gallery in MenuMitra folder!");
        } catch (error) {
          console.error('Save to gallery failed:', error);
          // Fallback to sharing
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Save your QR code',
            UTI: 'public.png'
          });
        }
      } else if (Platform.OS === 'ios') {
        try {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert("Success", "QR Code saved to your Photos!");
        } catch (error) {
          console.error('iOS photo save failed:', error);
          await Sharing.shareAsync(uri, {
            UTI: 'public.png',
            mimeType: 'image/png',
            dialogTitle: 'Save PNG',
          });
        }
      }
      
      // Cleanup temporary files
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (e) {
          console.log("Cleanup error (non-critical):", e);
        }
      }, 3000);
      
      setIsQRModalVisible(false);
    } catch (error) {
      console.error("Error generating QR:", error);
      Alert.alert("Error", "Could not create QR code: " + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Update the downloadAsPDF function to save directly to device
  const downloadAsPDF = async () => {
    try {
      setIsLoading(true);
      
      // Request permissions if not already granted
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'App needs permission to save files');
        setIsLoading(false);
        return;
      }

      // Get the common HTML content
      const htmlContent = await getCommonHtmlContent();
      
      // Get restaurant name for filename
      const restaurantName = await AsyncStorage.getItem("restaurant_name") || "Restaurant";
      const cleanRestaurantName = restaurantName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRestaurantName}_Table_${selectedQRData.tableNumber}_QR.pdf`;
      
      // Generate PDF file
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 400,
        height: 400
      });
      
      // Get download directory based on platform
      const downloadDir = Platform.OS === 'android' 
        ? FileSystem.documentDirectory 
        : FileSystem.documentDirectory;
      
      const newFileUri = `${downloadDir}${fileName}`;

      try {
        // Copy file to downloads
        await FileSystem.copyAsync({
          from: uri,
          to: newFileUri
        });

        // For Android, make file visible in downloads
        if (Platform.OS === 'android') {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(newFileUri, { 
              encoding: FileSystem.EncodingType.Base64 
            });
            
            await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'application/pdf'
            ).then(async (uri) => {
              await FileSystem.writeAsStringAsync(uri, base64, { 
                encoding: FileSystem.EncodingType.Base64 
              });
            });
            
            Alert.alert("Success", "QR Code PDF saved to your downloads!");
        } else {
            // Fallback if permissions not granted for SAF
          const asset = await MediaLibrary.createAssetAsync(uri);
            Alert.alert("Success", "QR Code PDF saved to your device!");
          }
        } else if (Platform.OS === 'ios') {
          // For iOS, we can't save PDFs to photo library directly
          // We'll use CameraRoll or document directory
          await Sharing.shareAsync(uri, {
            UTI: 'com.adobe.pdf',
            mimeType: 'application/pdf',
            dialogTitle: 'Save PDF',
          });
          Alert.alert("Success", "Please select 'Save to Files' to save your PDF");
        }
      } catch (error) {
        console.error('Error saving PDF:', error);
        Alert.alert('Warning', 'Could not save to downloads, using fallback method.');
        // Fallback to basic sharing
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Save your QR code',
        });
      }
      
      setIsQRModalVisible(false);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download QR code as PDF. ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Share QR function
  const shareQR = async () => {
    try {
      setIsSharing(true);
      
      if (!selectedQRData) {
        Alert.alert("Error", "No QR code data available to share");
        setIsSharing(false);
        return;
      }
      
      // Get the HTML content for QR
      const htmlContent = await getCommonHtmlContent();
      
      // Generate temporary file
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 600,
        height: 600,
        base64: false,
      });
      
      // Share the generated file
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share QR Code',
        UTI: 'public.png'
      });
      
      // Cleanup after sharing
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (e) {
          console.log("Cleanup error (non-critical):", e);
        }
      }, 3000);
    } catch (error) {
      console.error("Error sharing QR:", error);
      Alert.alert("Error", "Could not share QR code: " + error.message);
    } finally {
      setIsSharing(false);
    }
  };

  // Update the downloadQR function to show options
 

  // Update the QR Code Modal Component to match RestaurantTables.js
  const QRCodeModal = () => {
    return (
      <Modal
        visible={isQRModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsQRModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { position: 'relative', alignSelf: 'center' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{outletName || "Restaurant"} QR Code</Text>
              <TouchableOpacity onPress={() => setIsQRModalVisible(false)}>
                <RemixIcon name="close-line" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedQRData ? (
              <>
                <ViewShot ref={qrViewRef} options={{ format: 'png', quality: 1 }}>
                  <View style={styles.qrWrapperContainer}>
                    <View style={styles.qrWrapper}>
                      <View style={styles.qrFrame}>
                        {/* QR Code image */}
                        <Image
                          source={{ uri: selectedQRData?.qrCodeUrl }}
                          style={styles.qrCodeImage}
                        />
                        
                        {/* O column display INSIDE the QR border - centered vertically */}
                        <View style={[styles.qrInfoColumnsInsideBorder, { left: 7, top: 120 }]}>
                          <View style={styles.qrInfoTable}>
                            <View style={styles.qrInfoDigitsContainer}>
                              {String(selectedQRData?.outletCode || '').split('').reverse().map((digit, idx) => (
                                <Text key={idx} style={styles.qrInfoDigitSmall}>{digit}</Text>
                              ))}
                            </View>
                            <Text style={styles.qrInfoLabelSmall}>O</Text>
                          </View>
                        </View>
                        
                        {/* Logo in center */}
                        <View style={styles.logoWhiteSpace}>
                          <View style={styles.logoContainer}>
                            <Image
                              source={require('../../assets/icon.png')} // Your app logo
                              style={styles.logoOverlay}
                              resizeMode="contain"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </ViewShot>
                
                <Text style={styles.scanText}>
                  Scan to view our digital menu
                </Text>
                
                <View style={styles.qrButtonsContainer}>
                  {/* Download Button (with options) */}
                  <TouchableOpacity
                    style={[
                      styles.qrButton,
                      styles.downloadButton,
                      (isDownloading || isSharing) && styles.disabledButton,
                    ]}
                    onPress={() => {
                      Alert.alert(
                        "Download QR Code",
                        "Choose format to download",
                        [
                          {
                            text: "PNG",
                            onPress: downloadAsPNG
                          },
                          {
                            text: "PDF",
                            onPress: downloadAsPDF
                          },
                          {
                            text: "Cancel",
                            style: "cancel"
                          }
                        ]
                      );
                    }}
                    disabled={isDownloading || isSharing}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <RemixIcon name="download-2-line" size={18} color="#fff" />
                        <Text style={styles.qrButtonText}>Download</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  {/* Share Button */}
                  <TouchableOpacity
                    style={[
                      styles.qrButton,
                      styles.shareButton,
                      (isDownloading || isSharing) && styles.disabledButton,
                    ]}
                    onPress={shareQR}
                    disabled={isDownloading || isSharing}
                  >
                    {isSharing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <RemixIcon name="share-line" size={18} color="#fff" />
                        <Text style={styles.qrButtonText}>Share</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <ActivityIndicator size="large" color="#0dcaf0" />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchRestaurantInfo(); // Fetch data when the screen is focused
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      // This will run when the screen is focused
      const loadSettings = async () => {
        console.log("Loading settings in RestaurantInfo screen");
        try {
          // Always get the latest settings from API
          const appSettings = await getSettings();
          console.log("Settings loaded:", appSettings);
          setSettings(appSettings);
        } catch (error) {
          console.error("Error loading settings in RestaurantInfo:", error);
        }
      };
      
      loadSettings();
      
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  if (loading) {
    return (
      <ActivityIndicator style={styles.loading} size="large" color="#0000ff" />
    );
  }

  if (!restaurantData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Failed to load restaurant information.
        </Text>
      </View>
    );
  }

  const toTitleCase = (str) => {
    return str
      .split(" ") // Split the string into words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
      .join(" "); // Join them back into a single string
  };

  return (
    <>
      <CustomHeader title="Restaurant Info" />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6200ee"]}
            tintColor="#6200ee"
          />
        }
      >
        {restaurantData.image && (
          <View style={styles.imageCard}>
            <Image
              source={{ uri: restaurantData.image }}
              style={styles.restaurantImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Basic Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="restaurant" size={24} color="#4b89dc" />
            <Text style={styles.cardTitle}>Restaurant Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.value,
                  { color: restaurantIsOpen ? "#28a745" : "#dc3545" },
                ]}
              >
                {restaurantIsOpen ? "OPEN" : "CLOSED"}
              </Text>
              <Text style={styles.label}>Restaurant Status</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {toTitleCase(restaurantData.name)}
              </Text>
              <Text style={styles.label}>Restaurant Name</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {toTitleCase(restaurantData.owner_name)}
              </Text>
              <Text style={styles.label}>Owner Name</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {toTitleCase(restaurantData.outlet_type)}
              </Text>
              <Text style={styles.label}>Restaurant Type</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.mobile}</Text>
              <Text style={styles.label}>Mobile</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.fssainumber}</Text>
              <Text style={styles.label}>FSSAI Number</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.gstnumber}</Text>
              <Text style={styles.label}>GST Number</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.veg_nonveg?.toUpperCase()}
              </Text>
              <Text style={styles.label}>Veg/Non-veg</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.address}</Text>
              <Text style={styles.label}>Address</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.upi_id}</Text>
              <Text style={styles.label}>UPI ID</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.website}</Text>
              <Text style={styles.label}>Website</Text>
            </View>
          </View>
        </View>

        {/* Additional Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="info" size={24} color="#4b89dc" />
            <Text style={styles.cardTitle}>Additional Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.service_charges + "%"}
              </Text>
              <Text style={styles.label}>Service Charges</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.gst + "%"}</Text>
              <Text style={styles.label}>GST</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.total_category}</Text>
              <Text style={styles.label}>Total Categories</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.total_menu}</Text>
              <Text style={styles.label}>Total Menu Items</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.total_completed_orders}
              </Text>
              <Text style={styles.label}>Completed Orders</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.total_cancelled_orders}
              </Text>
              <Text style={styles.label}>Cancelled Orders</Text>
            </View>
          </View>
        </View>

        {/* Social Links Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="share" size={24} color="#4b89dc" />
            <Text style={styles.cardTitle}>Social Links</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.whatsapp || "-"}</Text>
              <Text style={styles.label}>WhatsApp</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.facebook || "-"}</Text>
              <Text style={styles.label}>Facebook</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.instagram || "-"}
              </Text>
              <Text style={styles.label}>Instagram</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>{restaurantData.website || "-"}</Text>
              <Text style={styles.label}>Website</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.google_review || "-"}
              </Text>
              <Text style={styles.label}>Google Review</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.google_business_link || "-"}
              </Text>
              <Text style={styles.label}>Google Business</Text>
            </View>
          </View>
        </View>

        {/* Timing Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="access-time" size={24} color="#4b89dc" />
            <Text style={styles.cardTitle}>Timing</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.opening_time || "-"}
              </Text>
              <Text style={styles.label}>Opening Time</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.closing_time || "-"}
              </Text>
              <Text style={styles.label}>Closing Time</Text>
            </View>
          </View>
        </View>

        {/* Created/Updated Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="history" size={24} color="#4b89dc" />
            <Text style={styles.cardTitle}>Other Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.created_on || "-"}
              </Text>
              <Text style={styles.label}>Created On</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.created_by || "-"}
              </Text>
              <Text style={styles.label}>Created By</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.updated_on || "-"}
              </Text>
              <Text style={styles.label}>Updated On</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.value}>
                {restaurantData.updated_by || "-"}
              </Text>
              <Text style={styles.label}>Updated By</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating QR Button - conditional based on settings */}
      {settings && settings.has_counter && (
        <TouchableOpacity
          style={[styles.floatingButton, { bottom: 140 }]} // Positioned above edit button
          onPress={fetchRestaurantQRCode}
        >
          <RemixIcon name="qr-code-line" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add the QR Code Modal */}
      <QRCodeModal />

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate("EditRestaurantInfo")}
      >
        <RemixIcon name="pencil-line" size={24} color="#fff" />
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>

      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  infoItem: {
    width: "48%",
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  value: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  vegText: {
    marginLeft: 4,
    color: "#333",
    fontWeight: "500",
  },
  addressContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
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
  imageCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  restaurantImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
  },
  editIcon: {
    position: "absolute",
    bottom: -5,
    right: "40%",
    backgroundColor: "#fff",
    padding: 5,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonContainer: {
    paddingHorizontal: 10,
    marginVertical: 20,
  },
  updateButton: {
    backgroundColor: "#6200ee",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footerContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  footerText: {
    color: "#666",
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  editButton: {
    position: "absolute",
    right: 16,
    bottom: 80,
    backgroundColor: "#0dcaf0",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 25,
    elevation: 3,
    zIndex: 1,
  },
  editButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  vegIcon: {
    marginLeft: 10,
  },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  qrWrapperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    width: '100%',
  },
  qrWrapper: {
    padding: 0,
    backgroundColor: "transparent",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
  },
  qrFrame: {
    position: 'relative',
    padding: 15,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FF7043',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrCodeImage: {
    width: 260,
    height: 260,
    borderRadius: 8,
  },
  qrInfoColumnsInsideBorder: {
    position: 'absolute',
    left: 8,
    top: 20,
    flexDirection: 'row',
    justifyContent: 'flex-center',
    alignItems: 'flex-center',
    zIndex: 10,
  },
  qrInfoTable: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  qrInfoDigitsContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  qrInfoLabelSmall: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#0066FF',
    transform: [{ rotate: '270deg' }], // Rotate labels to face away from QR
  },
  qrInfoDigitSmall: {
    fontSize: 10,
    color: '#333',
    lineHeight: 10,
    fontWeight: '500',
    transform: [{ rotate: '270deg' }], // Rotate digits to face north
    marginVertical: -1, // Negative margin to remove spacing between digits
  },
  logoWhiteSpace: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  logoContainer: {
    width: 45,
    height: 45,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoOverlay: {
    width: 40,
    height: 40,
  },
  scanText: {
    marginTop: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  qrButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  downloadButton: {
    backgroundColor: "#0dcaf0",
    marginRight: 8,
  },
  shareButton: {
    backgroundColor: "#198754",
    marginLeft: 8,
  },
  qrButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.7,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0dcaf0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
});

export default RestaurantInfo;

