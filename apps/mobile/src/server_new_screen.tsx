import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert, Button } from './components/base_components';
import BusyOverlay from './components/busy_overlay';
import { FormBox, FormInput } from './components/form';
import { StyleSheet, useStyles, useColor } from './components/theme_style';
import ServerStore from './stores/server_store';
import { useBusy, useLatestCallback } from './tools/util';

import type { StackNavigation } from './router';

const baseStyles = StyleSheet.create({ serverNewScreen: { flex: 1 } });

export default function ServerNewScreen() {
  const navigation = useNavigation<StackNavigation<'ServerNew'>>();
  const styles = useStyles(baseStyles);
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const modal_color = useColor('modal');
  const [is_busy, setBusy, clearBusy] = useBusy();

  const _onSave = useLatestCallback(async () => {
    if (hostname && port && username && setBusy()) {
      const id = await ServerStore.createServer({ hostname, port, username });
      if (typeof id === 'string') {
        navigation.goBack();
        navigation.navigate('Server', { server_id: id });
      } else {
        Alert.alert('Failed to save server.');
      }
      clearBusy();
    }
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      contentStyle: { backgroundColor: modal_color },
      headerLeft: () => <Button title='Cancel' onPress={navigation.goBack} />,
      headerRight: () => <Button title='Save' onPress={() => void _onSave()} />,
    });
  }, [navigation, modal_color, _onSave]);

  return (
    <SafeAreaView style={styles.serverNewScreen}>
      <FormBox>
        <FormInput
          label='SSH Server'
          value={hostname}
          autoCapitalize='none'
          autoComplete='off'
          autoCorrect={false}
          autoFocus
          keyboardType='url'
          placeholder='host or ip'
          onChange={setHostname}
        />
        <FormInput
          label='Server Port'
          value={port ? String(port) : ''}
          autoCapitalize='none'
          autoComplete='off'
          autoCorrect={false}
          inputMode='numeric'
          keyboardType='numeric'
          maxLength={5}
          placeholder='port'
          onChange={(n) => {
            setPort(n ? parseInt(n, 10) : 0);
          }}
        />
        <FormInput
          label='Username'
          value={username}
          autoCapitalize='none'
          autoComplete='off'
          autoCorrect={false}
          placeholder='user'
          keyboardType='email-address'
          onChange={setUsername}
        />
      </FormBox>
      <BusyOverlay isBusy={is_busy} />
    </SafeAreaView>
  );
}
