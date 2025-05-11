import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  Platform,
  Modal,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Box,
  HStack,
  VStack,
  Heading,
  IconButton,
  useToast,
  Icon,
  Center,
  Spinner,
  Button,
} from "native-base";
import { getBaseUrl } from "../../config/api.config";
import { fetchWithAuth } from "../../utils/apiInterceptor";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { ViewShot } from "react-native-view-shot";

// Import the MM logo
const mmLogo = require("../../assets/images/mm-logo.png");

const RestaurantProfile = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantData, setRestaurantData] = useState(null);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [selectedQRData, setSelectedQRData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCounter, setHasCounter] = useState(false);
  const qrViewRef = useRef();

  // Define the QRCodeModal component inside RestaurantProfile
  const QRCodeModal = () => {
    // Determine QR code type based on available data
    let qrType = "Restaurant QR Code";
    
    if (selectedQRData) {
      if (selectedQRData.isCounter) {
        qrType = "Counter QR Code";
      } else if (selectedQRData.tableNumber) {
        qrType = `Table ${selectedQRData.tableNumber} QR Code`;
      }
    }
      
    // Use a simple modal implementation with basic React Native components
    return (
      <Modal
        visible={isQRModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsQRModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{qrType}</Text>
              <TouchableOpacity onPress={() => setIsQRModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedQRData && selectedQRData.qrCodeUrl ? (
              <>
                {typeof ViewShot !== 'undefined' ? (
                  <ViewShot ref={qrViewRef} options={{ format: 'png', quality: 1 }}>
                    <View style={styles.qrContainer}>
                      <Image
                        source={{ uri: selectedQRData.qrCodeUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  </ViewShot>
                ) : (
                  <View style={styles.qrContainer}>
                    <Image
                      source={{ uri: selectedQRData.qrCodeUrl }}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
                
                <Text style={styles.scanText}>
                  Scan to view our digital menu
                </Text>
                
                {/* Display QR URL for debugging */}
                <Text style={styles.qrUrlText} numberOfLines={1} ellipsizeMode="middle">
                  {selectedQRData.rawUrl}
                </Text>
                
                <View style={styles.qrButtonsContainer}>
                  {/* Download Button */}
                  <TouchableOpacity
                    style={[
                      styles.qrButton,
                      styles.downloadButton,
                      (isDownloading || isSharing) && styles.disabledButton,
                    ]}
                    onPress={downloadQR}
                    disabled={isDownloading || isSharing}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="file-download" size={18} color="#fff" />
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
                        <MaterialIcons name="share" size={18} color="#fff" />
                        <Text style={styles.qrButtonText}>Share</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0dcaf0" />
                <Text style={styles.loadingText}>Loading QR code...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Load the counter setting from AsyncStorage
  const loadCounterSetting = async () => {
    try {
      const appSettingsStr = await AsyncStorage.getItem("app_settings");
      if (appSettingsStr) {
        const appSettings = JSON.parse(appSettingsStr);
        
        // Check both possible structures for the counter setting
        if (appSettings.orderTypes && typeof appSettings.orderTypes.counter !== 'undefined') {
          // Parsed settings object format from settings.jsx
          setHasCounter(Boolean(appSettings.orderTypes.counter));
        } else if (typeof appSettings.has_counter !== 'undefined') {
          // Direct API response format
          setHasCounter(Boolean(appSettings.has_counter));
        }
      }
    } catch (error) {
      console.error("Error loading counter setting:", error);
    }
  };

  const fetchRestaurantInfo = async () => {
    try {
      setLoading(true);
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const captain_id = await AsyncStorage.getItem("captain_id");

      if (!outlet_id || !captain_id) {
        throw new Error("Required data missing");
      }

      // Load counter setting from AsyncStorage
      await loadCounterSetting();

      const response = await fetchWithAuth(`${getBaseUrl()}/view_outlet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: captain_id,
          outlet_id: outlet_id,
        }),
      });

      if (response.st === 1) {
        setRestaurantData(response.data);
        
        // Store restaurant data in AsyncStorage for offline access
        try {
          await AsyncStorage.setItem("outlet_name", response.data.name || "");
          await AsyncStorage.setItem("outlet_address", response.data.address || "");
          await AsyncStorage.setItem("outlet_mobile", response.data.mobile || "");
        } catch (storageError) {
          console.error("Error saving to AsyncStorage:", storageError);
        }
      } else {
        toast.show({
          description: response.msg || "Failed to load restaurant information",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching restaurant info:", error);
      toast.show({
        description: "Error loading restaurant information",
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRestaurantInfo();
  }, []);

  // Fetch restaurant QR code
  const fetchRestaurantQRCode = async () => {
    try {
      setIsLoading(true);
      const outlet_id = await AsyncStorage.getItem("outlet_id");

      if (!outlet_id) {
        throw new Error("Outlet ID missing");
      }

      // For Counter QR, we need to send specific parameters
      // Counter QR is typically represented as section "0" and table "0"
      const response = await fetchWithAuth(`${getBaseUrl()}/send_qr_link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outlet_id,
          is_counter: true,  // Flag to indicate this is for counter
          section_id: 0,     // Use "0" to indicate counter
          table_id: 0        // Use "0" to indicate counter
        }),
      });

      // Log the response structure to help with debugging
      console.log("QR code API response:", JSON.stringify(response, null, 2));

      // Check if the response has a different structure than expected (might be tables data)
      if (response && Array.isArray(response)) {
        throw new Error("Received tables data instead of QR code data. Please check the API endpoint.");
      }

      // Add validation to check if the required fields exist
      if (response && response.user_app_url && response.outlet_code) {
        try {
          // Generate URL in the correct format with all required parameters
          let appDataUrl;
          
          // Check if section_id and table_number are available in the response
          // This handles both counter QR codes and table QR codes
          if (response.section_id && response.table_number) {
            // Table QR code format with section and table
            appDataUrl = `${response.user_app_url}o${response.outlet_code}/s${response.section_id}/t${response.table_number}`;
          } else {
            // Counter/Restaurant QR code format (outlet only)
            appDataUrl = `${response.user_app_url}o${response.outlet_code}`;
          }
          
          console.log("App data URL (unencoded):", appDataUrl);
          
          // FIXED: Use the QR API without double encoding the URL
          // We're using encodeURIComponent only once for the data parameter
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(appDataUrl)}&margin=10`;
          
          console.log("Generated QR code URL:", qrCodeUrl);
          
          const qrData = {
            userAppUrl: response.user_app_url,
            outletCode: response.outlet_code,
            sectionId: response.section_id,
            tableNumber: response.table_number,
            isCounter: true,
            qrCodeUrl: qrCodeUrl,
            rawUrl: appDataUrl
          };
          
          setSelectedQRData(qrData);
          setIsQRModalVisible(true);
        } catch (formatError) {
          console.error("Error formatting QR data:", formatError);
          throw new Error("Failed to format QR code data: " + formatError.message);
        }
      } else {
        throw new Error("QR code data not received from server - missing required fields");
      }
    } catch (error) {
      console.error("Error fetching QR code:", error);
      toast.show({
        description: "Failed to fetch QR code: " + error.message,
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Download QR code as PNG
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
      const restaurantName = await AsyncStorage.getItem("outlet_name") || "Restaurant";
      const cleanRestaurantName = restaurantName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRestaurantName}_QR.png`;
      
      // Use ViewShot to capture the QR view
      const uri = await qrViewRef.current.capture();
      
      // Save to media library
      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(uri);
          const album = await MediaLibrary.getAlbumAsync('MenuMitra');
          
          if (album === null) {
            await MediaLibrary.createAlbumAsync('MenuMitra', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
          
          toast.show({
            description: "QR Code saved to your gallery in MenuMitra folder!",
            status: "success",
            placement: "bottom",
            duration: 3000,
          });
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
          toast.show({
            description: "QR Code saved to your Photos!",
            status: "success",
            placement: "bottom",
            duration: 3000,
          });
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
      toast.show({
        description: "Could not create QR code: " + error.message,
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Add PDF download option
  const downloadAsPDF = async () => {
    try {
      setIsLoading(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'App needs permission to save files');
        setIsLoading(false);
        return;
      }

      // Get restaurant name for filename
      const restaurantName = await AsyncStorage.getItem("outlet_name") || "Restaurant";
      const cleanRestaurantName = restaurantName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRestaurantName}_QR.pdf`;
      
      // Generate HTML content for PDF
      const htmlContent = `
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
                <img class="qr-image" src="${selectedQRData.qrCodeUrl}" />
              </div>
              
              <div class="footer">
                <p>Scan this QR code with your smartphone to place your order</p>
                <p>Powered by MenuMitra</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      // Generate PDF file
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 400,
        height: 400
      });
      
      // For Android
      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(uri);
          const album = await MediaLibrary.getAlbumAsync('MenuMitra');
          
          if (album === null) {
            await MediaLibrary.createAlbumAsync('MenuMitra', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
          
          toast.show({
            description: "QR Code PDF saved to your gallery in MenuMitra folder!",
            status: "success",
            placement: "bottom",
            duration: 3000,
          });
        } catch (error) {
          console.error('Save to gallery failed:', error);
          // Fallback to sharing
          await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
            dialogTitle: 'Save your QR code',
            UTI: 'com.adobe.pdf'
          });
        }
      } else if (Platform.OS === 'ios') {
        // iOS doesn't save PDFs to photo library, use sharing instead
        await Sharing.shareAsync(uri, {
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Save PDF',
        });
        toast.show({
          description: "Please select 'Save to Files' to save your PDF",
          status: "success",
          placement: "bottom",
          duration: 3000,
        });
      }
      
      setIsQRModalVisible(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.show({
        description: "Could not create PDF: " + error.message,
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a direct download option that doesn't rely on ViewShot
  const downloadQRDirectly = async () => {
    try {
      setIsDownloading(true);
      
      // Check if we have QR data
      if (!selectedQRData || !selectedQRData.qrCodeUrl) {
        toast.show({
          description: "No QR code available to download",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
        setIsDownloading(false);
        return;
      }
      
      // Request permissions if not already granted
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'App needs permission to save files');
        setIsDownloading(false);
        return;
      }
      
      // Get restaurant name for filename
      const restaurantName = await AsyncStorage.getItem("outlet_name") || "Restaurant";
      const cleanRestaurantName = restaurantName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${cleanRestaurantName}_QR.png`;
      
      // Download the QR image directly
      const fileUri = FileSystem.documentDirectory + fileName;
      
      // Download the image from the QR service
      const downloadResult = await FileSystem.downloadAsync(
        selectedQRData.qrCodeUrl,
        fileUri
      );
      
      if (downloadResult.status !== 200) {
        throw new Error("Failed to download QR code image");
      }
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      
      toast.show({
        description: "QR Code saved to your gallery!",
        status: "success",
        placement: "bottom",
        duration: 3000,
      });
      
      setIsQRModalVisible(false);
    } catch (error) {
      console.error("Error downloading QR directly:", error);
      toast.show({
        description: "Could not download QR code: " + error.message,
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Download QR options function
  const downloadQR = () => {
    if (!qrViewRef.current) {
      // Fallback to direct download if ViewShot ref is not available
      Alert.alert(
        "Download QR Code",
        "The enhanced download is not available. Would you like to download the basic QR code?",
        [
          {
            text: "Yes, download",
            onPress: downloadQRDirectly,
          },
          {
            text: "Cancel",
            style: "cancel",
          }
        ]
      );
      return;
    }
    
    Alert.alert(
      "Download QR Code",
      "Choose download format",
      [
        {
          text: "Download as PNG",
          onPress: () => downloadAsPNG(),
        },
        {
          text: "Download as PDF",
          onPress: () => downloadAsPDF(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  // Add a direct share option that doesn't rely on ViewShot
  const shareQRDirectly = async () => {
    try {
      setIsSharing(true);
      
      // Check if we have QR data
      if (!selectedQRData || !selectedQRData.qrCodeUrl) {
        toast.show({
          description: "No QR code available to share",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
        setIsSharing(false);
        return;
      }
      
      // Download the QR image to a temp file
      const fileName = "temp_qr_code.png";
      const fileUri = FileSystem.cacheDirectory + fileName;
      
      // Download the image from the QR service
      const downloadResult = await FileSystem.downloadAsync(
        selectedQRData.qrCodeUrl,
        fileUri
      );
      
      if (downloadResult.status !== 200) {
        throw new Error("Failed to download QR code image for sharing");
      }
      
      // Share the image
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: 'Share QR Code',
        UTI: 'public.png'
      });
      
      // Cleanup after sharing
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        } catch (e) {
          console.log("Cleanup error (non-critical):", e);
        }
      }, 3000);
    } catch (error) {
      console.error("Error sharing QR directly:", error);
      toast.show({
        description: "Could not share QR code: " + error.message,
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Share QR code
  const shareQR = async () => {
    try {
      setIsSharing(true);
      
      if (!selectedQRData) {
        toast.show({
          description: "No QR code data available to share",
          status: "error",
          placement: "bottom",
          duration: 3000,
        });
        setIsSharing(false);
        return;
      }
      
      if (!qrViewRef.current) {
        // Fallback to direct sharing
        setIsSharing(false);
        shareQRDirectly();
        return;
      }
      
      // Get the QR code image
      const uri = await qrViewRef.current.capture();
      
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
      toast.show({
        description: "Could not share QR code: " + error.message,
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
    } finally {
      setIsSharing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRestaurantInfo();
      
      // Add a separate effect to refresh the counter setting 
      // whenever the screen comes into focus
      loadCounterSetting();
    }, [])
  );

  const toTitleCase = (str) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (loading && !refreshing) {
    return (
      <Center flex={1} bg="coolGray.50">
        <Spinner size="lg" color="blue.500" />
      </Center>
    );
  }

  if (!restaurantData) {
    return (
      <Center flex={1} bg="coolGray.50" px={4}>
        <Text style={styles.errorText}>
          Failed to load restaurant information.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchRestaurantInfo}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </Center>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <HStack
        px={4}
        py={3}
        justifyContent="space-between"
        alignItems="center"
        bg="white"
        shadow={1}
      >
        <IconButton
          icon={<Icon as={MaterialIcons} name="arrow-back" size={6} color="gray.500" />}
          onPress={() => router.back()}
          variant="ghost"
          _pressed={{ bg: "coolGray.100" }}
          borderRadius="full"
        />
        <Heading size="md" flex={1} textAlign="center">
          Restaurant Profile
        </Heading>
        <Box width={10} /> {/* Empty box for balanced header */}
      </HStack>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0dcaf0"]}
            tintColor="#0dcaf0"
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
            <MaterialIcons name="store" size={24} color="#4b89dc" />
            <Text style={styles.cardTitle}>Restaurant Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text
                style={[
                  styles.value,
                  { color: restaurantData.is_open ? "#28a745" : "#dc3545" },
                ]}
              >
                {restaurantData.is_open ? "OPEN" : "CLOSED"}
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
            <MaterialIcons name="info" size={24} color="#4b89dc" />
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
            <MaterialIcons name="share" size={24} color="#4b89dc" />
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
            <MaterialIcons name="access-time" size={24} color="#4b89dc" />
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
            <MaterialIcons name="history" size={24} color="#4b89dc" />
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

      {/* Edit Restaurant Profile FAB */}
      {/* <TouchableOpacity
        style={[
          styles.editFAB,
          hasCounter ? { bottom: 90 } : { bottom: 20 }
        ]}
        onPress={() => router.push('/profile/edit-restaurant-profile')}
      >
        <MaterialIcons name="edit" size={24} color="#fff" />
      </TouchableOpacity> */}

      {/* Counter QR Button FAB - conditional based on settings */}
      {hasCounter && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={fetchRestaurantQRCode}
        >
          <HStack space={1} alignItems="center">
            <MaterialIcons name="qr-code" size={24} color="#fff" />
            <Text style={styles.fabButtonText}>Counter QR</Text>
          </HStack>
        </TouchableOpacity>
      )}

      {/* Using the QRCodeModal defined inside the component */}
      <QRCodeModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#0dcaf0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryText: {
    color: "white",
    fontWeight: "500",
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
  editFAB: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4b89dc",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    minWidth: 120,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0dcaf0",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
  fabButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
  },
  qrImage: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
  },
  logoOverlay: {
    width: 40,
    height: 40,
  },
  scanText: {
    marginTop: 15,
    marginBottom: 5,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  downloadButton: {
    backgroundColor: "#0dcaf0",
  },
  shareButton: {
    backgroundColor: "#198754",
  },
  qrButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  qrContainer: {
    width: 250,
    height: 250,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FF7043',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cornerMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 4,
    borderColor: '#0066FF',
  },
  topLeftMarker: {
    top: 10,
    left: 10,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRightMarker: {
    top: 10,
    right: 10,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeftMarker: {
    bottom: 10,
    left: 10,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRightMarker: {
    bottom: 10,
    right: 10,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 8,
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
  qrButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 15,
  },
  loadingContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  qrUrlText: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default RestaurantProfile; 