import { useRef, useEffect } from 'react';
import { resolveStyle } from '../base_components/styles';

import type { ReactNode } from 'react';
import type { StyleInput } from '../base_components';

import '../../css/dialog.css';

export interface DialogProps {
  style?: StyleInput;
  className?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}
export default function Dialog(props: DialogProps) {
  const { style, open, onClose } = props;
  const dialog_ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialog_ref.current;
    if (dialog) {
      if (open && !dialog.open) {
        dialog.showModal();
      } else if (!open && dialog.open) {
        dialog.close();
      }
    }
  }, [open]);
  useEffect(() => {
    const dialog = dialog_ref.current;
    if (dialog) {
      function _handleClose() {
        onClose?.();
      }
      dialog.addEventListener('close', _handleClose);
      return () => {
        dialog.removeEventListener('close', _handleClose);
      };
    }
  }, [onClose]);
  const { className, inlineStyle } = resolveStyle(style, props.className);
  return (
    <dialog
      ref={dialog_ref}
      className={'base-component-dialog ' + className}
      style={inlineStyle}
    >
      {props.children}
    </dialog>
  );
}
