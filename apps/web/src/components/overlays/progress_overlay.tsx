import { StyleSheet, View } from '../base_components';
import type { StyleInput } from '../base_components';

import ProgressSpinner from '../progress_spinner';

const styles = StyleSheet.create({
  progresssOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    backgroundColor: 'rgba(0,0,0,0.8)',

    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

interface Props {
  style?: StyleInput;
  color?: string;
}
export default function ProgresssOverlay(props: Props) {
  return (
    <View style={[styles.progresssOverlay, props.style]}>
      <ProgressSpinner color={props.color} />
    </View>
  );
}
