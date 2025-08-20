import { StyleSheet, Text } from './base_components';
import type { StyleInput } from './base_components';
import { resolveStyle } from './base_components/styles';

const styles = StyleSheet.create({
  label: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  text: { marginLeft: '0.5rem' },
});

interface Props {
  style?: StyleInput;
  textStyle?: StyleInput;
  className?: string;
  disabled?: boolean;
  text?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}
export default function Checkbox(props: Props) {
  const { style, textStyle, text, value, className: extraClass } = props;
  function _onChange(e: React.ChangeEvent<HTMLInputElement>) {
    props.onChange(e.target.checked || false);
  }
  const { className, inlineStyle } = resolveStyle(
    [styles.label, style],
    extraClass
  );
  return (
    <label
      className={'base-component ' + (className || '')}
      style={inlineStyle}
    >
      <input
        type='checkbox'
        className='base-component-checkbox-input'
        checked={value}
        disabled={props.disabled}
        onChange={_onChange}
      />
      {text ? <Text style={[styles.text, textStyle]}>{text}</Text> : null}
    </label>
  );
}
