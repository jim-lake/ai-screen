import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect } from 'react';
import QRCode from 'react-native-qrcode-svg';

import {
  useWindowDimensions,
  ScrollView,
  Share,
  View,
} from './components/base_components';
import BarButton from './components/buttons/bar_button';
import BarIconButton from './components/buttons/bar_icon_button';
import { FormBox, FormText } from './components/form';
import { StyleSheet, useColor, useStyles } from './components/theme_style';
import KeyStore from './stores/key_store';
import { useLatestCallback } from './tools/util';

import type { StackScreenProps, StackNavigation } from './router';

const rawStyles = StyleSheet.create({
  barIconButton: { marginRight: 12 },
  button: { height: 40, width: 40 },
  buttonText: { color: 'var(--text-color)', fontSize: 20 },
  keyScreen: { flex: 1 },
  noKeys: { color: 'var(--text-color)' },
  qr: { alignSelf: 'stretch', margin: 10 },
  qrView: {
    alignSelf: 'center',
    backgroundColor: 'var(--form-box-bg)',
    borderRadius: 10,
    padding: 20,
  },
  text: { color: 'var(--text-color)', fontSize: 'var(--text-size)' },
});

export default function KeyScreen(props: StackScreenProps<'Key'>) {
  const { route } = props;
  const navigation = useNavigation<StackNavigation<'Key'>>();
  const styles = useStyles(rawStyles);
  const edit_bg_color = useColor('edit-bg');
  const key = KeyStore.useKey(route.params?.key_tag ?? '');
  const { width } = useWindowDimensions();
  const _onShare = useLatestCallback(() => {
    void Share.share({ message: key?.sshPublicKey ?? '' });
  });
  useEffect(() => {
    void KeyStore.fetch();
  }, []);
  useLayoutEffect(() => {
    navigation.setOptions({
      contentStyle: { backgroundColor: edit_bg_color },
      headerRight: () => (
        <>
          <BarIconButton
            style={styles.barIconButton}
            name='share-outline'
            onPress={_onShare}
          />
          <BarButton
            text='Edit'
            onPress={() => {
              navigation.navigate('KeyEdit', route.params);
            }}
          />
        </>
      ),
    });
  }, [navigation, styles, _onShare, edit_bg_color, route.params]);

  const size = width - 40 - 24;
  let type = '';
  if (key?.type === 'EC') {
    type = 'ECDSA P-256';
  } else if (key?.type === 'ED') {
    type = 'ED25519';
  } else if (key?.size === 4096) {
    type = 'RSA 4096';
  } else {
    type = 'RSA 2048';
  }

  return (
    <ScrollView
      style={styles.keyScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <FormBox>
        <FormText label='Name' value={key?.label ?? ''} />
        <FormText label='Type' value={type} />
        <FormText label='Public Key' last value={key?.public ?? ''} />
      </FormBox>
      <View style={styles.qrView}>
        <QRCode size={size} value={key?.sshPublicKey ?? ' '} />
      </View>
    </ScrollView>
  );
}
