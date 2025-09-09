import { useEffect, useLayoutEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ScrollView,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { StyleSheet, useStyles } from './components/theme_style';
import KeyStore from './stores/key_store';
import type { ReactNode } from 'react';
import type { StackScreenProps } from './router';

const rawStyles = StyleSheet.create({
  newKeyScreen: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: 'var(--text-color)', fontSize: 'var(--text-size)' },
  noKeys: { color: 'var(--text-color)' },
  buttonText: { color: 'black', fontSize: 20 },
});

export default function NewKeyScreen() {
  const navigation = useNavigation<StackScreenProps<'NewKey'>>();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Button title='Cancel' onPress={() => navigation.goBack()} />
      ),
      headerRight: () => (
        <Button title='Save' onPress={() => navigation.goBack()} />
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
      <TouchableHighlight onPress={() => navigation.goBack()}>
        <View style={{ height: 40, width: 40 }}>
          <Text style={styles.buttonText}>Dismiss</Text>
        </View>
      </TouchableHighlight>
    </SafeAreaView>
  );
}
