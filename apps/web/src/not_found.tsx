import { StyleSheet, Text, View } from './components/base_components';
import LinkTextButton from './components/buttons/link_text_button';

export const Component = NotFound;

const styles = StyleSheet.create({
  notFound: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'column',
    background: 'var(--login-bg-color)',
  },
  text: { fontSize: '1.5rem' },
});

export default function NotFound() {
  return (
    <View style={styles.notFound}>
      <Text style={styles.text}>Looks like something is missing...</Text>
      <LinkTextButton text='Go Home' url='/' />
    </View>
  );
}
