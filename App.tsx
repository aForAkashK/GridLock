/**
 * App root.
 *
 * GestureHandlerRootView must wrap everything — the board's tap and swipe
 * gestures do not work outside it.
 */

import React from 'react';
import { LogBox, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { Colors } from './src/theme/tokens';

// react-navigation still imports DrawerLayoutAndroid, which RN 0.87 deprecates.
// Nothing we can act on, and in dev the LogBox toast it raises sits on top of
// the action row and swallows taps on Hint/Undo/Reset.
LogBox.ignoreLogs(['DrawerLayoutAndroid is deprecated']);

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: Colors.screenBackground },
};

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screenBackground },
});

export default App;
