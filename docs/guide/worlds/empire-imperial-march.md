# The Imperial March

**Zone role:** Empire heartland, marching route toward the capital, fortified corridor map.

**Design promise:** A disciplined, ordered landscape where the player moves through
 Empire strength: patrols, checkpoints, supply depots, and a capital city skyline
 visible on the horizon. The same geometry supports two fantasies: infiltrate the
 march as a fugitive, or assault it as a rebel faction.

## Lore

The Imperial March begins at the Iron Gate in the west, where the road crosses
the River Sorn, and ends at the capital's outer wall twelve miles distant. The
Emperor built it not for war but for control: straight lines for rapid troop
movement, mile markers for dispatch riders, and fortified inns for garrisons.

Over the years, the road became the spine of imperial power. Towns sprouted at
each milestone, each with its own garrison, tax office, and drill yard. Forest
elves avoided the march entirely; the mountains watched it from afar. Even when
the war began, the March held — because the Emperor held the road.

Now the road is a frontline. Deserters hide in the drainage ditches. Bandits
strike supply wagons at dusk. Forest elf scouts follow the March only when they
need to cross toward the capital. The garrisons are fewer, the drills less
frequent, but the road's straightness makes no place to hide.

## Mood and visual language

- Stone road, white gravel shoulders, precise shadow lines, grey-green-grey
  brick, iron-grey metalwork.
- Horizon landmarks are all architectural: gate towers,mile markers, capital
  wall segments, church spires.
- The map must feel ordered without being boring: straight roads, right-angle
  turns, perfectly aligned buildings.
- Empire props should feel industrial and durable: iron fittings, cast stone,
  functional geometry.

## Player-facing flow

1. Start at the Iron Gate with the capital visible on the horizon.
2. Choose between the guarded main road, the parallel drainage ditch route, or
   the elevated rail embankment flank.
3. Fight, sneak past, or bribe through three garrison checkpoints.
4. Reach the capital's outer wall and decide whether to press toward the inner
   district, find a smuggler route, or hold a position for reinforcement.

## 20-by-20 text map

Each row contains 20 cells. North is row 01, west is column 01.

| Symbol | Meaning |
| ------ | ------- |
| `R` | Imperial March road |
| `G` | Gravel shoulder |
| `W` | River Sorn (west, off-map) |
| `S` | Capital direction (east, off-map) |
| `X` | Iron Gate / western entrance |
| `.` | Open grass or cultivated field |
| `B` | Brick garrison building |
| `T` | Drill yard / parade ground |
| `F` | Supply depot / warehouse |
| `D` | Drainage ditch / alternate route |
| `E` | Rail embankment flank |
| `C` | Capital outer wall |
| `H` | Church spire landmark |

| Row | 20-cell map |
| --- | ----------- |
| 01 | `W................CCS` |
| 02 | `W.............BB.CCS` |
| 03 | `W...........GG..CC.S` |
| 04 | `W........GG.TT..CC.S` |
| 05 | `W......XX..GG..FFF.S` |
| 06 | `W......XX..GG..FFF.S` |
| 07 | `.......X....D..B..SS` |
| 08 | `.......X....D..B..SS` |
| 09 | `.......D............SS` |
| 10 | `.......D............SS` |
| 11 | `......D..F...HH.....SS` |
| 12 | `......D..F...HH.....SS` |
| 13 | `.....D...F..........SS` |
| 14 | `.....D..............SS` |
| 15 | `....D..B..T..T..BB.SSS` |
| 16 | `....D..B..T..T..BB.SSS` |
| 17 | `....GG..GG........SSSS` |
| 18 | `....GG..GG...X......SS` |
| 19 | `....GG..GG...X......SS` |
| 20 | `....GG..GG...XXX...SSS` |

## Landmark briefs

| Landmark | Player use | Implementation notes |
| -------- | ---------- | -------------------- |
| Iron Gate (X) | Western spawn, primary checkpoint | Build as twin towers with drawbridge mechanism; guards check papers and货物. |
| Church spire (H) | Mid-map navigation landmark, possible turret | Tall silhouette visible from Iron Gate; can serve as sniper perch. |
| Supply depot (F) | Loot objective, cover anchor | Warehouse buildings with stacked crates; later becomes a faction objective. |
| Drill yard (T) | Combat arena, patrol starting point | Open square for group fights; guards train here during peace. |
| Capital outer wall (C) | Eastern boundary, expansion limit | Tall stone wall with gates; no interior required for first version. |
| Drainage ditch (D) | Stealth route, flank path | Trenches under hedges; readable as terrain without requiring climb. |
| Rail embankment (E) | Elevated flank, vertical route | Raised path above road; camera tests needed for height difference. |

## Faction pressure

| Faction | Presence | Behavior |
| ------- | -------- | -------- |
| Empire garrison | Patrol road, guard buildings, drill yard | Regular patrols, checkpoint stops, call reinforcements if attacked. |
| Human townsfolk | Buildings, market stalls, farms | Civilians flee combat; later rumor and reward source. |
| Forest Elves | Rare scout along ditch or embankment | Observes from range, retreats if spotted; no direct engagement. |
| Deserters | Drainage ditch, abandoned outposts | Hide in cover, ambush lone players, flee at first sign of force. |

## Encounter set pieces

- **Iron Gate first contact:** player must pass through checkpoint or find a
  side route; guards demand papers or refuse entry.
- **Drainage ditch ambush:** two deserters hide in the ditch and attack from
  low angle; a third watches from the embankment.
- **Drill yard confrontation:** the player interrupts a drill, turning trainees
  and instructors into a three-wave fight.
- **Supply depot raid:** warehouse guards defend crates; loot is high-value but
  attracts garrison reinforcements.
- **Church spire scout:** an Empire sniper watches from above; climbing it
  reveals a map marker for capital defenses.

## Traversal and camera notes

- Keep the main road at least 5 meters wide in gameplay scale so patrols, wagons,
  and the player can share it comfortably.
- Gravel shoulders should be walkable but slower than the road; use visual
  texture change, not mechanical cost.
- Drainage ditches should be readable as linear terrain features without
  requiring climb mechanics; hidden collision rails prevent true falls.
- Church spire and rail embankment are optional vertical beats; the first
  greybox can keep them as blocked props.
- Capital wall should be tall enough to feel imposing but allow easy jump or
  ledge to breach.

## Streaming and save notes

- Suggested cells: `empire_iron_gate`, `empire_drainage`, `empire_supply_depot`,
  `empire_drill_yard`, `empire_spire`, `empire_capital_wall`.
- Save payload should track checkpoint status: papers inspected, wanted level,
  garrison alert state, and which warehouses were raided.
- Later reputation flags can attach to the march: Empire wanted level, town
  merchant trust, deserters' hiding spots revealed.

## Asset list

| Asset | Priority | Notes |
| ----- | -------- | ----- |
| Iron Gate towers and drawbridge | High | Main zone identity and western entrance. |
| Brick wall and building kit | High | Core visual identity; uniform geometry. |
| Empire soldier (enemy) | High | Primary NPC; see `empire-soldier.glb`. |
| Supply crates and warehouse props | Medium | Lootable, stackable silhouettes. |
| Church architecture kit | Medium | Spire as landmark; interior optional. |
| Drill yard props | Low | Training dummies, practice weapons. |
| Rail embankment terrain | Low | Optional vertical route; can share with forest. |

## Open implementation questions

- Should the Iron Gate be a combat arena from the start, or a puzzle that can be
  avoided via ditch/embankment?
- Do captured checkpoints reset to Empire control after a time, or stay
  liberated until the next patrol wave?
- How should the capital wall handle future expansion: locked gate for now,
  or a breach point with debris and rubble?
