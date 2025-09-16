import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useDeviceName } from 'react-native-device-info';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert, ScrollView } from './components/base_components';
import BusyOverlay from './components/busy_overlay';
import BarButton from './components/buttons/bar_button';
import TextButton from './components/buttons/text_button';
import { FormBox, FormInput, FormSelect, FormSwitch } from './components/form';
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
  const [name, setName] = useState(server?.hostname ?? '');
  const [show_delete, setShowDelete] = useState(false);
  const [is_busy, setBusy, clearBusy] = useBusy();

  const _onSave = useLatestCallback(async () => {
    navigation.goBack();
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
        <BarButton text='Save' onPress={() => void _onSave()} />
      ),
    });
  }, [navigation, _onSave]);

  return (
    <ScrollView
      style={styles.serverEditScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <FormBox>
        <FormInput
          label='Server Address'
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
