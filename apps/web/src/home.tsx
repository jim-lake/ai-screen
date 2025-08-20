import { StyleSheet, Text, View } from './components/base_components';

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
  return (
    <View style={styles.home}>
      <Text style={styles.text}>Home</Text>
    </View>
  );
}
