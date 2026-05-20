const shell = document.querySelector(".launcher-shell");
const progressFill = document.querySelector("#progressFill");
const progressText = document.querySelector("#progressText");
const statusText = document.querySelector("#statusText");
const buildBadge = document.querySelector("#buildBadge");
const versionLabel = document.querySelector("#versionLabel");
const engineBadge = document.querySelector("#engineBadge");
const badgeOld = document.querySelector("#badgeOld");
const badgeNew = document.querySelector("#badgeNew");

const badgeSteps = ["old", "strike", "morph", "new", "new"];
const badgePairs = [
  { old: "Serious Engine 1.5", new: "Unreal Engine 5.7" },
  { old: "DirectX 8.1", new: "DirectX 12" },
  { old: "ASCII Shaders", new: "HLSL Shaders" },
  { old: "CPU Particles", new: "Niagara FX" },
  { old: "Baked Lighting", new: "Lumen GI" },
];

const nativeBridge = window.UnrealLauncher ?? {
  play(channel) {
    console.info("[launcher] play", channel);
  },
  verify(channel) {
    console.info("[launcher] verify", channel);
  },
  login() {
    console.info("[launcher] login");
  },
  openExternal(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  },
  minimize() {
    console.info("[launcher] minimize");
  },
  close() {
    console.info("[launcher] close");
  },
  beginDrag() {
    console.info("[launcher] beginDrag");
  },
};

const currentChannel = "live";
let progressTimer = 0;
let badgeStepIndex = 0;
let badgePairIndex = 0;

function setProgress(value) {
  const safeValue = Math.max(0, Math.min(100, value));
  progressFill.style.width = `${safeValue}%`;
  progressText.textContent = `${Math.round(safeValue)}%`;
}

function setState(state, text, badge) {
  shell.dataset.state = state;
  statusText.textContent = text;
  buildBadge.textContent = badge;
}

function simulateVerify() {
  window.clearInterval(progressTimer);
  nativeBridge.verify(currentChannel);
  setState("checking", "Проверка манифеста и локальных файлов...", "Проверка");
  setProgress(0);

  let value = 0;
  progressTimer = window.setInterval(() => {
    value += Math.random() * 14 + 6;
    setProgress(value);

    if (value >= 100) {
      window.clearInterval(progressTimer);
      setState("ready", "Клиент проверен. Можно запускать игру.", "Готово");
      setProgress(100);
    }
  }, 260);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  if (action === "verify") {
    simulateVerify();
  }

  if (action === "play") {
    nativeBridge.play(currentChannel);
    setState("launching", "Запуск игрового клиента...", "Запуск");
  }

  if (action === "login") {
    nativeBridge.login();
  }

  if (action === "open-link") {
    nativeBridge.openExternal(target.dataset.url);
  }

  if (action === "minimize") {
    nativeBridge.minimize();
  }

  if (action === "close") {
    nativeBridge.close();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.clientY > 84 || event.clientX > window.innerWidth - 260) {
    return;
  }

  if (event.target.closest("button, a, input, textarea, select")) {
    return;
  }

  nativeBridge.beginDrag();
});

window.setInterval(() => {
  badgeStepIndex = (badgeStepIndex + 1) % badgeSteps.length;

  if (badgeStepIndex === 0) {
    badgePairIndex = (badgePairIndex + 1) % badgePairs.length;
    badgeOld.textContent = badgePairs[badgePairIndex].old;
    badgeNew.textContent = badgePairs[badgePairIndex].new;
  }

  engineBadge.classList.remove("step-old", "step-strike", "step-morph", "step-new");
  engineBadge.classList.add(`step-${badgeSteps[badgeStepIndex]}`);
}, 860);

setProgress(100);
