import { useNavigation } from '@react-navigation/native';
import { ScrollView, Text, TouchableHighlight, View } from 'react-native';

import { StyleSheet, useStyles } from './components/theme_style';

import type { StackScreenProps } from './router';

const baseStyles = StyleSheet.create({
  button: { backgroundColor: 'red', height: 40, width: 40 },
  homeScreen: { flex: 1 },
  padBottom: { height: 1000 },
  padTop: { height: 200 },
  text: { color: 'var(--text-color)', fontSize: 20 },
  touchable: { backgroundColor: 'green' },
  touchablePicker: { height: 100 },
});

export default function HomeScreen() {
  const navigation = useNavigation<StackScreenProps<'Home'>>();
  const styles = useStyles(baseStyles);
  return (
    <ScrollView
      style={styles.homeScreen}
      contentInsetAdjustmentBehavior='automatic'
    >
      <Text style={styles.text}>Home Screen</Text>
      <TouchableHighlight
        style={styles.touchable}
        onPress={() => {
          navigation.navigate('KeyList');
        }}
      >
        <View style={styles.button}>
          <Text style={styles.text}>Key</Text>
        </View>
      </TouchableHighlight>
      <View style={styles.padBottom} />
    </ScrollView>
  );
}
