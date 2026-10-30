# Daily display font

Fredoka One Regular by Milena Brandao. Unmodified TrueType font,43,500bytes; internal family `Fredoka One`,PostScript name `FredokaOne-Regular`. Source: official Google Fonts repository,pinned to commit `70c202f0f35084e9f83595225d0951062537beb0`:

https://github.com/google/fonts/tree/70c202f0f35084e9f83595225d0951062537beb0/ofl/fredokaone

The full SIL Open Font License1.1 and copyright notice are in `OFL.txt`,included with both native builds. Do not replace the font without preserving its license/provenance.

Android copy: `android/app/src/main/assets/fonts/FredokaOne-Regular.ttf` (filename-based native family). iOS copy: `ios/GridLock/Fonts/FredokaOne-Regular.ttf` (folder resource,registered in Info.plist UIAppFonts). Both platforms use `FredokaOne-Regular` in `DailyTypography.display`. Use normal weight: this face already has a heavy rounded design,and synthetic bold would change its appearance. Body copy retains the system font for readability at small sizes.

There is no runtime download,font-loader package or per-frame font work. OS font loading/caching uses the bundled native file. A native rebuild/install is required; Metro alone cannot add a new native font. `audit:assets` verifies native file/license parity and a64KiB font budget.

Validation: Android emulator screenshot at `release/screenshots/android-daily-fredoka.webp` confirms the rounded face is rendered on headings,numbers and the collected button. Its label is dark blue on gold without the old blurred shadow. Both native builds succeed; Android APK and built iOS bundle contain the43,500-byte font and its license,and iOS UIAppFonts registers the folder path.629 tests,TypeScript,lint and asset checks pass.
