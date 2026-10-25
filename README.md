# Fifer: Daily Cricket Quiz (by Bowlers Association, @arijitrock)

A static, mobile-first cricket quiz. Every day there are 5 questions (one "over" of a fifer), picked by the IST date. It has a share-on-X result grid, streaks and personal stats in localStorage, and an all-time records page. It has no backend, so you can host it free on GitHub Pages, Netlify or Cloudflare Pages.

## Run locally
    cd /workspace/cricket-quiz && python3 -m http.server 8080
    # open http://localhost:8080

## Files
- `index.html`, `js/app.js`: the quiz, score screen, share, streak and stats.
- `stats.html`, `js/stats.js`, `data/records.json`: the records tables (update `asOf` when you change figures).
- `data/questions.json`: the question bank. To add a question, append an object:
  `{"id":"q074","category":"India","question":"...","answer":"...","options":["<answer>","w1","w2","w3"],"fact":"..."}`
  The answer must be one of the options. Options are shuffled at runtime. Run `python3 tools/validate.py` after editing.
- `js/common.js`: config (SITE_URL, X handle, launch date, support link).

## How the daily pick works
Day N after `LAUNCH_DATE` (IST) takes slice N of a seeded shuffle of the bank, so questions don't repeat until the bank is used up (73 questions = 14 days per cycle), and each new cycle is reshuffled. Adding questions changes future picks. To keep past quizzes stable, add questions in batches at the start of a cycle, or move to a fixed schedule file later.

## Monetization placeholders
- `.ad-slot` divs: the AdSense `<ins>` snippet is in an HTML comment, plus a script slot in `<head>`. Add `ads.txt` once approved.
- Support link: set `SUPPORT_URL` in `js/common.js`.
- Pro teaser card: no payment wired up.
