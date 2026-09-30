# Project Passage

A minimalist text-based espionage game. You are a field officer three weeks
from mandatory retirement. She is an asset four years deep inside a building
you have never entered. You have both been protecting that fact for three years
and neither of you has ever said why.

Thirty minutes per session. After that the relay is traced.

## Play

Open `index.html` in any modern browser. No build step, no server, no
dependencies. Works from `file://`.

The splash screen is the entry point. Press `OP_SEC-ADMIN · LOGIN`, authenticate
(pre-filled), and the session begins.

## Mechanics

| Meter | Range | Meaning |
|---|---|---|
| Trust | 0–100 | Depth of emotional disclosure |
| Suspicion | 0–100 | Detection risk from surveillance handlers |
| Session window | 30 min | Hard limit; the relay is traced at zero |
| Turns | 24 | Secondary cap |

**Defection Together** requires Trust ≥ 45 and Suspicion < 45. The other three
endings are always available. Turns are generous by design (6–23 in practice)
so the joint escape has to be earned through disclosure, not speed.

**Suspicion bands** escalate the presentation:

- **25** — 8% of characters corrupt to `░▒█`
- **45** — 18% corruption plus screen shake; Exposed
- **70** — 30% corruption, shake, and blood

**Operational rules**, enforced in-fiction and in code:

- Real names on the open line cost +20 suspicion
- Operative vocabulary costs +14
- No access Thursdays or Friday mornings
- Codewords open the Vienna, Berlin, and Hong Kong memory archives

## Endings

- **Defection Together** — both walk out (Trust ≥ 45, Suspicion < 45)
- **The Asset Burned** — you spend yourself so she doesn't have to
- **The Company Man** — eleven days of quiet, then the record closes as dormant
- **Compromised** — traced and intercepted

## Layout

```
index.html      the entire game (engine + narrative + seals)
audio/          phase1-4.mp3, the score
_test/          verification harness (not required to play)
```

All agency names, seals, operations, and case references are invented for this
narrative. This is a work of fiction.

## Tests

```
cd _test
node balance.js    # route enumeration, gate reachability, turn spread
node verify.js     # state-space bounds, suspicion thresholds
node smoke.js      # engine boot, choice metrics, music, timeout
node gate.js       # splash -> login -> game flow
```

`engine.js` is extracted from `index.html` and gitignored. Regenerate it before
running the harness:

```
node -e "const fs=require('fs');const s=fs.readFileSync('../index.html','utf8');fs.writeFileSync('engine.js',s.split('<script>')[1].split('</script>')[0]+'\nglobalThis.__X={N,S,show,take,send,timeout,hud,push,sys,blood,shake,glitch,band,bandCheck,corrupt,clockTick,stopClock,codewords,OPS,NAME,dayBlocked,choices,reqOk,typingDot,clearDot,SCORE,musicPhase,wire,musicOn,musicOff,boot,bootGame,authenticate,openLoginForm};')"
```
