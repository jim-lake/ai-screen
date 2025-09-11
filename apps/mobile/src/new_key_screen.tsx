import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useDeviceName } from 'react-native-device-info';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert, Button } from './components/base_components';
import BusyOverlay from './components/busy_overlay';
import { FormBox, FormInput, FormSelect, FormSwitch } from './components/form';
import { StyleSheet, useStyles, useColor } from './components/theme_style';
import KeyStore from './stores/key_store';
import { useBusy, useLatestCallback } from './tools/util';

import type { StackScreenProps } from './router';
import type { KeyType } from './stores/key_store';

const rawStyles = StyleSheet.create({ newKeyScreen: { flex: 1 } });

const TYPE_OPTS = ['ECDSA P-256', 'ED25519', 'RSA 2048', 'RSA 4096'];
const KEY_MAP: Record<string, { type: KeyType; size: number }> = {
  'ECDSA P-256': { type: 'ec' as const, size: 256 },
  ED25519: { type: 'ed' as const, size: 256 },
  'RSA 2048': { type: 'rsa' as const, size: 2048 },
  'RSA 4096': { type: 'rsa' as const, size: 4096 },
};

export default function NewKeyScreen() {
  const navigation = useNavigation<StackScreenProps<'NewKey'>>();
  const styles = useStyles(rawStyles);
  const device_name = useDeviceName();
  const [name, setName] = useState<string | null>(null);
  const [type, setType] = useState('ECDSA P-256');
  const [synchronized, setSynchronized] = useState(false);
  const modal_color = useColor('modal');
  const [is_busy, setBusy, clearBusy] = useBusy();
  const key_name = name ?? device_name.result ?? '';

  const _onSave = useLatestCallback(async () => {
    if (key_name && type && setBusy()) {
      const mapped = KEY_MAP[type];
      if (mapped) {
        const err = await KeyStore.createKey({
          label: key_name,
          type: mapped.type,
          size: mapped.size,
          synchronized,
        });
        if (err) {
          Alert.alert('Failed to create key, please try again.');
        } else {
          navigation.goBack();
        }
      }
      clearBusy();
    }
  });

  useEffect(() => {
    void KeyStore.fetch();
  }, []);
  useLayoutEffect(() => {
    navigation.setOptions({
      contentStyle: { backgroundColor: modal_color },
      headerLeft: () => <Button title='Cancel' onPress={navigation.goBack} />,
      headerRight: () => <Button title='Save' onPress={() => void _onSave()} />,
    });
  }, [navigation, modal_color, _onSave]);

  return (
    <SafeAreaView style={styles.newKeyScreen}>
      <FormBox>
        <FormInput
          label='Key Name'
          value={key_name}
          placeholder='description'
          onChange={setName}
        />
        <FormSelect
          label='Key Type'
          value={type}
          options={TYPE_OPTS}
          onChange={setType}
        />
        <FormSwitch
          label='Synchronized'
          value={synchronized}
          onChange={setSynchronized}
          last
        />
      </FormBox>
      <BusyOverlay isBusy={is_busy} />
    </SafeAreaView>
  );
}
