// ---------- Part A: Select elements and store the data ----------
const API_URL = "https://jsonplaceholder.typicode.com/users";

const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let users = [];   // all loaded users are kept here

// ---------- Part B: renderUsers(list) ----------
function renderUsers(list) {
  usersList.textContent = "";            // clear the old list

  if (list.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No users match your filter.";
    usersList.appendChild(li);
    return;
  }

  list.forEach(user => {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("div");
    email.textContent = "Email: " + user.email;

    const city = document.createElement("div");
    city.textContent = "City: " + user.address.city;

    const company = document.createElement("div");
    company.textContent = "Company: " + user.company.name;

    li.append(name, email, city, company);
    usersList.appendChild(li);
  });
}

// ---------- Part C: loadUsers() with async/await, try/catch/finally ----------
async function loadUsers() {
  loadButton.disabled = true;                 // disable while loading
  statusMessage.textContent = "Loading users...";

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {                        // 404, 500 and so on
      throw new Error("Server returned status " + response.status);
    }

    users = await response.json();             // store in the array
    applyFilter();                             // draw (respects any typed filter)
    statusMessage.textContent = "Loaded " + users.length + " users.";
  } catch (error) {
    statusMessage.textContent = "Something went wrong: " + error.message;
  } finally {
    loadButton.disabled = false;               // runs on success AND on error
  }
}

// ---------- Part D: Filter without a new request, and wire up events ----------
function applyFilter() {
  if (users.length === 0) return;

  const term = filterInput.value.trim().toLowerCase();
  const matches = users.filter(user =>
    user.name.toLowerCase().includes(term)
  );
  renderUsers(matches);
}

loadButton.addEventListener("click", loadUsers);
filterInput.addEventListener("input", applyFilter);
