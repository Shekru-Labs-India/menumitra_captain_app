import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Image,
  TouchableWithoutFeedback,
  Platform,
  Animated,
  BackHandler,  // Add this import
  Switch,
} from "react-native";
import axios from "axios";
import { TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import globalStyles from "../../styles";
import RemixIcon from "react-native-remix-icon";
import { getRestaurantId , getUserId} from "../utils/getOwnerData";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomTabBar from "../CustomTabBar";
import MainToolBar from "../MainToolbar";
import CustomHeader from "../../components/CustomHeader";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Picker } from "@react-native-picker/picker"; // Add this import
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";
import { getSettings } from '../../utils/getSettings';
import * as Print from 'expo-print';
import { Asset } from 'expo-asset';
import * as Constants from 'expo-constants';
import ViewShot from 'react-native-view-shot';
import PaymentModal from "../../components/PaymentModal";




const RestaurantTables = () => {
  const [sections, setSections] = useState([]); // Holds the grouped sections
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [showIcons, setShowIcons] = useState(false); // State to control the visibility of edit and delete icons
  const [deleteTableId, setDeleteTableId] = useState(null); // State to track the table ID for delete icon
  const [sectionId, setSectionId] = useState(null); // Add this near other state declarations
  const [sectionName, setSectionName] = useState("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionName, setEditingSectionName] = useState("");

  const [deletingSection, setDeletingSection] = useState(null); // Store the section details to be deleted
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletingTable, setDeletingTable] = useState(null); // Store the table to be deleted
  const [isCreateTableModalVisible, setIsCreateTableModalVisible] =
    useState(false);
  const [isCreateSectionModalVisible, setIsCreateSectionModalVisible] =
    useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [sectionsList, setSectionsList] = useState([]); // Add new state for sections dropdown
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [selectedQRData, setSelectedQRData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "occupied", "available"
  const [isOrderTypeModalVisible, setIsOrderTypeModalVisible] = useState(false);
  const [sectionNameError, setSectionNameError] = useState("");
  const [sectionSelectError, setSectionSelectError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const [sectionStatusLoading, setSectionStatusLoading] = useState({});

  // Add this state for blinking animation
  const blinkAnim = useRef(new Animated.Value(0)).current;
  
  // Add this effect to create the blinking animation
  useEffect(() => {
    const startBlinking = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true
          })
        ])
      ).start();
    };
    
    startBlinking();
    
    // Clean up animation when component unmounts
    return () => {
      blinkAnim.stopAnimation();
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTables();
    }, 30000); 

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures this runs only once on mount

  const [todaySales, setTodaySales] = useState("0");
  const [liveSales, setLiveSales] = useState("0");

  const fetchTables = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);
      setLoading(true);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_listview",
        {
          outlet_id: restaurantId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Log the full API response for debugging
      console.log("Table ListView API Response:", response.data);

      if (response.data.st === 1) {
        setSections(response.data.data);
        // Extract today's sales and live sales from API response
        setTodaySales(response.data.today_total_sales || "0");
        setLiveSales(response.data.live_sales || "0");
        // Fetch sections list to get additional data
        await fetchSectionsList();
      } else {
        Alert.alert("Error", "Failed to fetch table data");
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
      Alert.alert("Error", "Error fetching tables");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTables();
    }, [])
  );

  

  // Add this state for the delete confirmation modal
  const [isDeleteConfirmModalVisible, setIsDeleteConfirmModalVisible] = useState(false);

  // Update handleDeleteSection function
  const handleDeleteSection = () => {
    if (deletingTable) {
      setIsDeleteConfirmModalVisible(true);
    }
  };

  // Add this function to handle the actual deletion
  const confirmDeleteSection = async () => {
    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_delete",
        {
          outlet_id: restaurantId,
          section_id: deletingTable.section_id,
          user_id: userId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;
      console.log("API Response:", data);

      if (data.st === 1) {
        console.log("Section deleted successfully");
        setSectionsList((prevSections) =>
          prevSections.filter(
            (section) => section.section_id !== deletingTable.section_id
          )
        );
        await fetchTables();
        await fetchSections();
        Alert.alert("Success", "Section deleted successfully");
      } else {
        console.error("Failed to delete section:", data.msg || "Unknown error");
        Alert.alert("Error", `Failed to delete section: ${data.msg || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting section:", error);
      Alert.alert("Error", "Something went wrong while deleting the section.");
    } finally {
      setDeletingTable(null);
      setIsDeleteConfirmModalVisible(false);
    }
  };

  const fetchSections = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_sections",
        {
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
        const sectionList = Object.entries(response.data.section_list).map(
          ([key, value]) => ({
            name: key,
            id: value,
          })
        );
        setSectionsList(sectionList);
      } else {
        Alert.alert("Error", "Failed to fetch sections.");
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const confirmDeleteTable = async (tableId, sectionId) => {
    Alert.alert("Delete Table", "Are you sure you want to delete this table?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const [restaurantId, userId, accessToken] = await Promise.all([
              getRestaurantId(),
              getUserId(),
              AsyncStorage.getItem("access_token"),
            ]);
            setLoading(true);

            const response = await axiosInstance.post(
              onGetProductionUrl() + "table_delete",
              {
                outlet_id: restaurantId,
                section_id: sectionId,
                user_id: userId,
              },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (response.data.st === 1) {
              setLoading(false);
              fetchTables();
              setDeleteTableId(null);
              Alert.alert("Success", "Table deleted successfully");
            } else {
              setLoading(false);
              Alert.alert(
                "Error",
                response.data.msg || "Failed to delete table",
                [{ text: "OK" }]
              );
            }
          } catch (error) {
            console.error(
              "Delete table error:",
              error.response?.data || error.message
            );
            setLoading(false);
            Alert.alert("Error", "Failed to delete table. Please try again.", [
              { text: "OK" },
            ]);
          }
        },
      },
    ]);
  };

  const handleEditSection = async (sectionId) => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);
      setLoading(true);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_view",
        {
          outlet_id: restaurantId,
          section_id: sectionId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setEditingSectionId(sectionId);
        setEditingSectionName(response.data.data.section_name);
        setIsEditModalVisible(true);
      } else {
        Alert.alert(
          "Error",
          response.data.msg || "Failed to fetch section details"
        );
      }
    } catch (error) {
      console.error("Error fetching section:", error);
      Alert.alert("Error", "Failed to fetch section details");
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateSection = async () => {
    if (!editingSectionName.trim()) {
      Alert.alert("Error", "Section name cannot be empty");
      return;
    }

    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);
      setLoading(true);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_update",
        {
          outlet_id: restaurantId,
          section_id: editingSectionId,
          user_id: userId,
          section_name: editingSectionName.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setIsEditModalVisible(false);
        fetchTables();
        Alert.alert("Success", "Section updated successfully");
      } else {
        Alert.alert("Error", response.data.msg || "Failed to update section");
      }
    } catch (error) {
      console.error("Error updating section:", error);
      Alert.alert("Error", "Failed to update section");
    } finally {
      setLoading(false);
    }
  };

  // Use your existing function without modifications
 

  const fetchTableQRCode = async (tableId, tableNumber, sectionId) => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "send_qr_link",
        {
          outlet_id: restaurantId,
          table_id: tableId
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data) {
        // FIXED: Generate URL in the correct format with path parameters
        const appDataUrl = `${response.data.user_app_url}o${response.data.outlet_code}/s${response.data.section_id}/t${response.data.table_number}`;
        
        // Use QR Server API with different parameters for better logo visibility
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(appDataUrl)}&ecc=H&color=0066FF&bgcolor=FFFFFF&margin=1&qzone=1&size=400x400&logo=https://menumitra.com/assets/images/logo-icon.png&logosize=100`;
        
        const qrData = {
          userAppUrl: response.data.user_app_url,
          outletCode: response.data.outlet_code,
          sectionId: response.data.section_id,
          tableNumber: response.data.table_number,
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

  // Update the imageToBase64 function to handle errors better
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

  // Update the generatePDF function with correct logo path and fallback
  const generatePDF = async (qrData) => {
    try {
      // Try to get the logo - use the table.png image that we know exists in the project
      // based on your imports at the top of the file
      let logoBase64;
      try {
        // Use the logo that's already imported in the file
        logoBase64 = await imageToBase64(require("../../assets/icon.png"));
      } catch (error) {
        console.warn("Could not load logo image:", error);
        logoBase64 = null;
      }

      // Create QR code with embedded base64 logo (if available)
      const htmlContent = `
        <html>
          <body style="text-align: center; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">MenuMitra Table QR Code</h2>
              <p style="color: #666;">Table ${qrData.tableNumber}</p>
              <div style="margin: 20px 0;">
                <!-- Generate QR code with embedded data -->
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData.rawUrl)}&ecc=H&color=0066FF&bgcolor=FFFFFF&margin=1&qzone=1" style="width: 300px; height: 300px;"/>
                
                ${logoBase64 ? `
                <!-- Overlay the logo on top of QR code -->
                <div style="position: relative; width: 300px; height: 300px; margin: 0 auto; margin-top: -300px;">
                  <img src="data:image/png;base64,${logoBase64}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; z-index: 10;" />
                </div>
                ` : ''}
              </div>
              <p style="color: #666; margin-top: 20px;">Scan to access digital menu</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

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
            <div class="subtitle">Table ${selectedQRData.tableNumber} QR Code</div>
            
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
      
      // Check if qrViewRef is available with more detailed error message
      if (!qrViewRef || !qrViewRef.current) {
        console.error("QR view reference not available:", { 
          refExists: !!qrViewRef, 
          currentExists: qrViewRef ? !!qrViewRef.current : false 
        });
        throw new Error("QR code component not ready. Please try again.");
      }
      
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
      const fileName = `${cleanRestaurantName}_Table_${selectedQRData.tableNumber}_QR.png`;
      
      // Add a small delay to ensure the QR view is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use ViewShot to capture the entire QR view with styling
      console.log("Capturing ViewShot...");
      let uri;
      try {
        // Specify format and quality for better results
        uri = await qrViewRef.current.capture({
          format: 'png',
          quality: 1,
          result: 'tmpfile'
        });
        console.log("ViewShot captured successfully:", uri);
      } catch (captureError) {
        console.error("ViewShot capture failed:", captureError);
        
        // Try a second capture attempt with a longer delay if first attempt fails
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Retrying capture...");
        uri = await qrViewRef.current.capture({
          format: 'png',
          quality: 1,
          result: 'tmpfile'
        });
      }
      
      if (!uri) {
        throw new Error("Failed to capture QR code image");
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

  // Now update the downloadAsPNG function to use this
  

  // Update the initial state for payment methods
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash'); // Set cash as default
  const [selectedTable, setSelectedTable] = useState(null);
  const [isPaid, setIsPaid] = useState(false); 

  // Add this function to handle payment and settle order
  const handleSettlePayment = async (paymentMethod, isPaid) => {
    // Add validation for payment method
    if (!paymentMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }
    
    // Make sure selectedTable has all required properties
    if (!selectedTable || !selectedTable.order_id) {
      Alert.alert("Error", "No active order found for this table");
      return;
    }

    try {
      setLoading(true);
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      // Determine if this is a complementary order
      const isComplementary = paymentMethod === 'COMPLEMENTARY';

      const settleRequestBody = {
        outlet_id: restaurantId.toString(),
        order_id: selectedTable.order_id.toString(),
        order_status: "paid",
        user_id: userId.toString(),
        is_paid: isComplementary ? "complementary" : "paid",
        is_complementary: isComplementary ? 1 : 0,
        order_type: "dine-in",
        tables: [selectedTable.table_number?.toString() || ""],
        section_id: selectedTable.section_id?.toString() || "",
        payment_method: isComplementary ? null : paymentMethod
      };

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_order_status",
        settleRequestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert(
          "Success", 
          isComplementary ? "Order marked as complementary" : "Order settled successfully!"
        );
        setIsPaymentModalVisible(false);
        fetchTables(); // Refresh the tables
      } else {
        Alert.alert("Error", response.data.msg || "Failed to settle order");
      }
    } catch (error) {
      console.error("Error settling payment:", error);
      Alert.alert("Error", "Failed to settle payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update the openPaymentModal function to properly format the table data for the PaymentModal component
  const openPaymentModal = (table) => {
    if (!table.order_id) {
      Alert.alert("Error", "This table doesn't have an active order");
      return;
    }
    
    // Format the order data for PaymentModal
    const orderData = {
      order_id: table.order_id, // Ensure this is included
      order_number: table.order_number || 'N/A',
      table_number: table.table_number,
      grand_total: table.grand_total || '0.00',
      order_type: "dine-in",
      is_paid: table.is_paid,
      is_complementary: table.is_paid === "complementary",
      payment_method: table.payment_method,
      section_id: table.section_id
    };
    
    setSelectedTable(orderData);
    setIsPaymentModalVisible(true);
  };

  // Now update the PaymentModal component to match the new layout
  

  const renderTableItem = ({ item, section }) => {
    const isUnoccupied = item.is_occupied === 0;
    const isReserved = item.is_reserved === true;
    const isKotAndSave = item.action === "KOT_and_save";
    const isPrintAndSave = item.action === "print_and_save";
    const isCreateOrder = item.action === "create_order";
    const isPlaced = item.action === "placed";
    const isSave = item.action === "has_save";

    // Get all tables in this section and sort them by table_id
    const sectionTables = sections.find(s => s.section_id === section.section_id)?.tables || [];
    const sortedTables = [...sectionTables].sort((a, b) => b.table_id - a.table_id);
    
    // Check if this is the last table (highest table_id) in the section
    const isLastTable = item.table_id === sortedTables[0]?.table_id;
    const isAvailable = isUnoccupied && !isReserved;
    const showDeleteIcon = showIcons && isLastTable && isAvailable;

    

    const getTimeDifference = (occupiedTime) => {
      // Early return if occupiedTime is null, undefined, or empty
      if (!occupiedTime || typeof occupiedTime !== "string") {
        return "";
      }

      try {
        // Replace hyphens with spaces for the date part
        const normalizedTime = occupiedTime.replace(/-/g, " ");
        const parts = normalizedTime.trim().split(" ");

        // Now parts should be ["31", "Jan", "2025", "03:34:02", "PM"]
        if (parts.length !== 5) {
          console.log("Invalid date format after normalization:", occupiedTime);
          return "";
        }

        const [day, month, year, time, modifier] = parts;
        let [hours, minutes, seconds] = time.split(":");

        // Convert hours to 24-hour format
        hours = parseInt(hours);
        if (modifier.toUpperCase() === "PM" && hours !== 12) {
          hours = hours + 12;
        }
        if (modifier.toUpperCase() === "AM" && hours === 12) {
          hours = 0;
        }

        // Create Date objects for occupied time
        const months = {
          Jan: 0,
          Feb: 1,
          Mar: 2,
          Apr: 3,
          May: 4,
          Jun: 5,
          Jul: 6,
          Aug: 7,
          Sep: 8,
          Oct: 9,
          Nov: 10,
          Dec: 11,
        };

        // Check if month exists in our mapping
        if (!(month in months)) {
          console.log("Invalid month:", month);
          return "";
        }

        const occupiedDate = new Date(
          parseInt(year),
          months[month],
          parseInt(day),
          hours,
          parseInt(minutes),
          parseInt(seconds)
        );

        // Validate if date is valid
        if (isNaN(occupiedDate.getTime())) {
          console.log("Invalid date created:", occupiedTime);
          return "";
        }

        const now = new Date();

        // Calculate time difference in milliseconds
        const diffMs = now - occupiedDate;
        const diffMins = Math.floor(diffMs / 60000); // Convert to minutes
        const diffHours = Math.floor(diffMs / 3600000); // Convert to hours

        // Format the output based on the time difference
        if (diffMins < 1) {
          return "0m Ago";
        } else if (diffMins < 60) {
          return `${diffMins}m${diffMins > 1 ? "" : ""} Ago`;
        } else if (diffHours < 3) {
          return `${diffHours}h${diffHours > 1 ? "" : ""} Ago`;
        } else {
          return "3h+";
        }
      } catch (error) {
        console.error(
          "Error parsing occupied time:",
          error,
          "Input:",
          occupiedTime
        );
        return "";
      }
    };

    // Determine table styles based on status
    let tableStyles = {};
    
    if (isPrintAndSave) {
      // Print_and_save table - orange style
      tableStyles = {
        backgroundColor: "#fff3e0", // Light orange/peach background
        borderColor: "#ff9800", // Orange border
        borderStyle: "dashed",
      };
    } else if (isKotAndSave) {
      // KOT_and_save table - special black/grey style
      tableStyles = {
        backgroundColor: "#e2e2e2", // grey background
        borderColor: "#000000", // black border
        borderStyle: "dashed",
      };
    } else if (isCreateOrder) {
      // Create_order table - blue style
      tableStyles = {
        backgroundColor: "#ffcdd2", // Light blue background
        borderColor: "#ffcdd2", // Blue border
        borderStyle: "dashed",
      };
    } else if (isPlaced) {
      // Placed table - red style
      tableStyles = {
        backgroundColor: "#ffcdd2",
        borderColor: "#dc3545",
        borderStyle: "dashed",
      };
    } else if (isSave) {
      // Save action table - green style
      tableStyles = {
        backgroundColor: "#e8f5e9", // Light green background
        borderColor: "#4CAF50", // Green border
        borderStyle: "solid", // Solid border instead of dashed
      };
    } else if (item.is_occupied) {
      // Occupied table - red style
      tableStyles = {
        backgroundColor: "#ffcdd2",
        borderColor: "#dc3545",
        borderStyle: "dashed",
      };
    } else if (isReserved) {
      // Reserved table - grey style
      tableStyles = {
        backgroundColor: "#e0e0e0",
        borderColor: "#757575",
        borderStyle: "dashed",
      };
    } else {
      // Available table - white with black dotted border (CHANGED)
      tableStyles = {
        backgroundColor: "#ffffff", // White background instead of green
        borderColor: "#000000", // Black border instead of green
        borderStyle: "dotted", // Dotted border instead of dashed
      };
    }

    // Define handlePrinterPress inside renderTableItem where 'item' is in scope
    const handlePrinterPress = () => {
      if (!item.order_id) {
        Alert.alert("Error", "This table doesn't have an active order");
        return;
      }
      
      // Use the openPaymentModal function to properly set up the modal
      openPaymentModal(item);
    };

    // Add a new function to handle the reserve button press
    const handleReservePress = () => {
      Alert.alert(
        "Reserve Table",
        `Are you sure you want to reserve Table ${item.table_number}?`,
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Reserve",
            onPress: () => reserveTable(item.table_id, item.table_number, section.section_id)
          }
        ]
      );
    };

    return (
      <Pressable
        style={[
          styles.tableCard,
          tableStyles
        ]}
        onPress={async () => {
          // Format the table data for navigation
          const formattedTableData = {
            table_id: item.table_id,
            table_number: item.table_number,
            section_id: section.section_id,
            section_name: section.section_name,
            outlet_id: item.outlet_id,
            is_occupied: item.is_occupied,
            is_reserved: item.is_reserved,
          };

          // Add order-related data if the table is occupied
          if (item.is_occupied && item.order_id) {
            formattedTableData.order_id = item.order_id;
            formattedTableData.order_number = item.order_number;
            formattedTableData.grand_total = parseFloat(item.grand_total || 0).toFixed(2);
            formattedTableData.occupied_time = item.occupied_time;
          }

          // Always navigate to DemoScreen first, passing the appropriate data
          navigation.navigate("DemoScreen", {
            tableData: formattedTableData,
            orderType: "dine-in"
          });
        }}
      >
        {/* Price tag at the top */}
        {item.is_occupied && (
          <Text
            style={[
              styles.tablePrice,
              {
                position: "absolute",
                top: -10,
                alignSelf: "center",
                backgroundColor: isPrintAndSave ? "#ff9800" : isKotAndSave ? "#000000" : isCreateOrder ? "#dc3545" : isSave ? "#4CAF50" : "#2196f3", 
                color: "#ffffff",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                fontSize: 12,
              },
            ]}
          >
            ₹{(item.grand_total || 0).toFixed(2)}
          </Text>
        )}

        {/* Add Reserved label for reserved tables */}
        {isReserved && !item.is_occupied && (
          <Text
            style={[
              styles.tableReserved,
              {
                position: "absolute",
                top: -10,
                alignSelf: "center",
                backgroundColor: "#757575",
                color: "#fff",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                fontSize: 12,
              },
            ]}
          >
            Reserved
          </Text>
        )}

        <View style={styles.tableNumberContainer}>
          {(isKotAndSave || isPrintAndSave || isCreateOrder || isPlaced || isSave) && (
            <Animated.View 
              style={[
                styles.kotIndicatorDot,
                {
                  opacity: blinkAnim
                }
              ]} 
            />
          )}
          <Text style={styles.tableNumber}>{item.table_number}</Text>
        </View>
        <Text style={[
          styles.tableStatus,
          item.occupied_time && getTimeDifference(item.occupied_time).includes('m') && 
          parseInt(getTimeDifference(item.occupied_time).split('m')[0]) > 45 ? 
          { color: 'red' } : 
          item.occupied_time && (getTimeDifference(item.occupied_time).includes('h') || 
          getTimeDifference(item.occupied_time).includes('3h+')) ? 
          { color: 'red' } : {}
        ]}>
          {item.occupied_time ? getTimeDifference(item.occupied_time) : ""}
        </Text>
        
        {/* Bottom print icon for KOT_and_save tables */}
        {isKotAndSave && (
          <TouchableOpacity 
            style={[styles.bottomPrintIconContainer, { backgroundColor: "#000000" }]}
            onPress={handlePrinterPress}
          >
            <RemixIcon name="printer-line" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        
        {/* Bottom print icon for Save tables */}
        {isSave && (
          <TouchableOpacity 
            style={[styles.bottomPrintIconContainer, { backgroundColor: "#4CAF50" }]}
            onPress={handlePrinterPress}
          >
            <RemixIcon name="printer-line" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        
        {showIcons && (
          <TouchableOpacity
            style={styles.qrCodeIcon}
            onPress={() =>
              fetchTableQRCode(
                item.table_id,
                item.table_number,
                section.section_id
              )
            }
          >
            <RemixIcon name="qr-code-line" size={20} color="#198754" />
          </TouchableOpacity>
        )}

        {/* Reserve icon for available tables when in edit mode */}
        {showIcons && isAvailable && settings?.reserve_table && (
          <TouchableOpacity
            style={styles.reserveTableIcon}
            onPress={handleReservePress}
          >
            <RemixIcon name="lock-line" size={20} color="#ff9800" />
          </TouchableOpacity>
        )}

        {/* Unreserve icon for reserved tables when in edit mode */}
        {showIcons && isReserved && !item.is_occupied && settings?.reserve_table && (
          <TouchableOpacity
            style={styles.unreserveTableIcon}
            onPress={() => handleUnreservePress(item.table_id, item.table_number, section.section_id)}
          >
            <RemixIcon name="lock-unlock-line" size={20} color="#757575" />
          </TouchableOpacity>
        )}

        {/* Bottom print icon for Print_and_save tables */}
        {isPrintAndSave && (
          <TouchableOpacity
            style={[styles.bottomPrintIconContainer, { backgroundColor: "#ff9800" }]}
            onPress={handlePrinterPress}
          >
            <RemixIcon name="printer-line" size={22} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bottom print icon for create_order tables */}
        {isCreateOrder && (
          <TouchableOpacity
            style={[styles.bottomPrintIconContainer, { backgroundColor: "#dc3545" }]}
            onPress={handlePrinterPress}
          >
            <RemixIcon name="printer-line" size={22} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bottom print icon for placed tables */}
        {isPlaced && (
          <TouchableOpacity
            style={[styles.bottomPrintIconContainer, { backgroundColor: "#dc3545" }]}
            onPress={handlePrinterPress}
          >
            <RemixIcon name="printer-line" size={22} color="#fff" />
          </TouchableOpacity>
        )}
        

        {showDeleteIcon && (
          <TouchableOpacity
            style={styles.deleteTableButton}
            onPress={() => confirmDeleteTable(item.table_id, section.section_id)}
          >
            <RemixIcon name="delete-bin-line" size={20} color="#dc3545" />
          </TouchableOpacity>
        )}
      </Pressable>
    );
  };

  const getSectionStats = (tables) => {
    const total = tables.length;
    const occupied = tables.filter((table) => table.is_occupied).length;
    const available = total - occupied;
    return { total, occupied, available };
  };

  const filterTables = (tables, sectionName) => {
    return tables.filter((table) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        table.table_number.toString().includes(searchQuery) ||
        sectionName.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (filterStatus === "occupied") {
        matchesStatus = table.is_occupied === 1;
      } else if (filterStatus === "available") {
        matchesStatus = table.is_occupied === 0;
      }

      return matchesSearch && matchesStatus;
    });
  };

  const renderSection = ({ item }) => {
    // Calculate stats for this specific section
    const sectionStats = {
      total: item.tables.length,
      occupied: item.tables.filter((table) => table.is_occupied === 1).length,
      available: item.tables.filter((table) => table.is_occupied === 0).length,
    };

    const filteredTables = filterTables(item.tables, item.section_name);

    // Sort tables by table_id to ensure consistent ordering
    const sortedTables = [...item.tables].sort(
      (a, b) => b.table_id - a.table_id
    );
    const lastTable = sortedTables[0];

    // Create updated section object with last table info
    const updatedSection = {
      ...item,
      lastTableId: lastTable ? lastTable.table_id : null,
      isLastTableUnoccupied: lastTable ? lastTable.is_occupied === 0 : false,
    };

    // If search query matches neither section name nor any tables, hide the section
    if (
      searchQuery &&
      !item.section_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      filteredTables.length === 0
    ) {
      return null;
    }

    return (
      <View key={item.section_id}>
        {/* Icons moved above the card */}
        {showIcons && (
          <View style={styles.sectionIconsContainer}>
            
            <Pressable
              onPress={() => handleEditSection(item.section_id)}
              style={styles.iconButton}
            >
              <RemixIcon name="edit-2-line" size={20} />
            </Pressable>
            {item.tables.every((table) => table.is_occupied === 0) && (
              <Pressable
                onPress={() => {
                  setDeletingTable({
                    section_id: item.section_id,
                    section_name: item.section_name,
                  });
                  handleDeleteSection();
                }}
                style={styles.iconButton}
              >
                <RemixIcon name="delete-bin-line" size={20} />
              </Pressable>
            )}
          </View>
        )}

        {/* Section card */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionHeader} numberOfLines={1} ellipsizeMode="tail">
                  {item.section_name}
                </Text>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total:</Text>
                  <Text style={styles.statNumber}>{sectionStats.total}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: "#dc3545" }]}>
                    Occupied:
                  </Text>
                  <Text style={[styles.statNumber, { color: "#dc3545" }]}>
                    {sectionStats.occupied}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: "#198754" }]}>
                    Available:
                  </Text>
                  <Text style={[styles.statNumber, { color: "#198754" }]}>
                    {sectionStats.available}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {filteredTables.length > 0 ? (
            <FlatList
              data={[...filteredTables, ...(showIcons ? [{ isAddTableCard: true }] : [])]}
              renderItem={({ item }) => 
                item.isAddTableCard ? 
                  <AddTableCard sectionId={updatedSection.section_id} /> : 
                  renderTableItem({ item, section: updatedSection })
              }
              keyExtractor={(item) => item.isAddTableCard ? 'add-table' : item.table_id.toString()}
              numColumns={3}
              columnWrapperStyle={styles.tableRow}
            />
          ) : (
            <Text style={styles.noTablesText}>
              No tables match the filter criteria
            </Text>
          )}
        </View>
      </View>
    );
  };

  

  // Add refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Refresh settings first
      const appSettings = await getSettings();
      setSettings(appSettings);
      console.log("Settings refreshed on pull-to-refresh");
      
      // Then refresh tables data
      await fetchTables();
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Add handleCreateTable function
 

  // Add handleCreateSection function
  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      Alert.alert("Error", "Section name cannot be empty");
      return;
    }

    try {
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);
      setLoading(true);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_create",
        {
          outlet_id: restaurantId,
          section_name: newSectionName.trim(),
          user_id: parseInt(userId),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setIsCreateSectionModalVisible(false);
        setNewSectionName("");
        fetchTables();
        Alert.alert(
          "Success", 
          "Section created successfully",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", response.data.msg || "Failed to create section");
      }
    } catch (error) {
      console.error("Error creating section:", error);
      Alert.alert("Error", "Failed to create section");
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to fetch settings
  const [settings, setSettings] = useState({
   
    reserve_table: true,
   
  });

  useFocusEffect(
    React.useCallback(() => {
      // This will run when the screen is focused
      const loadSettings = async () => {
        console.log("Loading settings in RestaurantTables screen");
        try {
          // Always get the latest settings from API
          const appSettings = await getSettings();
          console.log("Settings loaded:", appSettings);
          setSettings(appSettings);
        } catch (error) {
          console.error("Error loading settings in RestaurantTables:", error);
          // No need for Alert since getSettings has fallbacks
        }
      };
      
      loadSettings();
      fetchTables();
      
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  // Update the order type buttons rendering
  const renderOrderTypeButtons = () => {
    // Make sure settings is not null
    if (!settings) {
      console.log("Settings not loaded yet");
      return null;
    }

    console.log("Rendering buttons with settings:", settings);

    // Create array of enabled order types
    const enabledButtons = [
      settings.has_counter && {
        type: "counter",
        icon: "store-2-fill",
        label: "Counter",
        color: "#000000" // Black for counter
      },
      settings.has_parcel && {
        type: "parcel",
        icon: "hand-heart-fill",
        label: "Parcel",
        color: "#000000" // Black for parcel
      },
      settings.has_delivery && {
        type: "delivery",
        icon: "motorbike-fill",
        label: "Delivery",
        color: "#000000" // Black for delivery
      },
      settings.has_drive_through && {
        type: "drive-through",
        icon: "car-fill",
        label: "Drive",
        color: "#000000" // Black for drive-through
      }
    ].filter(Boolean); // Remove false values
    
    console.log("Enabled buttons:", enabledButtons);

    if (enabledButtons.length === 0) {
      return null;
    }

    // Calculate button width based on number of enabled buttons
    const buttonWidth = `${(100 / enabledButtons.length) - 2}%`;

    return (
      <View style={styles.orderTypeContainer}>
        {enabledButtons.map((button) => (
          <TouchableOpacity
            key={button.type}
                        style={[              styles.orderTypeButton,               {                 width: buttonWidth,                borderColor: "#000000",                backgroundColor: "#FFFFFF"              }            ]}
            onPress={() => handleOrderTypeSelect(button.type)}
          >
            <RemixIcon name={button.icon} size={16} color="#777777" />
            <Text style={[styles.orderTypeButtonText, { color: "#000000" }]}>{button.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Update the shareQR function to use its own loading state
  const shareQR = async () => {
    try {
      setIsSharing(true);

      // Get restaurant name from AsyncStorage
      const restaurantName = await AsyncStorage.getItem("restaurant_name") || "Restaurant";
      
      // Clean restaurant name (remove special characters and spaces)
      const cleanRestaurantName = restaurantName.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Get the logo using the same method as invoice
      const asset = Asset.fromModule(require('../../assets/icon.png'));
      await asset.downloadAsync();
      const logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Create HTML content with improved styling
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
              .title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
                width: 100%;
                text-align: center;
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
              <div class="subtitle">Table ${selectedQRData.tableNumber} QR Code</div>
              
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

      // Generate a temp file with stable dimensions
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 400,
        height: 400
      });

      // Create a meaningful filename with restaurant name and table number
      const fileName = `${cleanRestaurantName}_Table_${selectedQRData.tableNumber}_QR.pdf`;

      // Share the generated file with custom filename
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share QR Code',
          UTI: 'com.adobe.pdf',
          filename: fileName
        });
        setIsQRModalVisible(false);
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
      Alert.alert("Error", "Failed to share QR code.");
    } finally {
      setIsSharing(false);
    }
  };

  // Add these functions to handle order type selection
  const handleOrderTypeSelect = (orderType) => {
    setIsOrderTypeModalVisible(false);
    navigation.navigate("DemoScreen", {
      orderType: orderType,
      // Don't pass table data for non-dine-in orders
    });
  };

  // Add this helper function for title case conversion
  const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, (text) => {
      return text.charAt(0).toUpperCase() + text.substr(1).toLowerCase();
    });
  };

  // Add handleAddTable function
  const handleAddTable = async (sectionId) => {
    try {
      const [restaurantId, accessToken, userId] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
        AsyncStorage.getItem("user_id"),
      ]);
      setLoading(true);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_create",
        {
          outlet_id: restaurantId,
          section_id: sectionId,
          user_id: parseInt(userId),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        await fetchTables();
        Alert.alert("Success", "Table created successfully");
      } else {
        Alert.alert("Error", response.data.msg || "Failed to create table");
      }
    } catch (error) {
      console.error("Error creating table:", error);
      Alert.alert("Error", "Failed to create table. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add new component for the "Add Table" card
  const AddTableCard = ({ sectionId }) => {
    return (
      <Pressable
        style={[styles.tableCard]}
        onPress={() => handleAddTable(sectionId)}
      >
        <RemixIcon name="add-circle-line" size={24} color="#0dcaf0" />
        <Text style={styles.tableCardText}>Add Table</Text>
      </Pressable>
    );
  };

  // Updated QRCodeModal component to better match the RestaurantInfo.js implementation
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
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setIsQRModalVisible(false)}
            >
              <RemixIcon name="close-line" size={24} color="#000" />
            </TouchableOpacity>

            <Text style={styles.qrTableNumber}>Table {selectedQRData?.tableNumber} QR Code</Text>
            
            {selectedQRData ? (
              <>
                {/* ViewShot wrapper with ref - IMPORTANT for capture */}
                <ViewShot ref={qrViewRef} options={{ format: 'png', quality: 1 }}>
                  <View style={styles.qrWrapper}>
                    <View style={styles.qrFrame}>
                      {/* QR Code image */}
                      <Image
                        source={{ uri: selectedQRData?.qrCodeUrl }}
                        style={styles.qrCodeImage}
                      />
                      
                      {/* Logo overlay */}
                      <View style={styles.logoWhiteSpace}>
                        <View style={styles.logoContainer}>
                          <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logoOverlay}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                      
                      {/* Corner markers */}
                      <View style={[styles.cornerMarker, styles.topLeftMarker]} />
                      <View style={[styles.cornerMarker, styles.topRightMarker]} />
                      <View style={[styles.cornerMarker, styles.bottomLeftMarker]} />
                      <View style={[styles.cornerMarker, styles.bottomRightMarker]} />
                    </View>
                  </View>
                </ViewShot>
                
                <Text style={styles.scanText}>Scan to place your order</Text>
                
                <View style={styles.qrButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.qrButton, 
                      styles.downloadButton,
                      (isDownloading || isSharing) && styles.disabledButton
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
                        <RemixIcon name="download-2-line" size={20} color="#fff" />
                        <Text style={styles.qrButtonText}>Download</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.qrButton, 
                      styles.shareButton,
                      (isDownloading || isSharing) && styles.disabledButton
                    ]}
                    onPress={shareQR}
                    disabled={isDownloading || isSharing}
                  >
                    {isSharing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <RemixIcon name="share-line" size={20} color="#fff" />
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

  // Updated downloadAsPNG function to match the working implementation from RestaurantInfo.js
  

  // Add or update the function that opens the payment modal
 

  // Add this effect to handle hardware back button
  useEffect(() => {
    // Handle back button press
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Navigate to HomeScreen instead of going back in the stack
      navigation.navigate("TabScreen/HomeScreen");
      return true; // Prevent default behavior
    });

    // Clean up the event listener on unmount
    return () => backHandler.remove();
  }, [navigation]);

  // Add this ref near your other refs
  const qrViewRef = useRef(null);

  // Add the Delete Confirmation Modal component
  const DeleteConfirmationModal = () => (
    <Modal
      visible={isDeleteConfirmModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsDeleteConfirmModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setIsDeleteConfirmModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}> Confirm Delete</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to delete the section "{deletingTable?.section_name}"?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setIsDeleteConfirmModalVisible(false);
                    setDeletingTable(null);
                  }}
                >
                  <RemixIcon name="close-line" size={16} color="#6c757d" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.deleteButton]}
                  onPress={confirmDeleteSection}
                >
                  <RemixIcon name="delete-bin-line" size={16} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Add handleSectionStatusChange function after other handler functions
  

  // Add fetchSectionsList function after other fetch functions
  const fetchSectionsList = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "section_listview",
        {
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
        // Store the sections list data
        setSectionsList(response.data.data);
        
        // Update the sections data with active status
        setSections(prevSections => {
          return prevSections.map(section => {
            // Find matching section from sections list
            const sectionData = response.data.data.find(
              s => s.section_id === section.section_id
            );
            
            if (sectionData) {
              return {
                ...section,
                is_active: true, // Default to true since active status isn't in the response
                table_count: sectionData.table_count,
                occupied_table_count: sectionData.occupied_table_count,
                remaining_table_count: sectionData.remaining_table_count
              };
            }
            return section;
          });
        });
      } else {
        console.error("Failed to fetch sections list:", response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching sections list:", error);
    }
  };

  // Add this function to handle reserving a table
  const reserveTable = async (tableId, tableNumber, sectionId) => {
    try {
      setIsLoading(true);
      
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token")
      ]);
      
      // Call the API to reserve the table
      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_is_reserved",
        {
          table_id: tableId.toString(),
          table_number: tableNumber.toString(),
          outlet_id: restaurantId.toString(),
          is_reserved: true,
          user_id: userId.toString()
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.data.st === 1) {
        Alert.alert("Success", "Table has been reserved");
        // Refresh the tables to show the updated reserved status
        fetchTables();
      } else {
        Alert.alert("Error", response.data.msg || "Failed to reserve table");
      }
    } catch (error) {
      console.error("Error reserving table:", error);
      Alert.alert("Error", error.response?.data?.msg || error.message || "Failed to reserve table");
    } finally {
      setIsLoading(false);
    }
  };

  // Add handleUnreservePress function after the reserveTable function
  const handleUnreservePress = (tableId, tableNumber, sectionId) => {
    Alert.alert(
      "Unreserve Table",
      `Are you sure you want to unreserve Table ${tableNumber}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Unreserve",
          onPress: () => unreserveTable(tableId, tableNumber, sectionId)
        }
      ]
    );
  };

  // Add unreserveTable function after handleUnreservePress
  const unreserveTable = async (tableId, tableNumber, sectionId) => {
    try {
      setIsLoading(true);
      
      const [restaurantId, userId, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token")
      ]);
      
      // Call the API to unreserve the table (same endpoint but with is_reserved=false)
      const response = await axiosInstance.post(
        onGetProductionUrl() + "table_is_reserved",
        {
          table_id: tableId.toString(),
          table_number: tableNumber.toString(),
          outlet_id: restaurantId.toString(),
          is_reserved: false, // Set to false to unreserve
          user_id: userId.toString()
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.data.st === 1) {
        Alert.alert("Success", "Table has been unreserved");
        // Refresh the tables to show the updated reserved status
        fetchTables();
      } else {
        Alert.alert("Error", response.data.msg || "Failed to unreserve table");
      }
    } catch (error) {
      console.error("Error unreserving table:", error);
      Alert.alert("Error", error.response?.data?.msg || error.message || "Failed to unreserve table");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.navigate("TabScreen/HomeScreen")}>
  <Icon name="arrow-back" size={24} color="#000" />
</TouchableOpacity>
        <Text style={styles.headerTitle}> Restaurant Table</Text>
        <Pressable
          onPress={() => setShowIcons(!showIcons)}
          style={[styles.gearIcon, showIcons && styles.gearIconActive]}
        >
          <RemixIcon name="settings-3-line" size={24} />
        </Pressable>
      </View>

      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Section"
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" />}
        />
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === "all" && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus("all")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === "all" && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === "occupied" && styles.filterButtonActiveOc,
            ]}
            onPress={() => setFilterStatus("occupied")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === "occupied" && styles.filterButtonTextActive,
              ]}
            >
              Occupied
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterStatus === "available" && styles.filterButtonActiveAv,
            ]}
            onPress={() => setFilterStatus("available")}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === "available" && styles.filterButtonTextActive,
              ]}
            >
              Available
            </Text>
          </TouchableOpacity>
        </View>
      </View>

    

      {renderOrderTypeButtons()}
        {/* Sales Summary badges */}
        <View style={styles.salesContainer}>
          <View style={[styles.salesBadge]}>
            <Text style={styles.salesLabel}>Today's Sales</Text>
            <Text style={styles.salesAmount}>₹{todaySales}</Text>
          </View>
          <View style={[styles.salesBadge, styles.liveSalesBadge]}>
            <Text style={styles.salesLabel}>Live Sales</Text>
            <Text style={styles.salesAmount}>₹{liveSales}</Text>
          </View>
        </View>

      <View style={styles.container}>
        {/* Render all sections */}
        <FlatList
          data={sections} // Use the updated sections array
          renderItem={renderSection} // Render each section
          keyExtractor={(item) => item.section_id.toString()} // Use section_id as the key
          contentContainerStyle={{ paddingBottom: 100 }} // Add padding to avoid overlap with buttons
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0dcaf0"]} // Android - using your theme color
              tintColor="#0dcaf0" // iOS
            />
          }
        />

        {/* Sticky Footer Buttons */}
        <View style={styles.footer}>
          {/* Add New Section Button */}
          <TouchableOpacity
            style={[styles.floatingButton, styles.sectionButton]}
            onPress={() => setIsCreateSectionModalVisible(true)}
          >
            <RemixIcon name="add-circle-line" size={20} color="#fff" />
            <Text style={styles.floatingButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Section</Text>
                <TextInput
                  style={styles.input}
                  value={editingSectionName}
                  onChangeText={setEditingSectionName}
                  label={
                    <Text style={styles.label}>
                      <Text style={{ color: "red" }}>*</Text> Section Name
                    </Text>
                  }
                  mode="outlined"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setIsEditModalVisible(false)}
                  >
                    <RemixIcon name="close-line" size={16} color="#6c757d" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.updateButton]}
                    onPress={handleUpdateSection}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
  visible={isCreateSectionModalVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => {
    setNewSectionName(""); // Reset input
    setSectionNameError(""); // Reset error
    setIsCreateSectionModalVisible(false);
  }}
>
        <TouchableWithoutFeedback 
          onPress={() => {
            setNewSectionName(""); // Reset input
            setSectionNameError(""); // Reset error
            setIsCreateSectionModalVisible(false);
          }}
        >
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Section</Text>
                <TextInput
                  style={[
                    styles.input,
                    sectionNameError ? styles.inputError : null,
                  ]}
                  value={newSectionName}
                  onChangeText={(text) => {
                    setNewSectionName(text);
                    setSectionNameError(""); // Clear error when typing
                  }}
                  label={
                    <Text style={styles.label}>
                      <Text style={{ color: "red" }}>*</Text> Section name
                    </Text>
                  }
                  mode="outlined"
                  error={!!sectionNameError}
                />
                {sectionNameError ? (
                  <Text style={styles.errorText}>{sectionNameError}</Text>
                ) : null}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setNewSectionName(""); // Reset input
                      setSectionNameError(""); // Reset error
                      setIsCreateSectionModalVisible(false);
                    }}
                  >
                    <RemixIcon name="close-line" size={16} color="#6c757d" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.updateButton]}
                    onPress={() => {
                      if (!newSectionName.trim()) {
                        setSectionNameError("Section name is required");
                        return;
                      }
                      handleCreateSection();
                    }}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* QR Code Modal */}
      <QRCodeModal />

      <PaymentModal
        visible={isPaymentModalVisible}
        onClose={() => setIsPaymentModalVisible(false)}
        onConfirm={handleSettlePayment}
        orderData={selectedTable}
      />

      <CustomTabBar />
      
      {/* Add this near your other modals */}
      <DeleteConfirmationModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6c757d',
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  updateButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 10,
  },
  sectionContainer: {
    padding: 5,
    borderColor: "rgba(145,145,145,0.59)",
    borderRadius: 10,
    borderWidth: 0.5,
    marginBottom: 20,
    backgroundColor: "white",
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 4,
    flexWrap: "nowrap", // Prevent wrapping to next line
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginRight: 8,
    maxWidth: "30%", // Limit width to prevent overlap
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
    marginRight: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginRight: 1,
  },
  statNumber: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // Space between icons
  },
  iconButton: {
    backgroundColor: "rgba(128, 128, 128, 0.2)", // Light gray with transparency
    borderRadius: 50, // Fully rounded
    padding: 8, // Internal padding
    width: 36, // Fixed width
    height: 36, // Fixed height
    justifyContent: "center",
    alignItems: "center",
  },
  tableCard: {
    width: "31%",
    margin: "1%",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    height: 100,
    minWidth: 90,
    marginBottom: 20,
  },
  tableNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tableStatus: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
  },
  deleteIcon: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  footer: {
    marginBottom: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 5,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    backgroundColor: "#0dcaf0",
    borderRadius: 30,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sectionButton: {
    bottom: 70, // Add New Section button above Create
  },
  floatingButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  tableRow: {
    justifyContent: "flex-start",
    flexWrap: "wrap",
    width: "100%",
  },
  gearIcon: {
    borderRadius: 50,
    width: 40, // Fixed width to ensure circle
    height: 40, // Fixed height to ensure circle
    justifyContent: "center", // Center icon horizontally
    alignItems: "center", // Center icon vertically
  },
  gearIconActive: {
    backgroundColor: "rgba(128, 128, 128, 0.2)", // Light gray with transparency
    borderRadius: 50,
  },
  dropdownContainer: {
    marginBottom: 15,
  },
  dropdownLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  sectionsList: {
    maxHeight: 150,
  },
  sectionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedSection: {
    backgroundColor: "#219ebc",
  },
  sectionItemText: {
    fontSize: 14,
    color: "#333",
  },
  selectedSectionText: {
    color: "#fff",
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    marginTop: 8,
  },
  picker: {
    height: 50,
  },
  qrCodeIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    padding: 5,
    zIndex: 1,
  },
  qrCodeImage: {
    width: 250,
    height: 250,
    resizeMode: "contain",
    marginVertical: 20,
  },
  qrButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    gap: 15,
  },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  downloadButton: {
    backgroundColor: "#0dcaf0",
  },
  shareButton: {
    backgroundColor: "#198754",
  },
  qrButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  closeModalButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 1,
  },
  filterContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInput: {
    backgroundColor: "white",
    borderRadius: 8,
    height: 40,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#0dcaf0",
    borderColor: "skyblue",
  },
  filterButtonActiveAv: {
    backgroundColor: "green",
    borderColor: "green",
  },
  filterButtonActiveOc: {
    backgroundColor: "red",
    borderColor: "red",
  },
  filterButtonText: {
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    elevation: 2,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 100,
  },
  statLabel: {
    fontSize: 14,
    color: "#0dcaf0",
    marginRight: 1,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0dcaf0",
  },
  sectionHeaderLeft: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 10,
    paddingBottom: 8,
  },
  noTablesText: {
    textAlign: "center",
    color: "#666",
    padding: 20,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0dcaf0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
    orderTypeButtonText: {    color: '#000000',    marginLeft: 4,    fontSize: 12,    fontWeight: '500',  },
  orderTypeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0dcaf0",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  orderTypeModalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    width: "80%",
    padding: 20,
  },
  inputError: {
    borderColor: "red",
    borderWidth: 1,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerError: {
    borderColor: "red",
    borderWidth: 1,
  },
  qrButtonDisabled: {
    opacity: 0.5,
  },
  tableReserved: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    backgroundColor: "#757575",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
  },
  kotIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc3545',
    marginRight: 8,
  },
  bottomPrintIconContainer: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sectionIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
    marginBottom: 4,
  },
  toggleLoader: {
    marginRight: 4,
  },
  tableActionIcons: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    flexDirection: 'row',
    gap: 4,
  },
  tableActionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  deleteTableButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 999, // Ensure it's above other elements
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addTableCard: {
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    backgroundColor: '#f8f9fa',
  },
  addTableText: {
    color: '#0dcaf0',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  qrTableNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    marginTop: 10,
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
    marginVertical: 20,
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
  },
  qrCodeImage: {
    width: 260,
    height: 260,
    borderRadius: 8,
  },
  logoWhiteSpace: {
    position: 'absolute',
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  logoContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  logoOverlay: {
    width: 50,
    height: 50,
  },
  cornerMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 5,
    backgroundColor: 'transparent',
  },
  topLeftMarker: {
    top: 10,
    left: 10,
    borderTopColor: '#FF7043',
    borderLeftColor: '#FF7043',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopLeftRadius: 6,
  },
  topRightMarker: {
    top: 10,
    right: 10,
    borderTopColor: '#FF7043',
    borderRightColor: '#FF7043',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    borderTopRightRadius: 6,
  },
  bottomLeftMarker: {
    bottom: 10,
    left: 10,
    borderBottomColor: '#FF7043',
    borderLeftColor: '#FF7043',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomLeftRadius: 6,
  },
  bottomRightMarker: {
    bottom: 10,
    right: 10,
    borderBottomColor: '#FF7043',
    borderRightColor: '#FF7043',
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomRightRadius: 6,
  },
  scanText: {
    fontSize: 16,
    color: "#666",
    textAlign: 'center',
    marginBottom: 20,
  },
  qrButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
    gap: 15,
  },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  downloadButton: {
    backgroundColor: "#0dcaf0",
  },
  shareButton: {
    backgroundColor: "#198754",
  },
  qrButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  paymentModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 8,
    padding: 20,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
   
    marginBottom: 10,
    textAlign: 'left', // Left align the title
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 15,
    textAlign: 'left', // Left align the label
  },
  paymentOptionsContainer: {
    marginBottom: 20,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '95%',
  },
 
  radioButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 18, // Smaller radio button
    height: 18, // Smaller radio button
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#0dcaf0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  radioButtonSelected: {
    borderColor: '#0dcaf0',
  },
  radioButtonInner: {
    width: 8, // Smaller inner circle
    height: 8, // Smaller inner circle
    borderRadius: 4,
    backgroundColor: '#0dcaf0',
  },
  paymentOptionText: {
    fontSize: 14,
    color: '#333',
  },
  paidCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18, // Smaller checkbox
    height: 18, // Smaller checkbox
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  checkboxChecked: {
    backgroundColor: '#0dcaf0',
    borderColor: '#0dcaf0',
  },
  paidText: {
    color: "#333",
    marginLeft: 6,
  },
  complementaryContainer: {
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2196f3",
  },
  complementaryText: {
    color: "#333",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  settleButton: {
    backgroundColor: '#0dcaf0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  qrContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
  },
  qrImage: {
    width: 230,
    height: 230,
    resizeMode: 'contain',
  },
  settleButtonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  // Add or update these styles
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
  logoOverlay: {
    width: 40,
    height: 40,
  },
  tableInfoText: {
    position: 'absolute',
    bottom: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  reserveTableIcon: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    zIndex: 999, // Ensure it's above other elements
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  unreserveTableIcon: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    zIndex: 999, // Ensure it's above other elements
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  salesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  salesBadge: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'grey',
  },
  liveSalesBadge: {
    backgroundColor: 'rgba(253,237,232,0.8)',
    borderLeftColor: '#FF9A6C',
    marginRight: 0,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#FF9A6C'
  },
  salesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 4,
  },
  salesAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default RestaurantTables;
