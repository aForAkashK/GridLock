"""Original, deterministic toy-instrument score and cartoon feedback. No samples.
Run with Python 3 and macOS afconvert. Cues: mono PCM for native pools;
BGM: 16 bars at 112 BPM, mono AAC64kbps, decoded/looped by native players.
"""
from pathlib import Path
from array import array
import math, random, subprocess, tempfile, wave
ROOT = Path(__file__).resolve().parents[1]
RATE = 24000
TAU = math.tau

def note(midi): return 440 * 2 ** ((midi - 69) / 12)
def layer(out, start, duration, frequency, gain, kind='pluck', end=None, loop=False):
    offset = round(start * RATE)
    rng = random.Random(offset + round(frequency))
    for i in range(round(duration * RATE)):
        t = i / RATE; u = t / duration
        attack = min(1, t / .004)
        release = min(1, (duration-t) / .025)
        f1 = end if end is not None else frequency
        phase = TAU * (frequency*t + (f1-frequency)*t*t/(2*duration))
        if kind == 'bell':
            value = (math.sin(phase)*math.exp(-6*u) + .33*math.sin(phase*2.76)*math.exp(-12*u) + .12*math.sin(phase*5.4)*math.exp(-20*u))
        elif kind == 'wood':
            value = (math.sin(phase) + .28*math.sin(phase*3))*math.exp(-9*u)
        elif kind == 'air':
            value = rng.uniform(-1,1)*math.sin(math.pi*u)**2 * .35
        elif kind == 'bounce':
            value = (math.sin(phase)+.18*math.sin(phase*2))*math.sin(math.pi*u)**.7
        else:
            value = (math.sin(phase)+.23*math.sin(phase*2)+.08*math.sin(phase*3))*math.exp(-5*u)
        index = offset+i
        if loop: index %= len(out)
        if index < len(out): out[index] += gain*attack*release*value

def write(path, samples, peak):
    maximum=max(abs(v) for v in samples) or 1
    scale=min(1,peak/maximum)
    pcm=array('h', (round(32767*v*scale) for v in samples))
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
    print(f'{path.relative_to(ROOT) if path.is_relative_to(ROOT) else path.name}: {len(samples)/RATE:.2f}s, peak {maximum*scale:.3f}')

def cue(name, duration, events):
    out=array('f',[0])*round(duration*RATE)
    for event in events: layer(out,*event)
    path=ROOT/'assets/audio'/f'{name}.wav';write(path,out,.70)
    for target in [ROOT/'android/app/src/main/res/raw'/f'gl_{name}.wav', ROOT/'ios/GridLock/Audio'/f'{name}.wav']:
        target.write_bytes(path.read_bytes())

# Rubber pops, sliding whistles and small bell cascades, without sharp square waves.
cue('tap',.095,[(0,.08,610,.42,'bounce',310),(0,.045,1100,.08,'wood')])
cue('move',.20,[(0,.17,310,.30,'bounce',650),(.01,.18,400,.13,'air')])
cue('blocked',.19,[(0,.13,190,.35,'bounce',95),(.085,.09,135,.15,'wood')])
cue('exit',.34,[(0,.12,490,.32,'bounce',980),(.08,.22,1175,.22,'bell'),(.135,.19,1568,.16,'bell')])
cue('coin',.47,[(0,.28,note(88),.28,'bell'),(.075,.32,note(95),.23,'bell'),(.15,.28,note(100),.12,'bell')])
win=[]
for i,midi in enumerate([72,76,79,84]): win.append((i*.095,.36,note(midi),.28,'wood'))
for midi in [72,76,79,84]: win.append((.41,.62,note(midi),.13,'bell'))
cue('win',1.08,win)

# Sunny toy-town arrangement: marimba melody, pizzicato offbeats, rounded bass,
# soft brushed shaker. Four related phrases, a turnaround, and wrapped decay tails.
beat=60/112; bars=16; duration=bars*4*beat
out=array('f',[0])*round(duration*RATE)
chords=[(48,60,64,67),(45,57,60,64),(53,60,65,69),(43,59,62,67)]
phrases=[ [76,79,81,79,76,74,72,74], [76,79,84,83,81,79,76,74],
          [77,81,84,81,79,77,76,74], [74,79,83,81,79,76,74,71] ]
for bar in range(bars):
    base=bar*4*beat; root,*chord=chords[bar%4]
    for step in [0,1.5,2,3.5]: layer(out,base+step*beat,.31,note(root+(12 if step==3.5 else 0)),.16,'pluck',loop=True)
    for step in [.5,1.5,2.5,3.5]:
        for midi in chord: layer(out,base+step*beat,.20,note(midi),.045,'wood',loop=True)
    motif=phrases[bar%4]
    for slot,midi in enumerate(motif):
        # Leave breathing space; second half varies octave and cadence.
        if slot==5 and bar%2==0: continue
        if bar>=8 and slot in [1,6]: midi+=12
        if bar==15 and slot>=6: midi=[74,71][slot-6]
        layer(out,base+(slot*.5+(.045 if slot%2 else 0))*beat,.35,note(midi),.12,'wood',loop=True)
    for slot in range(8): layer(out,base+slot*.5*beat,.045,1200,.055 if slot%2 else .035,'air',loop=True)
with tempfile.TemporaryDirectory() as tmp:
    wav=Path(tmp)/'toy-town.wav';write(wav,out,.60)
    music=ROOT/'assets/audio/toy_town.m4a'
    subprocess.run(['afconvert','-f','m4af','-d','aac ','-b','64000',str(wav),str(music)],check=True)
    for target in [ROOT/'android/app/src/main/res/raw/gl_bgm.m4a',ROOT/'ios/GridLock/Audio/toy_town.m4a']:
        target.write_bytes(music.read_bytes())
print('Original toy-town loop generated. No downloaded samples or runtime synthesis.')
