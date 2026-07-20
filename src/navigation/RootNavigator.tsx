import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainTabParamList, RootStackParamList } from './types';
import { palette } from '../theme/colors';
import { fonts } from '../theme/typography';
import { shadows } from '../theme/tokens';
import { Icon, IconName } from '../components/Icon';
import { ScreenErrorBoundary } from '../components/ScreenErrorBoundary';
import { useGameStore } from '../store/gameStore';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={styles.tabIconWrap}>
      <Icon name={name} size={21} color={focused ? palette.goldBright : '#5F6B7E'} />
      <View style={[styles.tabDot, !focused && { opacity: 0 }]} />
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabPad = Math.max(insets.bottom, Platform.OS === 'android' ? 20 : 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          backgroundColor: palette.bgDeep,
          borderTopColor: 'rgba(212,168,75,0.14)',
          borderTopWidth: 1,
          height: 60 + tabPad,
          paddingBottom: tabPad,
          paddingTop: 8,
          ...shadows.deep,
        },
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: '#5F6B7E',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemi,
          fontSize: 9.5,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarItemStyle: { paddingHorizontal: 0 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        getComponent={() => require('../screens/HomeScreen').HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Collection"
        getComponent={() => require('../screens/CollectionScreen').CollectionScreen}
        options={{
          tabBarLabel: 'Cards',
          tabBarIcon: ({ focused }) => <TabIcon name="collection" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Deck"
        getComponent={() => require('../screens/DeckScreen').DeckScreen}
        options={{
          tabBarLabel: 'Deck',
          tabBarIcon: ({ focused }) => <TabIcon name="deck" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Shop"
        getComponent={() => require('../screens/ShopScreen').ShopScreen}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ focused }) => <TabIcon name="shop" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        getComponent={() => require('../screens/ProfileScreen').ProfileScreen}
        options={{
          tabBarLabel: 'You',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.bgDeep,
    card: palette.bgDeep,
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
          headerStyle: { backgroundColor: palette.bgDeep },
          headerTintColor: palette.gold,
          headerTitleStyle: {
            fontFamily: fonts.display,
            fontSize: 17,
            color: palette.text,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: palette.bgDeep },
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

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.gold,
    marginTop: 3,
  },
});
