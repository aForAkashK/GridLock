import { startAds, setAdsSaveReady } from "./src/services/ads/adService";
/**
 * App root.
 *
 * GestureHandlerRootView must wrap everything — the board's tap and swipe
 * gestures do not work outside it.
 */

import { startDiagnostics } from "./src/services/diagnostics/runtime";
import {
  breadcrumb,
  diagnosticContext,
} from "./src/services/diagnostics/client";
import { DiagnosticBoundary } from "./src/components/DiagnosticBoundary";
import React, { useEffect } from "react";
import { Linking, NativeModules, StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  NavigationContainer,
  DarkTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import type { RootStackParamList } from "./src/navigation/types";
import {
  startLevelDelivery,
  setLevelDeliveryGameVisible,
} from "./src/services/levels/levelDeliveryRuntime";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { bootstrap } from "./src/services/bootstrap";
import { Colors } from "./src/theme/tokens";
import { startAudio, play } from "./src/services/audio/audioService";
import {
  canUseEmulatorQA,
  installEmulatorQA,
} from "./src/services/debug/emulatorQA";
import { AccountDeletionGate } from "./src/components/AccountDeletionGate";
import { useAccountStore } from "./src/state/accountStore";
import { AccountRecoveryGate } from "./src/components/AccountRecoveryGate";

const navigationRef = createNavigationContainerRef<RootStackParamList>();
let qaLaunched = false;
const updateDeliveryRoute = () => {
  const route = navigationRef.getCurrentRoute();
  diagnosticContext({
    screen: route?.name ?? "starting",
    preview:
      route?.name === "Game" &&
      Boolean((route.params as { preview?: boolean } | undefined)?.preview),
  });
  breadcrumb("navigation", { screen: route?.name });
  setLevelDeliveryGameVisible(route?.name === "Game");
  if (!qaLaunched && NativeModules.GridLockFeedback?.qaEnabled === true) {
    qaLaunched = true;
    NativeModules.GridLockFeedback.initialPreview().then((levelId: number) => {
      navigationRef.navigate("Game", { levelId, preview: true });
    });
  }
};

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: Colors.screenBackground },
};

function App() {
  useEffect(() => {
    if (!canUseEmulatorQA()) {
      return;
    }
    installEmulatorQA((levelId) =>
      navigationRef.navigate("Game", { levelId, preview: true })
    );
    const openPreview = (url: string) => {
      const match = /^gridlock:\/\/debug\/level\/(\d+)$/.exec(url);
      if (match && navigationRef.isReady()) {
        navigationRef.navigate("Game", {
          levelId: Number(match[1]),
          preview: true,
        });
      }
    };
    const subscription = Linking.addEventListener("url", (event) =>
      openPreview(event.url)
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const stopDiagnostics = startDiagnostics();
    // Deliberately not awaited and not gating render: sign-in and the cloud
    // merge run alongside the first frame. The game works entirely from local
    // state, so a slow or absent network costs nothing but a later merge.
    // bootstrap() never rejects, so there is no failure path to handle here.
    bootstrap().then((result) =>
      setAdsSaveReady(result.uid !== null && result.merge !== "skipped")
    );
    const stopAudio = startAudio();
    const stopAds = startAds();
    const stopDelivery = startLevelDelivery();
    return () => {
      stopDiagnostics();
      stopAds();
      stopAudio();
      stopDelivery();
    };
  }, []);

  return (
    <DiagnosticBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" />
          <NavigationContainer
            ref={navigationRef}
            onReady={updateDeliveryRoute}
            onStateChange={() => {
              play("tap");
              updateDeliveryRoute();
            }}
            theme={navTheme}
          >
            <RootNavigator />
          </NavigationContainer>
          <AccountRecoveryGate />
          <AccountDeletionGate
            onContinue={() => {
              useAccountStore.setState({
                deletionComplete: false,
                error: null,
              });
              navigationRef.resetRoot({ index: 0, routes: [{ name: "Home" }] });
              bootstrap().then((result) =>
                setAdsSaveReady(
                  result.uid !== null && result.merge !== "skipped"
                )
              );
            }}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </DiagnosticBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.screenBackground },
});

export default App;
