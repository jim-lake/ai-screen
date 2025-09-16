import { useNavigation } from '@react-navigation/native';

import {
  ScrollView,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { ItemList } from './components/item_list';
import { StyleSheet, useStyles } from './components/theme_style';
import KeyStore from './stores/key_store';

import type { Item } from './components/item_list';
import type { StackNavigation } from './router';
import type { SshKey } from './stores/key_store';

const baseStyles = StyleSheet.create({
  button: { height: 40, marginTop: 10, width: 200 },
  buttonText: { color: 'var(--text-color)', fontSize: 20 },
  keyListScreen: { flex: 1 },
  list: { marginTop: 10 },
  noKeys: { color: 'var(--text-color)' },
  text: { color: 'var(--text-color)', fontSize: 'var(--text-size)' },
});

export default function KeyListScreen() {
  const navigation = useNavigation<StackNavigation<'Key'>>();
  const styles = useStyles(baseStyles);
  const list = KeyStore.useList();
  let keys: Item[] = [];
  if (list.length > 0) {
    keys = list
      .filter(_filterPrivate)
      .map((item) => ({
        text: item.label,
        subtext: _type(item),
        screen: 'Key' as const,
        args: { key_tag: item.tag },
      }));
  }

  return (
    <ScrollView
      style={styles.keyListScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <ItemList style={styles.list} list={keys} />
      <TouchableHighlight
        style={styles.button}
        onPress={() => {
          navigation.navigate('KeyNew');
        }}
      >
        <View style={StyleSheet.absoluteFill}>
          <Text style={styles.buttonText}>New Key</Text>
        </View>
      </TouchableHighlight>
    </ScrollView>
  );
}
function _filterPrivate(item: SshKey) {
  return item.class === 'Private';
}
function _type(item: SshKey): string {
  let ret = '';
  if (item.type === 'EC') {
    ret = 'ECDSA P-256';
  } else if (item.type === 'ED') {
    ret = 'ED25519';
  } else if (item.size === 4096) {
    ret = 'RSA 4096';
  } else {
    ret = 'RSA 2048';
  }
  return ret;
}
