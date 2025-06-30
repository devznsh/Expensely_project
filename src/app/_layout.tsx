// src/navigation/Layout.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import HomeScreen from '../app/index';
import ScanScreen from '../app/scan';
import BudgetScreen from '../app/budget';
import GroupsScreen from '../app/groups';
import ReportsScreen from '../app/reports';
import AddScreen from '../app/add';

const Tab = createBottomTabNavigator();

export default function Layout() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5D5FEF',
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="index"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="scan"
        component={ScanScreen}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <Icon name="camera-alt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="budget"
        component={BudgetScreen}
        options={{
          tabBarLabel: 'Budget',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-balance-wallet" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="groups"
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <Icon name="group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="add"
        component={AddScreen}
        options={{
          tabBarLabel: 'Add',
          tabBarIcon: ({ color, size }) => (
            <Icon name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
