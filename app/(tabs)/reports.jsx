// import React from "react";
// import {
//   StyleSheet,
//   View,
//   Text,
//   TouchableOpacity,
//   SafeAreaView,
//   StatusBar,
//   ScrollView,
//   Platform,
// } from "react-native";
// import { MaterialIcons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import Header from "../components/Header";

// export default function ReportsScreen() {
//   const router = useRouter();

//   const reportCards = [
//     {
//       title: "Order Reports",
//       icon: "receipt-long",
//       route: "/(tabs)/staff/reports/orders",
//       color: "#4CAF50",
//       description: "View daily, weekly and monthly order statistics",
//     },
//     {
//       title: "Inventory Reports",
//       icon: "inventory",
//       route: "/(tabs)/staff/reports/inventory",
//       color: "#2196F3",
//       description: "Track inventory levels and movement",
//     },
//   ];

//   return (
//     <SafeAreaView style={styles.container}>
//       <StatusBar backgroundColor="#fff" barStyle="dark-content" />
//       <Header title="Reports" />

//       <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
//         <View style={styles.cardsContainer}>
//           {reportCards.map((card, index) => (
//             <TouchableOpacity
//               key={index}
//               style={[styles.card, { backgroundColor: card.color }]}
//               onPress={() => router.push(card.route)}
//             >
//               <MaterialIcons name={card.icon} size={30} color="#fff" />
//               <Text style={styles.cardTitle}>{card.title}</Text>
//               <Text style={styles.cardDescription}>{card.description}</Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#fff",
//   },
//   header: {
//     height: 60,
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//     backgroundColor: "#fff",
//     elevation: 2,
//     shadowColor: "#000",
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#333",
//   },
//   content: {
//     flex: 1,
//     padding: 15,
//   },
//   cardsContainer: {
//     gap: 15,
//   },
//   card: {
//     width: "100%",
//     height: 120,
//     borderRadius: 10,
//     padding: 20,
//     marginBottom: 15,
//     elevation: 3,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   cardTitle: {
//     color: "#fff",
//     fontSize: 20,
//     fontWeight: "bold",
//     marginTop: 12,
//   },
//   cardDescription: {
//     color: "#fff",
//     fontSize: 14,
//     marginTop: 8,
//     opacity: 0.9,
//   },
// });
