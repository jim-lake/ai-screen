import React from 'react';
import { resolveStyle } from '../base_components/styles';
import type { StyleInput } from '../base_components';

import { useNavigate } from 'react-router';
import { stopAll } from '../../tools/util';

interface Props {
  style?: StyleInput;
  className?: string;
  url: string;
  children?: React.ReactNode;
  href?: string;
  target?: string;
  onPress?: (event?: React.SyntheticEvent) => unknown;
}
export default function Link(props: Props) {
  const {
    style,
    className: extraClass,
    url,
    onPress,
    ...other_props
  }: Props = props;
  const navigate = useNavigate();
  const extra: Record<string, string> = {};
  if (
    !other_props.target &&
    (url.startsWith('http') || url.startsWith('tel') || url.startsWith('mail'))
  ) {
    extra.target = '_blank';
  }
  function _onPress(e: React.MouseEvent<HTMLAnchorElement>) {
    let handle = onPress?.(e);
    if (handle !== false) {
      handle = other_props.target !== '_blank' && extra.target !== '_blank';
      if (handle) {
        stopAll(e);
        void navigate(encodeURI(url));
      }
    }
    return !handle;
  }

  const { className, inlineStyle } = resolveStyle(style, extraClass);
  return (
    <a
      className={'base-component-link ' + className}
      style={inlineStyle}
      {...other_props}
      {...extra}
      href={url}
      onClick={_onPress}
    >
      {props.children}
    </a>
  );
}
