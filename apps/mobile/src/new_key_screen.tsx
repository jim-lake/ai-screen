import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Button,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { StyleSheet, useStyles } from './components/theme_style';
import type { StackScreenProps } from './router';
import KeyStore from './stores/key_store';

const rawStyles = StyleSheet.create({
  button: { height: 40, width: 40 },
  buttonText: { color: 'black', fontSize: 20 },
  newKeyScreen: { flex: 1 },
  noKeys: { color: 'var(--text-color)' },
  text: { color: 'var(--text-color)', fontSize: 'var(--text-size)' },
});

export default function NewKeyScreen() {
  const navigation = useNavigation<StackScreenProps<'NewKey'>>();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button
          title='Cancel'
          onPress={() => {
            navigation.goBack();
          }}
        />
      ),
      headerRight: () => (
        <Button
          title='Save'
          onPress={() => {
            navigation.goBack();
          }}
        />
      ),
    });
  }, [navigation]);

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
    <SafeAreaView style={styles.newKeyScreen}>
      <Text style={styles.text}>New Key Screen</Text>
      {keys}
      <TouchableHighlight
        onPress={() => {
          navigation.goBack();
        }}
      >
        <View style={styles.button}>
          <Text style={styles.buttonText}>Dismiss</Text>
        </View>
      </TouchableHighlight>
    </SafeAreaView>
  );
}
