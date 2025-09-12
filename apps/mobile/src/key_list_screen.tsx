import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

import {
  ScrollView,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { ItemList } from './components/item_list';
import { StyleSheet, useStyles } from './components/theme_style';
import KeyStore from './stores/key_store';

import type { StackScreenProps } from './router';
import type { ReactNode } from 'react';
import type { Item } from './components/item_list';

const rawStyles = StyleSheet.create({
  button: { marginTop: 10, height: 40, width: 200 },
  buttonText: { color: 'var(--text-color)', fontSize: 20 },
  keyListScreen: { flex: 1 },
  noKeys: { color: 'var(--text-color)' },
  text: { color: 'var(--text-color)', fontSize: 'var(--text-size)' },
});

export default function KeyListScreen() {
  const navigation = useNavigation<StackScreenProps<'Key'>>();
  const styles = useStyles(rawStyles);
  const list = KeyStore.useList();
  useEffect(() => {
    void KeyStore.fetch();
  }, []);
  let keys: Item[] = [];
  if (list.length > 0) {
    keys = list.map((item, i) => ({
      text: item.label,
      subtext: item.public,
      screen: 'Key' as const,
      args: {
        key_tag: item.tag,
      },
    }));
  }

  return (
    <ScrollView
      style={styles.keyListScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <ItemList list={keys} />
      <TouchableHighlight
        style={styles.button}
        onPress={() => {
          navigation.goBack();
        }}
      >
        <View style={StyleSheet.absoluteFill}>
          <Text style={styles.buttonText}>Home</Text>
        </View>
      </TouchableHighlight>
      <TouchableHighlight
        style={styles.button}
        onPress={() => {
          navigation.navigate('NewKey');
        }}
      >
        <View style={StyleSheet.absoluteFill}>
          <Text style={styles.buttonText}>New Key</Text>
        </View>
      </TouchableHighlight>
    </ScrollView>
  );
}
