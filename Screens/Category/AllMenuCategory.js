import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator, // Import ActivityIndicator for loading indication
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  RefreshControl,
  Switch,
  Alert,
} from "react-native";
import axios from "axios";
import globalStyles from "../../styles";
import { Card, TextInput } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import {
  getOwnerName,
  getRestaurantId,
  getRestaurantName,
} from "../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomTabBar from "../CustomTabBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const { width } = Dimensions.get("window");

const AllMenuCategory = () => {
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryStatusLoading, setCategoryStatusLoading] = useState({});
  const navigation = useNavigation();

  // Improved fetchMenuCategories function
  const fetchMenuCategories = useCallback(async () => {
    try {
      setLoading(true);
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

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
        const filteredCategories = response.data.menucat_details
          .filter((category) => category.menu_cat_id !== null)
          .sort((a, b) => b.menu_cat_id - a.menu_cat_id); // Sort by newest first

        setCategories(filteredCategories);
        setFilteredCategories(filteredCategories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Use both useEffect and useFocusEffect for better state management
  useEffect(() => {
    fetchMenuCategories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMenuCategories();
    }, [fetchMenuCategories])
  );

  // Update the onRefresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMenuCategories();
  }, [fetchMenuCategories]);

  const handleEditPress = useCallback(
    (item) => {
      navigation.navigate("UpdateMenuCategory", {
        menu_cat_id: item.menu_cat_id,
        refresh: fetchMenuCategories,
      });
    },
    [navigation]
  );

  // Update the search handler
  const handleSearch = useCallback(
    (text) => {
      setSearchText(text);
      const filtered = categories.filter((category) =>
        category.category_name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredCategories(filtered);
    },
    [categories]
  );

  const handleActiveStatusChange = async (categoryId, isActive, index) => {
    try {
      setCategoryStatusLoading(prev => ({ ...prev, [categoryId]: true }));
      
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_active_status",
        {
          outlet_id: restaurantId,
          type: "menu_category",
          id: categoryId,
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
        const updatedCategories = [...categories];
        updatedCategories[index].is_active = isActive;
        setCategories(updatedCategories);
        
        const filteredIndex = filteredCategories.findIndex(item => item.menu_cat_id === categoryId);
        if (filteredIndex !== -1) {
          const updatedFilteredCategories = [...filteredCategories];
          updatedFilteredCategories[filteredIndex].is_active = isActive;
          setFilteredCategories(updatedFilteredCategories);
        }
        
        Alert.alert(
          isActive ? "Category activated successfully" : "Category deactivated successfully"
        );
      } else {
        throw new Error(response.data.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating category status:", error);
      Alert.alert("Error", "An error occurred while updating status");
    } finally {
      setCategoryStatusLoading(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ViewCategory", {
          menu_cat_id: item.menu_cat_id,
          refresh: fetchMenuCategories,
        })
      }
    >
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{item.category_name}</Text>
              <View style={styles.toggleContainer}>
                {categoryStatusLoading[item.menu_cat_id] ? (
                  <ActivityIndicator size="small" color="#0dcaf0" style={styles.toggleLoader} />
                ) : (
                  <Switch
                    value={item.is_active !== false}
                    onValueChange={(value) => handleActiveStatusChange(item.menu_cat_id, value, index)}
                    trackColor={{ false: "#e0e0e0", true: "rgba(13, 202, 240, 0.3)" }}
                    thumbColor={item.is_active !== false ? "#0dcaf0" : "#f5f5f5"}
                    ios_backgroundColor="#e0e0e0"
                  />
                )}
              </View>
            </View>
            <Text style={styles.subtitle}>Menu Count: {item.menu_count}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={globalStyles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Category"
            value={searchText}
            onChangeText={handleSearch}
            mode="outlined"
            left={<TextInput.Icon icon="magnify" />}
          />
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator
            size="large"
            color="#6200ee"
            style={styles.loadingIndicator}
          />
        ) : (
          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item.menu_cat_id.toString()}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#0dcaf0"]}
                tintColor="#0dcaf0"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No categories found</Text>
              </View>
            }
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={false}
            onEndReachedThreshold={0.5}
          />
        )}

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() =>
            navigation.navigate("AddNewMenuCategory", {
              refresh: () => {
                setLoading(true);
                fetchMenuCategories();
              },
            })
          }
        >
          <RemixIcon name="add-circle-line" size={20} color="#fff" />
          <Text style={styles.floatingButtonText}>Create</Text>
        </TouchableOpacity>
      </View>
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: "#f6f6f6",
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    margin: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    height: 40,
    backgroundColor: "white",
    borderRadius: 5,
    flex: 1,
  },
  card: {
    margin: 5,
    borderRadius: 5,
    elevation: 3,
    backgroundColor: "#fff",
    width: Platform.OS === "web" ? width * 0.9 : "98%",
    height: Platform.OS === "web" ? 100 : 80,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    paddingHorizontal: 15,
  },
  image: {
    width: 25,
    height: 25,
    marginHorizontal: 5,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    height: "100%",
    marginRight: 10,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
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
    fontSize: 16,
    color: "#d9534f",
    marginBottom: 10,
  },
  retryText: {
    fontSize: 16,
    color: "#0275d8",
  },
  fullWidthList: {
    width: "100%",
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 100, // Positioned above the bottom navigation
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
  floatingButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 80, // Add padding for floating button
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  toggleContainer: {
    marginLeft: 15,
  },
  toggleLoader: {
    marginRight: 4,
  },
});

export default AllMenuCategory;
