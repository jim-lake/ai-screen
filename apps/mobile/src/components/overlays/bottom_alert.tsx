import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PlatformColor,
  Modal,
  Text,
  TouchableWithoutFeedback,
  View,
} from '../base_components';
import { StyleSheet, useStyles } from '../theme_style';
import TextButton from '../buttons/text_button';

import type { LayoutChangeEvent } from '../base_components';

const baseStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  panel: { flexDirection: 'column' },
  panelInner: {
    marginLeft: 8,
    marginRight: 8,
    backgroundColor: PlatformColor('secondarySystemBackground'),
    borderRadius: 16,
    overflow: 'hidden',
  },
  touchCover: { flex: 1, alignSelf: 'stretch' },
  text: {
    padding: 16,
    color: PlatformColor('secondaryLabel'),
    fontSize: 15,
    textAlign: 'center',
  },
  sep: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'var(--bottom-alert-sep)',
  },
  button: { height: 57, borderRadius: 0, backgroundColor: 'transparent' },
  buttonText: { fontSize: 20 },
  cancel: {
    marginTop: 8,
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 34,
    height: 57,
    backgroundColor: PlatformColor('tertiarySystemBackground'),
  },
  cancelText: { fontSize: 20, color: PlatformColor('link') },
});

export interface Props {
  visible: boolean;
  text: string;
  buttonText: string;
  buttonType?: string;
  onPress: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}
export default function BottomAlert(props: Props) {
  const styles = useStyles(baseStyles);
  const [panel_height, setPanelHeight] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(props.visible);
  const _onLayout = useCallback((e: LayoutChangeEvent) => {
    setPanelHeight(e.nativeEvent.layout.height);
  });
  useEffect(() => {
    if (props.visible) {
      setVisible(true);
      translateY.setValue(panel_height);
      Animated.spring(translateY, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: panel_height,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [props.visible, panel_height]);

  return (
    <>
      <Modal transparent visible={visible} onRequestClose={props.onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback
            style={styles.touchCover}
            onPress={props.onCancel}
          >
            <View style={styles.touchCover} />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[styles.panel, { transform: [{ translateY }] }]}
            onLayout={_onLayout}
          >
            <View style={styles.panelInner}>
              <Text style={styles.text}>{props.text}</Text>
              <View style={styles.sep} />
              <TextButton
                style={styles.button}
                textStyle={styles.buttonText}
                text={props.buttonText}
                type={props.buttonType ?? 'default'}
                onPress={() => void props.onPress()}
              />
            </View>
            <TextButton
              style={styles.cancel}
              textStyle={styles.cancelText}
              text='Cancel'
              onPress={() => void props.onCancel()}
            />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
