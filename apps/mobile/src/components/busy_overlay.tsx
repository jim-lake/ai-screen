import React from 'react';

import { Modal } from './base_components';
import ProgressOverlay from './overlays/progress_overlay';

import type { ViewStyle } from './base_components';

interface OverlayProps {
  style?: ViewStyle;
  isBusy: boolean;
}
export default function BusyOverlay(props: OverlayProps) {
  const { style, isBusy } = props;
  let content: React.ReactNode = null;
  if (isBusy) {
    content = (
      <Modal visible={isBusy} transparent animationType='none'>
        <ProgressOverlay style={style} color='white' />
      </Modal>
    );
  }
  return content;
}
