# CLOSE ENOUGH

Answer with a number. The closer you are, the more points you get.

A mobile-first static web game built to test one hypothesis: **will friends voluntarily try to beat each other's score?**
Vanilla JS, no frameworks, no backend, no build step.

```
index.html      markup for the 4 screens (start, question, reveal, end)
style.css       dark, high-contrast, portrait-first styles
game.js         game logic + UI (parser, scoring, seeded PRNG, modes)
questions.json  question bank
```

## Run locally

`game.js` loads `questions.json` with `fetch`, which doesn't work from `file://`, so serve the folder over HTTP:

```sh
python3 -m http.server 8000
# or: npx serve .
```

Then open http://localhost:8000. To test on your phone, open `http://<your-computer-ip>:8000` on the same Wi-Fi.
Voice input only works over **HTTPS** or on `localhost` (that's a browser rule), so use a deployed URL to test the mic on a phone.

## Deploy to Vercel (static)

There's no build step, so there's nothing to configure.

- **CLI:** `npm i -g vercel`, then run `vercel` from this folder (`vercel --prod` for production). When asked, keep the
  framework as **Other**, and leave the build command and output directory empty.
- **Dashboard:** import the Git repo at vercel.com/new, set Framework Preset to **Other**, leave Build Command empty,
  set Output Directory to `.` (root), then Deploy.

## How it works

- **Round:** 5 questions, 20 s each. The timer uses timestamps, so it stays correct if the tab is backgrounded.
  If time runs out you get 0, unless an "I heard: …" value is on screen; that value is submitted.
- **Input:** the mic (tap to toggle, or hold to talk and release) uses the Web Speech API in the selected language
  (EN = `en-US`, RU = `ru-RU`). The number field is always there, and typed text goes through the same parser.
  Browsers without speech recognition (e.g. Firefox) just show the input field.
- **Spoken number parser** (`parseSpokenNumber`): digits with `,` / space / NBSP separators, decimal comma or point,
  English and Russian number words (including common oblique and ordinal forms), scales
  (`thousand`, `million`, `тысяч`, `млн`, `млрд`, `k`, …), `1.5 million`, `полтора миллиона`, `полмиллиона`,
  `half a million`, `два с половиной миллиона`, `two point five million`, and year phrasing such as
  `nineteen eighty nine` or `тысяча девятьсот сорок пятом году`. If parsing fails, it asks you to type.
- **Scoring:**
  - `ratio` (default): `points = round(1000 · exp(−3 · |ln(guess/truth)|))`. A guess ≤ 0 scores 0.
  - `year`: `points = round(1000 · max(0, 1 − |guess − truth| / span))`, where `span` defaults to 50.
  - Emoji per question: 🟩 ≥ 800, 🟨 ≥ 500, 🟧 ≥ 200, 🟥 below.
- **Seeding:** mulberry32 shuffles the bank, sorted by `id`, and takes the first 5. The same seed and the same bank give
  the same questions in the same order for everyone.

### Modes

| Mode | Seed | Notes |
|---|---|---|
| DAILY | UTC date `YYYYMMDD` | One result per day (kept in localStorage). Daily #1 = 2026-10-02 UTC. |
| PRACTICE | random | TRY AGAIN starts a new random round immediately. |
| CHALLENGE | from the URL | `?seed=<seed>&b=<name:score,...>` |

**Challenge links:** `b` holds up to 10 `name:score` entries, sorted by score. Names are URL-encoded and capped at
12 characters. Opening a link shows `FRIEND TO BEAT: <top name> — <score>` and plays that seed. The end screen shows
the gap (`112 to go` / `beaten by 40`). SHARE adds your score to the board, or raises your existing entry. Every
share, including Daily and Practice, carries a challenge link so the recipient plays the same 5 questions.
In Challenge mode, TRY AGAIN replays the same seed so you can catch up.

Your name comes from the field on the start screen. If it's empty when you share, the game asks for one.

Personal bests are stored per mode in localStorage (`ce_best_daily`, `ce_best_practice`, `ce_best_challenge`).

## Question bank

`questions.json` is an array of:

```json
{
  "id": 1,
  "text_en": "How tall is Mount Everest?",
  "text_ru": "Какова высота Эвереста?",
  "answer": 8849,
  "unit": "m",
  "type": "ratio",
  "span": 50,
  "category": "geography",
  "source_url": "https://en.wikipedia.org/wiki/Mount_Everest",
  "fact": "optional one-liner",
  "fact_ru": "optional Russian one-liner",
  "verify": true
}
```

- `type` is `"ratio"` (default) or `"year"`. `span` only applies to `year` questions.
- Questions with `"verify": true` are **skipped** by the selector until you check them and remove the flag.
- `fact_ru` is optional; the English `fact` is shown when it's missing.
- Keep `id`s unique and stable. Adding or removing questions changes which 5 a given seed picks, so old challenge
  links will point at a different set.
- `unit` is shown as written, except that `m`, `km`, `km/s`, `m/s`, `s` and `K` are translated for RU.
