import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { StyleSheet, useStyles } from './components/theme_style';

const baseStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: 'var(--text-color)', fontSize: 20 },
});

export default function HomeScreen() {
  const navigation = useNavigation();
  const styles = useStyles(baseStyles);
  return (
    <>
      <View style={styles.container}>
        <Text style={styles.text}>Home Screen2</Text>
        <TouchableHighlight onPress={() => navigation.navigate('Key')}>
          <View style={{ height: 40, width: 40 }}>
            <Text style={styles.text}>Key</Text>
          </View>
        </TouchableHighlight>
      </View>
    </>
  );
}
