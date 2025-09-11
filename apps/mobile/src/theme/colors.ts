import { PlatformColor } from 'react-native';

import { setVariables, setSchemeVariables } from '../components/theme_style';

setVariables({
  'text-color': 'black',
  'text-size': 10,
  'light-underlay': 'rgba(0,0,0,0.1)',
  modal: '#f3f2f7',
  'form-box-bg': PlatformColor('secondarySystemGroupedBackground'),
  'form-box-border': '#c6c5c9',
});

setSchemeVariables('dark', {
  'text-color': 'white',
  'light-underlay': 'rgba(255,255,255,0.1)',
  modal: '#1c1c1e',
  'form-box-bg': PlatformColor('secondarySystemGroupedBackground'),
  'form-box-border': '#44434a',
});
