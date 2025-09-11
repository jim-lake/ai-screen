import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlatformColor } from 'react-native';

import HomeScreen from './home_screen';
import KeyScreen from './key_screen';
import NewKeyScreen from './new_key_screen';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export const screens = {
  Home: HomeScreen,
  Key: { screen: KeyScreen, options: { title: 'SSH Keys' } },
  NewKey: {
    screen: NewKeyScreen,
    options: {
      presentation: 'modal' as const,
      animation: 'slide_from_bottom' as const,
      gestureEnabled: true,
      headerLargeTitle: false,
      headerTitle: 'New SSH Key',
    },
  },
} as const;

type RootStack = typeof screens;

export type StackScreenProps<T extends keyof RootStack> =
  NativeStackNavigationProp<Record<keyof RootStack, undefined>, T>;

export const StackNavigator = createNativeStackNavigator({
  screens,
  screenOptions: {
    headerLargeTitle: true,
    headerTransparent: true,
    headerBlurEffect: 'systemUltraThinMaterial',
    headerLargeStyle: { backgroundColor: 'transparent' },
    contentStyle: { backgroundColor: PlatformColor('systemBackgroundColor') },
  },
});
