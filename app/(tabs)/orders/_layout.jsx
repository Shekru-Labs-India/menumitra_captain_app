import { Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function OrdersLayout() {
  const router = useRouter();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => {
                /* Add filter/search action */
              }}
            >
              <MaterialIcons name="filter-list" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="order-details"
        options={{
          animation: "slide_from_right",
          presentation: "card",
          headerTitle: "Order Details",
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 16 }}
              onPress={() => {
                /* Add print/share action */
              }}
            >
              <MaterialIcons name="file-download" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
