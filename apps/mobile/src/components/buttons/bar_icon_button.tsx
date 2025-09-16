import IonIcons from '@react-native-vector-icons/ionicons';
import React from 'react';

import { PlatformColor, StyleSheet, Pressable } from '../base_components';

import type { ViewStyle, TextStyle } from '../base_components';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

const styles = StyleSheet.create({
  barIconButton: { alignSelf: 'center', padding: 6 },
  pressed: { opacity: 0.5 },
  text: { color: PlatformColor('link'), fontSize: 25 },
});

interface Props {
  style?: ViewStyle;
  textStyle?: TextStyle;
  name: IoniconsIconName;
  disabled?: boolean;
  onPress?: () => void | Promise<void>;
}
export default function BarIconButton(props: Props) {
  const { style, textStyle, name, disabled, onPress } = props;
  return (
    <Pressable
      style={[styles.barIconButton, style]}
      disabled={disabled}
      onPress={onPress ? () => void onPress() : undefined}
    >
      {({ pressed }) => (
        <IonIcons
          style={[styles.text, textStyle, pressed ? styles.pressed : null]}
          name={name}
        />
      )}
    </Pressable>
  );
}
