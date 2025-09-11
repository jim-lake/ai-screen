import { StyleSheet, View } from '../base_components';
import ProgressSpinner from '../progress_spinner';

import type { ViewStyle } from '../base_components';

const styles = StyleSheet.create({
  progresssOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    bottom: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',

    right: 0,
    top: 0,
    zIndex: 99999,
  },
});

interface Props {
  style?: ViewStyle;
  color?: string;
}
export default function ProgresssOverlay(props: Props) {
  return (
    <View style={[styles.progresssOverlay, props.style]}>
      <ProgressSpinner color={props.color} />
    </View>
  );
}
