import { describe, test, expect } from 'vitest';
import {
  Snake,
  Apple,
  formatTime,
  createApple,
  canTurn,
  shouldSubmitScore,
  getRandomInt,
  GRID_SIZE,
  GRID_COUNT,
  SNAKE_INITIAL_LENGTH,
} from '../engine.js';

describe('formatTime', () => {
  test('formats whole seconds correctly', () => {
    expect(formatTime(0)).toBe('0m 0s');
    expect(formatTime(30)).toBe('0m 30s');
    expect(formatTime(60)).toBe('1m 0s');
    expect(formatTime(90)).toBe('1m 30s');
    expect(formatTime(3600)).toBe('60m 0s');
  });

  test('does not display 60 seconds (bug #4)', () => {
    // Math.round(59.7) = 60, so formatTime(119.7) returns "1m 60s"
    expect(formatTime(119.7)).not.toContain('60s');
    expect(formatTime(119.7)).toBe('2m 0s');
  });

  test('handles edge case at 59.5 seconds', () => {
    // 59.5 rounds to 60 with Math.round
    expect(formatTime(59.5)).toBe('1m 0s');
  });
});

describe('Snake', () => {
  test('initializes with correct defaults', () => {
    const snake = new Snake(160, 160, GRID_SIZE);
    expect(snake.x).toBe(160);
    expect(snake.y).toBe(160);
    expect(snake.dx).toBe(GRID_SIZE);
    expect(snake.dy).toBe(0);
    expect(snake.maxCells).toBe(SNAKE_INITIAL_LENGTH);
    expect(snake.cells).toEqual([]);
    expect(snake.autoplay).toBe(false);
  });

  test('increase_length increments maxCells', () => {
    const snake = new Snake(160, 160, GRID_SIZE);
    snake.increase_length();
    expect(snake.maxCells).toBe(SNAKE_INITIAL_LENGTH + 1);
  });

  test('move updates position by velocity', () => {
    const snake = new Snake(0, 0, GRID_SIZE);
    snake.move();
    expect(snake.x).toBe(GRID_SIZE);
    expect(snake.y).toBe(0);
  });

  test('flush_queued_move applies queued direction', () => {
    const snake = new Snake(0, 0, GRID_SIZE);
    snake.queue_turn_down();
    expect(snake.dx).toBe(GRID_SIZE); // not yet applied
    snake.flush_queued_move();
    expect(snake.dx).toBe(0);
    expect(snake.dy).toBe(GRID_SIZE);
  });

  test('calculateGradient returns valid rgba string', () => {
    const snake = new Snake(0, 0, GRID_SIZE);
    const color = snake.calculateGradient(0, [0, 0, 0], [255, 255, 255]);
    expect(color).toMatch(/^rgba\(\d+, \d+, \d+, 1\)$/);
  });
});

describe('canTurn — direction guard (bug #2)', () => {
  test('allows valid turn from horizontal to vertical', () => {
    const snake = new Snake(160, 160, GRID_SIZE);
    // Moving right: dx=20, dy=0
    expect(canTurn(snake, 'up')).toBe(true);
    expect(canTurn(snake, 'down')).toBe(true);
    expect(canTurn(snake, 'left')).toBe(false);
    expect(canTurn(snake, 'right')).toBe(false);
  });

  test('allows valid turn from vertical to horizontal', () => {
    const snake = new Snake(160, 160, GRID_SIZE);
    snake.queue_turn_up();
    snake.flush_queued_move();
    // Now moving up: dx=0, dy=-20
    expect(canTurn(snake, 'left')).toBe(true);
    expect(canTurn(snake, 'right')).toBe(true);
    expect(canTurn(snake, 'up')).toBe(false);
    expect(canTurn(snake, 'down')).toBe(false);
  });

  test('prevents 180-degree reversal within one tick', () => {
    const snake = new Snake(160, 160, GRID_SIZE);
    // Moving right: dx=20, dy=0, dxToApply=20, dyToApply=0
    expect(canTurn(snake, 'up')).toBe(true);
    snake.queue_turn_up();
    // Queued: dxToApply=0, dyToApply=-20
    // But dx/dy still = 20/0 (not flushed yet)

    // Trying to reverse the queued direction should be blocked
    expect(canTurn(snake, 'down')).toBe(false);
  });

  test('prevents reversal: queue left then right', () => {
    const snake = new Snake(160, 160, GRID_SIZE);
    snake.queue_turn_up();
    snake.flush_queued_move();
    // Moving up: dx=0, dy=-20
    expect(canTurn(snake, 'left')).toBe(true);
    snake.queue_turn_left();
    // Queued left: dxToApply=-20, dyToApply=0
    // Trying right should be blocked
    expect(canTurn(snake, 'right')).toBe(false);
  });
});

describe('createApple', () => {
  test('creates apple at valid grid position', () => {
    const snake = new Snake(0, 0, GRID_SIZE);
    snake.cells = [{ x: 0, y: 0 }];
    const apple = createApple(snake, GRID_SIZE, GRID_COUNT);
    expect(apple).toBeInstanceOf(Apple);
    expect(apple.x % GRID_SIZE).toBe(0);
    expect(apple.y % GRID_SIZE).toBe(0);
  });

  test('does not place apple on snake', () => {
    const snake = new Snake(0, 0, GRID_SIZE);
    snake.cells = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 40, y: 0 },
    ];
    // Run many times to increase confidence
    for (let i = 0; i < 50; i++) {
      const apple = createApple(snake, GRID_SIZE, GRID_COUNT);
      const onSnake = snake.cells.some(c => c.x === apple.x && c.y === apple.y);
      expect(onSnake).toBe(false);
    }
  });

  test('returns null on full board (bug #6)', () => {
    const snake = new Snake(0, 0, GRID_SIZE);
    snake.cells = [];
    for (let x = 0; x < GRID_COUNT; x++) {
      for (let y = 0; y < GRID_COUNT; y++) {
        snake.cells.push({ x: x * GRID_SIZE, y: y * GRID_SIZE });
      }
    }
    // Current buggy code would infinite loop here
    const apple = createApple(snake, GRID_SIZE, GRID_COUNT);
    expect(apple).toBeNull();
  }, 3000); // 3 second timeout — if it hangs, the bug is confirmed
});

describe('shouldSubmitScore (bug #3)', () => {
  test('rejects zero score', () => {
    expect(shouldSubmitScore(0)).toBe(false);
  });

  test('accepts positive score', () => {
    expect(shouldSubmitScore(1)).toBe(true);
    expect(shouldSubmitScore(100)).toBe(true);
  });
});

describe('getRandomInt', () => {
  test('returns values within range', () => {
    for (let i = 0; i < 100; i++) {
      const val = getRandomInt(0, 10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
    }
  });
});
