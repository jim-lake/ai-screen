import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { useNavigation } from '@react-navigation/native';

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: 'black', fontSize: 20 },
});

export default function HomeScreen() {
  const navigation = useNavigation();
  return (
    <>
    <StatusBar barStyle='dark-content' />
    <View style={styles.container}>
      <Text style={styles.text}>Home Screen2</Text>
      <TouchableHighlight onPress={() => navigation.navigate('Key')}>
        <View style={{ height: 40, width: 40}}>
          <Text>Key</Text>
        </View>
      </TouchableHighlight>
    </View>
    </>
  );
}
