// ---------- Select elements ----------
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

const MAX_CHARS = 200;
const WARNING_AT = 180;
const DRAFT_KEY = "draft";
const THEME_KEY = "theme";

// ---------- Counters ----------
function updateCounts() {
  const text = noteText.value;
  const length = text.length;
  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

  charCount.textContent = `${length} / ${MAX_CHARS} characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.remove("warning", "over");
  if (length > MAX_CHARS) {
    charCount.classList.add("over");
  } else if (length > WARNING_AT) {
    charCount.classList.add("warning");
  }
}

// ---------- Draft ----------
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, noteText.value);
}

function clearAll() {
  noteText.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
  noteText.focus();
}

// ---------- Theme ----------
function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

// ---------- Events ----------
noteText.addEventListener("input", function () {
  updateCounts();
  saveDraft();
});

noteText.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    clearAll();
  }
});

clearBtn.addEventListener("click", clearAll);

themeToggle.addEventListener("click", function () {
  const isDark = !document.body.classList.contains("dark");
  applyTheme(isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
});

// ---------- On page load ----------
const savedDraft = localStorage.getItem(DRAFT_KEY);
if (savedDraft !== null) {
  noteText.value = savedDraft;
}
applyTheme(localStorage.getItem(THEME_KEY) === "dark");
updateCounts();
