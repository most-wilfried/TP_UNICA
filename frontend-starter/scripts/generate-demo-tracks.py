"""Generate original demo loops with the Python standard library (no samples)."""
from array import array
import json
import math
from pathlib import Path
import random
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/audio/demos'
RATE = 22050
TRACKS = [
    ('house', 'House · Lumière de nuit', 'House', 124, 45),
    ('hip-hop', 'Hip-hop · Promenade', 'Hip-hop', 88, 48),
    ('afrobeat', 'Afrobeat · Soleil levant', 'Afrobeat', 104, 50),
    ('amapiano', 'Amapiano · Horizon', 'Amapiano', 112, 43),
    ('reggae', 'Reggae · Jardin tranquille', 'Reggae', 78, 45),
    ('blues', 'Blues · Route du soir', 'Blues', 96, 45),
]


def render(slug, bpm, root, variant=0):
    beat = 60 / bpm
    samples = array('f', [0]) * round(32 * beat * RATE)
    rng = random.Random(f'{slug}-{variant}')

    def add(at, duration, kind, amplitude, note=0):
        start = round(at * RATE)
        count = round(duration * RATE)
        frequency = 440 * 2 ** ((note - 69) / 12)
        phase = 0
        for index in range(count):
            target = start + index
            t = index / RATE
            if kind == 'kick':
                phase += 2 * math.pi * (45 + 130 * math.exp(-t * 35)) / RATE
                value = math.sin(phase) * math.exp(-t * 14)
            elif kind in ('hat', 'snare'):
                value = rng.uniform(-1, 1) * math.exp(-t * (90 if kind == 'hat' else 25))
                if kind == 'snare':
                    value = value * .7 + math.sin(2 * math.pi * 180 * t) * math.exp(-t * 24) * .3
            else:
                envelope = min(1, t / .008) * math.exp(-t * (5 if kind == 'key' else 9))
                value = (math.sin(2 * math.pi * frequency * t) + .2 * math.sin(4 * math.pi * frequency * t)) * envelope
            # Wrap tails so the end joins the first beat without a hard cut.
            samples[target % len(samples)] += value * amplitude

    for bar in range(8):
        chord_root = root + [0, 5, 7, 0][(bar + variant) % 4]
        base = bar * 4 * beat
        kicks = [0, 1, 2, 3] if slug == 'house' else [0, 1.75, 2.5] if slug in ('afrobeat', 'amapiano') else [0, 2]
        for step in kicks:
            add(base + step * beat, .4, 'kick', .48)
        for step in [1, 3]:
            add(base + step * beat, .18, 'snare', .22)
        for step in range(8):
            swing = .12 if slug in ('hip-hop', 'blues') and step % 2 else 0
            add(base + (step / 2 + swing) * beat, .08, 'hat', .075 if step % 2 else .05)
        for step in [0, 1.5, 2, 3.5]:
            add(base + step * beat, beat * .65, 'bass', .24, chord_root)
        chord_steps = [.5, 1.5, 2.5, 3.5] if slug == 'reggae' else [0, 2.5]
        for step in chord_steps:
            for interval in [12, 15, 19]:
                add(base + step * beat, beat * .7, 'key', .065, chord_root + interval)
        if (bar + variant) % 2:
            for step, interval in zip([.75, 1.5, 2.75, 3.5], [24, 27, 26, 19]):
                add(base + step * beat, beat * .5, 'key', .09, root + interval)
    peak = max(abs(value) for value in samples)
    pcm = array('h', (round(value / max(peak, 1) * 26000) for value in samples))
    if sys.byteorder != 'little':
        pcm.byteswap()
    return pcm


OUTPUT.mkdir(parents=True, exist_ok=True)
catalog = []
for slug, title, style, bpm, root in [(slug, title if variant == 0 else title + f' — Variation {variant + 1}', style, bpm + (variant % 5 - 2) * 2 if variant else bpm, root + variant % 3) for slug, title, style, bpm, root in TRACKS for variant in range(10)]:
    variant = len(catalog) % 10
    pcm = render(slug, bpm, root, variant)
    slug = slug if variant == 0 else slug + f'-{variant + 1}'
    path = OUTPUT / f'{slug}.wav'
    with wave.open(str(path), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(pcm.tobytes())
    catalog.append(dict(id=f'demo-{slug}', title=title, style=style, bpm=bpm,
                        originalName=path.name, mimeType='audio/wav', size=path.stat().st_size,
                        createdAt='2026-10-14', url=f'/audio/demos/{path.name}',
                        duration=round(len(pcm) / RATE, 2)))
(ROOT / 'src/app/shared/models/demo-tracks.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
print(f'{len(catalog)} original loops generated in {OUTPUT}')
