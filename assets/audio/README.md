# Original cartoon audio — 2026-10-26

All cues and music are composed/synthesized by `tools/generate-audio.py`, using deterministic oscillators, envelopes and seeded noise. No downloaded samples, voices or third-party tracks. Regenerate with Python3 and macOS `afconvert` (AAC encoding may require access to the system audio codec service).

- Tap: small descending rubber pop,95ms.
- Move: rising whistle with a soft air slide,200ms.
- Blocked: gentle low double bounce,190ms.
- Exit: upward pop and bell sparkle,340ms.
- Coin: three ascending bell tones,470ms.
- Win: toy-marimba arpeggio and bell chord,1.08s.
- Toy Town BGM: original16-bar112BPM arrangement,34.286s; marimba phrases, pizzicato offbeats, rounded bass, soft shaker. Decay tails wrap across the loop boundary. No runtime synthesis.

Effects are mono24kHz16bitPCM WAV, under52KB each, predecoded by SoundPool/AudioServices. Music is mono24kHz AAC in M4A,about250KB, with encoder priming metadata and native looping. Android uses async MediaPlayer preparation, lifecycle pause and audio focus/duck handling; iOS uses AVAudioPlayer, ambient mixing, background/interruption pause and route-change handling. OS playback owns looping; no JS interval or per-frame store writes.

Runtime copies live in Android `res/raw/` and iOS `Audio/`. Source files here are not imported by Metro. BGM defaults to28% with its independent persisted switch and volume; effects/haptics retain their separate switches. Respect the device's volume and iOS silent switch. New native functionality requires a rebuild/install, not a Metro reload.

The composition is a listening candidate: check perceived balance, loop transitions, headphone routing and interruption recovery on physical Android/iOS devices before public release. Compilation and waveform bounds alone do not establish subjective audio quality.

`effects_preview.wav` is a listening-only sequence: tap → move → blocked → exit → coin → win, with short gaps. It is not copied into either native app bundle. Android emulator verifies native looping at28% volume, state6/paused1 when backgrounded and state5/paused0 on return, with one player/session reused.
