import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccountStore } from '../state/accountStore';
import { usePlayerStore } from '../state/playerStore';
import {
  markNudgeSeen,
  shouldShowNudge,
} from '../services/auth/saveProgressNudge';
import { Home, Radius, Spacing } from '../theme/tokens';

export function SaveProgressPrompt({ onSettings }: { onSettings: () => void }) {
  const user = useAccountStore((s) => s.user);
  const completed = usePlayerStore((s) => s.completedLevels.length);
  const coins = usePlayerStore((s) => s.coins);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (
      user &&
      shouldShowNudge({
        completedLevelCount: completed,
        coinBalance: coins,
        hasRecoverableIdentity: user.hasRecoverableIdentity,
      })
    ) {
      setVisible(true);
    }
  }, [user, completed, coins]);
  const dismiss = () => {
    markNudgeSeen();
    setVisible(false);
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Keep your progress</Text>
          <Text style={styles.body}>
            Connect Google in Settings to recover your coins and completed
            levels on another device.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              dismiss();
              onSettings();
            }}
            style={styles.primary}
          >
            <Text style={styles.label}>Open account settings</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={dismiss}
            style={styles.secondary}
          >
            <Text style={styles.label}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Home.chrome,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: { color: '#FFFFFF', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primary: {
    backgroundColor: Home.playRim,
    borderRadius: Radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
