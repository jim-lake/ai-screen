import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Animated,
  PlatformColor,
  Modal,
  Text,
  TouchableWithoutFeedback,
  View,
} from '../base_components';
import TextButton from '../buttons/text_button';
import { StyleSheet, useStyles } from '../theme_style';

import type { LayoutChangeEvent } from '../base_components';
import type { ButtonType } from '../buttons/button_style';

const baseStyles = StyleSheet.create({
  button: { backgroundColor: 'transparent', borderRadius: 0, height: 57 },
  buttonText: { fontSize: 20 },
  cancel: {
    backgroundColor: PlatformColor('tertiarySystemBackground'),
    height: 57,
    marginBottom: 34,
    marginLeft: 8,
    marginRight: 8,
    marginTop: 8,
  },
  cancelText: { color: PlatformColor('link'), fontSize: 20 },
  overlay: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.2)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: { flexDirection: 'column' },
  panelInner: {
    backgroundColor: PlatformColor('secondarySystemBackground'),
    borderRadius: 16,
    marginLeft: 8,
    marginRight: 8,
    overflow: 'hidden',
  },
  sep: {
    alignSelf: 'stretch',
    backgroundColor: 'var(--bottom-alert-sep)',
    height: StyleSheet.hairlineWidth,
  },
  text: {
    color: PlatformColor('secondaryLabel'),
    fontSize: 15,
    padding: 16,
    textAlign: 'center',
  },
  touchCover: { alignSelf: 'stretch', flex: 1 },
});

export interface Props {
  visible: boolean;
  text: string;
  buttonText: string;
  buttonType?: ButtonType;
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
  }, []);
  useEffect(() => {
    if (props.visible) {
      setVisible(true);
      translateY.setValue(panel_height);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: panel_height,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
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
                type={props.buttonType ?? ('default' as const)}
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
