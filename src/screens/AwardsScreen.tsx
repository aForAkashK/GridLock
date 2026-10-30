import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { BackButton } from "../components/navigation/BackButton";
import { CoinPill } from "../components/CoinPill";
import { homeTileAssets } from "../components/home/homeTileAssets";
import { usePlayerStore } from "../state/playerStore";
import { AWARDS, type AwardId } from "../services/awards/catalog";
import { awardStatus } from "../services/awards/policy";
import { GameTypography } from "../theme/typography";
import { Colors, Home, Radius, Spacing } from "../theme/tokens";
import { play } from "../services/audio/audioService";
type Props = NativeStackScreenProps<RootStackParamList, "Awards">;
export function AwardsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const progress = usePlayerStore((s) => s.awards);
  const completed = usePlayerStore((s) => s.completedLevels);
  const claim = usePlayerStore((s) => s.claimAward);
  const [message, setMessage] = useState("");
  const statuses = useMemo(
    () => AWARDS.map((award) => awardStatus(award.id, progress, completed)!),
    [progress, completed]
  );
  const claimed = statuses.filter((status) => status.claimed).length;
  const available = statuses.filter((status) => status.claimable).length;
  const collect = (id: AwardId) => {
    try {
      const result = claim(id);
      if (result.claimed) {
        play("coin");
        setMessage(`Collected ${result.amount} coins!`);
      } else {
        setMessage(
          result.reason === "recovery_pending"
            ? "Finish restoring your account before collecting."
            : result.reason === "already_claimed"
            ? "This reward is already collected."
            : "Keep playing to unlock this award."
        );
      }
    } catch {
      setMessage(
        "Could not finish saving. Try again; a reward will not be counted twice."
      );
    }
  };
  return (
    <View style={styles.root}>
      <Image
        source={require("../../assets/ui/bg/city_bg.webp")}
        resizeMode="cover"
        style={[styles.background, { width, height }]}
        accessible={false}
      />
      <View pointerEvents="none" style={styles.scrim} />
      <FlatList
        style={{ marginTop: insets.top }}
        data={statuses}
        keyExtractor={(item) => item.award.id}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.sm,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.intro}>
            <View style={styles.header}>
              <BackButton onPress={() => navigation.goBack()} />
              <CoinPill />
            </View>
            <Image
              source={homeTileAssets.awards}
              style={styles.hero}
              accessible={false}
            />
            <Text style={styles.title}>Awards</Text>
            <Text style={styles.subtitle}>
              {claimed} of {AWARDS.length} rewards collected
            </Text>
            <Text style={styles.summary}>
              {available
                ? `${available} reward${
                    available === 1 ? " is" : "s are"
                  } ready to collect!`
                : "Play, solve and build your daily streak."}
            </Text>
            {message ? (
              <Text accessibilityLiveRegion="polite" style={styles.message}>
                {message}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.claimable && styles.readyCard]}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardTitle}>{item.award.title}</Text>
              <Text style={styles.reward}>+{item.award.reward} coins</Text>
            </View>
            <Text style={styles.description}>{item.award.description}</Text>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={item.award.title}
              accessibilityValue={{
                min: 0,
                max: item.award.goal,
                now: item.current,
                text: `${item.current} of ${item.award.goal}`,
              }}
              style={styles.progressTrack}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${(item.current / item.award.goal) * 100}%` },
                  item.claimed && styles.collectedFill,
                ]}
              />
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.count}>
                {item.current} / {item.award.goal}
              </Text>
              {item.claimable ? (
                <Pressable
                  onPress={() => collect(item.award.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Collect ${item.award.reward} coins for ${item.award.title}`}
                  style={({ pressed }) => [
                    styles.collect,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.collectText}>Collect reward</Text>
                </Pressable>
              ) : (
                <Text
                  style={[styles.status, item.claimed && styles.collectedText]}
                >
                  {item.claimed ? "Collected" : "Keep going"}
                </Text>
              )}
            </View>
          </View>
        )}
        ListFooterComponent={
          <Text style={styles.note}>
            Each reward can be collected once. Level milestones include skips.
            Perfect goals count different levels, at par or better, from this
            update onward—replay older levels to make them count. Daily goals
            remember your best claim streak, even after a missed day.
          </Text>
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Home.sky },
  background: { position: "absolute", top: 0, left: 0 },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(9,28,65,.55)",
  },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  intro: { alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingRight: Spacing.sm,
  },
  hero: { width: 94, height: 94 },
  title: {
    fontFamily: GameTypography.display,
    fontSize: 32,
    color: Colors.textPrimary,
    textShadowColor: Home.chromeBorder,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
  },
  subtitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: "700" },
  summary: {
    color: Home.coinGold,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  message: { color: Home.coinGold, textAlign: "center", fontSize: 14 },
  card: {
    backgroundColor: Home.chrome,
    borderColor: Home.tileBlue,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  readyCard: { borderColor: Home.coinGold },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontFamily: GameTypography.display,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  reward: {
    fontFamily: GameTypography.display,
    fontSize: 15,
    color: Home.coinGold,
  },
  description: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Home.chromeBorder,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Home.coinGold,
  },
  collectedFill: { backgroundColor: Home.playTop },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  count: { color: Colors.textSecondary, fontSize: 12 },
  collect: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Home.coinGold,
    borderBottomWidth: 3,
    borderBottomColor: Home.tileAmber,
  },
  collectText: {
    fontFamily: GameTypography.display,
    color: Home.chromeBorder,
    fontSize: 14,
  },
  pressed: { transform: [{ scale: 0.96 }] },
  status: { color: Colors.textSecondary, fontSize: 13, fontWeight: "700" },
  collectedText: { color: Home.playTop },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textPrimary,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
});
