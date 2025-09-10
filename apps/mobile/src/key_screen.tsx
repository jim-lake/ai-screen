import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import {
  ScrollView,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { StyleSheet, useStyles } from './components/theme_style';
import type { StackScreenProps } from './router';
import KeyStore from './stores/key_store';

const rawStyles = StyleSheet.create({
  button: { height: 40, width: 40 },
  buttonText: { color: 'var(--text-color)', fontSize: 20 },
  keyScreen: { flex: 1 },
  noKeys: { color: 'var(--text-color)' },
  text: { color: 'var(--text-color)', fontSize: 'var(--text-size)' },
});

export default function KeyScreen() {
  const navigation = useNavigation<StackScreenProps<'Key'>>();
  const styles = useStyles(rawStyles);
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
    <ScrollView
      style={styles.keyScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <Text style={styles.text}>Key Screen</Text>
      {keys}
      <TouchableHighlight
        onPress={() => {
          navigation.goBack();
        }}
      >
        <View style={styles.button}>
          <Text style={styles.buttonText}>Home</Text>
        </View>
      </TouchableHighlight>
      <TouchableHighlight
        onPress={() => {
          navigation.navigate('NewKey');
        }}
      >
        <View style={styles.button}>
          <Text style={styles.buttonText}>New Key</Text>
        </View>
      </TouchableHighlight>
    </ScrollView>
  );
}
