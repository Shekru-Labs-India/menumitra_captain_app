import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Text, Card, FAB, TextInput } from "react-native-paper";
import axios from "axios";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetProductionUrl, onGetOwnerUrl } from "../utils/ConstantFunctions";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import MainToolBar from "../MainToolbar";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const CaptainList = ({ navigation }) => {
  const [captains, setCaptains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [captainStatusLoading, setCaptainStatusLoading] = useState({});

  const fetchCaptains = async () => {
    try {
      setLoading(true);
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "captain_listview",
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
        setCaptains(response.data.data);
      } else if (response.data.st === 2) {
        setCaptains([]);
      }
    } catch (error) {
      console.error("Error fetching captains:", error);
      setCaptains([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCaptains();
    }, [])
  );

  const toTitleCase = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filterCaptains = () => {
    return captains.filter((captain) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        captain.name.toLowerCase().includes(searchLower) ||
        captain.mobile.toLowerCase().includes(searchLower)
      );
    });
  };

  const handleActiveStatusChange = async (captainId, isActive, index) => {
    try {
      setCaptainStatusLoading(prev => ({ ...prev, [captainId]: true }));
      
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_active_status",
        {
          outlet_id: restaurantId,
          type: "captain",
          id: captainId,
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
        setCaptains(prevCaptains => {
          const updatedCaptains = [...prevCaptains];
          updatedCaptains[index] = {
            ...updatedCaptains[index],
            is_active: isActive,
            status: isActive ? "active" : "inactive"
          };
          return updatedCaptains;
        });
        
        Alert.alert(
          isActive ? "Captain activated successfully" : "Captain deactivated successfully"
        );
      } else {
        throw new Error(response.data.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating captain status:", error);
      Alert.alert("Error", "An error occurred while updating status");
    } finally {
      setCaptainStatusLoading(prev => ({ ...prev, [captainId]: false }));
    }
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ViewCaptain", {
          captain: item,
          refreshList: fetchCaptains,
        })
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
              {captainStatusLoading[item.user_id] ? (
                <ActivityIndicator size="small" color="#0066FF" style={styles.toggleLoader} />
              ) : (
                <Switch
                  value={item.is_active}
                  onValueChange={(value) => handleActiveStatusChange(item.user_id, value, index)}
                  trackColor={{ false: "#767577", true: "rgba(0, 102, 255, 0.3)" }}
                  thumbColor={item.is_active ? "#0066FF" : "#f4f3f4"}
                  ios_backgroundColor="#767577"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
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
          ? "No captains found matching your search"
          : "No captains added yet"}
      </Text>
      <Text style={styles.noResultsSubText}>
        {searchQuery
          ? "Try a different search term"
          : "Tap the + button to add a captain"}
      </Text>
    </View>
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCaptains();
  }, []);

  const handleEdit = (item) => {
    navigation.navigate("EditCaptain", {
      userId: item.user_id,
    });
  };

  return (
    <>
      <CustomHeader title="Captains" />
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
        {filterCaptains().length === 0 ? (
          <NoResults />
        ) : (
          <FlatList
            data={filterCaptains()}
            renderItem={renderItem}
            keyExtractor={(item) => item.user_id.toString()}
            refreshing={loading}
            onRefresh={fetchCaptains}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddCaptain")}
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

export default CaptainList;
