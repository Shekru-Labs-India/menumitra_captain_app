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
  Modal,
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
  const qrViewRef = useRef();

  const fetchRestaurantInfo = async () => {
    try {
      setLoading(true);
      const outlet_id = await AsyncStorage.getItem("outlet_id");
      const captain_id = await AsyncStorage.getItem("captain_id");

      if (!outlet_id || !captain_id) {
        throw new Error("Required data missing");
      }

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

  // QR Code Modal Component
  const QRCodeModal = () => {
    return (
      <Modal
        isOpen={isQRModalVisible}
        onClose={() => setIsQRModalVisible(false)}
        size="lg"
      >
        <Modal.Content borderRadius="lg">
          <Modal.Header>
            <HStack justifyContent="space-between" alignItems="center" width="100%">
              <Heading size="md">COUNTER QR Code</Heading>
              <IconButton
                icon={<Icon as={MaterialIcons} name="close" size="sm" />}
                onPress={() => setIsQRModalVisible(false)}
                variant="ghost"
                _pressed={{ bg: "coolGray.100" }}
                borderRadius="full"
              />
            </HStack>
          </Modal.Header>
          
          <Modal.Body alignItems="center">
            {selectedQRData ? (
              <>
                <ViewShot ref={qrViewRef} options={{ format: 'png', quality: 1 }}>
                  <Box
                    width="250px"
                    height="250px"
                    padding="10px"
                    bg="white"
                    borderWidth="3"
                    borderColor="#FF7043"
                    borderRadius="10"
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                    shadow={2}
                  >
                    {/* Corner markers */}
                    <Box
                      position="absolute"
                      top="10px"
                      left="10px"
                      width="20px"
                      height="20px"
                      borderTopWidth="4"
                      borderLeftWidth="4"
                      borderColor="#0066FF"
                      borderTopLeftRadius="8"
                    />
                    <Box
                      position="absolute"
                      top="10px"
                      right="10px"
                      width="20px"
                      height="20px"
                      borderTopWidth="4"
                      borderRightWidth="4"
                      borderColor="#0066FF"
                      borderTopRightRadius="8"
                    />
                    <Box
                      position="absolute"
                      bottom="10px"
                      left="10px"
                      width="20px"
                      height="20px"
                      borderBottomWidth="4"
                      borderLeftWidth="4"
                      borderColor="#0066FF"
                      borderBottomLeftRadius="8"
                    />
                    <Box
                      position="absolute"
                      bottom="10px"
                      right="10px"
                      width="20px"
                      height="20px"
                      borderBottomWidth="4"
                      borderRightWidth="4"
                      borderColor="#0066FF"
                      borderBottomRightRadius="8"
                    />
                    
                    {/* QR Image */}
                    <Image
                      source={{ uri: selectedQRData?.qrCodeUrl }}
                      style={styles.qrImage}
                    />
                    
                    {/* Logo in center */}
                    <Box
                      position="absolute"
                      width="60px"
                      height="60px"
                      bg="white"
                      borderRadius="30px"
                      justifyContent="center"
                      alignItems="center"
                      shadow={2}
                    >
                      <Box
                        width="45px"
                        height="45px"
                        bg="white"
                        borderRadius="25px"
                        justifyContent="center"
                        alignItems="center"
                        overflow="hidden"
                      >
                        <Image
                          source={mmLogo}
                          style={styles.logoOverlay}
                          resizeMode="contain"
                        />
                      </Box>
                    </Box>
                  </Box>
                </ViewShot>
                
                <Text style={styles.scanText}>
                  Scan to view our digital menu
                </Text>
                
                <HStack space={3} mt={4}>
                  {/* Download Button */}
                  <Pressable
                    style={[
                      styles.qrButton,
                      styles.downloadButton,
                      (isDownloading || isSharing) && styles.disabledButton,
                    ]}
                    onPress={downloadAsPNG}
                    disabled={isDownloading || isSharing}
                  >
                    {isDownloading ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <HStack space={2} alignItems="center">
                        <Icon as={MaterialIcons} name="file-download" size="sm" color="white" />
                        <Text style={styles.qrButtonText}>Download</Text>
                      </HStack>
                    )}
                  </Pressable>
                  
                  {/* Share Button */}
                  <Pressable
                    style={[
                      styles.qrButton,
                      styles.shareButton,
                      (isDownloading || isSharing) && styles.disabledButton,
                    ]}
                    onPress={shareQR}
                    disabled={isDownloading || isSharing}
                  >
                    {isSharing ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <HStack space={2} alignItems="center">
                        <Icon as={MaterialIcons} name="share" size="sm" color="white" />
                        <Text style={styles.qrButtonText}>Share</Text>
                      </HStack>
                    )}
                  </Pressable>
                </HStack>
              </>
            ) : (
              <Spinner size="lg" color="#0dcaf0" />
            )}
          </Modal.Body>
        </Modal.Content>
      </Modal>
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchRestaurantInfo();
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
          { bottom: 90 } // Always position FAB higher to accommodate QR button
        ]}
        onPress={() => router.push('/profile/edit-restaurant-profile')}
      >
        <MaterialIcons name="edit" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Floating QR Button - always visible */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={fetchRestaurantQRCode}
      >
        <MaterialIcons name="qr-code" size={24} color="#fff" />
      </TouchableOpacity>

      {/* QR Code Modal */}
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0dcaf0",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
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
});

export default RestaurantProfile; 