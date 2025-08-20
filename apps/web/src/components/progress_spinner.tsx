import { StyleSheet, View } from './base_components';
import type { StyleInput } from './base_components';

import '../css/progress.css';

const styles = StyleSheet.create({
  progessSpinner: { width: '5rem', height: '5rem' },
});

interface Props {
  style?: StyleInput;
  size?: string;
  color?: string;
}
export default function ProgressSpinner(props: Props) {
  return (
    <View style={[styles.progessSpinner, props.style]}>
      <svg width='100%' height='100%' viewBox='0 0 24 24'>
        <path
          className='progess-spinner-svg'
          fill={props.color ?? 'white'}
          d='M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z'
        />
      </svg>
    </View>
  );
}
