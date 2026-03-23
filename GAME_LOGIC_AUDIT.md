# Game Logic Audit

## 1. Game speeds up on each pause/unpause (duplicate rAF loops)

**Location:** `App.vue` — `loop()` (line 370) and `unpause_game()` (line 245)

**Problem:** `requestAnimationFrame(loop)` is called unconditionally at the top of `loop()`, so the loop never stops — even when paused. When `unpause_game()` calls `requestAnimationFrame(loop)` again, it spawns a second concurrent loop. Each pause/unpause cycle adds another loop, making the game progressively faster.

**Test plan:**
1. Open the game, note the snake speed
2. Pause (Esc), unpause (Esc) — repeat 5 times
3. **Expected (bug):** Snake visibly moves faster after each cycle
4. **Expected (fix):** Snake speed remains constant

**Solution:** Remove `requestAnimationFrame(loop)` from `unpause_game()` since the loop never stops.

```javascript
// BEFORE
function unpause_game() {
  if (!game_paused) return
  game_paused = false;
  snake.pauses.push(new Date().getTime() - currentPauseStart.getTime())
  currentPauseStart = null;
  requestAnimationFrame(loop);  // BUG: spawns duplicate loop
}

// AFTER
function unpause_game() {
  if (!game_paused) return
  game_paused = false;
  snake.pauses.push(new Date().getTime() - currentPauseStart.getTime())
  currentPauseStart = null;
}
```

---

## 2. 180-degree reversal kills snake on fast input

**Location:** `App.vue` — keydown handler (lines 544-563)

**Problem:** Direction guards check `snake.dx`/`snake.dy` (the *active* direction), not `snake.dxToApply`/`snake.dyToApply` (the *queued* direction). If a player presses two keys within one game tick — e.g. Up then Down while moving Right — the first press queues Up (allowed: `dy === 0`), then the second press queues Down (also allowed: `dy` is still `0` because `flush_queued_move()` hasn't run). Down overwrites Up, and on flush the snake reverses into itself and dies.

**Test plan:**
1. Start the game (snake moves right by default)
2. Press Up and Down in rapid succession (within ~66ms, one game tick at 15fps)
3. **Expected (bug):** Snake immediately reverses downward into its own body and dies
4. **Expected (fix):** The Down press is rejected because Up was already queued

**Solution:** Check queued direction (`dxToApply`/`dyToApply`) instead of active direction.

```javascript
// BEFORE
if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "j") && snake.dx === 0) {
  snake.autoplay = false;
  snake.queue_turn_left();
}
else if ((e.key === "ArrowUp" || e.key === "w" || e.key === "i") && snake.dy === 0) {
  snake.autoplay = false;
  snake.queue_turn_up();
}
else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "l") && snake.dx === 0) {
  snake.autoplay = false;
  snake.queue_turn_right();
}
else if ((e.key === "ArrowDown" || e.key === "s" || e.key === "k") && snake.dy === 0) {
  snake.autoplay = false;
  snake.queue_turn_down();
}

// AFTER
if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "j") && snake.dxToApply === 0) {
  snake.autoplay = false;
  snake.queue_turn_left();
}
else if ((e.key === "ArrowUp" || e.key === "w" || e.key === "i") && snake.dyToApply === 0) {
  snake.autoplay = false;
  snake.queue_turn_up();
}
else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "l") && snake.dxToApply === 0) {
  snake.autoplay = false;
  snake.queue_turn_right();
}
else if ((e.key === "ArrowDown" || e.key === "s" || e.key === "k") && snake.dyToApply === 0) {
  snake.autoplay = false;
  snake.queue_turn_down();
}
```

---

## 3. Score 0 submitted on immediate death

**Location:** `App.vue` — collision handler (line 494)

**Problem:** `ScoreService.saveScore()` fires on every death, including when the player dies immediately without eating any apples (`currentScore.value === 0`). This fills the database with useless zero-score rows.

**Test plan:**
1. Start the game
2. Immediately steer the snake into itself (e.g. press Left while moving Right — if bug #2 is not yet fixed, or wait for it to wrap and collide)
3. Check the network tab for the POST to `/api/score`
4. **Expected (bug):** A request is sent with `score: 0`
5. **Expected (fix):** No request is sent

**Solution:** Guard the save call.

```javascript
// BEFORE
ScoreService.saveScore(username, currentScore.value, timeTakenSeconds);

// AFTER
if (currentScore.value > 0) {
  ScoreService.saveScore(username, currentScore.value, timeTakenSeconds);
}
```

---

## 4. `formatTime` can display "60s"

**Location:** `App.vue` — `formatTime()` (line 99)

**Problem:** `Math.round(totalSeconds % 60)` rounds up to 60 when the fractional part is >= 59.5. For example, `119.7` seconds -> minutes = `Math.floor(119.7/60)` = 1, seconds = `Math.round(59.7)` = 60 -> displays "1m 60s".

**Test plan:**
1. In browser console, call `formatTime(119.7)`
2. **Expected (bug):** Returns "1m 60s"
3. **Expected (fix):** Returns "2m 0s"

**Solution:** Use `Math.floor` and let the seconds stay at 59 max.

```javascript
// BEFORE
let minutes = Math.floor(totalSeconds / 60);
let seconds = Math.round(totalSeconds % 60);

// AFTER
let totalRounded = Math.round(totalSeconds);
let minutes = Math.floor(totalRounded / 60);
let seconds = totalRounded % 60;
```

---

## 5. `snakePositionSet` maintained but never used

**Location:** `App.vue` — `updateGameState()` (lines 434-440) and collision check (line 486)

**Problem:** The set is updated every tick (add head, remove tail), but the actual collision check at line 486 iterates the `cells` array with string comparison. The set is dead weight — wasted memory and CPU each frame.

**Test plan:**
1. Add `console.log(snake.snakePositionSet.size, snake.cells.length)` inside `updateGameState` after the set update
2. Play the game, eat a few apples
3. **Expected (bug):** Both values grow in sync — confirming the set is maintained but never queried for collision
4. After fix: the set no longer exists, collision uses only the array (which is already correct)

**Solution:** Remove all `snakePositionSet` references.

```javascript
// In Snake constructor, REMOVE:
this.snakePositionSet = new Set();

// In updateGameState, REMOVE:
snake.snakePositionSet.add(headPosition);
// and:
snake.snakePositionSet.delete(`${tail.x},${tail.y}`);
```

---

## 6. `createApple()` can stall on near-full board

**Location:** `App.vue` — `createApple()` (lines 106-117)

**Problem:** The function randomly guesses positions until it finds one not on the snake. If the snake is very long (approaching 625 cells on a 25x25 grid), this could spin for a very long time or freeze the tab entirely on a full board.

**Test plan:**
1. Manually set `snake.maxCells = 620` and fill cells array to near capacity
2. Call `createApple()`
3. **Expected (bug):** Function takes a noticeable time or hangs
4. **Expected (fix):** Function returns immediately with a valid position

**Solution:** Compute the set of free positions and pick randomly from that.

```javascript
// BEFORE
function createApple() {
  let newApplePosition;
  do {
    newApplePosition = {
      x: getRandomInt(0, 25) * grid,
      y: getRandomInt(0, 25) * grid
    };
  } while (isAppleOnSnake(newApplePosition));
  return new Apple(newApplePosition.x, newApplePosition.y);
}

// AFTER
function createApple() {
  const occupied = new Set(snake.cells.map(cell => `${cell.x},${cell.y}`));
  const freeCells = [];
  for (let x = 0; x < 25; x++) {
    for (let y = 0; y < 25; y++) {
      const px = x * grid;
      const py = y * grid;
      if (!occupied.has(`${px},${py}`)) {
        freeCells.push({ x: px, y: py });
      }
    }
  }
  if (freeCells.length === 0) return null; // board full — win condition?
  const pos = freeCells[getRandomInt(0, freeCells.length)];
  return new Apple(pos.x, pos.y);
}
```

---

## Implementation Order

Apply fixes in this order to ensure tests fail before each fix and pass after:

| Step | Fix | Files |
|------|-----|-------|
| 1 | Duplicate rAF loop (#1) | `App.vue:245` |
| 2 | 180-degree reversal (#2) | `App.vue:544-563` |
| 3 | Zero-score submission (#3) | `App.vue:494` |
| 4 | formatTime "60s" (#4) | `App.vue:99` |
| 5 | Remove dead snakePositionSet (#5) | `App.vue:260,436,440` |
| 6 | createApple stall (#6) | `App.vue:106-117` |
