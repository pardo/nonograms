# Nonograms

A touch-friendly nonogram (picross) puzzle app. Play a curated set of hand-picked
puzzles, a large library of procedurally generated pattern puzzles, or an
unlimited number of randomly generated puzzles solvable by pure logic.

Live at: https://pardo.github.io/nonograms/

## Features

- Curated pixel-art puzzles (hearts, faces, houses, trees, ...)
- A large library of parametric pattern puzzles (diamonds, rings, checkerboards, ...) at multiple sizes
- Infinite random puzzle generation, verified solvable without guessing
- Touch-friendly: tap or drag to fill/mark, works well on tablets
- Timer, mistake counter, and win detection
- Progress and completion are saved locally (`localStorage`), so puzzles resume where you left off

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
app and deploys it to GitHub Pages.
