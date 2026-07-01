# Tool Feature Gap Notes

This compares the original legacy tools in `src/components/tools/` with the rewritten modular tools in `src/tools/`.

The rewrite intentionally simplified the app shell and tool implementations. The result is easier to maintain and lazy-loads tool code, but several original features were removed or reduced. This note tracks what was lost and what is worth restoring.

## Implementation Summary - 2026-06-24

### Restored In Current Pass

- Cross-tool:
  - Added `useLocalStorageState` for persistent tool preferences.
  - Added reusable `CopyButton`, `DownloadButton`, and copy success feedback.
  - Added URL-addressable hash routing such as `#/json`, `#/dns`, and `#/qr`.
  - Added search/filter on the home tool grid.
  - Removed legacy `src/components` and `src/utils` after the rewrite replaced them.
- UUID:
  - Restored v1, v3, v4, and v5 generation.
  - Added UUID v7 generation.
  - Restored namespace/name inputs and common namespace presets for v3/v5.
  - Added lines, JSON array, and CSV output modes.
  - Restored persisted settings.
- Password:
  - Restored uppercase/lowercase/digit/symbol toggles.
  - Restored avoid-confusing-characters option.
  - Added batch generation and entropy estimate.
  - Added passphrase generation with word count, separator, capitalization, and digit suffix controls.
  - Restored persisted settings.
- Base64:
  - Added URL-safe Base64 mode.
  - Added explicit copy/download controls for both plain text and Base64.
  - Added file-to-Base64 and Base64-to-file support.
  - Added persisted input and URL-safe setting.
- JSON:
  - Restored indent selector: 2, 3, 4, tab.
  - Restored download output.
  - Added recursive object-key sorting.
  - Added JSON validation, JSON Pointer query mode, and lightweight `$` path query mode.
  - Added simple JSON diff summary mode.
  - Added copy pretty and copy compact actions.
  - Added persisted input/options.
- Timestamp:
  - Restored reverse timestamp-to-date conversion.
  - Restored output format selector: Locale, ISO-8601, RFC-1123.
  - Added timezone offset selector and millisecond timestamp mode.
  - Added Now quick action.
  - Added persisted inputs/options.
- QR Code:
  - Restored output format selector: SVG, PNG, JPG, WEBP.
  - Restored error correction, foreground/background color, margin, scale, and quality controls.
  - Added URL, Wi-Fi, email, SMS, and vCard preset builders.
  - Fixed empty download `href` warning by omitting the link until output exists.
  - Restored persisted settings.
- DNS Lookup:
  - Restored DoH provider selector and custom DoH URL.
  - Restored GET/POST method selection.
  - Restored DNS class selector.
  - Restored advanced record type toggle.
  - Added structured answer table, raw DNS message toggle, and batch lookup.
  - Added resolver latency display.
  - Added persisted settings.
- File Hash:
  - Restored drag-and-drop file add.
  - Restored worker concurrency selector.
  - Restored per-file algorithm override.
  - Added copy hash plus JSON and CSV export.
  - Added `ALL` mode for multi-algorithm hashing in one streamed file pass.
  - Restored persisted default algorithm/concurrency.
- User Agent:
  - Restored navigator details table.
  - Restored UA examples tab.
  - Added copy-as-JSON.
  - Added parsed UA summary and UA reduction/privacy note.
- Sound Wave:
  - Restored waveform selector.
  - Restored volume control.
  - Restored direct frequency input.
  - Restored linear/log frequency slider option.
  - Added note presets, stereo pan, ADSR envelope controls, and waveform preview.
  - Restored persisted settings.

### Still Worth Doing

- Cross-tool:
  - Add reusable multi-document tabs for text tools.
  - Add a shared async task/cancellation hook.
- Password:
  - Add stronger password policy controls.
- JSON:
  - Add full JSONPath/JMESPath query mode.
- QR Code:
  - Add logo embedding.
- File Hash:
  - Add per-file cancellation and progress for very large files.
- User Agent:
  - Add richer UA parsing library or parser table.
- Sound Wave:
  - Add live audio analyser visualizer.

## Cross-Tool Gaps

### Removed

- Per-tool `localStorage` persistence for user preferences and active tabs.
- Multi-tab editing workflows from `MyDynamicTab` for Base64 and JSON.
- Consistent copy/download success feedback.
- Some validation and helper text from the old forms.
- Legacy app search/navigation behavior.

### Suggested Restores

- Add a shared `useLocalStorageState` hook for each tool's settings.
- Add a shared `CopyButton` with temporary "Copied" state.
- Add a shared `DownloadButton` helper for text/data URLs.
- Add optional multi-document tabs as a reusable tool-shell feature.
- Add URL-addressable tools, e.g. `/#/json` or `/tool/json`, so direct links work.

## UUID

### Current Rewrite

- Generates batches of UUID v4.
- Supports count, copy, and download.

### Removed From Original

- UUID v1 generation.
- UUID v3 and v5 deterministic namespace/name generation.
- Namespace input and UUID namespace validation.
- Name input for v3/v5.
- Saved settings via `localStorage`.
- Output threshold behavior that encouraged download for large batches.
- Visual loading/progress state.

### Restore Candidates

- Add validation and inline examples.

## Password

### Current Rewrite

- Generates one password using Web Crypto.
- Supports length and optional symbols.
- Supports copy and download.

### Removed From Original

- Character class toggles for uppercase, lowercase, digits, symbols.
- "Allow confusing characters" option.
- Saved settings via `localStorage`.
- Input validation for minimum length and at least one character class.
- Explicit CSPRNG toggle.
- Copy success feedback.

### Restore Candidates

- Restore per-character-class toggles.
- Restore "avoid confusing characters".
- Add entropy estimate and strength label.
- Add batch password generation.
- Add "must include at least one from each selected class".

## Base64

### Current Rewrite

- Two-pane UTF-8 text/base64 encode-decode.
- Live conversion and malformed-input feedback.

### Removed From Original

- Multi-tab workspace.
- Saved tabs/state via `localStorage`.
- Copy focused side.
- Download focused side.
- Close-all-tabs behavior.

### Restore Candidates

- Restore tabbed inputs for multiple conversions.
- Add explicit copy/download buttons for each side.
- Add URL-safe Base64 mode.
- Add Base64URL padding toggle.
- Add encoding selector: UTF-8, ASCII, bytes/hex.

## JSON

### Current Rewrite

- Formats or minifies JSON.
- Shows parse error and supports copying output.

### Removed From Original

- Multi-tab workspace.
- Saved tabs/state via `localStorage`.
- Indent selector: 2, 3, 4, tab.
- Download output.
- Mode stored per tab.
- Live transform behavior tied to selected mode.
- Close-all-tabs behavior.

### Restore Candidates

- Restore indent selector.
- Restore download output.
- Add JSON validation-only mode.
- Add sort keys option.
- Add JSONPath/JMESPath query mode.
- Add full JSONPath/JMESPath query mode.

## Timestamp

### Current Rewrite

- Converts browser-local `datetime-local` input to Unix timestamp.
- Shows ISO equivalent.
- Supports copy timestamp.

### Removed From Original

- Date/time picker UI.
- Seconds selector.
- Timezone offset selector.
- Live ticking current time.
- Reverse timestamp-to-string converter.
- Output formats: ISO-8601, RFC-1123, Locale.
- Copy formatted time string.

### Restore Candidates

- Restore two-way conversion: date to timestamp and timestamp to date.
- Restore output format selector.
- Add relative time display, e.g. "3 hours ago".
- Add "now" and "start/end of day" quick actions.

## QR Code

### Current Rewrite

- Generates PNG QR code for text.
- Supports downloading PNG.

### Removed From Original

- Output format selector: SVG, PNG, JPG, WEBP.
- Error correction level selector.
- Image quality slider for lossy formats.
- Foreground/background color controls.
- Margin control.
- Scale control.
- Hex color validation.
- Click-image-to-download behavior.
- Saved settings via `localStorage`.

### Restore Candidates

- Restore format selector, especially SVG.
- Restore error correction level.
- Restore foreground/background color pickers.
- Restore margin/size controls.
- Add logo/embed image option.
- Add downloadable filename input.

## DNS Lookup

### Current Rewrite

- Queries DNS over HTTPS using Cloudflare.
- Supports record types: A, AAAA, CNAME, MX, NS, TXT, CAA.
- Displays raw JSON result.

### Removed From Original

- Large DoH server list.
- Server URL setting with autocomplete.
- GET/POST method selection.
- DNS class selector: IN, CS, CH, HS, ANY.
- More record types: DNAME, DNSKEY, DS, HINFO, NSEC, NSEC3, NULL, PTR, RP, RRSIG, SOA, SRV.
- Settings dialog.
- Saved DoH method/server via `localStorage`.
- Domain and server URL validation.
- Enter-to-search behavior.
- Reset input button.
- Structured answer tables.

### Restore Candidates

- Restore DoH provider selector.
- Restore advanced record types behind an "Advanced" section.
- Add resolver latency display.
- Add DNSSEC-related display helpers.
- Add export results as JSON.

## File Hash

### Current Rewrite

- Adds files.
- Hashes all files sequentially in a Web Worker.
- Supports MD5, SHA-1, SHA-256, SHA-512.
- Displays result per file.

### Removed From Original

- Per-file start/stop controls.
- Start all / stop all queue controls.
- Worker pool concurrency selector.
- Default algorithm persistence.
- Per-file algorithm selector.
- Queued/processing/done status model.
- Drag-and-drop file box.
- Automatic default pool size from `navigator.hardwareConcurrency`.

### Restore Candidates

- Restore drag-and-drop.
- Restore per-file status and cancellation.
- Restore concurrency setting.
- Restore per-file algorithm override.
- Add copy hash button per file.
- Add CSV/JSON export for all hashes.
- Add progress display for very large files.

## User Agent

### Current Rewrite

- Displays current `navigator.userAgent`.
- Supports copy.

### Removed From Original

- "My UA" detail table.
- UA examples grouped by browser.
- Navigator fields beyond `userAgent`, including platform, language, cookies, online status, hardware concurrency, device memory, touch points, and do-not-track.
- Tabbed "My UA" vs "UA Example" interface.

### Restore Candidates

- Restore navigator details table.
- Restore sample UA library.
- Add Client Hints display via `navigator.userAgentData` where available.
- Add parsed UA summary.
- Add copy as JSON.
- Add privacy note explaining UA reduction and browser limitations.

## Sound Wave

### Current Rewrite

- Plays/stops a sine tone.
- Supports frequency slider.

### Removed From Original

- Waveform selector: sine, square, triangle, sawtooth.
- Volume control.
- Settings dialog.
- Linear vs perceptual/nonlinear frequency slider option.
- Direct frequency input.
- Saved waveform/frequency/settings via `localStorage`.
- Mute/unmute behavior.

### Restore Candidates

- Restore waveform selector.
- Restore volume slider.
- Restore frequency number input.
- Restore logarithmic/perceptual scale toggle.
- Add musical note presets.
- Add stereo pan control.
- Add ADSR envelope controls for less clicky playback.
- Add live audio analyser visualizer.

## Tooling / Architecture Suggestions

- Add `src/tools/<tool>/metadata.tsx` if tool metadata grows large.
- Keep each tool implementation lazy-loaded with `loader: () => import("./tool/Tool")`.
- Use shared hooks:
  - `useLocalStorageState`
  - `useClipboard`
  - `useAsyncTask`
  - `useDownload`
- Add a test/smoke page that imports only the registry and verifies every loader resolves.
- Consider grouping heavy dependencies into their tool chunks only, as QR/DNS/hash now do.

