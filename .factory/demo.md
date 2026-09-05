# Proofbook demo sandbox

Demo URL: <https://checklist-evidence-binder.sociobot.in/demo/>

The **Try it with sample data** link on the first screen opens this route in one
click. The demo immediately shows:

- a completed cold-room opening check signed by Rae Morgan;
- two downloadable evidence text files;
- the next daily cold-room check;
- an overdue weekly fire-exit walk; and
- sample activity and a 365-day retention setting.

The banner **Demo — sample data, nothing is saved** stays present on every demo
view. **Reset demo** rebuilds the original sample in memory. **Start for real**
leaves `/demo/` and opens the real encrypted binder gate.

Demo state is an in-memory `Binder` object. It never calls the IndexedDB vault
save, unlock, import, or erase functions. Reloading `/demo/` creates a fresh
sample. The `@claim:demo-isolation` browser test creates real data first,
compares the encrypted vault before and after demo edits, resets the sample,
and then unlocks the unchanged real binder.
