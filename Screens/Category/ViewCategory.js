import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Modal,
  Platform,
} from "react-native";
import { Text, Card } from "react-native-paper";
import axios from "axios";
import { getRestaurantId, getUserId } from "../utils/getOwnerData";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import RemixIcon from "react-native-remix-icon";
import CustomTabBar from "../CustomTabBar";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const ViewCategory = ({ route, navigation }) => {
  const { menu_cat_id } = route.params;
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Add refreshing state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCategoryDetails = async () => {
    try {
      setLoading(true);
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_category_view",
        {
          outlet_id: restaurantId,
          menu_cat_id: menu_cat_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        setCategoryData(response.data.data);
      } else {
        Alert.alert("Error", "Failed to fetch category details");
      }
    } catch (error) {
      console.error("Error fetching category details:", error);
      Alert.alert("Error", "Failed to fetch category details");
    } finally {
      setLoading(false);
      setRefreshing(false); // Stop refreshing when done
    }
  };

  useEffect(() => {
    fetchCategoryDetails();
  }, [menu_cat_id]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCategoryDetails();
    }, [menu_cat_id])
  );

  // Function to handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true); // Set refreshing to true
    fetchCategoryDetails();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const [restaurantId, user_id, accessToken] = await Promise.all([
        getRestaurantId(),
        getUserId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "menu_category_delete",
        {
          outlet_id: restaurantId,
          menu_cat_id: menu_cat_id,
          user_id: user_id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.st === 1) {
        Alert.alert("Success", "Category deleted successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", response.data.msg || "Failed to delete category");
      }
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete category");
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  const toTitleCase = (str) => {
    return str.replace(/\b(\w)/g, (char) => char.toUpperCase());
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0dcaf0" />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <RemixIcon name="arrow-left-line" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Category Details</Text>
          <TouchableOpacity
            onPress={() => setDeleteModalVisible(true)}
            style={{ marginRight: 15 }}
          >
            <Icon name="delete" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0dcaf0"]}
            />
          }
        >
          <Card style={styles.card}>
            {categoryData?.image ? (
              <Image
                source={{ uri: categoryData.image }}
                style={styles.categoryImage}
              />
            ) : (
              <RemixIcon
                name="restaurant-2-line"
                size={100}
                color="gray"
                style={styles.fallbackIcon}
              />
            )}
            <Card.Content>
              <Text style={styles.categoryName}>
                {categoryData?.name && toTitleCase(categoryData?.name)}
              </Text>

              <View style={styles.metadataContainer}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Created On:</Text>
                  <Text style={styles.metadataValue}>
                    {categoryData?.created_on}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Created By:</Text>
                  <Text style={styles.metadataValue}>
                    {toTitleCase(categoryData?.created_by || "")}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Updated On:</Text>
                  <Text style={styles.metadataValue}>
                    {categoryData?.updated_on}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Updated By:</Text>
                  <Text style={styles.metadataValue}>
                    {toTitleCase(categoryData?.updated_by || "")}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Status</Text>
                  <View style={[
                    styles.statusBadge,
                    {backgroundColor: categoryData.is_active ? '#e6f7ee' : '#ffebeb'}
                  ]}>
                    <Text style={[
                      styles.statusText,
                      {color: categoryData.is_active ? '#0f9d58' : '#e53935'}
                    ]}>
                      {categoryData.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              {categoryData?.menu_list && categoryData.menu_list.length > 0 && (
                <View style={styles.menuListContainer}>
                  <Text style={styles.menuListTitle}>
                    Menu Items ({categoryData.menu_count})
                  </Text>
                  {categoryData.menu_list.map((menu, index) => (
                    <Card key={menu.menu_id} style={styles.menuItem}>
                      <Card.Content>
                        <View style={styles.menuItemHeader}>
                          <Text style={styles.menuName}>{menu.menu_name}</Text>
                          <View
                            style={[
                              styles.foodTypeBadge,
                              {
                                backgroundColor:
                                  menu.food_type === "veg"
                                    ? "#4CAF50"
                                    : "#FF5252",
                              },
                            ]}
                          >
                            <Text style={styles.foodTypeText}>
                              {toTitleCase(menu.food_type)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.priceContainer}>
                          {menu.half_price > 0 && (
                            <Text style={styles.price}>
                              Half: ₹{menu.half_price}
                            </Text>
                          )}
                          <Text style={styles.price}>
                            Full: ₹{menu.full_price}
                          </Text>
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            navigation.navigate("UpdateMenuCategory", {
              menu_cat_id: menu_cat_id,
              onGoBack: fetchCategoryDetails,
            })
          }
        >
          <Icon name="edit" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </SafeAreaView>
      <CustomTabBar />
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Category</Text>
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Are you sure you want to delete this category? This action cannot
              be undone.
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
                  onPress={handleDelete}
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
    marginTop: Platform.OS === "ios" ? 0 : 25,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 80, // Add padding at bottom for edit button
  },
  card: {
    elevation: 4,
    borderRadius: 8,
    backgroundColor: "white",
    marginBottom: 0, // Remove bottom margin
  },
  categoryImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  fallbackIcon: {
    alignSelf: "center",
    marginTop: 20,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 16,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    textAlign: "center",
    marginLeft: -24,
  },
  editButton: {
    position: "absolute",
    right: 16,
    bottom: 80, // Reduced bottom spacing
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
  metadataContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  metadataItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  metadataValue: {
    fontSize: 14,
    color: "#333",
  },
  menuListContainer: {
    marginTop: 10, // Reduced margin
  },
  menuListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  menuItem: {
    marginBottom: 8, // Reduced margin
    backgroundColor: "#fff",
    elevation: 2,
  },
  menuItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  menuName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  foodTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  foodTypeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  priceContainer: {
    flexDirection: "row",
    gap: 15,
  },
  price: {
    fontSize: 14,
    color: "#666",
  },
  backButton: {
    padding: 10,  // Add padding to increase touch area
    marginLeft: -5, // Adjust margin to align visually
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ViewCategory;
