import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlatformColor } from 'react-native';

import HomeScreen from './home_screen';
import KeyListScreen from './key_list_screen';
import KeyScreen from './key_screen';
import KeyEditScreen from './key_edit_screen';
import KeyNewScreen from './key_new_screen';
import ServerScreen from './server_screen';
import ServerNewScreen from './server_new_screen';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export const screens = {
  Home: { screen: HomeScreen, options: { title: 'AI Screen' } },
  KeyList: { screen: KeyListScreen, options: { title: 'SSH Keys' } },
  Key: { screen: KeyScreen, options: { title: '', headerLargeTitle: false } },
  KeyEdit: {
    screen: KeyEditScreen,
    options: { title: '', headerLargeTitle: false },
  },
  KeyNew: {
    screen: KeyNewScreen,
    options: {
      presentation: 'modal' as const,
      animation: 'slide_from_bottom' as const,
      gestureEnabled: true,
      headerLargeTitle: false,
      headerTitle: 'New SSH Key',
    },
  },
  ServerNew: {
    screen: ServerNewScreen,
    options: {
      presentation: 'modal' as const,
      animation: 'slide_from_bottom' as const,
      gestureEnabled: true,
      headerLargeTitle: false,
      headerTitle: 'New SSH Server',
    },
  },
  Server: {
    screen: ServerScreen,
    options: { title: '', headerLargeTitle: false, headerBackTitle: 'Home' },
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
