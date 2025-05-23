import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Switch,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RemixIcon from "react-native-remix-icon";
import CustomHeader from "../../components/CustomHeader";
import { onGetProductionUrl } from "../utils/ConstantFunctions";
import WebService from "../utils/WebService";
import CustomTabBar from "../CustomTabBar";
import { TextInput } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import MainToolBar from "../MainToolbar";
import axiosInstance from "../../utils/axiosConfig";

const SupplierList = ({ navigation, route }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierStatusLoading, setSupplierStatusLoading] = useState({});

  const fetchSuppliers = async () => {
    try {
      const [outletId, accessToken] = await Promise.all([
        AsyncStorage.getItem(WebService.OUTLET_ID),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "supplier_listview",
        { outlet_id: outletId },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.st === 1) {
        setSuppliers(response.data.data);
      } else {
        console.log("Error", response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      console.log("Error", "Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();

    // Add listener for when screen comes into focus
    const unsubscribe = navigation.addListener("focus", () => {
      fetchSuppliers();
    });

    return unsubscribe;
  }, [navigation]);

  // Add search and filter functionality
  useEffect(() => {
    if (suppliers.length > 0) {
      let result = [...suppliers];

      // Apply status filter with null check
      if (statusFilter !== "all") {
        result = result.filter(
          (supplier) =>
            supplier.supplier_status?.toLowerCase() === statusFilter.toLowerCase()
        );
      }

      // Apply search filter with null checks
      if (searchQuery) {
        result = result.filter(
          (supplier) =>
            (supplier.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (supplier.mobile_number1 || "").includes(searchQuery) ||
            (supplier.supplier_code || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setFilteredSuppliers(result);
    }
  }, [suppliers, searchQuery, statusFilter]);

  const handleCallPress = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const toTitleCase = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleActiveStatusChange = async (supplierId, isActive, index) => {
    try {
      setSupplierStatusLoading(prev => ({ ...prev, [supplierId]: true }));
      
      const [outletId, accessToken] = await Promise.all([
        AsyncStorage.getItem(WebService.OUTLET_ID),
        AsyncStorage.getItem("access_token"),
      ]);

      const response = await axiosInstance.post(
        onGetProductionUrl() + "update_active_status",
        {
          outlet_id: outletId,
          type: "supplier",
          id: supplierId,
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
        // Update the status in both suppliers and filteredSuppliers arrays
        setSuppliers(prevSuppliers => 
          prevSuppliers.map(supplier => 
            supplier.supplier_id === supplierId 
              ? { ...supplier, supplier_status: isActive ? "active" : "inactive" }
              : supplier
          )
        );
        
        setFilteredSuppliers(prevFiltered => 
          prevFiltered.map(supplier => 
            supplier.supplier_id === supplierId 
              ? { ...supplier, supplier_status: isActive ? "active" : "inactive" }
              : supplier
          )
        );
        
        Alert.alert(
          isActive ? "Supplier activated successfully" : "Supplier deactivated successfully"
        );
      } else {
        throw new Error(response.data.msg || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating supplier status:", error);
      Alert.alert("Error", "An error occurred while updating status");
    } finally {
      setSupplierStatusLoading(prev => ({ ...prev, [supplierId]: false }));
    }
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("ViewSupplier", { supplierId: item.supplier_id })
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.rowContainer}>
          <View style={styles.leftContent}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    item.supplier_status === "active" ? "#28a745" : "#dc3545",
                },
              ]}
            />
            <Text style={styles.supplierName}>{toTitleCase(item.name || "")}</Text>
          </View>
          <View style={styles.rightContent}>
           
            <TouchableOpacity
              style={styles.phoneButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCallPress(item.mobile_number1);
              }}
            >
              <RemixIcon name="phone-fill" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchSuppliers().then(() => setRefreshing(false));
  }, []);

  return (
    <>
      <CustomHeader title="Suppliers" />
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <View style={styles.container}>
        <View style={styles.filterContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search supplier"
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            left={<TextInput.Icon icon="magnify" />}
          />
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={statusFilter}
              style={styles.picker}
              onValueChange={(itemValue) => setStatusFilter(itemValue)}
            >
              <Picker.Item label="All " value="all" />
              <Picker.Item label="Active" value="active" />
              <Picker.Item label="Inactive" value="inactive" />
            </Picker>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <FlatList
            data={filteredSuppliers}
            renderItem={renderItem}
            keyExtractor={(item) => item.supplier_id.toString()}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery || statusFilter !== "all"
                    ? "No suppliers found matching your criteria"
                    : "No suppliers available"}
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddSupplier")}
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
    padding: 16,
    marginBottom: 80,
  },
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardContent: {
    position: "relative",
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLoader: {
    marginRight: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  supplierName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  phoneButton: {
    backgroundColor: "#28a745",
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#0dcaf0",
    borderRadius: 30,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
  },
  fabText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 2,
    backgroundColor: "#fff",
    elevation: 2,
    height: 50,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ced4da",
    elevation: 2,
    height: 50,
    justifyContent: "center",
  },
  picker: {
    height: 50,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  addButton: {
    position: "absolute",
    right: 16,
    bottom: 0,
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
});

export default SupplierList;
