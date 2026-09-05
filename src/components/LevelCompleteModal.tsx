/**
 * Level complete.
 *
 * Appears ~400ms after the last vehicle escapes so the exit animation gets to
 * breathe — the escape is the most satisfying moment in the game and a modal
 * landing on top of it steals that (GAME_DESIGN.md).
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameButton } from './GameButton';
import { Colors, Radius, Spacing } from '../theme/tokens';

const REVEAL_DELAY_MS = 400;

type Props = {
  visible: boolean;
  moveCount: number;
  parMoves?: number;
  coinsAwarded: number;
  /** The board was cleared by paying to Skip, not by solving it. */
  skipped: boolean;
  hasNextLevel: boolean;
  onNext: () => void;
  onReplay: () => void;
  onHome: () => void;
};

export function LevelCompleteModal({
  visible,
  moveCount,
  parMoves,
  coinsAwarded,
  skipped,
  hasNextLevel,
  onNext,
  onReplay,
  onHome,
}: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    const timer = setTimeout(() => setShown(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || !shown) {
    return null;
  }

  // A skipped level was never solved, so move count, par and the perfect-solve
  // badge would all be claiming credit the player did not earn.
  const perfect = !skipped && parMoves !== undefined && moveCount <= parMoves;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{skipped ? 'Skipped ⏭' : 'Cleared! 🎉'}</Text>

        {skipped ? (
          <Text style={styles.stat}>Level unlocked — come back and solve it</Text>
        ) : (
          <Text style={styles.stat}>
            {moveCount} {moveCount === 1 ? 'move' : 'moves'}
            {parMoves !== undefined ? ` · par ${parMoves}` : ''}
          </Text>
        )}
        {perfect ? <Text style={styles.perfect}>Perfect solve ⭐</Text> : null}

        {coinsAwarded > 0 ? (
          <Text style={styles.reward}>+{coinsAwarded} 🪙</Text>
        ) : (
          <Text style={styles.replayNote}>
            {skipped ? 'No coins for a skip' : 'Replay — no coins awarded again'}
          </Text>
        )}

        {hasNextLevel ? (
          <GameButton
            label="Next level"
            variant="primary"
            onPress={onNext}
            style={styles.button}
          />
        ) : (
          <Text style={styles.endNote}>
            That's every level for now — more coming soon.
          </Text>
        )}

        <GameButton
          label={skipped ? 'Try it properly' : 'Replay'}
          onPress={onReplay}
          style={styles.button}
        />
        <GameButton label="Home" onPress={onHome} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.screenBackground,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  stat: { color: Colors.textSecondary, fontSize: 15 },
  perfect: {
    color: Colors.coin,
    fontSize: 15,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  reward: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginVertical: Spacing.lg,
  },
  replayNote: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginVertical: Spacing.lg,
  },
  endNote: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  button: { alignSelf: 'stretch', marginTop: Spacing.sm },
});
