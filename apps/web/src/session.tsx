import { useEffect } from 'react';
import { StyleSheet, Text, View } from './components/base_components';
import LinkText from './components/buttons/link_text';

import SessionStore from './stores/session_store';

export const Component = Session;

const styles = StyleSheet.create({
  session: {
    margin: '2rem',
    flexDirection: 'column',
  },
  text: { fontSize: '1.5rem' },
});

export default function Session() {
  const list = SessionStore.useList();
  useEffect(() => {
    SessionStore.fetch();
  }, []);
  console.log(list);
  return (
    <View style={styles.session}>
      <Text style={styles.text}>Session</Text>
      {list?.map(s => <LinkText key={s.session_name} style={styles.text} url={`/session/${s.session_name}`} text={s.session_name} />) ?? null}
    </View>
  );
}
