import { Button, StatusBar, useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import './theme/colors';

import { StackNavigator } from './router';

const Navigation = createStaticNavigation(StackNavigator);
export default function App() {
  const scheme = useColorScheme();
  return (
    <>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Navigation theme={scheme === 'dark' ? DarkTheme : DefaultTheme} />
    </>
  );
}
