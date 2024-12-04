import { Tabs } from "expo-router";
import BoxIcon from "../../components/BoxIcon";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <BoxIcon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => (
            <BoxIcon name="menu" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: "Staff",
          tabBarIcon: ({ color }) => (
            <BoxIcon name="staff" size={24} color={color} />
          ),
          href: "/staff/index",
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <BoxIcon name="staff" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
