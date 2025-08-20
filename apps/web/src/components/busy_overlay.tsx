import React from 'react';
import type { StyleInput } from './base_components';

import ProgressOverlay from './overlays/progress_overlay';

interface OverlayProps {
  style?: StyleInput;
  isBusy: boolean;
}
export default function BusyOverlay(props: OverlayProps) {
  const { style, isBusy } = props;
  let content: React.ReactNode = null;
  if (isBusy) {
    content = <ProgressOverlay style={style} color='white' />;
  }
  return content;
}
