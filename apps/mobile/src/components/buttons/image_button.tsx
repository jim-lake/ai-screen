import React from 'react';
import { Image, StyleSheet, TouchableHighlight, View } from 'react-native';

import type {
  ViewStyle,
  ImageStyle,
  ImageSourcePropType,
  ImageResizeMode,
} from 'react-native';

const styles = StyleSheet.create({
  image: { height: '100%', width: '100%' },
  imageButton: {
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

interface Props {
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  source?: ImageSourcePropType;
  children?: React.ReactNode;
  onPress: () => void | Promise<void>;
  resizeMode?: ImageResizeMode;
  underlayColor?: string;
  title?: string;
}
export default function ImageButton(props: Props) {
  return (
    <View style={[styles.imageButton, props.style]}>
      {props.source ? (
        <Image
          style={[styles.image, props.imageStyle]}
          resizeMode={props.resizeMode ?? 'contain'}
          source={props.source}
        />
      ) : null}
      {props.children}
      <TouchableHighlight
        style={StyleSheet.absoluteFill}
        underlayColor={props.underlayColor ?? 'rgba(0,0,0,0.2)'}
        onPress={() => void props.onPress()}
      >
        <View style={StyleSheet.absoluteFill} />
      </TouchableHighlight>
    </View>
  );
}
