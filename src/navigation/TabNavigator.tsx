import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

import CameraScreen from '../screens/CameraScreen';
import QuizScreen from '../screens/QuizScreen';
import DashboardScreen from '../screens/DashboardScreen';

const Tab = createBottomTabNavigator();

// 탭 아이콘 컴포넌트
const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => {
  const icons: { [key: string]: string } = {
    '촬영': '📷',
    '퀴즈': '📝',
    '대시보드': '📊',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[label]}
      </Text>
    </View>
  );
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingTop: 5,
          paddingBottom: 25,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 5,
        },
      }}
    >
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          tabBarLabel: '촬영',
          tabBarIcon: ({ focused }) => <TabIcon label="촬영" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Quiz"
        component={QuizScreen}
        options={{
          tabBarLabel: '퀴즈',
          tabBarIcon: ({ focused }) => <TabIcon label="퀴즈" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: '대시보드',
          tabBarIcon: ({ focused }) => <TabIcon label="대시보드" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
});
