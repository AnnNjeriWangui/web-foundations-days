// ---------- Starting data ----------
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const VALID_CATEGORIES = ["personal", "work", "study"];

// Trim, collapse repeated spaces and lower-case (used for comparisons)
function normalise(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

// ---------- 1. searchNotes ----------
function searchNotes(word) {
  const target = word.toLowerCase();
  return notes.filter(function (note) {
    return note.text.toLowerCase().includes(target);
  });
}

// ---------- 2. longestNote ----------
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// ---------- 3. countByCategory ----------
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category]) {
      counts[note.category] += 1;
    } else {
      counts[note.category] = 1;
    }
  }
  return counts;
}

// ---------- 4. getSummary ----------
function getSummary() {
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";

  if (total === 0) {
    return `0 notes.`;
  }

  const counts = countByCategory();
  const parts = [];
  for (const category of VALID_CATEGORIES) {
    if (counts[category]) {
      parts.push(`${counts[category]} ${category}`);
    }
  }
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// ---------- 5. isDuplicate ----------
function isDuplicate(text) {
  const target = normalise(text);
  return notes.some(function (note) {
    return normalise(note.text) === target;
  });
}

// ---------- 6. addNote ----------
function addNote(text, category) {
  if (typeof text !== "string") {
    console.log("Not added: text must be a string.");
    return false;
  }

  const cleaned = text.trim().replace(/\s+/g, " ");

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("Not added: text must be 1 to 200 characters.");
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log("Not added: a note with this text already exists.");
    return false;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    console.log("Not added: category must be personal, work or study.");
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: cleaned, category: category });
  return true;
}

// =====================================================
// TESTS  (expected output is in the comment beside each call)
// =====================================================

// --- searchNotes ---
console.log("searchNotes('the'):", searchNotes("the"));
// 2 notes: id 2 "Finish the Day 3 assignment" and id 3 "Email the project report to Grace"
console.log("searchNotes('MILK'):", searchNotes("MILK"));
// 1 note: id 1 "Buy milk and bread" (case is ignored)
console.log("searchNotes('zebra'):", searchNotes("zebra"));
// [] (no results)

// --- longestNote ---
console.log("longestNote():", longestNote());
// { id: 3, text: "Email the project report to Grace", category: "work" }
const backup = notes;
notes = [];
console.log("longestNote() with no notes:", longestNote()); // null
notes = backup;

// --- countByCategory ---
console.log("countByCategory():", countByCategory());
// { personal: 2, study: 2, work: 1 }
notes = [];
console.log("countByCategory() with no notes:", countByCategory()); // {}
notes = backup;

// --- getSummary ---
console.log(getSummary());
// "5 notes: 2 personal, 1 work, 2 study."
notes = [backup[0]];
console.log(getSummary()); // "1 note: 1 personal."
notes = [];
console.log(getSummary()); // "0 notes."
notes = backup;

// --- isDuplicate ---
console.log("isDuplicate('Buy milk and bread'):", isDuplicate("Buy milk and bread")); // true
console.log("isDuplicate('  BUY   Milk and   BREAD '):", isDuplicate("  BUY   Milk and   BREAD ")); // true (case and extra spaces ignored)
console.log("isDuplicate('Water the plants'):", isDuplicate("Water the plants")); // false

// --- addNote ---
console.log(addNote("Water the plants", "personal")); // true (note added with id 6)
console.log(addNote("buy milk and bread", "personal"));
// logs "Not added: a note with this text already exists." then false
console.log(addNote("", "work"));
// logs "Not added: text must be 1 to 200 characters." then false
console.log(addNote("x".repeat(201), "work"));
// logs "Not added: text must be 1 to 200 characters." then false
console.log(addNote("Plan the trip", "holiday"));
// logs "Not added: category must be personal, work or study." then false

// --- Final state after the addNote tests ---
console.log("Total notes:", notes.length); // Total notes: 6
console.log(getSummary()); // "6 notes: 3 personal, 1 work, 2 study."
