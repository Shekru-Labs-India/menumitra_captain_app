import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Dimensions,
  TextInput,
  Image,
  Alert,
  RefreshControl,
  Switch,
  Modal,
} from "react-native";
import { Card, Button } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import globalStyles from "../../../styles";
import { getRestaurantId } from "../../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../../utils/ConstantFunctions";
import newstyles from "../../newstyles";
import CustomTabBar from "../../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../../utils/axiosConfig";
import { EventEmitter } from '../../../utils/EventEmitter';
import { getSettings } from "../../../utils/getSettings";

const { width } = Dimensions.get("window");

const AllMenuProducts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allPosts, setAllPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState({ POS_show_menu_image: true });
  const navigation = useNavigation();
  const [menuStatusLoading, setMenuStatusLoading] = useState({});
  
  // Add new states for category functionality
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  // Add new states for food type filter
  const [foodTypes, setFoodTypes] = useState([]);
  const [selectedFoodType, setSelectedFoodType] = useState(null);
  const [foodTypeModalVisible, setFoodTypeModalVisible] = useState(false);

  // Single useEffect for initial data fetch and settings
  useEffect(() => {
    const initializeData = async () => {
      try {
        const appSettings = await getSettings();
        if (appSettings) {
          setSettings(appSettings);
        }
        await Promise.all([
          fetchMenuProducts(true),
          fetchCategories(),
          fetchFoodTypes() // Add this line
        ]);
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initializeData();

    const subscription = EventEmitter.addListener('MENU_ITEMS_SYNCED', () => {
      console.log('Menu items synced, refreshing data');
      fetchMenuProducts(false);
    });
    
    return () => subscription.remove();
  }, []);

  // Add fetchCategories function
  const fetchCategories = async () => {
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_category_listview",
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
        console.log("Categories fetched successfully");
        const categoriesData = response.data.menucat_details || [];
        
        const formattedCategories = categoriesData
          .filter(cat => cat && cat.menu_cat_id !== null)
          .map(cat => ({
            category_id: cat.menu_cat_id,
            name: cat.category_name || "Unknown"
          }));
        
        const allOption = { category_id: null, name: "All Categories" };
        setCategories([allOption, ...formattedCategories]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Add fetchFoodTypes function
  const fetchFoodTypes = async () => {
    try {
      const accessToken = await AsyncStorage.getItem("access_token");
      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_food_type_list",
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (response.data.st === 1) {
        const foodTypeList = Object.entries(response.data.food_type_list).map(
          ([key, value]) => ({
            id: key,
            name: value,
          })
        );
        const allOption = { id: null, name: "All Types" };
        setFoodTypes([allOption, ...foodTypeList]);
      }
    } catch (error) {
      console.error("Error fetching food types:", error);
    }
  };

  // Add back the fetchMenuProducts function
  const fetchMenuProducts = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const restaurantId = await getRestaurantId();
      const accessToken = await AsyncStorage.getItem("access_token");
      
      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_listview",
        { outlet_id: restaurantId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const responseData = response.data;
      
      if (responseData.st === 1) {
        setAllPosts(responseData.lists);
        setPosts(responseData.lists);
      } else {
        setError(new Error(responseData.msg));
      }
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setAllPosts([]);
        setPosts([]);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Add back the useFocusEffect
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused - Refreshing data");
      fetchMenuProducts(false);
      fetchCategories();
    }, [])
  );

  // Update the useEffect for filtering posts
  useEffect(() => {
    if (!allPosts) return;

    let filteredResults = [...allPosts];

    // Filter by search query
    if (searchQuery) {
      filteredResults = filteredResults.filter((post) =>
        post.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category if one is selected
    if (selectedCategory) {
      filteredResults = filteredResults.filter(
        (post) => post.menu_cat_id === selectedCategory
      );
    }

    // Filter by food type if one is selected
    if (selectedFoodType) {
      filteredResults = filteredResults.filter(
        (post) => post.food_type === selectedFoodType
      );
    }

    setPosts(filteredResults);
  }, [searchQuery, allPosts, selectedCategory, selectedFoodType]);

  const handleRetry = () => {
    fetchMenuProducts(true);
    setError(null);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMenuProducts(false);
  };

  const handleAddNewPress = useCallback(() => {
    navigation.navigate("AddMenuProduct", { 
      onSuccess: () => {
        // Refresh data after adding new menu item
        fetchMenuProducts(false);
      }
    });
  }, [navigation]);

  const handleActiveStatusChange = async (menuId, isActive, index) => {
    try {
      setMenuStatusLoading(prev => ({ ...prev, [menuId]: true }));
      
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_active_status",
        {
          outlet_id: restaurantId,
          type: "menu",
          id: menuId,
          is_active: isActive,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        const updatedPosts = [...posts];
        updatedPosts[index].is_active = isActive;
        setPosts(updatedPosts);
        
        const allPostsIndex = allPosts.findIndex(item => item.menu_id === menuId);
        if (allPostsIndex !== -1) {
          const updatedAllPosts = [...allPosts];
          updatedAllPosts[allPostsIndex].is_active = isActive;
          setAllPosts(updatedAllPosts);
        }
        
        Alert.alert(
          isActive ? "Menu activated successfully" : "Menu deactivated successfully"
        );
      } else {
        throw new Error(response.data.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating menu status:", error);
      Alert.alert("Error", "An error occurred while updating status");
    } finally {
      setMenuStatusLoading(prev => ({ ...prev, [menuId]: false }));
    }
  };

  // Extract the navigateToMenuDetails to fix the useLatestCallback error
  const navigateToMenuDetails = useCallback((menuId) => {
    navigation.navigate("MenuDetails", { menu_id: menuId });
  }, [navigation]);

  const renderItem = ({ item, index }) => {
    const isMenuLoading = menuStatusLoading[item.menu_id] || false;
    const menuActive = item.is_active !== false;
    
    return (
      <Card style={styles.card}>
        <TouchableOpacity
          onPress={() => navigateToMenuDetails(item.menu_id)}
          activeOpacity={1}
        >
          <View style={styles.row}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholderImageContainer]}>
                <RemixIcon name="restaurant-line" size={32} color="#aaa" />
              </View>
            )}
            <View style={styles.textContainer}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                </Text>
                <View style={styles.toggleContainer}>
                  {isMenuLoading ? (
                    <ActivityIndicator size="small" color="#0dcaf0" style={styles.toggleLoader} />
                  ) : (
                    <Switch
                      value={menuActive}
                      onValueChange={(value) => handleActiveStatusChange(item.menu_id, value, index)}
                      trackColor={{ false: "#e0e0e0", true: "rgba(13, 202, 240, 0.3)" }}
                      thumbColor={menuActive ? "#0dcaf0" : "#f5f5f5"}
                      ios_backgroundColor="#e0e0e0"
                    />
                  )}
                </View>
              </View>
              <Text style={styles.subtitle}>{item.category_name}</Text>
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Price:</Text>
                  <Text style={styles.priceValue}>₹{item.full_price}</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Error fetching posts: {error.message}
        </Text>
        <TouchableOpacity onPress={handleRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size={20}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu items..."
              value={searchQuery}
              onChangeText={(text) => setSearchQuery(text)}
            />
          </View>
        </View>
        
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              selectedCategory && styles.filterButtonActive,
              { marginRight: 8 }
            ]}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text 
              style={[
                styles.filterButtonText,
                selectedCategory && styles.filterButtonTextActive
              ]} 
              numberOfLines={1}
            >
              {selectedCategory 
                ? categories.find(c => c.category_id === selectedCategory)?.name 
                : "All Categories"}
            </Text>
            <RemixIcon 
              name="arrow-down-s-line" 
              size={20} 
              color={selectedCategory ? "#fff" : "#666"} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.filterButton, 
              selectedFoodType && styles.filterButtonActive
            ]}
            onPress={() => setFoodTypeModalVisible(true)}
          >
            <Text 
              style={[
                styles.filterButtonText,
                selectedFoodType && styles.filterButtonTextActive
              ]} 
              numberOfLines={1}
            >
              {selectedFoodType 
                ? foodTypes.find(t => t.id === selectedFoodType)?.name 
                : "All Types"}
            </Text>
            <RemixIcon 
              name="arrow-down-s-line" 
              size={20} 
              color={selectedFoodType ? "#fff" : "#666"} 
            />
          </TouchableOpacity>

          {(selectedCategory || selectedFoodType) && (
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={() => {
                setSelectedCategory(null);
                setSelectedFoodType(null);
              }}
            >
              <RemixIcon name="close-circle-fill" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.menu_id.toString()}
        contentContainerStyle={
          Platform.OS === "web" ? styles.fullWidthList : {}
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#0dcaf0"]}
            tintColor="#0dcaf0"
          />
        }
      />

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleAddNewPress}
        activeOpacity={1}
      >
        <RemixIcon name="add-circle-line" size={20} color="#fff" />
        <Text style={styles.floatingButtonText}>Create </Text>
      </TouchableOpacity>
      <CustomTabBar />

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    selectedCategory === item.category_id && styles.selectedCategoryItem
                  ]}
                  onPress={() => {
                    setSelectedCategory(item.category_id);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.categoryText,
                      selectedCategory === item.category_id && styles.selectedCategoryText
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.category_id?.toString() || "all"}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Food Type Modal */}
      <Modal
        visible={foodTypeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFoodTypeModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFoodTypeModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Food Type</Text>
              <TouchableOpacity
                onPress={() => setFoodTypeModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={foodTypes}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    selectedFoodType === item.id && styles.selectedCategoryItem
                  ]}
                  onPress={() => {
                    setSelectedFoodType(item.id);
                    setFoodTypeModalVisible(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.categoryText,
                      selectedFoodType === item.id && styles.selectedCategoryText
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id?.toString() || "all"}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 15,
    backgroundColor: "#f5f5f5",
    paddingBottom: 100,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 0,
    paddingHorizontal: 0,
    marginBottom: 0,
  },

  foodtype: {
    margin: 5,
    marginStart: 20,
    paddingStart: 20,
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
    color: "black",
    fontWeight: "bold",
    borderColor: "black",
    backgroundColor: "white",
  },
  exportButton: {
    borderColor: "black",
    backgroundColor: "white",
    marginLeft: 50,
  },
  exportButtonText: {
    color: "black",
    fontWeight: "bold",
  },
  card: {
    marginTop: 10,
    marginVertical: 0,
    marginHorizontal: 10,
    // borderRadius: 5,
    //elevation: 3,
    backgroundColor: "#fff",
    // width: Platform.OS === "web" ? width * 0.9 : "98%",
    // borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 100,
    padding: 0,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 0,
    marginRight: 0,
  },
  textContainer: {
    width: "75%",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
  },
  retryText: {
    color: "blue",
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "90%",
    maxHeight: "80%",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 10,
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
  list_test: {
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 16,
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 90,
    backgroundColor: "#4CAF50", 
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
  floatingButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    padding: 4,
    borderRadius: 4,
  },
  rating: {
    marginLeft: 4,
    fontSize: 12,
    color: "#333",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 8,
  },
  halfPrice: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    textTransform: "uppercase",
  },
  spicyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
 
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  priceContainer: {
    // marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 2,
    width: "auto",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
 
  headerContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  searchContainer: {
    flex: 1, 
    minWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: "#000",
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  categoryList: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  placeholderImageContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: '#2ecc71',
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
  categoryDropdown: {
    flex: 0.5,
    minWidth: 120,
    maxWidth: 200,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  dropdownText: {
    color: "#666",
    fontSize: 14,
    flex: 1,
  },
  dropdownTextActive: {
    color: "#fff",
  },
  categoryDropdownActive: {
    backgroundColor: "#0dcaf0",
  },
  resetButton: {
    width: 40,
    height: 40,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 300,
  },
  categoryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  categoryText: {
    fontSize: 16,
    fontWeight: "400",
    color: "#333",
  },
  selectedCategoryItem: {
    backgroundColor: "#0dcaf0",
    borderRadius: 4,
  },
  selectedCategoryText: {
    color: "#fff",
    fontWeight: "500",
  },
  allCategoriesItem: {
    borderBottomWidth: 2,
    borderBottomColor: "#0dcaf0",
    backgroundColor: "#f0f9ff",
  },
  allCategoriesText: {
    fontWeight: "bold",
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  
  toggleContainer: {
    marginLeft: 8,
    marginRight: 8,
  },
  
  toggleLoader: {
    marginRight: 4,
  },
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  filterButton: {
    flex: 0.5,
    minWidth: 120,
    maxWidth: 200,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#000",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  filterButtonText: {
    color: "#666",
    fontSize: 14,
    flex: 1,
  },
  filterButtonActive: {
    backgroundColor: "#0dcaf0",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
});

export default AllMenuProducts;
