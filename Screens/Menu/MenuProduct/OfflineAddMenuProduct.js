import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Text,
  Linking,
  PermissionsAndroid,
  ActivityIndicator,
  Animated,
  
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import newstyles from "../../newstyles";
import { getRestaurantId, getUserId } from "../../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';

// Import our local services
import LocalDatabaseService from '../../../services/LocalDatabaseService';
import SyncService from '../../../services/SyncService';
import { useOffline } from '../../../providers/OfflineProvider';
import CustomTabBar from "../../CustomTabBar";

export default function OfflineAddMenuProduct({ navigation, route }) {
  // Form state
  const [name, setName] = useState("");
  const [vegNonveg, setVegNonveg] = useState("");
  const [spicyIndex, setSpicyIndex] = useState("");
  const [fullPrice, setFullPrice] = useState("");
  const [halfPrice, setHalfPrice] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [ingredients, setIngredients] = useState("");
  const [offer, setOffer] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuCatId, setMenuCatId] = useState(null);
  
  // Reference data
  const [categories, setCategories] = useState([]);
  const [vegNonvegOptions, setVegNonvegOptions] = useState([]);
  const [spicyOptions, setSpicyOptions] = useState([]);
  
  // Modal state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [vegNonvegModalVisible, setVegNonvegModalVisible] = useState(false);
  const [spicyModalVisible, setSpicyModalVisible] = useState(false);
  
  // Track edit mode
  const [editMode, setEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  
  // Offline context
  const { isOnline } = useOffline();
  
  // Get form dimensions for layout
  const { width } = Dimensions.get("window");
  const formWidth = width > 500 ? 500 : width * 0.9;
  
  // Add form validation state
  const [errors, setErrors] = useState({
    name: '',
    vegNonveg: '',
    fullPrice: '',
    menuCatId: ''
  });
  
  // Add imageError state for image validation
  const [imageError, setImageError] = useState('');
  
  // Selected category state
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Initialize when screen loads
  useEffect(() => {
    checkIfEditMode();
    loadReferenceData();
  }, []);
  
  const checkIfEditMode = () => {
    if (route.params?.itemToEdit) {
      const item = route.params.itemToEdit;
      setEditMode(true);
      setEditingItemId(item.localId);
      
      // Set form values from item
      setName(item.name);
      setVegNonveg(item.vegNonveg);
      setSpicyIndex(item.spicyIndex || '');
      setFullPrice(item.fullPrice?.toString() || '');
      setHalfPrice(item.halfPrice?.toString() || '');
      setDescription(item.description || '');
      setIngredients(item.ingredients || '');
      setOffer(item.offer || '');
      setMenuCatId(item.menuCatId);
      
      // Load images
      if (item.images && item.images.length > 0) {
        setImages(item.images);
      }
    }
  };
  
  const loadReferenceData = async () => {
    try {
      // Ensure database is initialized
      await LocalDatabaseService.ensureInitialized();
      console.log('Database initialized');
      
      // Load categories
      const catData = await LocalDatabaseService.getReferenceDatas({ type: 'CATEGORY' });
      console.log('Categories loaded:', catData);
      setCategories(catData);
      
      // Load veg/non-veg options
      const vegOptions = await LocalDatabaseService.getReferenceDatas({ type: 'VEG_NONVEG' });
      console.log('Veg options loaded:', vegOptions);
      setVegNonvegOptions(vegOptions);
      
      // Load spicy options
      const spicyData = await LocalDatabaseService.getReferenceDatas({ type: 'SPICY' });
      console.log('Spicy options loaded:', spicyData);
      setSpicyOptions(spicyData);
      
      // Set defaults if not in edit mode
      if (!editMode) {
        if (catData.length > 0) {
          setMenuCatId(catData[0].key);
          setSelectedCategory(catData[0]);
          console.log('Set default category:', catData[0]);
        }
        if (vegOptions.length > 0) {
          setVegNonveg(vegOptions[0].key);
          console.log('Set default veg option:', vegOptions[0]);
        }
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
      Alert.alert('Error', 'Failed to load necessary data.');
    }
  };
  
  const handleSaveMenuItem = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields correctly');
      return;
    }

    try {
      setLoading(true);
      
      // Get user and restaurant IDs
      const userId = await getUserId();
      const outletId = await getRestaurantId();
      
      // Create menu item object
      const menuItem = {
        name,
        menuCatId,
        vegNonveg,
        spicyIndex,
        fullPrice,
        halfPrice,
        description,
        ingredients,
        offer,
        userId,
        outletId,
        status: 'ACTIVE',
        images,
        pendingSync: true, // Always set as pending since we're saving offline
        deleted: false
      };
      
      if (editMode) {
        // Update existing item
        await LocalDatabaseService.updateMenuItem(editingItemId, menuItem);
        Alert.alert('Success', 'Menu item updated successfully', [
          { text: 'OK', onPress: () => goBack() }
        ]);
      } else {
        // Create new item
        await LocalDatabaseService.addMenuItem(menuItem);
        Alert.alert('Success', 'Menu item added successfully', [
          { text: 'OK', onPress: () => goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      Alert.alert('Error', 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePickImage = async () => {
    try {
      // Request permissions
      if (Platform.OS === 'ios') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'We need photos permission to add images');
          return;
        }
      }
      
      // Launch image picker
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImages([...images, newImage]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to add image');
    }
  };
  
  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };
  
  const goBack = () => {
    navigation.navigate('OfflineMenuListScreen', { 
      refresh: true,
      timestamp: new Date().getTime()
    });
  };
  
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.key === categoryId);
    return category ? category.value : 'Select Category';
  };
  
  const getVegNonvegName = (option) => {
    const vegOption = vegNonvegOptions.find(opt => opt.key === option);
    return vegOption ? vegOption.value : 'Select Option';
  };
  
  const getSpicyName = (level) => {
    const spicyOption = spicyOptions.find(opt => opt.key === level);
    return spicyOption ? spicyOption.value : 'Select Spice Level';
  };
  
  // Add validation function
  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!vegNonveg) {
      newErrors.vegNonveg = 'Veg/Non-veg selection is required';
    }
    
    if (!fullPrice.trim()) {
      newErrors.fullPrice = 'Price is required';
    } else if (isNaN(fullPrice) || parseFloat(fullPrice) <= 0) {
      newErrors.fullPrice = 'Please enter a valid price';
    }
    
    if (!menuCatId) {
      newErrors.menuCatId = 'Category is required';
    }
    
    if (images.length === 0) {
      setImageError('At least one image is required');
    } else {
      setImageError('');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !imageError;
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={newstyles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.formContainer, { width: formWidth }]}>
          <Text style={styles.formTitle}>
            {editMode ? 'Edit Menu Item' : 'Add New Menu Item'}
          </Text>
          <TextInput
            mode="outlined"
            label="Menu Name *"
            placeholder="Enter menu name"
            value={name}
            onChangeText={setName}
            error={!!errors.name}
            style={[styles.input, errors.name && styles.errorInput]}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={styles.priceContainer}>
            <View style={styles.priceField}>
              <TextInput
                mode="outlined"
                label="Full Price *"
                placeholder="Enter full price"
                value={fullPrice}
                onChangeText={setFullPrice}
                keyboardType="decimal-pad"
                error={!!errors.fullPrice}
                style={[styles.input, errors.fullPrice && styles.errorInput]}
              />
              {errors.fullPrice && (
                <Text style={styles.errorText}>{errors.fullPrice}</Text>
              )}
            </View>

            <View style={styles.priceField}>
              <TextInput
                mode="outlined"
                label="Half Price"
                placeholder="Enter half price"
                value={halfPrice}
                onChangeText={setHalfPrice}
                keyboardType="decimal-pad"
                error={!!errors.halfPrice}
                style={[styles.input, errors.halfPrice && styles.errorInput]}
              />
              {errors.halfPrice && (
                <Text style={styles.errorText}>{errors.halfPrice}</Text>
              )}
            </View>
          </View>

          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[styles.dropdown, errors.menuCatId && styles.errorInput]}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text style={styles.dropdownLabel}>
                {menuCatId
                  ? getCategoryName(menuCatId)
                  : "Select Menu Category *"}
              </Text>
              <Icon name="keyboard-arrow-down" size={24} color="#666" />
            </TouchableOpacity>
            {errors.menuCatId && <Text style={styles.errorText}>{errors.menuCatId}</Text>}
          </View>

          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[styles.dropdown, errors.vegNonveg && styles.errorInput]}
              onPress={() => setVegNonvegModalVisible(true)}
            >
              <Text style={styles.dropdownLabel}>
                {vegNonveg
                  ? getVegNonvegName(vegNonveg)
                  : "Select Food Type *"}
              </Text>
              <Icon name="keyboard-arrow-down" size={24} color="#666" />
            </TouchableOpacity>
            {errors.vegNonveg && <Text style={styles.errorText}>{errors.vegNonveg}</Text>}
          </View>

          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setSpicyModalVisible(true)}
            >
              <Text style={styles.dropdownLabel}>
                {spicyIndex
                  ? getSpicyName(spicyIndex)
                  : "Select Spicy Level"}
              </Text>
              <Icon name="keyboard-arrow-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <TextInput
            mode="outlined"
            label="Description"
            placeholder="Enter description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label="Ingredients"
            placeholder="Enter ingredients (comma separated)"
            value={ingredients}
            onChangeText={setIngredients}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label="Offer (%)"
            placeholder="Enter offer percentage"
            value={offer}
            onChangeText={setOffer}
            keyboardType="numeric"
            error={!!errors.offer}
            style={[styles.input, errors.offer && styles.errorInput]}
          />
          {errors.offer && <Text style={styles.errorText}>{errors.offer}</Text>}

          {/* Image section */}
          <View style={styles.imageSection}>
            <View style={styles.imageHeaderContainer}>
              <Text style={styles.sectionTitle}>Images</Text>
            </View>
            
            <Text style={styles.subtitle}>Max image size 3MB</Text>
            {imageError && <Text style={styles.errorText}>{imageError}</Text>}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imageScrollView}
            >
              {images.map((img, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: img }} style={styles.thumbnailImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Icon name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 5 && (
                <TouchableOpacity
                  style={[styles.imageContainer, styles.addImageButton]}
                  onPress={handlePickImage}
                >
                  <Icon name="add" size={40} color="#888" />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <Button
            mode="contained"
            style={styles.submitButton}
            onPress={handleSaveMenuItem}
            loading={loading}
            disabled={loading}
          >
            {editMode ? 'Update Menu Item' : 'Save Menu Item'}
          </Button>
        </View>
      </ScrollView>
      
      {/* Category Selection Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Category</Text>
                  <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                {categories.length === 0 ? (
                  <View style={styles.emptyListContainer}>
                    <Icon name="category" size={48} color="#ccc" />
                    <Text style={styles.emptyListText}>No categories found</Text>
                  </View>
                ) : (
                  <FlatList
                    data={categories}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.modalItem,
                          menuCatId === item.key && styles.selectedItem
                        ]}
                        onPress={() => {
                          setMenuCatId(item.key);
                          setCategoryModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.modalItemText,
                            menuCatId === item.key && styles.selectedItemText
                          ]}
                        >
                          {item.value}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Similar modals for veg/non-veg and spicy selections would go here */}
      
      {/* Tab Bar */}
      <CustomTabBar navigation={navigation} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: 100, // Extra space for the tab bar
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
    height: 50,
    paddingHorizontal: 12,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  placeholder: {
    color: "#999",
  },
  imagesContainer: {
    marginVertical: 12,
  },
  imagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  imagesList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    margin: 5,
    position: "relative",
  },
  menuImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff6b6b",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    margin: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 8,
    backgroundColor: "#2196F3",
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedItem: {
    backgroundColor: "#f0f9ff",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  selectedItemText: {
    color: "#2563eb",
    fontWeight: "500",
  },
  emptyListContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyListText: {
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  priceField: {
    flex: 1,
    marginHorizontal: 4,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f8f9fa",
  },
  dropdownLabel: {
    fontSize: 16,
    color: "#666",
  },
  imageSection: {
    marginVertical: 16,
  },
  imageHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  imageScrollView: {
    flexDirection: "row",
    marginTop: 8,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  errorInput: {
    borderColor: "#dc3545",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
}); 