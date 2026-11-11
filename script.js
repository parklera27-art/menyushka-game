
const BASE = "https://raw.githubusercontent.com/parklera27-art/menyushka-game/main/";

const images = {
  idle: "Менюшка ожидание.png",
  happy: "Менюшка радость.png",
  angry: "Менюшка злость.png",
  sad: "Менюшка поражение.png",
  win: "Менюшка победа.png"
};

const products = [
  "продукты 1.png",
  "продукты 2.png",
  "продукты 3.png"
];

const trash = [
  "мусор 1.png",
  "мусор 2.png",
  "мусор 3.png"
];

const SETTINGS = {
  duration: 60,
  target: 100,
  points: 5,
  lives: 3,
  trashChance: 0.40,
  playerSpeed: 48,
  minSpawnDelay: 0.65,
  maxSpawnDelay: 1.15,
  minFallSpeed: 22,
  maxFallSpeed: 38
};

const field = document.getElementById("game-field");
const chef = document.getElementById("menyushka");
const message = document.getElementById("message");
const scoreText = document.getElementById("score");
const livesText = document.getElementById("lives");
const timerText = document.getElementById("timer");
const startButton = document.getElementById("start");
const overlay = document.getElementById("game-overlay");
const resultTitle = document.getElementById("result-title");
const resultText = document.getElementById("result-text");

const imageURL = name => BASE + encodeURIComponent(name);

const loaded = new Set();

[
  ...Object.values(images),
  ...products,
  ...trash
].forEach(name => {
  const img = new Image();

  img.onload = () => loaded.add(name);

  img.onerror = () => {
    console.error("Не загрузилась картинка:", name);
  };

  img.src = imageURL(name);
});

let score = 0;
let lives = SETTINGS.lives;
let time = SETTINGS.duration;
let playerX = 50;
let playing = false;
let items = [];

let keys = {
  left: false,
  right: false
};

let lastFrame = 0;
let spawnClock = 0;
let timeClock = 0;
let nextSpawn = 0.9;
let animationId = null;
let emotionTimeout = null;
let currentEmotion = "idle";

chef.src = imageURL(images.idle);

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomFile(pool) {
  const available = pool.filter(name => loaded.has(name));

  if (!available.length) return null;

  return available[
    Math.floor(Math.random() * available.length)
  ];
}

function setEmotion(emotion, duration = 0) {
  clearTimeout(emotionTimeout);

  currentEmotion = emotion;
  chef.src = imageURL(images[emotion]);

  if (duration > 0) {
    emotionTimeout = setTimeout(() => {
      if (playing && currentEmotion === emotion) {
        setEmotion("idle");
      }
    }, duration);
  }
}

function updateStats() {
  scoreText.textContent = score;
  livesText.textContent = lives;
  timerText.textContent = time;
}

function moveChef(dt) {
  const direction =
    Number(keys.right) - Number(keys.left);

  playerX += direction * SETTINGS.playerSpeed * dt;

  const fieldWidth = field.clientWidth;
  const chefWidth = chef.getBoundingClientRect().width;

  const halfWidth = fieldWidth
    ? (chefWidth / fieldWidth) * 50
    : 10;

  playerX = Math.max(
    halfWidth,
    Math.min(100 - halfWidth, playerX)
  );

  chef.style.left = playerX + "%";
}

function getPot() {
  const a = chef.getBoundingClientRect();

  return {
    left: a.left + a.width * 0.60,
    right: a.left + a.width * 0.94,
    rimY: a.top + a.height * 0.58,
    centerX: a.left + a.width * 0.77,
    centerY: a.top + a.height * 0.65
  };
}

function spawnItem() {
  const isTrash = Math.random() < SETTINGS.trashChance;
  const pool = isTrash ? trash : products;
  const name = randomFile(pool);

  if (!name) return;

  const img = document.createElement("img");
  img.src = imageURL(name);
  img.className = "falling-item";

  const x = randomBetween(8, 92);

  img.style.left = x + "%";
  img.style.top = "-15%";
  img.style.transform = "translateX(-50%)";

  field.appendChild(img);

  items.push({
    element: img,
    x,
    y: -15,
    speed: randomBetween(
      SETTINGS.minFallSpeed,
      SETTINGS.maxFallSpeed
    ),
    type: isTrash ? "trash" : "food"
  });
}

function removeItem(index) {
  items[index].element.remove();
  items.splice(index, 1);
}

function checkCollision(item) {
  const b = item.element.getBoundingClientRect();
  const pot = getPot();

  const itemCenterX = b.left + b.width / 2;

  return (
    itemCenterX >= pot.left &&
    itemCenterX <= pot.right &&
    b.bottom >= pot.rimY &&
    b.top <= pot.rimY
  );
}

function animateCatch(element) {
  const pot = getPot();
  const fieldRect = field.getBoundingClientRect();

  const targetX = pot.centerX - fieldRect.left;
  const targetY = pot.centerY - fieldRect.top;

  const rect = element.getBoundingClientRect();

  element.style.left =
    (rect.left + rect.width / 2 - fieldRect.left) + "px";

  element.style.top =
    (rect.top - fieldRect.top) + "px";

  element.style.transform = "translateX(-50%)";

  requestAnimationFrame(() => {
    element.classList.add("caught");
    element.style.left = targetX + "px";
    element.style.top = targetY + "px";
    element.style.transform =
      "translate(-50%, -30%) scale(0.12)";
  });

  setTimeout(() => element.remove(), 250);
}

const foodMessages = [
  "ВКУСНЯТИНА! +5 ⭐",
  "ШЕФ ОДОБРЯЕТ! +5 👨‍🍳",
  "В КАСТРЮЛЮ ЕГО! +5",
  "МИШЛЕН УЖЕ ЗВОНИТ! +5 ⭐"
];

const trashMessages = [
  "ЭТО КУХНЯ ИЛИ СВАЛКА?! 😡",
  "Я УВОЛЬНЯЮСЬ! ОПЯТЬ!",
  "КТО ПОДКИНУЛ МУСОР?!",
  "САНЭПИДЕМСТАНЦИЮ СЮДА!"
];

function randomMessage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function collect(item) {
  animateCatch(item.element);

  if (item.type === "food") {
    score += SETTINGS.points;
    setEmotion("happy", 650);
    message.textContent = randomMessage(foodMessages);
  } else {
    lives--;
    setEmotion("angry", 850);
    message.textContent = randomMessage(trashMessages);
  }

  updateStats();

  if (score >= SETTINGS.target) {
    endGame(true);
  } else if (lives <= 0) {
    endGame(false);
  }
}

function gameLoop(timestamp) {
  if (!playing) return;

  if (!lastFrame) lastFrame = timestamp;

  const dt = Math.min(
    (timestamp - lastFrame) / 1000,
    0.05
  );

  lastFrame = timestamp;

  moveChef(dt);

  spawnClock += dt;
  timeClock += dt;

  if (spawnClock >= nextSpawn) {
    spawnClock = 0;
    spawnItem();

    nextSpawn = randomBetween(
      SETTINGS.minSpawnDelay,
      SETTINGS.maxSpawnDelay
    );
  }

  if (timeClock >= 1) {
    timeClock -= 1;
    time--;
    updateStats();

    if (time <= 0) {
      endGame(false);
      return;
    }
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];

    // Строго вертикальное падение
    item.y += item.speed * dt;
    item.element.style.top = item.y + "%";

    if (checkCollision(item)) {
      items.splice(i, 1);
      collect(item);

      if (!playing) return;
    } else if (item.y > 110) {
      removeItem(i);
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
  cancelAnimationFrame(animationId);
  clearTimeout(emotionTimeout);

  field.querySelectorAll(".falling-item")
    .forEach(element => element.remove());

  items = [];

  score = 0;
  lives = SETTINGS.lives;
  time = SETTINGS.duration;
  playerX = 50;

  spawnClock = 0;
  timeClock = 0;
  lastFrame = 0;

  nextSpawn = randomBetween(
    SETTINGS.minSpawnDelay,
    SETTINGS.maxSpawnDelay
  );

  keys.left = false;
  keys.right = false;

  playing = true;
  overlay.classList.add("hidden");

  chef.style.left = "50%";
  setEmotion("idle");
  updateStats();

  message.textContent = "ЛОВИ ПРОДУКТЫ! 🥔";
  startButton.textContent = "ЗАНОВО";

  animationId = requestAnimationFrame(gameLoop);
}

function endGame(won) {
  playing = false;

  cancelAnimationFrame(animationId);
  clearTimeout(emotionTimeout);

  items.forEach(item => item.element.remove());
  items = [];

  setEmotion(won ? "win" : "sad");

  overlay.classList.remove("hidden");

  resultTitle.textContent = won
    ? "ПОБЕДА! 🏆"
    : "КУХНЯ ЗАКРЫТА! 😭";

  resultText.textContent = won
    ? `Менюшка набрал ${score} очков!`
    : `Результат: ${score} очков`;

  message.textContent = won
    ? "ШЕФ ДОВОЛЕН!"
    : "МЕНЮШКА УВОЛЬНЯЕТСЯ!";

  startButton.textContent = "ИГРАТЬ ЕЩЁ";
}

document.addEventListener("keydown", e => {
  if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "ArrowLeft") keys.left = true;
  if (e.key === "ArrowRight") keys.right = true;
});

document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
});

window.addEventListener("blur", () => {
  keys.left = false;
  keys.right = false;
});

function bindButton(id, direction) {
  const button = document.getElementById(id);

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    keys[direction] = true;
    button.setPointerCapture(e.pointerId);
  });

  const stop = () => {
    keys[direction] = false;
  };

  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("lostpointercapture", stop);
}

bindButton("left", "left");
bindButton("right", "right");

startButton.addEventListener("click", startGame);

updateStats();



