# First-release generated art

Created with OpenAI image generation at the user's explicit request (2026-10-26). Source outputs are preserved in the local generation folder outside the bundle; deployable app assets use appropriately sized WebP. Native iOS app-icon slots require opaque PNG. No external stock/license source was used.

Launcher source: `/Users/akashkumar/.codex/generated_images/01a174d1-88e4-71b1-b77a-b4e8d068ed37/exec-51bd119c-96bd-4f24-8b1a-a27fea2676cb.png`. Direction: square full-bleed glossy casual puzzle icon, centered red car based on the existing master car and home art references, no text, no transparent margins. WebP512 q92; Android density48–192 WebP; iOS opaque PNG40–1024.

Free restart source: `/Users/akashkumar/.codex/generated_images/01a174d1-88e4-71b1-b77a-b4e8d068ed37/exec-2c8194e2-c157-46e9-aa08-10c592815a2f.png`. Direction: preserve the existing glossy red circular restart button silhouette and white rotating arrow, transparent background; replace the coin cost pill with clear FREE text. Output `../buttons/reset_free.webp`,320 square,q90,alpha retained.

Home source PNGs remain editable source references. Runtime resolver imports only384 square q90/method6 WebP (about24–28KB each rather than about1.3MB per source PNG). Native labels remain text overlays. Sprite art remains existing WebP; boards are vectors generated from level grid size.

Android launcher correction: API26+ uses adaptive XML icons with a blue background and the existing square WebP fitted to the central72/108 viewport. Legacy density icons remain for API24–25. This prevents launcher-added white padding while retaining the car inside the system mask. Both normal and round manifest references use the adaptive resource. A native rebuild/install is required; Metro reload cannot update launcher resources.
