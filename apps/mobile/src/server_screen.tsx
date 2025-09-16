import { useNavigation } from '@react-navigation/native';
import { useEffect, useLayoutEffect } from 'react';

import {
  Alert,
  Button,
  ScrollView,
  Share,
  Text,
  TouchableHighlight,
  View,
} from './components/base_components';
import { StyleSheet, useColor, useStyles } from './components/theme_style';
import BarButton from './components/buttons/bar_button';
import { FormBox, FormText } from './components/form';
import TextButton from './components/buttons/text_button';
import ServerStore from './stores/server_store';
import { useLatestCallback } from './tools/util';

import type { StackScreenProps } from './router';
import type { ReactNode } from 'react';

const rawStyles = StyleSheet.create({
  serverScreen: { flex: 1 },
  button: { margin: 12 },
});

export default function ServerScreen(props: StackScreenProps<'Server'>) {
  const { route } = props;
  const navigation = useNavigation<StackScreenProps<'Server'>>();
  const styles = useStyles(rawStyles);
  const edit_bg_color = useColor('edit-bg');
  const server = ServerStore.useServer(route.params?.server_id ?? '');
  useLayoutEffect(() => {
    navigation.setOptions({
      contentStyle: { backgroundColor: edit_bg_color },
      headerRight: () => (
        <>
          <BarButton
            text='Edit'
            onPress={() => navigation.navigate('ServerEdit', route.params)}
          />
        </>
      ),
    });
  }, [navigation, edit_bg_color]);
  const _onConnectPress = useLatestCallback(() => {
    Alert.alert('Would connect');
  });

  return (
    <ScrollView
      style={styles.serverScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <FormBox>
        <FormText label='Server' value={server?.hostname} />
        <FormText label='Port' value={String(server?.port ?? '')} />
        <FormText label='Username' value={server?.username} />
      </FormBox>
      <TextButton
        style={styles.button}
        text='Connect'
        onPress={_onConnectPress}
      />
    </ScrollView>
  );
}
