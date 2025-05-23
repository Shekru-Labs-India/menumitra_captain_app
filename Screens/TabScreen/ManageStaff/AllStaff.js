import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
  TextInput,
} from "react-native";
import axios from "axios";
import { Card } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import globalStyles from "../../../styles";
import { getRestaurantId } from "../../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import { onGetProductionUrl } from "../../utils/ConstantFunctions";
import MainToolBar from "../../MainToolbar";

const { width } = Dimensions.get("window");

const AllStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation();

  useEffect(() => {
    fetchStaff(); // Fetch staff on component mount
  }, []);

  const fetchStaff = async () => {
    try {
      let restaurantId = await getRestaurantId();
      const response = await axios.post(
        onGetProductionUrl() + "/get_staff_list_with_role",
        {
          outlet_id: restaurantId,
          staff_role: "all",
        }
      );
      if (response.data.st === 1) {
        setStaff(response.data.lists);
      } else {
        setError("Failed to fetch staff");
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPress = (item) => {
    navigation.navigate("EditStaff", {
      staffId: item.staff_id,
      refresh: fetchStaff,
    });
  };

  const handleAddNewPress = () => {
    navigation.navigate("AddNewStaff", { refresh: fetchStaff }); // Pass fetchStaff to AddNewStaff
  };

  const filteredPosts = staff.filter((post) =>
    post.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Image
          source={{ uri: item.photo }} // Assuming the photo URL is in `item.photo`
          style={styles.image}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.subtitle}>
            {item.mobile} {item.role}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleEditPress(item)}>
          <Image
            source={require("../../../assets/edit.png")}
            style={globalStyles.editImage}
          />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error fetching staff: {error}</Text>
        <TouchableOpacity onPress={() => setLoading(true)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbarContainer}>
        <MainToolBar />
      </View>
      <View style={globalStyles.searchContainer}>
        <TextInput
          style={globalStyles.searchInput}
          placeholder="Search staff"
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
        <Icon
          name="search"
          size={20}
          color="#6200ee"
          style={globalStyles.searchIcon}
        />
      </View>
      <FlatList
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.staff_id.toString()}
        contentContainerStyle={
          Platform.OS === "web" ? styles.fullWidthList : {}
        }
      />
      <TouchableOpacity
        style={globalStyles.addButton}
        onPress={handleAddNewPress}
      >
        <RemixIcon name="ri-add-circle-line" size={24} color="#fff" />
        <Text style={globalStyles.addButtonText}>Create</Text>
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
  toolbarContainer: {
    backgroundColor: "#f6f6f6",
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginLeft: 10,
    borderBottomColor: "#e0e0e0",
  },
  card: {
    margin: 5,
    borderRadius: 5,
    elevation: 0,
    backgroundColor: "#fff",
    width: Platform.OS === "web" ? width * 0.9 : "98%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
  },
  image: {
    width: 40,
    height: 40,
    marginHorizontal: 5,
  },
  textContainer: {
    width: "75%",
    justifyContent: "center",
    height: "100%",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#000",
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
});

export default AllStaff;
