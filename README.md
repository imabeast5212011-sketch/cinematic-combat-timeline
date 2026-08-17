# Cinematic Combat Timeline

Version 0.1.0 for Foundry VTT v14.

Cinematic Combat Timeline adds a narrow, Final Fantasy X-style visual strip for the current and upcoming combatants. It is a compact display, not a replacement Combat Tracker, Actor sheet, custom HUD, or rules engine.

The module does not change initiative, rounds, turns, Actor resources, Tokens, lighting, chat, sounds, macros, damage, or D&D mechanics. Foundry's Combat document remains authoritative.

## What It Shows

- Current combatant as a slightly larger icon with a small NOW marker.
- Upcoming combatants in Foundry's existing order.
- Optional next-round preview, separated by a small divider.
- Defeated, hidden, hostile, friendly, neutral, and preview states through restrained marks.
- Optional GM-created visual countdown markers.

By default the strip is icon-only and roughly 54-72 CSS pixels wide. Expanded labels are client-controlled and remain compact.

## Combat Order

The module reads the viewed or active encounter through Foundry v14's combat collection:

```js
game.combats.viewed ?? game.combat ?? game.combats.active
```

Actual combatants are read from `combat.turns`. Their order is not recalculated or re-sorted by this module. Ties therefore follow Foundry's existing authoritative order.

Countdown markers are inserted into a derived visual sequence only. They never create Actors, Tokens, Combatants, turns, or initiative updates.

## Countdown Markers

Countdowns are GM-created visual event markers tied to a specific Combat document. Each stores a stable id, name, short label, starting count, current count, initiative position, tie placement, icon, accent color, active state, triggered state, combat id, zero behavior, and processed-round metadata.

Countdowns are stored under this module's Combat flag namespace:

```text
cinematic-combat-timeline.countdowns
```

### Decrement Rule

When combat progresses forward and crosses a countdown's initiative position, the active authoritative GM client decreases that countdown once for that round.

The module listens to Foundry v14's `combatTurnChange` hook, which fires after the database update with prior and current turn history. It compares the prior and current round/turn positions, checks whether the marker position was crossed, and records the processed round before saving the new count.

This means:

- Re-rendering the timeline cannot decrement a countdown.
- Next-round preview rendering cannot decrement a countdown.
- Rewinding does not increase a countdown.
- Rewinding and crossing the same round again does not decrement it again.
- Repeating countdowns reset after reaching zero and then wait for the next valid cycle.

### Tie Placement

If a countdown shares initiative with real combatants, it can be placed before or after all combatants at that initiative. The default is before equal initiative combatants. The same placement is used for display and decrement timing.

### Zero Behaviors

- Remain visible at zero.
- Hide after reaching zero.
- Automatically disable after reaching zero.
- Reset to the starting count for a repeating countdown.

Version 0.1.0 is visual only. Countdown zero does not execute macros, change documents, damage Actors, move Tokens, alter lighting, play audio, or create chat messages.

### Multiple GMs

Only an active GM client may save countdown mutations. When more than one GM is connected, the module deterministically chooses the active GM with the lowest user id as the authoritative countdown mutator. Other clients render state but do not decrement.

## Visibility And Privacy

Hidden combatants respect Foundry-facing visibility rules in this module's markup:

- GMs see the real icon and visible name.
- Players omit hidden combatants by default.
- If the world setting shows hidden combatants anonymously, players receive only the bundled unknown icon and generic labels.
- Anonymous entries do not include the hidden name, image path, initiative, status, disposition, or combatant id in timeline markup.

Countdown privacy is intentionally limited in v0.1.0. Countdown data is stored on the Combat document as module-owned flags, and this module does not treat Combat flags as a secure secret store. For that reason the creation UI saves public countdowns only. This avoids fake GM-only privacy.

## Actor Timeline Icon Configuration

Actor sheets get a Timeline Icon header control. The configuration stores only this module's Actor flag data:

- Timeline icon path.
- Focal X and Y.
- Zoom.
- Horizontal flip.
- Accent color.
- Short timeline name.

The preview uses the same small-frame crop, zoom, flip, object-fit, and frame dimensions as the live timeline.

Combatant icon fallback order:

1. Actor-specific timeline icon.
2. Current Combatant or Token image.
3. Actor portrait.
4. Bundled unknown silhouette.

No source image is modified, cropped, generated, or saved by the module.

## Controls

- Drag the handle to move the strip. Position is saved per client.
- Use the anchor control to cycle upper-left, middle-left, upper-right, and middle-right presets.
- Use scale controls or client settings to resize.
- Use the label toggle for compact expanded labels.
- Collapse to a small button.
- Left-click a visible combatant to select its Token when permitted.
- Shift-click a visible combatant to pan to its Token when permitted.
- Double-click a visible combatant to open its Actor sheet when permitted and the world setting allows it.
- GMs can create or edit countdowns from the timeline.

## Installation

Upload the folder named `cinematic-combat-timeline` to the remote Foundry server's:

```text
Data/modules/
```

After upload, restart Foundry if needed, enable Cinematic Combat Timeline in the world's Manage Modules dialog, then configure module settings from Configure Settings.

No manifest, download, release, or website URL is included in this local build.

## Current Limitations

- Live Foundry testing was not available in this development environment.
- Countdown markers are public only in v0.1.0 because Combat flags are not treated as secure private storage.
- The module does not perform complex collision avoidance with other UI. Use anchors, drag, and scale controls.
- The D&D 5e defeated-state adapter checks common defeated/status surfaces and fails gracefully if the installed system exposes conditions differently.
- ApplicationV2 form behavior and Actor-sheet header-control placement must be verified on the remote v14 server.

## Troubleshooting

- If the strip is offscreen, change the client anchor setting or clear the saved position setting.
- If images fail, check the Foundry file path and permissions. Broken images fall back to the bundled unknown silhouette.
- If players should not see hidden enemies, keep Hidden Combatants set to Omit.
- If countdowns do not decrement, confirm countdowns are enabled, a GM is connected, and combat is advancing forward through Foundry's combat controls.
- If two GMs are connected, only the deterministic authoritative GM mutates countdown state.

## Verification Note

This package received static verification only. It was not launched inside Foundry, and no local Foundry installation was created or modified.
