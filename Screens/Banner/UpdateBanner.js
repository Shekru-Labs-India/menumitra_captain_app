import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import newstyles from "../newstyles";
import Icon from "react-native-vector-icons/MaterialIcons";
import { getRestaurantId } from "../utils/getOwnerData";
import { onGetOwnerUrl } from "../utils/ConstantFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebService from "../utils/WebService";

export default function UpdateBanner({ route, navigation }) {
  const { banner_id } = route.params; // get menu category ID from navigation params
  const [name, setName] = useState("");
  const [offer, setOffer] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [description, setDescription] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);

  useEffect(() => {
    // Fetch the existing menu category details

    fetchCategoryDetails();
  }, [banner_id]);

  const fetchCategoryDetails = async () => {
    try {
      let restaurantId = await getRestaurantId();

      const response = await axios.post(onGetOwnerUrl() + "/banner/view", {
        restaurant_id: restaurantId,
        banner_id,
      });
      if (response.data.st === 1) {
        const bannerData = response.data.data;
        setName(bannerData.name);
        setProfileImage(bannerData.image);
        setOffer(bannerData.offer);
        setProductTitle(bannerData.product_title);
        setDescription(bannerData.description);
      } else {
        Alert.alert("Error", "Failed to fetch category details.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.log(error);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const fileReader = new FileReader();
          fileReader.onload = () => {
            setProfileImage(fileReader.result);
          };
          fileReader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      let result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!result.granted) {
        alert("Permission to access gallery is required!");
        return;
      }
      let pickedImage = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!pickedImage.canceled) {
        setProfileImage(pickedImage.assets[0].uri);
        setImageSelected(true);
      }
    }
  };

  const handleUpdateBanner = async () => {
    if (!name) {
      Alert.alert("Error", "Please fill out all fields with valid values.");
      return;
    }

    setLoading(true);
    try {
      let restaurantId = await getRestaurantId();

      const formData = new FormData();
      formData.append("name", name);
      formData.append("offer", offer);
      formData.append("product_title", productTitle);
      formData.append("description", description);
      formData.append("restaurant_id", restaurantId);
      formData.append("banner_id", banner_id);

      // Only append the new image if it's selected (not the default one)
      if (imageSelected) {
        formData.append("image", {
          uri: profileImage,
          type: "image/jpeg",
          name: "profile.jpg",
        });
      }

      const response = await axios.post(
        onGetOwnerUrl() + "/banner/update",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.st === 1) {
        setLoading(false);
        if (route.params?.onSuccess) {
          route.params.onSuccess();
        }
        navigation.goBack();
      } else {
        setLoading(false);
        Alert.alert("Error", response.data.msg);
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async () => {
    setLoading(true);
    try {
      let restaurantId = await getRestaurantId();

      const response = await axios.post(onGetOwnerUrl() + "/banner/delete", {
        restaurant_id: restaurantId,
        banner_id,
      });

      if (response.data.st === 1) {
        Alert.alert("Success", "Category deleted successfully.");
        if (route.params?.onSuccess) {
          route.params.onSuccess();
        }
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to delete category. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <TextInput
          label="Banner Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={newstyles.input}
        />
        <TextInput
          label="Offer"
          value={offer}
          onChangeText={setOffer}
          mode="outlined"
          style={newstyles.input}
        />
        <TextInput
          label="Product Title"
          value={productTitle}
          onChangeText={setProductTitle}
          mode="outlined"
          style={newstyles.input}
        />
        <TextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={newstyles.input}
        />

        <TouchableOpacity onPress={pickImage} style={styles.card}>
          {!profileImage ? (
            <View style={styles.cardContent}>
              <Icon name="cloud-upload" size={40} color="#888" />
              <Text style={styles.cardTitle}>Click to Upload</Text>
              <Text style={styles.cardSubtitle}>(Max file size: 5Mb)</Text>
            </View>
          ) : (
            <Image source={{ uri: profileImage }} style={styles.image} />
          )}
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={handleUpdateBanner}
          loading={loading}
          disabled={loading}
          style={newstyles.submitButton}
        >
          Update Banner
        </Button>

        <Button
          mode="contained"
          onPress={handleDeleteBanner}
          loading={loading}
          disabled={loading}
          style={[newstyles.submitButton, { backgroundColor: "red" }]}
        >
          Delete Banner
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    margin: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    color: "#333",
    marginTop: 10,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#888",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
});
