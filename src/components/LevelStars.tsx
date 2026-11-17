import React from "react";
import { Image, StyleSheet, View } from "react-native";
import type { LevelRating } from "../services/levels/ratings";

const SILVER_STAR = require("../../assets/ui/icons/result_star_silver.webp");
const STAR = require("../../assets/ui/icons/level_star.webp");

export function LevelStars({
  rating,
  size,
  celebration = false,
}: {
  rating: LevelRating;
  size: number;
  celebration?: boolean;
}) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, { gap: size * 0.12 }]}
    >
      {[1, 2, 3].map((position) => (
        <Image
          key={position}
          source={celebration && position > rating ? SILVER_STAR : STAR}
          resizeMode="contain"
          accessible={false}
          style={[
            { width: size, height: size },
            !celebration && position > rating && styles.empty,
            celebration && position === 2 && styles.featured,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  featured: { transform: [{ translateY: -2 }, { scale: 1.08 }] },
  empty: { opacity: 0.25 },
});
