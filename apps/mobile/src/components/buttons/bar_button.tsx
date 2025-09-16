import React from 'react';

import {
  PlatformColor,
  StyleSheet,
  View,
  Text,
  Pressable,
} from '../base_components';

import type { ViewStyle, TextStyle } from '../base_components';

const styles = StyleSheet.create({
  barButton: { alignSelf: 'center', padding: 8 },
  pressed: { opacity: 0.5 },
  text: { color: PlatformColor('link'), fontSize: 18 },
});

interface Props {
  style?: ViewStyle;
  textStyle?: TextStyle;
  text: string;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
}
export default function BarButton(props: Props) {
  const { style, textStyle, text, disabled, onPress } = props;
  return (
    <Pressable
      style={[styles.barButton, style]}
      disabled={disabled}
      onPress={() => void onPress()}
    >
      {({ pressed }) => (
        <Text style={[styles.text, textStyle, pressed ? styles.pressed : null]}>
          {text}
        </Text>
      )}
    </Pressable>
  );
}
