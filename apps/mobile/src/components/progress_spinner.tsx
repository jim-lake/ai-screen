import { ActivityIndicator } from './base_components';

interface Props {
  size?: number | 'small' | 'large';
  color?: string;
}
export default function ProgressSpinner(props: Props) {
  return <ActivityIndicator size={props.size ?? 'large'} color={props.color} />;
}
