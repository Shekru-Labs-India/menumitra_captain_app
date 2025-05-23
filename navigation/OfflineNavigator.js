import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screen components
import OfflineMenuListScreen from '../Screens/Menu/MenuProduct/OfflineMenuListScreen';
import OfflineAddMenuProduct from '../Screens/Menu/MenuProduct/OfflineAddMenuProduct';

const Stack = createStackNavigator();

export default function OfflineNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="OfflineMenuList"
      screenOptions={{
        headerShown: true
      }}
    >
      <Stack.Screen 
        name="OfflineMenuList" 
        component={OfflineMenuListScreen}
        options={{
          title: 'Offline Menu'
        }}
      />
      <Stack.Screen 
        name="OfflineAddMenuProduct" 
        component={OfflineAddMenuProduct}
        options={{
          title: 'Add Menu Item'
        }}
      />
    </Stack.Navigator>
  );
} 