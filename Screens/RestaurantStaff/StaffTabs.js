// StaffTabs.js
import React, { useState, useEffect } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Linking,
  Image,
  Animated,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import { getRestaurantId } from "../utils/getOwnerData";
import { useFocusEffect } from "@react-navigation/native";
import CustomHeader from "../../components/CustomHeader";
import CustomTabBar from "../CustomTabBar";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import RemixIcon from "react-native-remix-icon";
import MainToolBar from "../MainToolbar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "../../utils/axiosConfig";

const StaffTabs = () => {
  const navigation = useNavigation();
  const [staffList, setStaffList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [isRolesModalVisible, setIsRolesModalVisible] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [isAscending, setIsAscending] = useState(true);
  const [filteredStaffList, setFilteredStaffList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchRestaurantId = async () => {
      const id = await getRestaurantId();
      setRestaurantId(id);
    };
    fetchRestaurantId();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchStaffList();
      fetchRolesList();
    }, [])
  );

  useEffect(() => {
    if (staffList.length > 0) {
      const sortedList = [...staffList].sort((a, b) => {
        if (isAscending) {
          return a.name.localeCompare(b.name);
        }
        return b.name.localeCompare(a.name);
      });
      setStaffList(sortedList);
    }
  }, [staffList.length, isAscending]);

  const toTitleCase = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const fetchStaffList = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_staff_list_with_role",
        {
          outlet_id: restaurantId,
          staff_role:
            selectedRole === "Role" || selectedRole === "All"
              ? "all"
              : selectedRole.toLowerCase(),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;
      if (data.st === 1) {
        const sortedList = [...data.lists].sort((a, b) => {
          if (isAscending) {
            return a.name.localeCompare(b.name);
          }
          return b.name.localeCompare(a.name);
        });
        setStaffList(sortedList);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesList = async () => {
    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "staff_role_list",
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

      const data = response.data;
      if (data.st === 1) {
        const sortedRoles = data.role_list.sort((a, b) => {
          if (a.role_name.toLowerCase() === "all") return -1;
          if (b.role_name.toLowerCase() === "all") return 1;
          return a.role_name.localeCompare(b.role_name);
        });

        const formattedRoles = sortedRoles.map((role) => ({
          ...role,
          role_name: toTitleCase(role.role_name),
        }));

        setRolesList(formattedRoles);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const handleRoleSelect = async (role) => {
    const newRole = toTitleCase(role.role_name);
    setSelectedRole(newRole);
    setIsRolesModalVisible(false);
    setLoading(true);

    try {
      const [restaurantId, accessToken] = await Promise.all([
        getRestaurantId(),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "get_staff_list_with_role",
        {
          outlet_id: restaurantId,
          staff_role:
            role.role_name.toLowerCase() === "all"
              ? "all"
              : role.role_name.toLowerCase(),
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;
      if (data.st === 1) {
        setStaffList(data.lists);
        setFilteredStaffList([]); // Reset filtered list
        setSearchQuery(""); // Reset search query
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffPress = (item) => {
    console.log("Staff Item:", item);
    if (!item || !item.staff_id) {
      console.error("Invalid staff item:", item);
      return;
    }

    navigation.navigate("StaffDetails", {
      staffId: item.staff_id?.toString(),
      restaurantId: restaurantId?.toString() || "9",
    });
  };

  const handleSort = () => {
    setIsAscending(!isAscending);
    const sortedList = [...staffList].sort((a, b) => {
      if (!isAscending) {
        return b.name.localeCompare(a.name);
      }
      return a.name.localeCompare(b.name);
    });
    setStaffList(sortedList);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);

    if (text.length >= 3) {
      const filtered = staffList
        .filter(
          (staff) =>
            staff.name?.toLowerCase().includes(text.toLowerCase()) ||
            staff.role?.toLowerCase().includes(text.toLowerCase()) ||
            (staff.mobile && staff.mobile.toString().includes(text))
        )
        .slice(0, 5); // Limit to 5 items
      setFilteredStaffList(filtered);
    } else {
      setFilteredStaffList([]); // Clear filtered results if search query is less than 3 chars
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchStaffList(), fetchRolesList()]).finally(() =>
      setRefreshing(false)
    );
  }, []);

  const renderStaffCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleStaffPress(item)}
    >
      <View style={styles.cardContent}>
        <View
          style={[
            styles.avatarContainer,
            !item.photo && styles.avatarBackground,
          ]}
        >
          {item.photo ? (
            <Image
              source={{ uri: item.photo }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarText}>
              {item.name?.[0]?.toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>
            {item.name
              ?.split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join(" ")}
          </Text>
          <Text style={styles.staffRole}>
            {item.role
              ?.split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join(" ")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.callButton}
          onPress={(e) => {
            e.stopPropagation();
            if (item.mobile) {
              Linking.openURL(`tel:${item.mobile}`);
            }
          }}
        >
          <Icon name="phone" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const getFilteredStaff = () => {
    let filtered = [...staffList];

    // Filter by role if a specific role is selected
    if (selectedRole !== "Role" && selectedRole !== "All") {
      filtered = filtered.filter(
        (staff) => staff.role?.toLowerCase() === selectedRole.toLowerCase()
      );
    }

    // Filter by search query if it exists
    if (searchQuery) {
      filtered = filtered.filter(
        (staff) =>
          staff.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          staff.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (staff.mobile && staff.mobile.toString().includes(searchQuery))
      );
    }

    return filtered;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <>
      <CustomHeader title="Staff" />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <View style={styles.container}>
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
              placeholder="Search"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.rolesDropdown}
              onPress={() => setIsRolesModalVisible(true)}
            >
              <Text style={styles.rolesDropdownText} numberOfLines={1}>
                {selectedRole}
              </Text>
              <RemixIcon
                name="arrow-down-s-line"
                size={20}
                style={styles.dropdownIcon}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sortButton} onPress={handleSort}>
            <Icon
              name={isAscending ? "arrow-upward" : "arrow-downward"}
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        <Modal
          transparent={true}
          visible={isRolesModalVisible}
          animationType="fade"
          onRequestClose={() => setIsRolesModalVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setIsRolesModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Role</Text>
                  <TouchableOpacity
                    onPress={() => setIsRolesModalVisible(false)}
                  >
                    <RemixIcon name="close-line" size={24} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={rolesList}
                  keyExtractor={(item) => item.role_id?.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.roleItem}
                      onPress={() => handleRoleSelect(item)}
                    >
                      <Text
                        style={[
                          styles.roleItemText,
                          item.role_name.toLowerCase() === "all" &&
                            styles.roleItemTextAll,
                        ]}
                      >
                        {item.role_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>{selectedStatus}</Text>
          <Icon name="arrow-drop-down" size={24} color="#000" />
        </TouchableOpacity>
      </View> */}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0dcaf0" />
          </View>
        ) : (
          <FlatList
            data={
              searchQuery.length >= 3 ? filteredStaffList : getFilteredStaff()
            }
            renderItem={renderStaffCard}
            keyExtractor={(item) => item.staff_id?.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#0dcaf0"]}
              />
            }
          />
        )}

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() =>
            navigation.navigate("AddNewStaff", {
              refresh: fetchStaffList,
            })
          }
        >
          <RemixIcon name="add-circle-line" size={20} color="#fff" />
          <Text style={styles.floatingButtonText}>Create</Text>
        </TouchableOpacity>

        <CustomTabBar />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchSection: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  gridButton: {
    padding: 10,
    marginLeft: 10,
  },
  sortButton: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  filterContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  filterButtonText: {
    flex: 1,
    color: "#000",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    height: 70,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarBackground: {
    backgroundColor: "#00bcd4",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  staffInfo: {
    marginLeft: 15,
    flex: 1,
    justifyContent: "center",
  },
  staffName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
    color: "#666",
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4caf50",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 100,
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
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 80,
  },
  rolesDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    minWidth: 120,
  },
  rolesDropdownText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginRight: 4,
  },
  dropdownIcon: {
    marginLeft: "auto",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    width: "80%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  roleItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  roleItemText: {
    fontSize: 16,
  },
  roleItemTextAll: {
    // fontWeight: 'bold',
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
});

export default StaffTabs;
