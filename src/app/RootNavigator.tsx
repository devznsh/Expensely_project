// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Layout from './_layout'; 
import AddExpense from '../app/add';
import SetBudget from '../app/budget';
import Reports from '../app/reports';
import ScanReceipt from '../app/scan';
import LoginScreen from '../fireauth/fireauth';


const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Tabs */}
      <Stack.Screen name="Tabs" component={Layout} />

      {/* Stack Screens */}
      <Stack.Screen name="AddExpense" component={AddExpense} />
      <Stack.Screen name="SetBudget" component={SetBudget} />
      <Stack.Screen name="ScanReceipt" component={ScanReceipt} />
      <Stack.Screen name="Reports" component={Reports} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
    </Stack.Navigator>
  );
}
