import React from 'react';
import { Image, StyleSheet } from '../base_components';
import type { StyleInput } from '../base_components';

import Link from './link';

const styles = StyleSheet.create({
  linkIcon: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});

interface Props {
  style?: StyleInput;
  imageStyle?: StyleInput;
  children?: React.ReactNode;
  resizeMode?: string;
  source: { uri: string } | string;
  url: string;
  underlayColor?: string;
}
export default function LinkIcon(props: Props) {
  return (
    <Link style={[styles.linkIcon, props.style]} url={props.url}>
      <Image
        style={[styles.image, props.imageStyle]}
        resizeMode={props.resizeMode ?? 'contain'}
        source={props.source}
      />
      {props.children}
    </Link>
  );
}
