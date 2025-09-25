import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';

import { ScrollView } from './components/base_components';
import BusyOverlay from './components/busy_overlay';
import BarButton from './components/buttons/bar_button';
import TextButton from './components/buttons/text_button';
import { FormBox, FormInput } from './components/form';
import BottomAlert from './components/overlays/bottom_alert';
import { StyleSheet, useStyles, useColor } from './components/theme_style';
import ServerStore from './stores/server_store';
import { useBusy, useLatestCallback } from './tools/util';

import type { StackScreenProps, StackNavigation } from './router';

const baseStyles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    backgroundColor: 'var(--form-box-bg)',
    margin: 12,
  },
  inner: { flex: 1 },
  serverEditScreen: { alignSelf: 'stretch', flex: 1 },
});

export default function ServerEditScreen(
  props: StackScreenProps<'ServerEdit'>
) {
  const { route } = props;
  const navigation = useNavigation<StackNavigation<'ServerEdit'>>();
  const styles = useStyles(baseStyles);
  const edit_bg_color = useColor('edit-bg');
  const server = ServerStore.useServer(route.params?.server_id ?? '');
  const [hostname, setHostname] = useState(server?.hostname ?? '');
  const [port, setPort] = useState(server?.port ?? 22);
  const [username, setUsername] = useState(server?.username ?? '');
  const [show_delete, setShowDelete] = useState(false);
  const [is_busy, setBusy, clearBusy] = useBusy();

  const _onSave = useLatestCallback(async () => {
    if (
      hostname === server?.hostname &&
      port === server?.port &&
      username === server?.username
    ) {
      navigation.goBack();
    } else if (setBusy()) {
      const opts = {
        server_id: server?.server_id ?? '',
        hostname,
        port,
        username,
      };
      await ServerStore.updateServer(opts);
      clearBusy();
      navigation.goBack();
    }
  });
  const _onDeletePress = useLatestCallback(() => {
    setShowDelete(true);
  });
  const _onDenyPress = useLatestCallback(() => {
    setShowDelete(false);
  });
  const _onConfirmPress = useLatestCallback(async () => {
    if (setBusy()) {
      await ServerStore.deleteServer(server?.server_id ?? '');
      navigation.pop(2);
      clearBusy();
    }
  });
  useLayoutEffect(() => {
    navigation.setOptions({
      contentStyle: { backgroundColor: edit_bg_color },
      headerLeft: () => <BarButton text='Cancel' onPress={navigation.goBack} />,
      headerRight: () => (
        <BarButton
          text='Save'
          onPress={() => {
            _onSave();
          }}
        />
      ),
    });
  }, [navigation, _onSave, edit_bg_color]);

  return (
    <ScrollView
      style={styles.serverEditScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
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
      <TextButton
        style={styles.button}
        text='Delete'
        type='danger'
        onPress={_onDeletePress}
      />
      <BottomAlert
        visible={show_delete}
        text='This will perminently delete the server.  The server will not be recoverable after deletion.'
        buttonText='Delete Server'
        buttonType='danger'
        onPress={_onConfirmPress}
        onCancel={_onDenyPress}
      />
      <BusyOverlay isBusy={is_busy} />
    </ScrollView>
  );
}
