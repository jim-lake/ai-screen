import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect } from 'react';

import { Alert, ScrollView } from './components/base_components';
import BarButton from './components/buttons/bar_button';
import TextButton from './components/buttons/text_button';
import { FormBox, FormText } from './components/form';
import { StyleSheet, useColor, useStyles } from './components/theme_style';
import ConnectStore from './stores/connect_store';
import ServerStore from './stores/server_store';
import { useLatestCallback } from './tools/util';

import type { StackScreenProps, StackNavigation } from './router';

const rawStyles = StyleSheet.create({
  button: { margin: 12 },
  connectScreen: { flex: 1 },
});

export default function ConnectScreen(props: StackScreenProps<'Connect'>) {
  const { route } = props;
  const navigation = useNavigation<StackNavigation<'Connect'>>();
  const styles = useStyles(rawStyles);
  const server = ServerStore.useServer(route.params?.server_id ?? '');
  useLayoutEffect(() => {
    navigation.setOptions({
      title: server?.hostname ?? '',
      headerRight: () => (
        <>
          <BarButton
            text='Disconnect'
            onPress={() => {
              //navigation.navigate('ServerEdit', route.params);
            }}
          />
        </>
      ),
    });
  }, [navigation]);
  useEffect(() => {
    (async () => {
      if (server) {
        try {
          await ConnectStore.connect(server);
        } catch (e) {
          console.log('ConnectScreen: connect threw:', e);
        }
      }
    })();
  }, []);

  return (
    <ScrollView
      style={styles.connectScreen}
      contentInsetAdjustmentBehavior='automatic'
    />
  );
}
