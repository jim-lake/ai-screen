import React from 'react';
import Link from './link';
import type { StyleInput } from '../base_components';

interface Props {
  style?: StyleInput;
  className?: string;
  url: string;
  children?: React.ReactNode;
  href?: string;
  target?: string;
  underlayColor?: string;
  onPress?: (event?: React.SyntheticEvent) => unknown;
}
export default function LinkHighlight(props: Props) {
  const { underlayColor, ...other_props }: Props = props;
  const underlay_extra: React.CSSProperties = {
    backgroundColor: underlayColor ?? 'rgba(0,0,0,0.05)',
  };
  return (
    <Link {...other_props}>
      {props.children}
      <div className='base-component-link-underlay' style={underlay_extra} />
    </Link>
  );
}
