const shell = document.querySelector(".launcher-shell");
const progressFill = document.querySelector("#progressFill");
const progressText = document.querySelector("#progressText");
const statusText = document.querySelector("#statusText");
const buildBadge = document.querySelector("#buildBadge");
const engineBadge = document.querySelector("#engineBadge");
const badgeOld = document.querySelector("#badgeOld");
const badgeNew = document.querySelector("#badgeNew");
const langSwitcher = document.querySelector("#langSwitcher");
const localeLabel = document.querySelector("#localeLabel");
const profileStrip = document.querySelector(".profile-strip");
const profileLabel = document.querySelector("#profileLabel");
const profileName = document.querySelector("#profileName");
const profileMeta = document.querySelector("#profileMeta");
const authButton = document.querySelector(".auth-button");
const authModal = document.querySelector("#authModal");
const authForm = document.querySelector("#authForm");
const authLogin = document.querySelector("#authLogin");

const localeOptions = ["ru", "en", "de", "fr", "ja", "th"];
const badgeSteps = ["old", "strike", "morph", "new", "new"];

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
let translations = {};

function getByPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function t(path, fallback = "") {
  return getByPath(translations, path) ?? fallback;
}

async function loadLocale(locale) {
  const safeLocale = localeOptions.includes(locale) ? locale : "ru";

  try {
    const response = await fetch(`./locales/${safeLocale}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Locale ${safeLocale} failed`);
    translations = await response.json();
  } catch (error) {
    console.warn(error);
    const response = await fetch("./locales/ru.json", { cache: "no-store" });
    translations = await response.json();
  }

  applyTranslations(safeLocale);
}

function applyTranslations(locale) {
  document.documentElement.lang = locale;
  window.localStorage.setItem("launcher-locale", locale);
  localeLabel.textContent = locale.toUpperCase();

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n, node.textContent);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
    node.dataset.i18nAttr.split(";").forEach((binding) => {
      const [attribute, key] = binding.split(":").map((part) => part.trim());
      if (attribute && key) {
        node.setAttribute(attribute, t(key, node.getAttribute(attribute) ?? ""));
      }
    });
  });

  document.querySelectorAll(".lang-option").forEach((option) => {
    option.classList.toggle("is-active", option.dataset.locale === locale);
  });

  const pairs = t("badge.pairs", []);
  if (pairs.length > 0) {
    badgePairIndex = Math.min(badgePairIndex, pairs.length - 1);
    badgeOld.textContent = pairs[badgePairIndex].old;
    badgeNew.textContent = pairs[badgePairIndex].new;
  }

  if (profileStrip.classList.contains("is-authorized")) {
    profileLabel.textContent = t("account.authorizedLabel");
    profileName.textContent = window.localStorage.getItem("launcher-profile") ?? profileName.textContent;
    profileMeta.textContent = "";
    authButton.textContent = t("account.logout");
  } else {
    profileLabel.textContent = t("account.guestLabel");
    profileName.textContent = t("account.guest");
    profileMeta.textContent = t("account.hint");
    authButton.textContent = t("account.login");
  }
}

function closeLocaleMenu() {
  langSwitcher.classList.remove("is-open");
  langSwitcher.querySelector(".lang-trigger").setAttribute("aria-expanded", "false");
}

function setProgress(value) {
  const safeValue = Math.max(0, Math.min(100, value));
  progressFill.style.width = `${safeValue}%`;
  progressText.textContent = `${Math.round(safeValue)}%`;
}

function setState(state, statusKey, badgeKey) {
  shell.dataset.state = state;
  statusText.textContent = t(statusKey);
  buildBadge.textContent = t(badgeKey);
}

function openAuthModal() {
  authModal.classList.add("is-open");
  authModal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => authLogin.focus(), 60);
}

function closeAuthModal() {
  authModal.classList.remove("is-open");
  authModal.setAttribute("aria-hidden", "true");
}

function isAuthorized() {
  return profileStrip.classList.contains("is-authorized");
}

function authorize(login) {
  const displayName = login.trim() || "Adventurer";
  profileStrip.classList.add("is-authorized");
  shell.dataset.auth = "authorized";
  profileLabel.textContent = t("account.authorizedLabel");
  profileName.textContent = displayName;
  profileMeta.textContent = "";
  authButton.textContent = t("account.logout");
  window.localStorage.setItem("launcher-profile", displayName);
}

function logout() {
  profileStrip.classList.remove("is-authorized");
  shell.dataset.auth = "guest";
  profileLabel.textContent = t("account.guestLabel");
  profileName.textContent = t("account.guest");
  profileMeta.textContent = t("account.hint");
  authButton.textContent = t("account.login");
  window.localStorage.removeItem("launcher-profile");
}

function simulateVerify() {
  window.clearInterval(progressTimer);
  nativeBridge.verify(currentChannel);
  setState("checking", "patch.checkingStatus", "patch.checkingBadge");
  setProgress(0);

  let value = 0;
  progressTimer = window.setInterval(() => {
    value += Math.random() * 14 + 6;
    setProgress(value);

    if (value >= 100) {
      window.clearInterval(progressTimer);
      setState("ready", "patch.readyStatus", "patch.readyBadge");
      setProgress(100);
    }
  }, 260);
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  if (action === "verify") {
    simulateVerify();
  }

  if (action === "locale-toggle") {
    const isOpen = langSwitcher.classList.toggle("is-open");
    target.setAttribute("aria-expanded", String(isOpen));
  }

  if (action === "locale-select") {
    await loadLocale(target.dataset.locale);
    closeLocaleMenu();
  }

  if (action === "play") {
    if (!isAuthorized()) {
      nativeBridge.login();
      openAuthModal();
      return;
    }

    nativeBridge.play(currentChannel);
    setState("launching", "patch.launchingStatus", "patch.launchingBadge");
  }

  if (action === "login") {
    if (isAuthorized()) {
      logout();
      return;
    }

    nativeBridge.login();
    openAuthModal();
  }

  if (action === "auth-close") {
    closeAuthModal();
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
  if (event.button !== 0 || event.clientY > 84 || event.clientX > window.innerWidth - 460) {
    return;
  }

  if (event.target.closest("button, a, input, textarea, select")) {
    return;
  }

  nativeBridge.beginDrag();
});

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".lang-switcher, .auth-dialog")) {
    return;
  }

  closeLocaleMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLocaleMenu();
    closeAuthModal();
  }
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  authorize(authLogin.value);
  closeAuthModal();
  authForm.reset();
});

window.setInterval(() => {
  const pairs = t("badge.pairs", []);
  if (pairs.length === 0) return;

  badgeStepIndex = (badgeStepIndex + 1) % badgeSteps.length;

  if (badgeStepIndex === 0) {
    badgePairIndex = (badgePairIndex + 1) % pairs.length;
    badgeOld.textContent = pairs[badgePairIndex].old;
    badgeNew.textContent = pairs[badgePairIndex].new;
  }

  engineBadge.classList.remove("step-old", "step-strike", "step-morph", "step-new");
  engineBadge.classList.add(`step-${badgeSteps[badgeStepIndex]}`);
}, 860);

async function init() {
  setProgress(100);
  await loadLocale(window.localStorage.getItem("launcher-locale") ?? "ru");

  const storedProfile = window.localStorage.getItem("launcher-profile");
  if (storedProfile) {
    authorize(storedProfile);
  }
}

init();
