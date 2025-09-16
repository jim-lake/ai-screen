import { useNavigation } from '@react-navigation/native';
import { ScrollView, Text, TouchableHighlight, View } from 'react-native';

import { ItemList } from './components/item_list';
import { StyleSheet, useStyles } from './components/theme_style';
import ServerStore from './stores/server_store';
import KeyStore from './stores/key_store';

import type { Item } from './components/item_list';
import type { StackScreenProps } from './router';

const baseStyles = StyleSheet.create({
  homeScreen: { flex: 1 },
  list: { marginTop: 10 },
  button: { backgroundColor: 'red', height: 40,  },
  padBottom: { height: 1000 },
  padTop: { height: 200 },
  text: { color: 'var(--text-color)', fontSize: 20 },
  touchable: { backgroundColor: 'green' },
  touchablePicker: { height: 100 },
});

export default function HomeScreen() {
  const navigation = useNavigation<StackScreenProps<'Home'>>();
  const styles = useStyles(baseStyles);
  const key_list = KeyStore.useList();
  const server_list = ServerStore.useList();

  let servers: Item[] = [];
  if (server_list.length > 0) {
    servers = server_list
      .map((item, i) => ({
        text: item.hostname,
        subtext: item.username,
        screen: 'Server' as const,
        args: { server_id: item.server_id },
      }));
  }

  return (
    <ScrollView
      style={styles.homeScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <ItemList style={styles.list} list={servers} />
      <TouchableHighlight
        style={styles.touchable}
        onPress={() => {
          navigation.navigate('KeyList');
        }}
      >
        <View style={styles.button}>
          <Text style={styles.text}>Key</Text>
        </View>
      </TouchableHighlight>
      <TouchableHighlight
        style={styles.touchable}
        onPress={() => {
          navigation.navigate('ServerNew');
        }}
      >
        <View style={styles.button}>
          <Text style={styles.text}>New Server</Text>
        </View>
      </TouchableHighlight>
      <View style={styles.padBottom} />
    </ScrollView>
  );
}
