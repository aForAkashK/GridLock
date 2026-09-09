/**
 * App root.
 *
 * GestureHandlerRootView must wrap everything — the board's tap and swipe
 * gestures do not work outside it.
 */

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { bootstrap } from './src/services/bootstrap';
import { Colors } from './src/theme/tokens';

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: Colors.screenBackground },
};

function App() {
  useEffect(() => {
    // Deliberately not awaited and not gating render: sign-in and the cloud
    // merge run alongside the first frame. The game works entirely from local
    // state, so a slow or absent network costs nothing but a later merge.
    // bootstrap() never rejects, so there is no failure path to handle here.
    bootstrap();
  }, []);

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
