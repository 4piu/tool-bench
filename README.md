# ToolBench
Just a web page of some handy utilities

## Stack

- Bun
- Vite
- React 19
- TypeScript
- Tailwind CSS
- MUI 9

## Development

```sh
bun install --ignore-scripts
bun run dev
```

## Build

```sh
bun run typecheck
bun run build
```

The active app is written in TypeScript and uses MUI's modern `sx` styling. Some legacy source files remain parked in the repo for reference, but they are no longer part of the Vite runtime path.

## Adding Tools

Tools are modular and lazy-loaded:

1. Create a new component under `src/tools/<tool-name>/<ToolName>Tool.tsx`.
2. Reuse shared browser helpers from `src/tools/shared/browser.ts`.
3. Reuse `ToolSurface`, `ToolHeader`, and `ActionRow` from `src/tools/shared/ToolScaffold.tsx`.
4. Register metadata and a dynamic import in `src/tools/registry.tsx`.

Only the registry metadata ships on initial page load. Tool implementation code is loaded when the user opens that tool.
