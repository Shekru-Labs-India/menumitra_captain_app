import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Text, Card, TextInput } from "react-native-paper";
import axios from "axios";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetOwnerUrl, onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import RemixIcon from "react-native-remix-icon";
import MainToolBar from "../MainToolbar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const ManagerListView = ({ navigation }) => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [managerStatusLoading, setManagerStatusLoading] = useState({});

  // Add focus listener to refresh list when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchManagers();
    });
    
    return unsubscribe;
  }, [navigation]);

  const fetchManagers = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetOwnerUrl() + "manager/listview",
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
        setManagers(response.data.data || []);
      } else {
        console.log("Manager list error:", response.data);
        setManagers([]);
      }
    } catch (error) {
      console.error("Error fetching managers:", error);
      setManagers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchManagers();
  }, []);

  const toTitleCase = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filterManagers = () => {
    return managers.filter((manager) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        manager.name.toLowerCase().includes(searchLower) ||
        manager.mobile.toLowerCase().includes(searchLower)
      );
    });
  };

  const handleActiveStatusChange = async (managerId, isActive, index) => {
    try {
      setManagerStatusLoading(prev => ({ ...prev, [managerId]: true }));
      
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_active_status",
        {
          outlet_id: restaurantId,
          type: "manager",
          id: managerId,
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
        setManagers(prevManagers => {
          const updatedManagers = [...prevManagers];
          updatedManagers[index] = {
            ...updatedManagers[index],
            is_active: isActive,
            status: isActive ? "active" : "inactive"
          };
          return updatedManagers;
        });
        
        Alert.alert(
          isActive ? "Manager activated successfully" : "Manager deactivated successfully"
        );
      } else {
        throw new Error(response.data.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating manager status:", error);
      Alert.alert("Error", "An error occurred while updating status");
    } finally {
      setManagerStatusLoading(prev => ({ ...prev, [managerId]: false }));
    }
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ManagerDetails", { managerId: item.user_id })
      }
    >
      <Card style={[styles.card, { backgroundColor: "#fff" }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.leftContent}>
              <Text style={styles.name}>{toTitleCase(item.name)}</Text>
              <Text style={styles.mobile}>{item.mobile}</Text>
            </View>
            <View style={styles.rightContent}>
              {managerStatusLoading[item.user_id] ? (
                <ActivityIndicator size="small" color="#0dcaf0" style={styles.toggleLoader} />
              ) : (
                <Switch
                  value={item.is_active}
                  onValueChange={(value) => handleActiveStatusChange(item.user_id, value, index)}
                  trackColor={{ false: "#e0e0e0", true: "rgba(13, 202, 240, 0.3)" }}
                  thumbColor={item.is_active ? "#0dcaf0" : "#f5f5f5"}
                  ios_backgroundColor="#e0e0e0"
                />
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const NoResults = () => (
    <View style={styles.noResultsContainer}>
      <MaterialCommunityIcons
        name="account-supervisor-outline"
        size={64}
        color="#888"
      />
      <Text style={styles.noResultsText}>
        {searchQuery
          ? "No managers found matching your search"
          : "No managers added yet"}
      </Text>
      <Text style={styles.noResultsSubText}>
        {searchQuery
          ? "Try a different search term"
          : "Tap the + button to add a manager"}
      </Text>
    </View>
  );

  return (
    <>
      <CustomHeader title="Managers" />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <View style={styles.container}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" />}
        />
        {filterManagers().length === 0 ? (
          <NoResults />
        ) : (
          <FlatList
            data={filterManagers()}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.user_id)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddManager")}
        >
          <RemixIcon name="add-circle-line" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      <CustomTabBar />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchInput: {
    margin: 16,
    height: 40,
    backgroundColor: "#fff",
    elevation: 2,
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  card: {
    margin: 8,
    elevation: 4,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 5,
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLoader: {
    marginRight: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  mobile: {
    fontSize: 14,
    color: "#666",
  },
  addButton: {
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
  addButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: -60,
  },
  noResultsText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
  noResultsSubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
});

export default ManagerListView;
