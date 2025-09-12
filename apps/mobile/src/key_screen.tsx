import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';

import {
  useWindowDimensions,
  Button,
  ScrollView,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { StyleSheet, useStyles } from './components/theme_style';
import BarButton from './components/buttons/bar_button';
import { FormBox, FormText } from './components/form';
import KeyStore from './stores/key_store';

import type { StackScreenProps } from './router';
import type { ReactNode } from 'react';

const rawStyles = StyleSheet.create({
  button: { height: 40, width: 40 },
  buttonText: { color: 'var(--text-color)', fontSize: 20 },
  keyScreen: { flex: 1 },
  noKeys: { color: 'var(--text-color)' },
  text: { color: 'var(--text-color)', fontSize: 'var(--text-size)' },
  qrView: { padding: 20, backgroundColor: '#333', alignSelf: 'center', borderRadius: 10 },
  qr: { alignSelf: 'stretch', margin: 10 },
});

export default function KeyScreen(props: StackScreenProps<'Key'>) {
  const { route } = props;
  const navigation = useNavigation<StackScreenProps<'Key'>>();
  const styles = useStyles(rawStyles);
  const key = KeyStore.useKey(route.params?.key_tag ?? '');
  const { width } = useWindowDimensions();
  console.log("route:", route, key);
  useEffect(() => {
    void KeyStore.fetch();
  }, []);
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <>
        <BarButton text='Edit' onPress={() => console.log('edit2')} />
        <Button title='Edit' onPress={() => console.log('edit')} />
      </>,
    });
  }, [navigation]);

  const size = Math.floor(width * 0.8);

  return (
    <ScrollView
      style={styles.keyScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <FormBox>
        <FormText label="Label" value={key?.label}/>
        <FormText label="Public Key" last value={key?.public}/>
      </FormBox>
      <View style={styles.qrView}>
        <QRCode size={size} value={key.sshPublicKey} />
      </View>
    </ScrollView>
  );
}
