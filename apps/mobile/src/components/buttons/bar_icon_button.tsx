import React from 'react';
import IonIcons from '@react-native-vector-icons/ionicons';

import {
  PlatformColor,
  StyleSheet,
  View,
  Text,
  Pressable,
} from '../base_components';

import type { ViewStyle, TextStyle } from '../base_components';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';

const styles = StyleSheet.create({
  barIconButton: { padding: 6, alignSelf: 'center' },
  text: { color: PlatformColor('link'), fontSize: 25 },
  pressed: { opacity: 0.5 },
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
      onPress={onPress}
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
