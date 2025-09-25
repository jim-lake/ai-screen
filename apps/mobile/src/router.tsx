import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlatformColor } from 'react-native';

import ConnectScreen from './connect_screen';
import HomeScreen from './home_screen';
import KeyEditScreen from './key_edit_screen';
import KeyListScreen from './key_list_screen';
import KeyNewScreen from './key_new_screen';
import KeyScreen from './key_screen';
import ServerEditScreen from './server_edit_screen';
import ServerNewScreen from './server_new_screen';
import ServerScreen from './server_screen';

import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

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
  ServerEdit: {
    screen: ServerEditScreen,
    options: { title: '', headerLargeTitle: false },
  },
  Connect: {
    screen: ConnectScreen,
    options: { title: '', headerLargeTitle: false, headerBackTitle: 'Home' },
  },
} as const;

type RootStack = typeof screens;

interface StackParamList {
  Key: { key_tag: string };
  KeyEdit: { key_tag: string };
  Server: { server_id: string };
  ServerEdit: { server_id: string };
  Connect: { server_id: string };
}
export type RootStackParamList = {
  [K in keyof RootStack]: K extends keyof StackParamList
    ? StackParamList[K]
    : undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type StackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type StackNavigation<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;

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
