import { useCallback, useRef } from 'react';
import PickerSelect from 'react-native-picker-select';

import {
  useColorScheme,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  View,
} from './base_components';
import { StyleSheet, useStyles, useColor } from './theme_style';

import type {
  StyleProp,
  SwitchProps,
  TextInputProps,
  ViewStyle,
} from './base_components';
import type { ReactNode } from 'react';

const baseStyles = StyleSheet.create({
  formBox: {
    backgroundColor: 'var(--form-box-bg)',
    borderRadius: 8,
    flexDirection: 'column',
    margin: 12,
  },
  formInputBase: { alignSelf: 'stretch', flexDirection: 'column' },
  formInputBaseInner: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderBottomColor: 'var(--form-box-border)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 12,
    paddingRight: 12,
    paddingVertical: 12,
  },
  formSwitch: {},
  input: {
    color: 'var(--text-color)',
    flex: 1,
    fontSize: 17,
    textAlign: 'right',
  },
  label: { color: 'var(--text-color)', fontSize: 17, marginRight: 8 },
  lastInputBase: { borderBottomColor: 'transparent', borderBottomWidth: 0 },
  pickerItem: { color: 'var(--text-color)', fontSize: 16 },
  switch: {},
  value: {
    color: 'var(--text-color)',
    flexShrink: 1,
    fontSize: 17,
    textAlign: 'right',
  },
});

export interface FormBoxProps {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}
export function FormBox(props: FormBoxProps) {
  const styles = useStyles(baseStyles);
  return <View style={[styles.formBox, props.style]}>{props.children}</View>;
}
export interface FormBaseProps {
  style?: StyleProp<ViewStyle>;
  label: string;
  last?: boolean;
}
export interface FormInputBaseProps extends FormBaseProps {
  onPress?: () => void;
  children?: ReactNode;
}
export function FormInputBase(props: FormInputBaseProps) {
  const { onPress } = props;
  const styles = useStyles(baseStyles);
  const last = props.last ? styles.lastInputBase : null;
  const underlay_color = useColor('light-underlay');
  return (
    <View style={[styles.formInputBase, props.style]}>
      <View style={[styles.formInputBaseInner, last]}>
        <Text style={styles.label}>{props.label}</Text>
        {props.children}
      </View>
      {onPress ? (
        <TouchableHighlight
          style={StyleSheet.absoluteFill}
          underlayColor={underlay_color}
          onPress={onPress}
        >
          <View style={StyleSheet.absoluteFill} />
        </TouchableHighlight>
      ) : null}
    </View>
  );
}
export interface FormTextProps extends FormBaseProps {
  value: string;
  numberOfLines?: number;
}
export function FormText(props: FormTextProps) {
  const { style, label, last, numberOfLines } = props;
  const styles = useStyles(baseStyles);
  return (
    <FormInputBase style={style} label={label} last={last}>
      <Text style={styles.value} numberOfLines={numberOfLines}>
        {props.value}
      </Text>
    </FormInputBase>
  );
}
export type FormInputProps = {
  onChange: (value: string, ...other: unknown[]) => unknown;
} & FormBaseProps &
  Omit<TextInputProps, 'onChange' | 'style'>;
export function FormInput(props: FormInputProps) {
  const { style, label, onChange, last, ...other } = props;
  const styles = useStyles(baseStyles);
  return (
    <FormInputBase style={style} label={label} last={last}>
      <TextInput style={styles.input} onChangeText={onChange} {...other} />
    </FormInputBase>
  );
}
export type FormSelectProps = {
  value: string;
  options: string[];
  onChange: (new_value: string, ...other: unknown[]) => unknown;
} & FormBaseProps;
export function FormSelect(props: FormSelectProps) {
  const { style, label, value, options, onChange, last } = props;
  const styles = useStyles(baseStyles);
  const ref = useRef<PickerSelect>(null);
  const scheme = useColorScheme() ?? 'light';
  const items = options.map((s) => ({ label: s, value: s, key: s }));
  return (
    <FormInputBase
      style={style}
      label={label}
      last={last}
      onPress={() => ref.current?.togglePicker(true)}
    >
      <PickerSelect
        ref={ref}
        style={{ inputIOS: { width: 0, height: 0 } }}
        itemKey={value}
        darkTheme={scheme === 'dark'}
        onValueChange={onChange}
        items={items}
      />
      <Text style={styles.pickerItem}>{value}</Text>
    </FormInputBase>
  );
}
export type FormSwitchProps = {
  value: boolean;
  onChange: (
    new_value: boolean,
    ...other: unknown[]
  ) => unknown | Promise<unknown>;
} & FormBaseProps &
  Omit<SwitchProps, 'onChange' | 'style'>;
export function FormSwitch(props: FormSwitchProps) {
  const { style, label, last, value, onChange, ...other } = props;
  const styles = useStyles(baseStyles);
  const _onChange = useCallback(
    (val: boolean) => {
      onChange(val);
    },
    [onChange]
  );
  return (
    <FormInputBase style={[styles.formSwitch, style]} label={label} last={last}>
      <Switch
        style={styles.switch}
        value={value}
        onValueChange={_onChange}
        {...other}
      />
    </FormInputBase>
  );
}
