import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  StatusBar,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { StyleSheet, useStyles } from './components/theme_style';
import KeyStore from './stores/key_store';
import type { ReactNode } from 'react';

const rawStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: 'var(--text-color)', fontSize: 'var(--text-size)' },
  noKeys: { color: 'var(--text-color)' },
  buttonText: { color: 'black', fontSize: 20 },
});

export default function HomeScreen() {
  const navigation = useNavigation();
  const styles = useStyles(rawStyles);
  console.log("styles:", styles);
  const list = KeyStore.useList();
  useEffect(() => {
    void KeyStore.fetch();
  }, []);
  let keys: ReactNode = null;
  if (list.length > 0) {
    keys = list.map((item, i) => (
      <Text key={i} style={styles.noKeys}>
        Key: {item.tag}
      </Text>
    ));
  } else {
    keys = <Text style={styles.noKeys}>No Keys</Text>;
  }

  return (
    <>
      <StatusBar barStyle='dark-content' />
      <View style={styles.container}>
        <Text style={styles.text}>Key Screen</Text>
        {keys}
        <TouchableHighlight onPress={() => navigation.goBack()}>
          <View style={{ height: 40, width: 40 }}>
            <Text style={styles.buttonText}>Home</Text>
          </View>
        </TouchableHighlight>
      </View>
    </>
  );
}
