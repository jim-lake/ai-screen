import { StyleSheet, Text } from '../base_components';
import type { StyleInput } from '../base_components';
import Link from './link';

const styles = StyleSheet.create({
  linkText: { ':hover div': { color: '#06a' } },
  text: { color: 'var(--link-text-color)', textDecoration: 'underline' },
});

interface Props {
  style?: StyleInput;
  textStyle?: StyleInput;
  url: string;
  text: string;
  target?: string;
}
export default function LinkText(props: Props) {
  const { style, textStyle, ...other_props }: Props = props;
  return (
    <Link style={[styles.linkText, style]} {...other_props}>
      <Text style={[styles.text, textStyle]}>{props.text}</Text>
    </Link>
  );
}
