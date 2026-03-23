// Game constants
export const GRID_SIZE = 20;
export const GRID_COUNT = 25;
export const SNAKE_INITIAL_LENGTH = 4;
export const SNAKE_BODY_GRADIENT = { start: [24, 87, 39], end: [15, 54, 24] };

// get random whole numbers in a specific range
// @see https://stackoverflow.com/a/1527820/2124254
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function formatTime(totalSeconds) {
  let totalRounded = Math.round(totalSeconds);
  let minutes = Math.floor(totalRounded / 60);
  let seconds = totalRounded % 60;

  return `${minutes}m ${seconds}s`;
}

export class Snake {
  constructor(x, y, grid) {
    this.x = x;
    this.y = y;
    this.grid = grid;
    this.dx = grid;
    this.dy = 0;
    this.dxToApply = grid;
    this.dyToApply = 0;
    this.cells = [];

    this.maxCells = SNAKE_INITIAL_LENGTH;
    this.autoplay = false;
    this.birthDatetime = new Date();
    this.pauses = [];
  }

  queue_turn_left() {
    this.dxToApply = -this.grid;
    this.dyToApply = 0;
  }
  queue_turn_right() {
    this.dxToApply = this.grid;
    this.dyToApply = 0;
  }
  queue_turn_up() {
    this.dyToApply = -this.grid;
    this.dxToApply = 0;
  }
  queue_turn_down() {
    this.dyToApply = this.grid;
    this.dxToApply = 0;
  }

  move() {
    this.x += this.dx;
    this.y += this.dy;
  }

  flush_queued_move() {
    this.dx = this.dxToApply;
    this.dy = this.dyToApply;
  }

  increase_length() {
    this.maxCells++;
  }

  calculateGradient(i, firstColor, secondColor) {
    const step = i / (this.maxCells - 1);
    const r = Math.round(
      firstColor[0] + (secondColor[0] - firstColor[0]) * step
    );
    const g = Math.round(
      firstColor[1] + (secondColor[1] - firstColor[1]) * step
    );
    const b = Math.round(
      firstColor[2] + (secondColor[2] - firstColor[2]) * step
    );

    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  doOptimalMove(x, y) {
    const grid = GRID_SIZE;
    x = x / grid;
    y = y / grid;

    if (y === 0) {
      if (this.dy === -20) {
        this.queue_turn_right();
      } else if (this.dx === -20) {
        this.queue_turn_down();
      } else {
        this.queue_turn_down();
      }
    } else if (y === GRID_COUNT - 1) {
      if (this.dx === -20) {
        this.queue_turn_up();
      } else if (this.dy === 20) {
        this.queue_turn_right();
      } else {
        this.queue_turn_up();
      }
    } else if (this.dx === 20) {
      this.queue_turn_down();
    }
  }
}

export class Apple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// Create a new apple at a random position not occupied by the snake
export function createApple(snake, gridSize, gridCount) {
  const occupied = new Set(snake.cells.map(cell => `${cell.x},${cell.y}`));
  const freeCells = [];
  for (let x = 0; x < gridCount; x++) {
    for (let y = 0; y < gridCount; y++) {
      const px = x * gridSize;
      const py = y * gridSize;
      if (!occupied.has(`${px},${py}`)) {
        freeCells.push({ x: px, y: py });
      }
    }
  }
  if (freeCells.length === 0) return null;
  const pos = freeCells[getRandomInt(0, freeCells.length)];
  return new Apple(pos.x, pos.y);
}

/**
 * Check if the snake can turn in the given direction.
 * directions: 'left', 'right', 'up', 'down'
 */
export function canTurn(snake, direction) {
  switch (direction) {
    case 'left':
    case 'right':
      return snake.dxToApply === 0;
    case 'up':
    case 'down':
      return snake.dyToApply === 0;
    default:
      return false;
  }
}

/**
 * Check if a score should be submitted (non-zero).
 */
export function shouldSubmitScore(score) {
  return score > 0;
}
