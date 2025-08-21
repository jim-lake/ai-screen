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
    SessionStore.fetch();
  }, []);
  console.log(list);
  return (
    <View style={styles.home}>
      <Text style={styles.text}>Home</Text>
      {list?.map((s) => (
        <LinkText
          key={s.session_name}
          style={styles.text}
          url={`/session/${s.session_name}`}
          text={s.session_name}
        />
      )) ?? null}
    </View>
  );
}
