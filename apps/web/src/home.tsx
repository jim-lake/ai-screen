import { useEffect } from 'react';
import { StyleSheet, Text, View } from './components/base_components';
import LinkText from './components/buttons/link_text';

import SessionStore from './stores/session_store';

export const Component = Home;

const styles = StyleSheet.create({
  home: { margin: '2rem', flexDirection: 'column' },
  text: { fontSize: '1.5rem' },
});

export default function Home() {
  const list = SessionStore.useList();
  useEffect(() => {
    void SessionStore.fetch();
  }, []);
  return (
    <View style={styles.home}>
      <Text style={styles.text}>Home</Text>
      {list?.map((s) => (
        <LinkText
          key={s.sessionName}
          style={styles.text}
          url={`/session/${s.sessionName}`}
          text={s.sessionName}
        />
      )) ?? null}
    </View>
  );
}
