import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import axios from "axios";
import globalStyles from "../../styles";
import { getRestaurantId } from "../utils/getOwnerData";
import RemixIcon from "react-native-remix-icon";
import { onGetOwnerUrl } from "../utils/ConstantFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "../utils/WebService";

const Banners = ({ navigation }) => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      let restaurantId = await getRestaurantId();
      const response = await axios.post(onGetOwnerUrl() + "/banner/listview", {
        restaurant_id: restaurantId,
      });
      if (response.data.st === 1) {
        setBanners(response.data.lists);
      } else {
        console.error("Error fetching banners:", response.data.msg);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
    }
  };

  const handleEditPress = useCallback(
    (item) => {
      navigation.navigate("UpdateBanner", {
        banner_id: item.banner_id,
        onSuccess: () => {
          // Logic to refresh or update the parent component
          fetchBanners();
        },
      });
    },
    [navigation]
  );

  const renderBannerItem = ({ item }) => (
    <View style={styles.bannerItem}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
      <Text style={styles.bannerName}>{item.name}</Text>
      <Text style={styles.bannerOffer}>{item.offer}%</Text>
      <TouchableOpacity
        style={styles.editIcon}
        onPress={() => handleEditPress(item)}
      >
        <Icon name="create-outline" size={24} color="#007BFF" />
      </TouchableOpacity>
    </View>
  );

  const handleAddNewPress = useCallback(() => {
    navigation.navigate("AddBanner", { refresh: fetchBanners });
  }, [navigation, fetchBanners]);

  const handleIconPress = (screenName) => {
    navigation.navigate(screenName);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Scrollable list */}
      <View style={styles.listContainer}>
        <FlatList
          data={banners}
          renderItem={renderBannerItem}
          keyExtractor={(item) => item.banner_id.toString()}
          contentContainerStyle={styles.list}
        />
        <TouchableOpacity
          style={globalStyles.addButton}
          onPress={handleAddNewPress}
        >
          <RemixIcon name="ri-add-circle-line" size={24} color="#fff" />
          <Text style={globalStyles.addButtonText}> Add Banner</Text>
        </TouchableOpacity>
      </View>

      {/* Fixed Icon Menu at the Bottom */}

      {/*<HomeNavigation navigation={navigation}/>*/}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContainer: {
    flex: 1,
    padding: 10,
    paddingBottom: 80, // Leave space for the fixed icon menu
  },
  list: {
    paddingBottom: 60, // Additional space for the add button
  },
  bannerItem: {
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    elevation: 2,
    padding: 10,
    position: "relative",
  },
  bannerImage: {
    borderColor: "#000000",
    marginTop: 30,
    marginBottom: 40,
    width: "100%",
    height: 200,
    borderRadius: 10,
  },
  bannerName: {
    position: "absolute",
    top: 10,
    left: 10,
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
  },
  bannerOffer: {
    position: "absolute",
    top: 10,
    right: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  editIcon: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 5,
  },
  iconMenu: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  iconContainer: {
    alignItems: "center",
  },
  iconText: {
    marginTop: 5,
    fontSize: 12,
    color: "#000",
  },
});

export default Banners;
