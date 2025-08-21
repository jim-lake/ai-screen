import { useEffect } from 'react';
import { StyleSheet, Text, View } from './components/base_components';

import SessionStore from './stores/session_store';

export const Component = Home;

const styles = StyleSheet.create({
  home: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'column',
    background: 'var(--login-bg-color)',
  },
  text: { fontSize: '1.5rem' },
});

export default function Home() {
  const list = SessionStore.useList();
  useEffect(() => {
    SessionStore.fetch();
  }, []);
  return (
    <View style={styles.home}>
      <Text style={styles.text}>Home</Text>
      {list?.map(s => <Text key={s.name} style={styles.text}>Session: {s.name}</Text>) ?? null}
    </View>
  );
}
