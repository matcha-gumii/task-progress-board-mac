# Task Progress Board

English | [日本語](README.md)

A macOS desktop app for managing main tasks, subtasks, and nested tasks in a polished, glossy Mac-style interface.

## Features

- Create, edit, and track main tasks, subtasks, and nested tasks
- Drag to reorder items within the same hierarchy level
- Switch the interface between Japanese and English
- Choose from small, standard, and large text sizes
- Gray, wine, blue, and black color themes
- Search, filtering, duplication, notes, undo, and redo
- App data storage with JSON backup and restore

## Run for development

```bash
pnpm install
pnpm start
```

## Test

```bash
pnpm test
```

## Build for macOS

```bash
pnpm run build:mac
```

You can also run `.github/workflows/build-mac.yml` manually or push a tag beginning with `v` to build both Apple Silicon and Intel versions.

Build artifacts are written to `dist/`. The app supports Apple Silicon (`arm64`) and Intel (`x64`) Macs.

The current build is unsigned. Before distributing it publicly, configure Apple Developer ID signing and notarization.

Task data is stored in the app's dedicated data area. You can select a JSON backup destination in Settings to save a synchronized copy through the standard macOS file picker. Language, text size, theme, and progress bar color preferences are also available in Settings.

## Move existing data

To move tasks from the earlier HTML version or another Mac, select **Settings → Export JSON** in the source environment and then **Settings → Import JSON** in the new environment.

## License

Official compiled releases may be used for personal, non-commercial purposes.

Using, copying, modifying, building, redistributing, or commercially exploiting the source code—and redistributing the application itself—requires prior written permission from the copyright holder. See [LICENSE](LICENSE) for the complete terms.
