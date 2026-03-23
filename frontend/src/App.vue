<template>
  <Alert v-show="isAlertShown" :text="alertText"></Alert>

  <div class="parent">
    <div class="left-side-container child">
      <div class="username-container" style="width: inherit;">
        <img src="/user.svg" class="user-icon" width="25px">
        <div class="username-text">{{ username }}</div>
      </div>
      <div class="score-container" style="height: 200px; ">
        <div class="score" id="current-score">
          <Score title="Score" :score=currentScore></Score>
        </div>
        <div class="score" id="personal-best" style="margin-top: 20px;">
          <Score title="Personal Best" :score="personalBest"></Score>
        </div>
      </div>
      <div class="instruction-container">Instructions:<div v-for="(instruction, index) in instructions"> {{ index + 1 }}.
          {{
            instruction
          }}
        </div>
      </div>

    </div>


    <div class="child game-container">
      <canvas width="500" height="500" id="game"></canvas>
    </div>
    <div class="leaderboard-container child">
      <table id="leaderboard">
        <thead>
          <tr>
            <th>Username</th>
            <th>Score</th>
            <th>Scored At</th>
            <th>Time Taken</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(score, index) in topScores" :class="{ 'champion': index === 0 }">
            <td :class="{ 'no-bottom': index === topScores.length - 1 }">
              <div style="display: flex; align-items: center;">
                <img src="/crown.svg" width="25px" v-if="index === 0">
                <div width="20px" v-else style="width: 20px;"></div>

                <div>{{ truncateText(score.username) }}</div>
                <!-- <div>ssdddddddddddddddddds</div> -->
              </div>
            </td>
            <td :class="{ 'no-bottom': index === topScores.length - 1 }">{{ score.score }}</td>
            <td :class="{ 'no-bottom': index === topScores.length - 1 }">{{ new
              Date(score.scoredAt).toLocaleString("en-UK", {
                hour12: true, year: "2-digit",
                month: "2-digit", day: "2-digit", hour: "numeric", minute: "numeric"
              }) }}
            </td>
            <td :class="{ 'no-bottom': index === topScores.length - 1 }">{{ formatTime(score.timeTakenSeconds) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from "vue";
import ScoreService from "./services/ScoreService";
import Score from './components/Score.vue'
import Alert from "./components/Alert.vue";


const instructions = ref(["Move with arrow keys/WASD/IJKL", "Eat the 404", "Don't touch your tail", "Pause/Unpause with Esc"])

function truncateText(text) {
  const maxLength = 10
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + '...';
  } else {
    return text;
  }
}

const topScores = ref([]);

const personalBest = ref(0);

const currentScore = ref(0);

function formatTime(totalSeconds) {
  // const hours = Math.floor(timeTaken / 3600);
  // const minutes = Math.floor((timeTaken % 3600) / 60);
  // const seconds = timeTaken % 60;

  // return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  let minutes = Math.floor(totalSeconds / 60);
  let seconds = Math.round(totalSeconds % 60);

  return `${minutes}m ${seconds}s`;
}


// Function to create a new apple at a random position not occupied by the snake
function createApple() {
  let newApplePosition;

  do {
    newApplePosition = {
      x: getRandomInt(0, 25) * grid,
      y: getRandomInt(0, 25) * grid
    };
  } while (isAppleOnSnake(newApplePosition)); // Ensure the apple is not on the snake

  return new Apple(newApplePosition.x, newApplePosition.y); // Return the new apple object
}

// Function to check if the apple's position overlaps with the snake's body
function isAppleOnSnake(position) {
  return snake.cells.some(cell => cell.x === position.x && cell.y === position.y);
}

// If SSE fails the first time, use normal api
let shouldQueryNormalApiCounter = 5

function createScoresEventSource() {
  console.log("Creating eventsource for leaderboard")

  const eventSource = ScoreService.streamHighScores()

  // Attempt to reconnect after a delay
  setTimeout(async () => {
    if (!topScores || topScores.value.length === 0) {
      console.warn("Event source streaming may not be working, calling normal api");
      topScores.value = await ScoreService.getScores()
    }
  }, 2000);

  eventSource.onmessage = function (event) {
    topScores.value = JSON.parse(event.data).data;
  };


  eventSource.onerror = async function () {
    console.error("EventSource connection lost, attempting to reconnect...");
    eventSource.close();  // Close the current connection

    // After 5 SSE fails, fallback to normal api call
    if (shouldQueryNormalApiCounter >= 5) {
      topScores.value = await ScoreService.getScores()
      shouldQueryNormalApiCounter = 0
    }
    // Attempt to reconnect after a delay
    setTimeout(() => {
      console.log("Reconnecting to EventSource...");
      createScoresEventSource();
    }, 5000);
  };

  return eventSource;
}

async function setupScores() {
  personalBest.value = await ScoreService.getPersonalBest(username);
}
createScoresEventSource();


let context;
let canvas;
// Cache canvas width and height
let canvasWidth = 0;
let canvasHeight = 0;

function initialize_canvas() {
  canvas = document.getElementById("game");
  context = canvas.getContext("2d");

  canvasHeight = canvas.height;
  canvasWidth = canvas.width;
}

let snake;
let apple;

onMounted(async () => {
  // Initialize Canvas
  initialize_canvas();

  // setup scores
  setupScores();

  // start the game
  requestAnimationFrame(loop);

  // pauses = []

  snake = new Snake(160, 160, grid);
  apple = createApple();
});




const SNAKE_BODY_GRADIENT = { start: [24, 87, 39], end: [15, 54, 24] };
const SNAKE_INITIAL_LENGTH = 4;
// const SNAKE_EAT_SOUND = new Audio("gulp.mp3");

// the canvas width & height, snake x & y, and the apple x & y, all need to be a multiples of the grid size in order for collision detection to work
// (e.g. 16 * 25 = 400)
var grid = 20;

let username = localStorage.getItem("username");

function setupUsername() {
  // Keep prompting for the username until a valid one is provided
  while (username === null || username === "null" || username.trim() === "") {
    username = prompt("Enter your username:");
    if (username && username.trim() !== "") {
      console.log("Username: " + username);
    } else {
      alert("Please enter a valid username.");
    }
  }
  localStorage.setItem("username", username);
}

setupUsername();



let currentPauseStart;
function pause_game() {
  if (game_paused) return
  game_paused = true;
  currentPauseStart = new Date()
}

function unpause_game() {
  if (!game_paused) return
  game_paused = false;
  snake.pauses.push(new Date().getTime() - currentPauseStart.getTime())
  currentPauseStart = null;
  requestAnimationFrame(loop);
}

var game_paused = false;

class Snake {
  constructor(x, y, grid) {
    this.x = x;
    this.y = y;
    this.dx = grid;
    this.dy = 0;
    this.dxToApply = grid;
    this.dyToApply = 0;
    this.cells = [];
    // Set up a tracker for snake positions (for collision)
    this.snakePositionSet = new Set();

    this.maxCells = SNAKE_INITIAL_LENGTH;
    this.autoplay = false;
    this.birthDatetime = new Date()
    this.pauses = [];

  }

  queue_turn_left() {
    this.dxToApply = -grid;
    this.dyToApply = 0;
  }
  queue_turn_right() {
    this.dxToApply = grid;
    this.dyToApply = 0;
  }
  queue_turn_up() {
    this.dyToApply = -grid;
    this.dxToApply = 0;
  }
  queue_turn_down() {
    this.dyToApply = grid;
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
    currentScore.value += 1
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
    x = x / grid;
    y = y / grid;
    console.log(x, "   ", y);

    if (y === 0) {
      if (this.dy === -20) {
        this.queue_turn_right();
      } else if (this.dx === -20) {
        this.queue_turn_down();
      } else {
        this.queue_turn_down();
      }
    } else if (y === 25 - 1) {
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

class Apple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}



// get random whole numbers in a specific range
// @see https://stackoverflow.com/a/1527820/2124254
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

let frameCount = 0;
let msPrev = window.performance.now();
const fps = 60;
const slowFPS = 15; // Desired FPS when slowing down
const slowFactor = fps / slowFPS; // Factor to throttle to 15 FPS
const msPerFrame = 1000 / fps;
let excessTime = 0; // Track excess time separately


// Main game loop
function loop() {

  requestAnimationFrame(loop); // Request the next frame

  const msNow = window.performance.now();
  const msPassed = msNow - msPrev;

  // Update the previous timestamp
  msPrev = msNow;

  // Accumulate excess time
  excessTime += msPassed;

  // Skip frames if not enough time has passed
  while (excessTime >= msPerFrame) {
    // Update game state
    updateGameState();

    // Reduce excess time by the time spent on one frame
    excessTime -= msPerFrame;
  }

  // // Render the frame (this should be called only once per animation frame)
  // renderFrame();
}

// Function to update the game state
function updateGameState() {
  if (game_paused) {
    // context.fillStyle = "#ffcb74";
    // context.fillRect(20, 200, (25 * grid) * 0.6, grid * 5);

    // context.fillStyle = "#ffcb74";
    // context.font = `${grid * 4}px impact`;
    // context.fillText("PAUSED", (grid * 25) * 0.25, (grid * 25) * 0.55);

    context.fillStyle = "#ffcb74";
    context.strokeStyle = "#373636";
    context.lineWidth = 1; // Outline thickness (adjust to your liking)
    context.font = `${grid * 4}px impact`;
    context.strokeText("PAUSED", (grid * 25) * 0.25, (grid * 25) * 0.55);
    context.fillText("PAUSED", (grid * 25) * 0.25, (grid * 25) * 0.55);


    // context.fillStyle = "red";
    // context.fillRect(20, 200, 5, 5);


    return
  }; // Stop the loop if the game is paused
  frameCount++;
  if (frameCount < slowFactor) return; // Skip frames to slow down the game
  frameCount = 0;

  if (snake.autoplay) {
    snake.doOptimalMove(snake.x, snake.y);
  }
  snake.flush_queued_move();
  context.clearRect(0, 0, canvasWidth, canvasHeight);

  // Move snake by velocity and handle wrapping
  snake.move();
  snake.x = (snake.x + canvasWidth) % canvasWidth;
  snake.y = (snake.y + canvasHeight) % canvasHeight;

  // Track snake position using a Set for faster collision checking
  const headPosition = `${snake.x},${snake.y}`;
  snake.cells.unshift({ x: snake.x, y: snake.y });
  snake.snakePositionSet.add(headPosition);

  if (snake.cells.length > snake.maxCells) {
    const tail = snake.cells.pop();
    snake.snakePositionSet.delete(`${tail.x},${tail.y}`);
  }

  // Draw the apple
  context.fillStyle = "#ffcb74";
  context.fillRect(apple.x, apple.y, grid - 1, grid - 1);
  context.fillStyle = "#373636";
  context.font = `${grid * 0.5}px arial`;
  context.fillText("404", apple.x, apple.y + grid / 1.5);


  // Draw snake with gradient and eyes
  context.beginPath();
  snake.cells.forEach((cell, index) => {
    context.fillStyle = snake.calculateGradient(index, SNAKE_BODY_GRADIENT.end, SNAKE_BODY_GRADIENT.start);
    context.fillRect(cell.x, cell.y, grid - 1, grid - 1);

    // Draw eyes if head
    if (index === 0) {
      context.fillStyle = "white";
      const eyeOffsets = {
        "20,0": [[15, 6], [15, 14]], // Right
        "-20,0": [[5, 6], [5, 14]],  // Left
        "0,20": [[6, 15], [14, 15]], // Down
        "0,-20": [[6, 5], [14, 5]]   // Up
      };
      const [eye1, eye2] = eyeOffsets[`${snake.dx},${snake.dy}`] || [];
      context.beginPath();
      context.arc(cell.x + eye1[0], cell.y + eye1[1], 2, 0, 2 * Math.PI);
      context.arc(cell.x + eye2[0], cell.y + eye2[1], 2, 0, 2 * Math.PI);
      context.fill();
    }
  });

  // Handle eating apple
  if (snake.x === apple.x && snake.y === apple.y) {
    snake.increase_length();
    apple = createApple();

    if (currentScore.value > personalBest.value) {
      personalBest.value = currentScore.value;
    }
  }

  // Check for collisions with self
  for (let i = 1; i < snake.cells.length; i++) {
    if (`${snake.cells[i].x},${snake.cells[i].y}` === headPosition) {
      let timeTaken = (new Date().getTime() - snake.birthDatetime.getTime());
      // Sum up all pause durations
      const totalPauseTime = snake.pauses.reduce((sum, pause) => sum + pause, 0);
      // Subtract total pause time from time taken
      timeTaken = Math.max(0, timeTaken - totalPauseTime);
      const timeTakenSeconds = timeTaken / 1000;
      console.log(timeTakenSeconds)
      ScoreService.saveScore(username, currentScore.value, timeTakenSeconds);
      currentScore.value = 0;

      snake = new Snake(160, 160, grid);
      apple = createApple();
      break;
    }
  }
}

const alertText = ref("")
const isAlertShown = ref(false)
function showAlert(text) {
  console.log("shwoing alert")
  alertText.value = text
  isAlertShown.value = true

  setTimeout(() => {
    isAlertShown.value = false
  }, 2000);
}


const CHEATING_ALERT_TEXT = "Autoplay enabled"
const autoplayCheat = 'aspirine'.split('');
let autoplayCheatPointer = 0

// listen to keyboard events to move the snake
document.addEventListener("keydown", function (e) {



  if (e.key === "Escape") {
    if (game_paused) {
      unpause_game();
    } else { pause_game(); }

  }

  if (e.key === autoplayCheat[autoplayCheatPointer]) {
    autoplayCheatPointer += 1
    if (autoplayCheatPointer === autoplayCheat.length) {
      snake.autoplay = true;
      showAlert(CHEATING_ALERT_TEXT)
      return
    }
  } else {
    autoplayCheatPointer = 0
  }

  // left arrow key
  if ((e.key === "ArrowLeft" || e.key === "a" || e.key === "j") && snake.dx === 0) {
    snake.autoplay = false;
    snake.queue_turn_left();
  }
  // up arrow key
  else if ((e.key === "ArrowUp" || e.key === "w" || e.key === "i") && snake.dy === 0) {
    snake.autoplay = false;
    snake.queue_turn_up();
  }
  // right arrow key
  else if ((e.key === "ArrowRight" || e.key === "d" || e.key === "l") && snake.dx === 0) {
    snake.autoplay = false;
    snake.queue_turn_right();
  }
  // down arrow key
  else if ((e.key === "ArrowDown" || e.key === "s" || e.key === "k") && snake.dy === 0) {
    snake.autoplay = false;
    snake.queue_turn_down();
  }
  // // c key
  // else if (e.key === "c") {
  //   snake.autoplay = !snake.autoplay;

  //   console.log("Cheating: autoplay toggled");
  // }
});

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') {
    // User has switched tabs or alt-tabbed away
    pause_game()
  }
});


</script>

<style>
/* html,
body {
  height: 100%;
  margin: 0;
}

body {
  background: #373636;
  display: flex;
  align-items: center;
  justify-content: center;
} */

canvas {
  border: 1px solid #ccc;
}




.parent {
  width: 100%;
  padding-left: 0;
  margin-left: 0;
  margin-right: 0;
  box-sizing: border-box;
  display: flex;
  /* width: 100%; */
  justify-content: space-between;
  /* border: 1px green solid; */

  align-items: center;
  /* width: 100vw; */
  /* height: 100vh;
  margin-left: 0;
  margin-right: 0;
  padding-left: 0; */
}

.child {
  /* Child 1 takes up 40% of the space */
  /* margin: 0 10px; */
  margin: 10px;
  /* add some margin to create a gap between the child elements */
}

.game-container {

  /* margin-top: 4%; */
  width: 500px;
  top: 100px
}

.left-side-container {

  /* border: red 1px solid; */
  width: 250px;
}

.score-container {
  /* border: green 1 px solid; */
  margin-bottom: 80px;

}

.instruction-container {
  /* border: yellow 1px solid; */

  /* border: 1px solid #ccc;
  border-radius: 10px;
  padding: 10px; */
  font-family: 'Fantasy';

  color: #ccc;
}

.leaderboard-container {

  /* border: green 1px solid; */
  width: 450px;
}


.username-container {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  background-color: #185727;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: fit-content;
  max-width: inherit;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 50px;

}



.user-icon {
  font-size: 1.5em;
  margin-right: 10px;
  color: #ccc;
}

.username-text {
  font-size: 1em;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Roboto', sans-serif;
  /* or replace with your choice */
  font-size: 1.5em;
}


#leaderboard {
  font-family: Arial, sans-serif;
  font-size: 14px;
  width: 450px;
  /* margin-right: 2%; */
  /* margin-left: 0; */
  /* margin: 0 auto; */
  /* padding: 20px; */
  border: 1px solid #ccc;
  border-radius: 10px;
  /* box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); */
}

#leaderboard th {
  /* background-color: #f0f0f0; */
  color: white;
  padding: 10px;
  border-bottom: 1px solid #ccc;

}


#leaderboard td {
  padding: 10px;
  border-bottom: 1px solid #ccc;
}

#leaderboard .no-bottom {
  /* padding: 10px; */
  border-bottom: 0px solid #ccc;
}

/* #leaderboard tr:hover {
        background-color: #f2f2f2;
      } */

#leaderboard th,
#leaderboard td {
  text-align: left;
}

#leaderboard th:first-child,
#leaderboard td:first-child {
  width: 10%;
}

#leaderboard th:nth-child(2),
#leaderboard td:nth-child(2) {
  width: 20%;
}

#leaderboard th:nth-child(3),
#leaderboard td:nth-child(3) {
  width: 35%;
}

#leaderboard th:nth-child(4),
#leaderboard td:nth-child(4) {
  width: 25%;
}


.champion {
  color: #ffcb74;
}
</style>
