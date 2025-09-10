import { useNavigation } from '@react-navigation/native';
import { ScrollView, Text, TouchableHighlight, View } from 'react-native';

import { StyleSheet, useStyles } from './components/theme_style';
import type { StackScreenProps } from './router';

const baseStyles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  homeScreen: { flex: 1 },
  padBottom: { height: 1000 },
  text: { color: 'var(--text-color)', fontSize: 20 },
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
        onPress={() => {
          navigation.navigate('Key');
        }}
      >
        <View style={{ height: 40, width: 40 }}>
          <Text style={styles.text}>Key</Text>
        </View>
      </TouchableHighlight>
      <View style={styles.padBottom} />
    </ScrollView>
  );
}
