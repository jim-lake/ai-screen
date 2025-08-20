import { StyleSheet, Text, View } from './components/base_components';
import ProgressSpinner from './components/progress_spinner';

export const Component = Loading;

const styles = StyleSheet.create({
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'var(--standard-screen-bg)',
  },
  topLine: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: '25rem', height: '5rem' },
  boxView: {
    alignSelf: 'stretch',
    margin: '2rem',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    flex: 1,
    padding: '3rem',
    maxWidth: '40rem',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { color: 'var(--standard-text)', fontSize: '2rem', fontWeight: '600' },
  spinner: { marginTop: '4rem' },
});

export default function Loading() {
  return (
    <View style={styles.loading}>
      <View style={styles.boxView}>
        <View style={styles.box}>
          <Text style={styles.title}>Loading...</Text>
          <ProgressSpinner style={styles.spinner} color='#333' />
        </View>
      </View>
    </View>
  );
}
