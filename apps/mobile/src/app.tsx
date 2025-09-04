import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './home_screen';
import KeyScreen from './key_screen';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Key: KeyScreen,
  },
});
const Navigation = createStaticNavigation(RootStack);
export default function App() {
  return <Navigation />;
}
