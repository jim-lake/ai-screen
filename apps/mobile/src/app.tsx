import { useEffect } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  createStaticNavigation,
} from '@react-navigation/native';
import { StatusBar, useColorScheme } from 'react-native';

import { StackNavigator } from './router';
import KeyStore from './stores/key_store';
import ServerStore from './stores/server_store';

import './theme/colors';

const Navigation = createStaticNavigation(StackNavigator);
export default function App() {
  const scheme = useColorScheme();
  useEffect(() => {
    console.log("App.useEffect");
    void KeyStore.fetch();
    void ServerStore.init();
  }, []);
  return (
    <>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Navigation theme={scheme === 'dark' ? DarkTheme : DefaultTheme} />
    </>
  );
}
