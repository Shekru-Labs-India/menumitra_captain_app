import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Alert,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
  Animated,
} from "react-native";
import axios from "axios";
import { getRestaurantId, getUserId } from "../../utils/getOwnerData";
import { onGetProductionUrl } from "../../utils/ConstantFunctions";
import RemixIcon from "react-native-remix-icon";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomTabBar from "../../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../../utils/axiosConfig";
import { getSettings } from "../../../utils/getSettings";

const { width } = Dimensions.get("window");

export default function MenuDetails({ route, navigation }) {
  const { menu_id } = route.params;
  const [menuData, setMenuData] = useState({
    name: '',
    description: '',
    images: [],
    food_type: '',
    // Add other default properties as needed
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settings, setSettings] = useState({ POS_show_menu_image: true });
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success', 'error', or 'warning'
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchMenuDetails();

    // Add navigation focus listener
    const unsubscribe = navigation.addListener("focus", () => {
      fetchMenuDetails();
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const appSettings = await getSettings();
        if (appSettings) {
          console.log("Loaded settings in MenuDetails:", appSettings);
          setSettings(appSettings);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    loadSettings();
  }, []);

  const fetchMenuDetails = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_view",
        {
          outlet_id: restaurantId,
          menu_id: menu_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Menu Details Response:", response.data);

      if (response.data.st === 1) {
        // Get the data but maintain safe defaults
        const data = response.data.data || {};
        
        // Fix the images processing issue
        let processedImages = [];
        if (data.images) {
          // Handle different possible formats of images from API
          if (Array.isArray(data.images)) {
            processedImages = data.images.map(img => {
              // If img is an object with image_url property
              if (img && typeof img === 'object' && img.image_url) {
                return img.image_url;
              }
              // If img is an object with url property
              else if (img && typeof img === 'object' && img.url) {
                return img.url;
              }
              // If img is an object with image property (this is what your API actually returns)
              else if (img && typeof img === 'object' && img.image) {
                return img.image;
              }
              // If img is a string already (URL)
              else if (typeof img === 'string') {
                return img;
              }
              // If img is something else unexpected, log it
              if (img) {
                console.log("Unexpected image format:", JSON.stringify(img));
              }
              return null;
            }).filter(Boolean); // Remove any null entries
          } else if (typeof data.images === 'string') {
            // If images is just a string URL
            processedImages = [data.images];
          } else if (data.images && typeof data.images === 'object') {
            // If images is a single object (not in an array)
            if (data.images.image) {
              processedImages = [data.images.image];
            } else if (data.images.image_url) {
              processedImages = [data.images.image_url];
            } else if (data.images.url) {
              processedImages = [data.images.url];
            }
          }
        }
        
        // Update menuData with properly processed images
        setMenuData({
          ...data,
          images: processedImages
        });
      }
    } catch (error) {
      console.error("Error fetching menu details:", error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const handleDeleteProduct = async () => {
    setDeleting(true);
    try {
      const [restaurantId, user_id, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_delete",
        {
          outlet_id: restaurantId,
          menu_id: menu_id,
          user_id: user_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Delete menu response:", response.data);

      if (response.data.st === 1) {
        showToast("Menu item deleted successfully", "success");
        if (route.params?.refresh) {
          route.params.refresh();
        }
        setDeleteModalVisible(false);
        
        // Give the toast a moment to show before navigating away
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      } else {
        showToast(response.data.msg || "Failed to delete menu item", "error");
        setDeleteModalVisible(false);
      }
    } catch (error) {
      console.error("Error deleting menu:", error);
      showToast(error.message || "An unexpected error occurred", "error");
    } finally {
      setDeleting(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setDeleteModalVisible(true)}
          style={{ marginRight: 15 }}
        >
          <Icon name="delete" size={24} color="#000" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchMenuDetails().finally(() => {
      setRefreshing(false);
    });
  }, []);

  // First, add a helper function to determine food type color
  const getFoodTypeColor = (foodType) => {
    switch (foodType) {
      case "veg":
        return "#388E3C"; // Green for veg
      case "nonveg":
        return "#FF5252"; // Red for nonveg
      case "egg":
        return "#BDBDBD"; // Gray for egg
      case "vegan":
        return "#388E3C"; // Dark green for vegan
      default:
        return "#9E9E9E"; // Default gray
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BCD4" />
      </View>
    );
  }

  if (!menuData) {
    return (
      <View style={styles.errorContainer}>
        <Text>Failed to load menu details</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Image Gallery Section */}
        <View style={styles.imageContainer}>
          {menuData.images && menuData.images.length > 0 ? (
            <FlatList
              data={menuData.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item: imageUrl }) => (
                <View style={{ width }}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.galleryImage}
                      onError={(e) => {
                        console.log('Image failed to load:', imageUrl);
                        console.log('Error details:', e.nativeEvent.error);
                      }}
                    />
                  ) : (
                    <View style={[styles.galleryImage, styles.placeholderContainer]}>
                      <RemixIcon name="image-line" size={48} color="#ccc" />
                      <Text style={styles.placeholderText}>Image not available</Text>
                    </View>
                  )}
                </View>
              )}
            />
          ) : menuData.image ? (
            <Image
              source={{ uri: menuData.image }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <Icon name="image-not-supported" size={40} color="#ccc" />
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.detailsContainer}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: getFoodTypeColor(menuData.food_type),
                  padding: 5,
                  borderRadius: 5,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              {menuData.food_type === "veg" && (
                <Icon name="eco" size={20} color="#fff" /> // Using "eco" for veg
              )}
              {menuData.food_type === "nonveg" && (
                <Icon name="restaurant-menu" size={20} color="#fff" /> // Using "restaurant-menu" for nonveg
              )}
              {menuData.food_type === "egg" && (
                <Icon name="egg" size={20} color="#fff" /> // Using "egg" for egg
              )}
              {menuData.food_type === "vegan" && (
                <Icon name="nature" size={20} color="#fff" /> // Using "nature" for vegan
              )}
              {!["veg", "nonveg", "egg", "vegan"].includes(
                menuData.food_type
              ) && (
                <Icon name="help-outline" size={20} color="#fff" /> // Using "help-outline" for invalid/unknown food type
              )}
            </View>

            <Text style={styles.title}>
              {menuData.name
                .split(" ")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(" ")}
            </Text>
            
            <View style={styles.badgesContainer}>
              {/* Status badge */}
              <View style={[styles.statusBadge, { backgroundColor: menuData.is_active ? '#26c963' : '#dc3545' }]}>
                <Text style={styles.statusBadgeText}>
                  {menuData.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              
              {/* Special badge */}
              {menuData.is_special && (
                <View style={styles.specialBadge}>
                  <Text style={styles.specialBadgeText}>Special</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.categoryRow}>
  <Text style={styles.category}>{menuData.category_name}</Text>
  {menuData.rating && menuData.rating !== "0.0" && (
    <View style={styles.ratingContainer}>
      <RemixIcon name="star-fill" size={16} color="#FFD700" />
      <Text style={styles.rating}>{menuData.rating}</Text>
    </View>
  )}
</View>
          <View style={styles.spicyContainer}>
            {/* Spicy Indicator Section */}
            <View style={styles.spicyIndicator}>
              {menuData.spicy_index && menuData.spicy_index !== "" ? (
                [...Array(Math.min(parseInt(menuData.spicy_index) || 0, 5))].map((_, i) => (
                  <RemixIcon key={i} name="fire-fill" size={20} color="#FF5252" />
                ))
              ) : null}
            </View>

            {/* Offer Badge Section */}
            {menuData.offer > 0 && (
              <View style={styles.offerBadge}>
                <Text style={styles.offerText}>{menuData.offer}% OFF</Text>
              </View>
            )}
          </View>
          {/* Pricing Section */}
          <View style={styles.priceSection}>
            
            <View style={styles.priceDetails}>
             
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Price:</Text>
                <Text style={styles.price}>₹{menuData.full_price}</Text>
              </View>
            </View>
          </View>

          {/* Description Section */}
          {menuData.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{menuData.description}</Text>
            </View>
          )}

          {/* Ingredients Section */}
          {menuData.ingredients && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <Text style={styles.ingredients}>{menuData.ingredients}</Text>
            </View>
          )}

          {/* Creation and Update Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Creation Details</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Created On:</Text>
                <Text style={styles.infoValue}>{menuData.created_on}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Created By:</Text>
                <Text style={styles.infoValue}>{menuData.created_by}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>Last Update</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Updated On:</Text>
                <Text style={styles.infoValue}>{menuData.updated_on}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Updated By:</Text>
                <Text style={styles.infoValue}>{menuData.updated_by}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() =>
          navigation.navigate("UpdateMenuProduct", {
            menuId: menu_id,
            onGoBack: fetchMenuDetails,
          })
        }
      >
        <RemixIcon name="edit-line" size={20} color="#fff" />
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
      <CustomTabBar />

      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Menu Item</Text>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>
              Are you sure you want to delete this menu item? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <View style={styles.leftButton}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDeleteModalVisible(false)}
                  disabled={deleting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rightButton}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDeleteProduct}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            { 
              backgroundColor: toastType === 'success' ? '#2ecc71' : 
                                toastType === 'warning' ? '#f39c12' : '#e74c3c',
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }]
            }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    position: "relative",
  },
  specialBadge: {
    backgroundColor: "#87CEEB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 10,
  },

  specialBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    height: 300,
    backgroundColor: "#f5f5f5",
  },
  galleryImage: {
    width: Dimensions.get("window").width,
    height: 300,
  },
  mainImage: {
    width: "100%",
    height: 300,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginLeft: 8,
    paddingRight: 8,
    flexWrap: "wrap",
    marginVertical: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 8,
    borderRadius: 4,
  },
  rating: {
    marginLeft: 4,
    color: "#333",
    fontWeight: "500",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  category: {
    fontSize: 16,
    color: "#666",
    marginRight: 8,
  },
  badge: {
    borderRadius: 50,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    textTransform: "uppercase",
  },
  priceSection: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  priceDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  priceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priceType: {
    fontSize: 14,
    color: "#666",
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  spicyContainer: {
    flexDirection: "row", // Align items in a row
    justifyContent: "space-between", // Space between spicy index and offer badge
    alignItems: "center", // Vertically align items
    marginBottom: 16,
  },
  spicyIndicator: {
    flexDirection: "row", // Spicy indicators in a row
    marginTop: 4,
  },
  offerBadge: {
    backgroundColor: "#4CAF50", // Green badge background
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offerText: {
    color: "#fff", // White text color
    fontSize: 12,
    fontWeight: "500",
  },
  section: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#495057",
    lineHeight: 20,
  },
  ingredients: {
    fontSize: 14,
    color: "#495057",
    lineHeight: 20,
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
  placeholderContainer: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxWidth: 400,
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
  modalText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  leftButton: {
    flex: 1,
  },
  rightButton: {
    flex: 1,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  deleteButton: {
    backgroundColor: "#FF0000",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoRow: {
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#212529",
    flex: 1,
    textAlign: "right",
  },

  lastSection: {
    marginBottom: 100, // Extra margin for the last section
  },
  noImageContainer: {
    height: 300,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  noImageText: {
    color: "#666",
    fontSize: 16,
    marginTop: 8,
  },
  statusBadge: {
    backgroundColor: '#26c963', // Default to green (will be overridden)
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#2ecc71', // Default green
    padding: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  toastText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  badgesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    flexWrap: "wrap",
    marginTop: 4,
  },
});
