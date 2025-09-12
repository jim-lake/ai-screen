import { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

import {
  useColorScheme,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  View,
} from './base_components';
import { StyleSheet, useStyles, useColor } from './theme_style';

const baseStyles = StyleSheet.create({
  itemList: {
    flexDirection: 'column',
  },
  item: {
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  left: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'column',
  },
  right: {
    paddingRight: 10,
    flex: 6,
    alignSelf: 'stretch',
    flexDirection: 'column',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'var(--form-box-border)',
  },
  last: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'var(--form-box-border)',
  },
  text: {
    color: 'var(--text-color)',
    fontSize: 17,
  },
  subtext: {
    paddingTop: 5,
    color: 'var(--secondary-text-color)',
    fontSize: 17,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
});

export interface Item {
  text: string;
  subtext?: string;
  screen?: string;
  args?: unknown;
}
export interface ItemListProps {
  style?: StyleProp<ViewStyle>;
  list: Item[];
  children?: ReactNode;
}
export function ItemList(props: ItemListProps) {
  const styles = useStyles(baseStyles);
  const items = props.list.map((item, i) => {
    return <Item key={i} last={i === props.list.length -1 } {...item} />;
  });
  return <View style={[styles.itemList, props.style]}>
    {items}
    {props.children}
  </View>;
}
export default ItemList;
interface ItemProps extends Items { last?: boolean; }
function Item(props: ItemProps) {
  const { text, subtext, screen, args } = props;
  const styles = useStyles(baseStyles);
  const navigation = useNavigation();
  const last = props.last ? styles.last : null;
  return (
    <View style={styles.item}>
      <View style={styles.left}>
      </View>
      <View style={[styles.right, last]}>
        <Text style={styles.text}>{text}</Text>
        {subtext ? <Text style={styles.subtext} numberOfLines={1} ellipsizeMode="end">{subtext}</Text> : null}
      </View>
      <TouchableHighlight
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (screen) {
            navigation.navigate(screen, args);
          }
        }}
      >
        <View style={StyleSheet.absoluteFill} />
    </TouchableHighlight>
    </View>
  );
}
