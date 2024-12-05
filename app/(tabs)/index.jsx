import React, { useState, useEffect } from "react";
import {
  Image,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  StatusBar,
  ScrollView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Sidebar from "../components/Sidebar";
import { Audio } from "expo-av";

export default function HomeScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const router = useRouter();

  // Cleanup sound on component unmount
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  async function playSound() {
    if (isPlaying) {
      // If sound is playing, stop it
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(undefined);
      setIsPlaying(false);
    } else {
      // Load and play the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/simple-notification.mp3"), // Make sure to add your sound file
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const managementCards = [
    {
      title: "Staff",
      icon: "group",
      route: "/(tabs)/staff",
      color: "#4CAF50",
    },
    {
      title: "Orders",
      icon: "receipt",
      route: "/(tabs)/orders",
      color: "#2196F3",
    },
    {
      title: "Table Section",
      icon: "table-restaurant",
      route: "/(tabs)/tables/sections",
      color: "#9C27B0",
    },
    {
      title: "Inventory",
      icon: "inventory",
      route: "/(tabs)/staff/inventory",
      color: "#FF9800",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      {/* Header */}
      <View
        style={[
          styles.header,
          Platform.OS === "android" && {
            marginTop: StatusBar.currentHeight,
          },
        ]}
      >
        <View style={styles.headerTitleContainer}>
          <Image
            source={require("../../assets/images/mm-logo-bg-fill-hat.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>MenuMitra Captain</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.menuButton} onPress={playSound}>
            <MaterialIcons name="notifications" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <MaterialIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {managementCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { backgroundColor: card.color }]}
              onPress={() => router.push(card.route)}
            >
              <MaterialIcons name={card.icon} size={32} color="#fff" />
              <Text style={styles.cardTitle}>{card.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  card: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
    numberOfLines: 2,
    adjustsFontSizeToFit: true,
  },
});
