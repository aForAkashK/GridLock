# Daily rewards art — 2026-10-26

Generated with the built-in OpenAI image tool at the user's explicit request to match their supplied cartoon Daily rewards reference. Reference: `codex-clipboard-e23dbddf-fa2f-4125-83d1-c9879f7bccab.png` (user-provided layout/style reference). The reward rules, claim receipts and prices are independent of the artwork.

## Runtime files

- Final background: `../bg/city_bg.webp`, a clean844×1863 variant of `levels_bg.webp` with its top title decoration removed, per the user’s newer instruction. The original Levels art is unchanged. The generated city-background concept is superseded and is not imported or shipped. Its original source remains `/Users/akashkumar/.codex/generated_images/01a174d1-88e4-71b1-b77a-b4e8d068ed37/exec-f71edc1f-666c-4aa2-b517-edfd10c57f51.png`.
- `header.webp`: transparent calendar/title/cones graphic,768px wide,q92/alpha100/method6,about55KB. Source `/Users/akashkumar/.codex/generated_images/01a174d1-88e4-71b1-b77a-b4e8d068ed37/exec-d8dd0d56-75c3-4f80-b66e-cc9d55a0b575.png`.

Keep original generated sources intact. Metro imports only the WebP copies. The fixed title is accessible as "Daily rewards". All streak numbers, balances, coin amounts, status text and buttons are native live UI. One non-animated Skia canvas draws the glossy frame and seven tile/button bevels behind their measured native layouts. No UI screenshot is used as a fake interactive screen.

## Superseded background concept prompt (not shipped)

Use case: stylized-concept. Asset type: portrait mobile-game background. Use the supplied Daily rewards UI reference only for the illustrated city scenery and its glossy toy-like cartoon style. Create a NEW portrait background image of that cheerful sunny city street: bright blue sky, soft clouds, colourful low-rise buildings, green trees, tiny rounded red/yellow/green toy cars along the SIDE EDGES, orange road cones, and a road receding through the centre. Soft intentional depth-of-field blur keeps the scenery secondary. Centre region simple and calm because live UI will cover it. Match the reference palette and polished casual car-puzzle game rendering. Composition tall9:19 portrait,full bleed,no border. CRITICAL: BACKGROUND ONLY. Absolutely no UI panel,no calendar,no reward cards,no buttons,no title,no coin counter,no text,no numbers,no logo,no watermark.

## Header generation prompt

Use case: stylized-concept. Asset type: isolated transparent mobile-game header illustration. Match ONLY the header of the supplied Daily rewards reference,not its full screen. One wide cohesive glossy cartoon title graphic: purple rounded toy calendar badge with a blue-and-cream page and golden sun,centered ABOVE and slightly overlapping a curved thick deep-blue sign. On the sign the exact words "Daily rewards": "Daily" in chunky shiny white-to-pale-blue3D lettering and "rewards" in chunky golden-yellow3D lettering,thick navy outline,soft orange depth on gold letters. Two small orange-and-white road cones at the lower left and lower right of the sign. Top-left lighting,plastic highlights,strong clear silhouette matching the reference. Wide2:1 composition,the subject fills the canvas with a small safe margin; everything fully visible. Actual transparent alpha background. No subtitle,no coin counter,no balance,no reward panel/cards,no buttons,no other words or numbers,no watermark. Text must be exactly "Daily rewards".

## Earlier gift concept

`../../source/daily_gift.webp` preserves the earlier transparent gift-chest concept generated before the user supplied the more specific reference. It is not imported at runtime. Source: `/Users/akashkumar/.codex/generated_images/01a174d1-88e4-71b1-b77a-b4e8d068ed37/exec-9ba8335d-7047-45a4-b04c-148ec058ee54.png`. This concept is superseded by the reference-based calendar header.

## Final clean-city edit

Source: `/Users/akashkumar/.codex/generated_images/01a174d1-88e4-71b1-b77a-b4e8d068ed37/exec-d4e5d242-e8ac-41ac-96fd-e76654910aae.png`. Converted to844×1863 WebP,q90/method6. The original `levels_bg.webp` was the edit target, viewed before editing.

Prompt: Use case: precise-object-edit. Edit the supplied levels_bg.webp background. Remove ONLY the top 'Levels' title decoration: erase the entire wooden title sign, its yellow Levels lettering, and the little green leaves attached to that sign. Seamlessly fill that small top-centre area with the same bright blue sky/cloud atmosphere already behind it. Keep ALL other artwork unchanged: the exact portrait composition and framing,cars and their sizes/positions,blue bus,green truck,bridge,buildings,trees,road,both roadside billboards and their existing text,lighting,colours,cartoon rendering,and bottom empty road. Do not add anything. Do not redraw or rearrange the city. Preserve the original tall844:1863 aspect ratio and full image bounds. This should be the same game background with a clean sky where the title was,suitable for reusing behind other screens. No new text,no new UI,no logo,no watermark.

Final emulator verification: claimed Day1 renders with the clean city background,live balance660,live20-coin amount,green selected tile and readable gold collected button. The screenshot is `release/screenshots/android-daily-rewards.webp` and is not a runtime asset. Original Levels background has no changes. Final imported artwork inventory:44 WebP files,2.19MiB encoded,within all asset budgets. All629 tests,TypeScript,lint and Android phone-test/signed-release builds pass.
