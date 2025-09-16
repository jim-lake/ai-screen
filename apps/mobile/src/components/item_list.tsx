import { useNavigation } from '@react-navigation/native';

import { Text, TouchableHighlight, View } from './base_components';
import { StyleSheet, useStyles } from './theme_style';

import type { StyleProp, ViewStyle } from './base_components';
import type { RootStackParamList, RootNavigationProp } from '../router';
import type { ReactNode } from 'react';

const baseStyles = StyleSheet.create({
  item: { alignSelf: 'stretch', flexDirection: 'row', height: 70 },
  itemList: { flexDirection: 'column' },
  last: {
    borderBottomColor: 'var(--form-box-border)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'column',
    justifyContent: 'center',
    width: 76,
  },
  leftBox: {
    backgroundColor: '#8e8f95',
    borderRadius: 10,
    height: 44,
    width: 44,
  },
  right: {
    alignSelf: 'stretch',
    borderTopColor: 'var(--form-box-border)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    paddingRight: 10,
  },
  subtext: {
    color: 'var(--secondary-text-color)',
    fontSize: 17,
    overflow: 'hidden',
    paddingTop: 5,
    whiteSpace: 'nowrap',
  },
  text: { color: 'var(--text-color)', fontSize: 17 },
});

export interface ItemListProps {
  style?: StyleProp<ViewStyle>;
  list: Item[];
  children?: ReactNode;
}
export function ItemList(props: ItemListProps) {
  const styles = useStyles(baseStyles);
  const items = props.list.map((item, i) => {
    return <Item key={i} last={i === props.list.length - 1} {...item} />;
  });
  return (
    <View style={[styles.itemList, props.style]}>
      {items}
      {props.children}
    </View>
  );
}
export default ItemList;

//export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type Item<
  K extends keyof RootStackParamList = keyof RootStackParamList,
> = {
  text: string;
  subtext?: string;
  screen?: K;
} & (RootStackParamList[K] extends undefined
  ? { args?: undefined }
  : { args: RootStackParamList[K] });

type ItemProps<K extends keyof RootStackParamList = keyof RootStackParamList> =
  Item<K> & { last?: boolean };

function Item<K extends keyof RootStackParamList>(props: ItemProps<K>) {
  const { text, subtext, screen, args } = props;
  const styles = useStyles(baseStyles);
  const navigation = useNavigation<RootNavigationProp>();
  const last = props.last ? styles.last : null;
  return (
    <View style={styles.item}>
      <View style={styles.left}>
        <View style={styles.leftBox} />
      </View>
      <View style={[styles.right, last]}>
        <Text style={styles.text}>{text}</Text>
        {subtext ? (
          <Text style={styles.subtext} numberOfLines={1} ellipsizeMode='tail'>
            {subtext}
          </Text>
        ) : null}
      </View>
      <TouchableHighlight
        style={StyleSheet.absoluteFill}
        underlayColor='rgba(255,255,255,0.1)'
        onPress={() => {
          if (screen) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigation.navigate(screen as any, args as any);
          }
        }}
      >
        <View style={StyleSheet.absoluteFill} />
      </TouchableHighlight>
    </View>
  );
}
