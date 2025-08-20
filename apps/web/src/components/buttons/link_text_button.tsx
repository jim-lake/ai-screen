import React from 'react';
import { View, Text } from '../base_components';
import type { StyleInput } from '../base_components';
import Link from './link';

import { styles, getButtonStyles } from './button_style';
import type { StyleProps } from './button_style';

interface Props extends StyleProps {
  text: string;
  url: string;
  style?: StyleInput;
  textStyle?: StyleInput;
  // type is inherited from StyleProps
  beforeText?: React.ReactNode;
  afterText?: React.ReactNode;
  disabled?: boolean;
  onPress?: (event?: React.SyntheticEvent) => boolean | undefined;
}
export default function LinkTextButton(props: Props) {
  const { style, textStyle, text, beforeText, afterText, onPress }: Props =
    props;
  const { button_extra, text_extra } = getButtonStyles(props);

  return (
    <Link
      style={[styles.textButton, button_extra, style]}
      url={props.url}
      onPress={onPress}
    >
      <View style={styles.inner}>
        {beforeText}
        <Text style={[styles.text, text_extra, textStyle]}>{text}</Text>
        {afterText}
      </View>
    </Link>
  );
}
