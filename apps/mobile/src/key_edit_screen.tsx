import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useDeviceName } from 'react-native-device-info';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert, ScrollView } from './components/base_components';
import BottomAlert from './components/overlays/bottom_alert';
import BusyOverlay from './components/busy_overlay';
import { FormBox, FormInput, FormSelect, FormSwitch } from './components/form';
import { StyleSheet, useStyles, useColor } from './components/theme_style';
import BarButton from './components/buttons/bar_button';
import TextButton from './components/buttons/text_button';
import KeyStore from './stores/key_store';
import { useBusy, useLatestCallback } from './tools/util';

import type { StackScreenProps } from './router';
import type { KeyType } from './stores/key_store';

const baseStyles = StyleSheet.create({
  keyNewScreen: { flex: 1, alignSelf: 'stretch' },
  inner: { flex: 1 },
  button: {
    margin: 12,
    alignSelf: 'stretch',
    backgroundColor: 'var(--form-box-bg)',
  },
});

export default function KeyEditScreen(props: StackScreenProps<'KeyEdit'>) {
  const { route } = props;
  const navigation = useNavigation<StackScreenProps<'KeyEdit'>>();
  const styles = useStyles(baseStyles);
  const edit_bg_color = useColor('edit-bg');
  const key = KeyStore.useKey(route.params?.key_tag ?? '');
  const [name, setName] = useState<string | null>(key?.label ?? '');
  const [show_delete, setShowDelete] = useState(false);
  const [is_busy, setBusy, clearBusy] = useBusy();

  const _onSave = useLatestCallback(async () => {
    if (name === key?.label) {
      navigation.goBack();
    } else if (name && setBusy()) {
      const err = await KeyStore.updateKey({ tag: key.tag, label: name });
      if (err) {
        Alert.alert('Failed to update key, please try again.');
      } else {
        navigation.goBack();
      }
      clearBusy();
    }
  });
  const _onDeletePress = useLatestCallback(() => setShowDelete(true));
  const _onDenyPress = useLatestCallback(() => setShowDelete(false));
  const _onConfirmPress = useLatestCallback(async () => {
    if (setBusy()) {
      await KeyStore.deleteKey(key?.tag ?? '');
      navigation.pop(2);
      clearBusy();
    }
  });
  useEffect(() => {
    void KeyStore.fetch();
  }, []);
  useLayoutEffect(() => {
    navigation.setOptions({
      contentStyle: { backgroundColor: edit_bg_color },
      headerLeft: () => <BarButton text='Cancel' onPress={navigation.goBack} />,
      headerRight: () => (
        <BarButton text='Save' onPress={() => void _onSave()} />
      ),
    });
  }, [navigation, _onSave]);

  return (
    <ScrollView
      style={styles.keyScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <FormBox>
        <FormInput
          label='Key Name'
          value={name}
          placeholder='description'
          onChange={setName}
        />
      </FormBox>
      <TextButton
        style={styles.button}
        text='Delete'
        type='danger'
        onPress={_onDeletePress}
      />
      <BottomAlert
        visible={show_delete}
        text='This will perminently delete the key.  The key will not be recoverable after deletion.'
        buttonText='Delete SSH Key'
        buttonType='danger'
        onPress={_onConfirmPress}
        onCancel={_onDenyPress}
      />
      <BusyOverlay isBusy={is_busy} />
    </ScrollView>
  );
}
