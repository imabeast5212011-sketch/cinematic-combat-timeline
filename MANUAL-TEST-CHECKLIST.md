# Manual Remote-Server Test Checklist

Use this checklist after uploading `cinematic-combat-timeline` to the remote Foundry v14 server and enabling it in a D&D 5e world.

## Ordinary Tracker

- Start combat.
- End combat.
- Advance turns.
- Advance rounds.
- Change initiative.
- Add combatants.
- Remove combatants.
- Defeat combatants.
- Restore defeated combatants.
- Check hidden enemy behavior as GM.
- Check hidden enemy behavior as player with hidden combatants omitted.
- Check hidden enemy behavior as player with anonymous hidden combatants.
- Change active Scene.
- Switch active or viewed Combat when multiple combats exist.
- Confirm Actor-specific timeline icon fallback.
- Confirm Token image fallback.
- Confirm Actor portrait fallback.
- Confirm bundled fallback for missing image paths.
- Check square portraits.
- Check tall portraits.
- Check wide portraits.
- Check transparent PNG or WebP artwork.
- Check animated Token formats supported by the server.
- Drag the tracker and reload the browser.
- Resize the viewport.
- Change browser zoom.
- Open and close the sidebar.
- Toggle hotbar visibility.
- Enable browser reduced-motion preference.
- Enable the module's reduced-animation client setting.
- Check permission differences for Token selection.
- Check permission differences for Actor sheet opening.
- Confirm duplicate tracker prevention after refresh.
- Confirm no console errors.
- Observe the same combat order from two connected clients.

## Countdown Markers

- Create a countdown before combat starts.
- Create a countdown during combat.
- Place a countdown above all initiatives.
- Place a countdown below all initiatives.
- Tie a countdown before a combatant.
- Tie a countdown after a combatant.
- Create multiple countdowns at the same initiative.
- Confirm a countdown decrements exactly once per valid cycle.
- Skip forward across turns.
- Advance directly to a new round.
- Rewind within the round.
- Rewind to an earlier round.
- Refresh before the countdown initiative is reached.
- Refresh after the countdown initiative is reached.
- Connect two GMs.
- Disconnect the authoritative GM and confirm authority handoff.
- Attempt countdown modification as a player.
- Change countdown initiative mid-combat.
- Change countdown count manually.
- Disable and re-enable a countdown.
- Reset a countdown.
- Delete a countdown.
- Trigger a countdown at zero.
- Confirm remain-visible zero behavior.
- Confirm hide-after-zero behavior.
- Confirm disable-after-zero behavior.
- Confirm repeating zero behavior.
- Confirm next-round preview never decrements a countdown.
- Confirm combat reset behavior.
- Confirm combat end and restart behavior.
- Confirm countdown privacy limitation: v0.1.0 countdowns are public only.
- Confirm no duplicate decrement after re-renders.
- Confirm no duplicate decrement after reconnects.

## Actor Configuration

- Open an Actor sheet.
- Open the Timeline Icon configuration.
- Set a custom icon path.
- Adjust focal X.
- Adjust focal Y.
- Adjust zoom.
- Toggle horizontal flip.
- Set an accent color.
- Set a short timeline name.
- Confirm the small preview matches the live timeline crop.
- Clear the Actor timeline configuration.

## Settings

- Disable and re-enable the module.
- Change hidden combatant policy.
- Toggle next-round preview world permission.
- Change maximum displayed entries.
- Toggle Actor sheet opening.
- Toggle countdown markers.
- Toggle player visibility for public countdowns.
- Change default countdown zero behavior.
- Toggle client timeline display.
- Change anchor.
- Change scale.
- Change visible entry count.
- Toggle expanded labels.
- Toggle client reduced animation.
- Toggle collapse when inactive.
- Toggle preferred Token image fallback.
