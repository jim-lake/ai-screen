import { StatusBar, useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import './theme/colors';

import HomeScreen from './home_screen';
import KeyScreen from './key_screen';

const RootStack = createNativeStackNavigator({
  screens: { Home: HomeScreen, Key: KeyScreen },
});
const Navigation = createStaticNavigation(RootStack);
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
