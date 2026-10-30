/** Static asset resolver: Metro requires literal paths at bundle time. */
export const homeTileAssets = {
  levels: require('../../../assets/ui/buttons/home_levels.webp'),
  daily: require('../../../assets/ui/buttons/home_daily.webp'),
  awards: require('../../../assets/ui/buttons/home_awards.webp'),
  shop: require('../../../assets/ui/buttons/home_shop.webp'),
} as const;

export type HomeTileKind = keyof typeof homeTileAssets;
