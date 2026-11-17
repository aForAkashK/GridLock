import { AdBenefitsScreen } from "../screens/AdBenefitsScreen";
/**
 * Native stack — screens are backed by real native containers via
 * react-native-screens, so a push does not keep the previous screen's view
 * hierarchy mounted and animating.
 */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { DailyRewardsScreen } from "../screens/DailyRewardsScreen";
import { AwardsScreen } from "../screens/AwardsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { GameScreen } from "../screens/GameScreen";
import { LevelSelectScreen } from "../screens/LevelSelectScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { BuyCoinsScreen } from "../screens/BuyCoinsScreen";
import { canUseEmulatorQA } from "../services/debug/emulatorQA";
import { isPlayCheckoutConfigured } from "../services/purchases/coinCatalog";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
      <Stack.Screen name="Game" component={GameScreen} />
      <Stack.Screen name="Shop" component={ShopScreen} />
      <Stack.Screen name="DailyRewards" component={DailyRewardsScreen} />
      <Stack.Screen name="Awards" component={AwardsScreen} />
      <Stack.Screen name="AdBenefits" component={AdBenefitsScreen} />
      {isPlayCheckoutConfigured || canUseEmulatorQA() ? (
        <Stack.Screen name="BuyCoins" component={BuyCoinsScreen} />
      ) : null}
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
