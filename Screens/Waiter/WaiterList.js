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
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import MainToolBar from "../MainToolbar";
import RemixIcon from "react-native-remix-icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const WaiterList = ({ navigation }) => {
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [waiterStatusLoading, setWaiterStatusLoading] = useState({});

  const fetchWaiters = async () => {
    try {
      setLoading(true);
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "waiter_listview",
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
        setWaiters(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching waiters:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWaiters();
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

  const filterWaiters = () => {
    return waiters.filter((waiter) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        waiter.name.toLowerCase().includes(searchLower) ||
        waiter.mobile.toLowerCase().includes(searchLower)
      );
    });
  };

  const handleActiveStatusChange = async (waiterId, isActive, index) => {
    try {
      setWaiterStatusLoading(prev => ({ ...prev, [waiterId]: true }));
      
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_active_status",
        {
          outlet_id: restaurantId,
          type: "waiter",
          id: waiterId,
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
        setWaiters(prevWaiters => {
          const updatedWaiters = [...prevWaiters];
          updatedWaiters[index] = {
            ...updatedWaiters[index],
            is_active: isActive,
            status: isActive ? "active" : "inactive"
          };
          return updatedWaiters;
        });
        
        Alert.alert(
          isActive ? "Waiter activated successfully" : "Waiter deactivated successfully"
        );
      } else {
        throw new Error(response.data.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating waiter status:", error);
      Alert.alert("Error", "An error occurred while updating status");
    } finally {
      setWaiterStatusLoading(prev => ({ ...prev, [waiterId]: false }));
    }
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ViewWaiter", {
          waiter: {
            ...item,
            id: item.user_id,
          },
          refreshList: fetchWaiters,
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
              {waiterStatusLoading[item.user_id] ? (
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
        name="emoticon-sad-outline"
        size={48}
        color="#888"
      />
      <Text style={styles.noResultsText}>No Waiters Found</Text>
    </View>
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWaiters();
  }, []);

  const handleEdit = (item) => {
    navigation.navigate("EditWaiter", {
      userId: item.user_id,
    });
  };

  return (
    <>
      <CustomHeader title="Waiters" />
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
        {filterWaiters().length === 0 ? (
          <NoResults />
        ) : (
          <FlatList
            data={filterWaiters()}
            renderItem={renderItem}
            keyExtractor={(item) => item.user_id.toString()}
            refreshing={loading}
            onRefresh={fetchWaiters}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddWaiter")}
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
    position: "relative",
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
    right: 20,
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
    marginTop: -50,
  },
  noResultsText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 10,
  },
});

export default WaiterList;
