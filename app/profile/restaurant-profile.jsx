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
import { RemixIcon } from "react-native-remix-icon";
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
              <Text style={styles.modalTitle}>COUNTER QR Code</Text>
              <TouchableOpacity onPress={() => setIsQRModalVisible(false)}>
                <RemixIcon name="close-line" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedQRData ? (
              <>
                <ViewShot ref={qrViewRef} options={{ format: 'png', quality: 1 }}>
                  <View style={styles.qrContainer}>
                    {/* Corner markers */}
                    <View style={[styles.cornerMarker, styles.topLeftMarker]} />
                    <View style={[styles.cornerMarker, styles.topRightMarker]} />
                    <View style={[styles.cornerMarker, styles.bottomLeftMarker]} />
                    <View style={[styles.cornerMarker, styles.bottomRightMarker]} />
                    
                    {/* QR Image */}
                    <Image
                      source={{ uri: selectedQRData?.qrCodeUrl }}
                      style={styles.qrImage}
                    />
                    
                    {/* Logo in center */}
                    <View style={styles.logoWhiteSpace}>
                      <View style={styles.logoContainer}>
                        <Image
                          source={mmLogo}
                          style={styles.logoOverlay}
                          resizeMode="contain"
                        />
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
              <ActivityIndicator size="large" color="#0dcaf0" />
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
      const outlet_id = await AsyncStorage.getItem("outlet_id");

      if (!outlet_id) {
        throw new Error("Outlet ID missing");
      }

      const response = await fetchWithAuth(`${getBaseUrl()}/send_qr_link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outlet_id,
        }),
      });

      if (response) {
        // Generate URL in the required format with counter suffix
        const appDataUrl = `${response.user_app_url}o${response.outlet_code}`;
        
        // Use QR Server API for better logo visibility
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(appDataUrl)}&ecc=H&color=0066FF&bgcolor=FFFFFF&margin=1&qzone=1&size=400x400&logo=https://menumitra.com/assets/images/logo-icon.png&logosize=100`;
        
        const qrData = {
          userAppUrl: response.user_app_url,
          outletCode: response.outlet_code,
          qrCodeUrl: qrCodeUrl,
          rawUrl: appDataUrl
        };
        
        setSelectedQRData(qrData);
        setIsQRModalVisible(true);
      } else {
        throw new Error("No data received from QR code API");
      }
    } catch (error) {
      console.error("Error fetching QR code:", error);
      toast.show({
        description: "Failed to fetch QR code",
        status: "error",
        placement: "bottom",
        duration: 3000,
      });
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

  // Download QR options function
  const downloadQR = () => {
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
            <MaterialIcons name="restaurant" size={24} color="#4b89dc" />
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
      <TouchableOpacity
        style={[
          styles.editFAB,
          hasCounter ? { bottom: 90 } : { bottom: 20 }
        ]}
        onPress={() => router.push('/profile/edit-restaurant-profile')}
      >
        <MaterialIcons name="edit" size={24} color="#fff" />
      </TouchableOpacity>

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
});

export default RestaurantProfile; 