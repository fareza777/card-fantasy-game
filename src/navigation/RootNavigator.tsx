import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList, RootStackParamList } from './types';
import { palette } from '../theme/colors';
import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';
import { useGameStore } from '../store/gameStore';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      style={{
        color: focused ? palette.gold : palette.textMuted,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
        textAlign: 'center',
        minWidth: 52,
      }}
    >
      {label}
    </Text>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabPad = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 10);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          backgroundColor: palette.bgElevated,
          borderTopColor: palette.border,
          height: 54 + tabPad,
          paddingBottom: tabPad,
          paddingTop: 10,
        },
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        getComponent={() => require('../screens/HomeScreen').HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabLabel label="✦ HOME" focused={focused} /> }}
      />
      <Tab.Screen
        name="Collection"
        getComponent={() => require('../screens/CollectionScreen').CollectionScreen}
        options={{ tabBarIcon: ({ focused }) => <TabLabel label="◈ CARDS" focused={focused} /> }}
      />
      <Tab.Screen
        name="Deck"
        getComponent={() => require('../screens/DeckScreen').DeckScreen}
        options={{ tabBarIcon: ({ focused }) => <TabLabel label="☰ DECK" focused={focused} /> }}
      />
      <Tab.Screen
        name="Shop"
        getComponent={() => require('../screens/ShopScreen').ShopScreen}
        options={{ tabBarIcon: ({ focused }) => <TabLabel label="◆ SHOP" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        getComponent={() => require('../screens/ProfileScreen').ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabLabel label="◎ YOU" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.bg,
    card: palette.bgElevated,
    text: palette.text,
    border: palette.border,
    primary: palette.gold,
  },
};

function BattleScreenSafe() {
  const { BattleScreen } = require('../screens/BattleScreen') as typeof import('../screens/BattleScreen');
  return (
    <ScreenErrorBoundary onReset={() => useGameStore.getState().clearBattle()}>
      <BattleScreen />
    </ScreenErrorBoundary>
  );
}

function MainTabsSafe() {
  return (
    <ScreenErrorBoundary>
      <MainTabs />
    </ScreenErrorBoundary>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerStyle: { backgroundColor: palette.bgElevated },
          headerTintColor: palette.gold,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabsSafe} options={{ headerShown: false }} />
        <Stack.Screen
          name="Home"
          getComponent={() => require('../screens/HomeScreen').HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Battle"
          component={BattleScreenSafe}
          options={{ title: 'Rune Duel', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Rules"
          getComponent={() => require('../screens/RulesScreen').RulesScreen}
          options={{ title: 'How to Play' }}
        />
        <Stack.Screen
          name="Story"
          getComponent={() => require('../screens/StoryScreen').StoryScreen}
          options={{ title: 'Story', headerShown: false }}
        />
        <Stack.Screen
          name="PackReveal"
          getComponent={() => require('../screens/PackRevealScreen').PackRevealScreen}
          options={{ title: 'Booster', presentation: 'modal' }}
        />
        <Stack.Screen
          name="CardDetail"
          getComponent={() => require('../screens/CardDetailScreen').CardDetailScreen}
          options={{ title: 'Card' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
