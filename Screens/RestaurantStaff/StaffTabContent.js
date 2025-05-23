// StaffTabContent.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StyleSheet,
} from "react-native";
import axios from "axios";
import { Card } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import globalStyles from "../../styles";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { getRestaurantId } from "../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import axiosInstance from "../../utils/axiosConfig";

const StaffTabContent = ({ role, fetchStaffByRole }) => {
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const navigation = useNavigation();

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      let restaurantId = await getRestaurantId();
      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_staff_list_with_role",
        {
          outlet_id: restaurantId,
          staff_role: role,
        }
      );
      if (response.data.st === 1) {
        setStaffList(response.data.lists);
        setFilteredStaff(response.data.lists);
      }
    } catch (error) {
      console.error(`Error fetching staff for role ${role}:`, error);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleEditPress = (item) => {
    navigation.navigate("EditStaff", {
      staffId: item.staff_id,
      refresh: fetchStaff,
    });
  };

  const handleAddNewPress = () => {
    navigation.navigate("AddNewStaff", { refresh: fetchStaff });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStaff();
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    if (text === "") {
      setFilteredStaff(staffList);
    } else {
      const filteredList = staffList.filter((item) =>
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStaff(filteredList);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={globalStyles.searchContainer}>
        <TextInput
          style={globalStyles.searchInput}
          placeholder="Search staff"
          value={searchText}
          onChangeText={handleSearch}
        />
        <Icon name="search" size={20} style={globalStyles.searchIcon} />
      </View>

      <FlatList
        data={filteredStaff}
        keyExtractor={(item) => item.staff_id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.staffItem}>
              <Image source={{ uri: item.photo }} style={styles.staffImage} />
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{item.name}</Text>
                <Text>{item.mobile}</Text>
                <Text>{item.role}</Text>
              </View>
              <TouchableOpacity onPress={() => handleEditPress(item)}>
                {/*<Image*/}
                {/*    source={require('../../assets/icons/edit.png')}*/}
                {/*    style={globalStyles.editImage}*/}
                {/*/>*/}
                <RemixIcon name="ri-edit-box-line" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleAddNewPress}
      >
        <RemixIcon name="add-circle-line" size={20} color="#fff" />
        <Text style={styles.floatingButtonText}>Create</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 5,
    flex: 1,
    padding: 5,
    backgroundColor: "#fff",
  },
  card: {
    margin: 5,
    borderRadius: 5,
    elevation: 0,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
  },
  staffItem: {
    flexDirection: "row",
    padding: 5,
    paddingEnd: 15,
    alignItems: "center",
    justifyContent: "space-between",
  },
  staffImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontWeight: "bold",
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
});

export default StaffTabContent;
