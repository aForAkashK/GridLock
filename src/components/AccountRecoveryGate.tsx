import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAccountStore } from '../state/accountStore';
import { finishPendingRecovery } from '../services/auth/accountRecovery';
import { Home, Radius, Spacing } from '../theme/tokens';

/** Only an explicitly confirmed existing-account restore gates further spending. */
export function AccountRecoveryGate() {
  const pending = useAccountStore((s) => s.pendingRestore);
  const busy = useAccountStore((s) => s.busy);
  const error = useAccountStore((s) => s.error);
  return (
    <Modal
      visible={pending}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Restoring your save</Text>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : null}
          <Text style={styles.body}>
            {error ??
              'Loading your Google save before syncing. Please keep your connection on.'}
          </Text>
          {!busy ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                finishPendingRecovery().catch(() => {});
              }}
              style={styles.button}
            >
              <Text style={styles.title}>Retry restore</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  button: {
    minHeight: 48,
    padding: Spacing.md,
    backgroundColor: Home.playRim,
    borderRadius: Radius.md,
  },
});
