import { useEffect } from 'react';
import { useParams } from 'react-router';
import { StyleSheet, Text, View } from './components/base_components';
import LinkText from './components/buttons/link_text';
import ProgressSpinner from './components/progress_spinner';

import SessionStore from './stores/session_store';

export const Component = Session;

const styles = StyleSheet.create({
  session: { margin: '2rem', flexDirection: 'column' },
  text: { fontSize: '1.5rem' },
});

export default function Session() {
  const { session_name } = useParams();
  const list = SessionStore.useList();
  const session = SessionStore.useSession(session_name);
  useEffect(() => {
    SessionStore.fetch();
  }, [session_name]);

  console.log(list);
  console.log(session);

  let content: React.Node = null;
  if (!list) {
    content = <ProgressSpinner />;
  } else if (!session) {
    content = (
      <>
        <Text style={styles.text}>Session not found</Text>
      </>
    );
  } else {
    content = (
      <>
        <Text style={styles.text}>Session: {session.sessionName}</Text>
      </>
    );
  }

  return <View style={styles.session}>{content}</View>;
}
