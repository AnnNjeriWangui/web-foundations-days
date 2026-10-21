// ---------- Part A: Select elements and store the data ----------

// Local Kenyan users dataset (same shape as JSONPlaceholder /users)
const KENYAN_USERS = [
  {
    id: 1, name: "Wanjiru Kamau",
    email: "wanjiru.kamau@safaricom.co.ke",
    address: { city: "Nairobi" },
    company: { name: "Safaricom PLC" }
  },
  {
    id: 2, name: "Otieno Odhiambo",
    email: "otieno.odhiambo@kengen.co.ke",
    address: { city: "Kisumu" },
    company: { name: "KenGen" }
  },
  {
    id: 3, name: "Aisha Mohamed",
    email: "aisha.mohamed@equity.co.ke",
    address: { city: "Mombasa" },
    company: { name: "Equity Bank Kenya" }
  },
  {
    id: 4, name: "Kipchoge Mutai",
    email: "kipchoge.mutai@kplc.co.ke",
    address: { city: "Eldoret" },
    company: { name: "Kenya Power" }
  },
  {
    id: 5, name: "Njeri Waweru",
    email: "njeri.waweru@cooperative.co.ke",
    address: { city: "Nyeri" },
    company: { name: "Co-operative Bank" }
  },
  {
    id: 6, name: "Baraka Mwangi",
    email: "baraka.mwangi@kenairways.co.ke",
    address: { city: "Nairobi" },
    company: { name: "Kenya Airways" }
  },
  {
    id: 7, name: "Fatuma Hassan",
    email: "fatuma.hassan@kra.go.ke",
    address: { city: "Mombasa" },
    company: { name: "Kenya Revenue Authority" }
  },
  {
    id: 8, name: "Mwenda Kariuki",
    email: "mwenda.kariuki@kcb.co.ke",
    address: { city: "Nakuru" },
    company: { name: "KCB Group" }
  },
  {
    id: 9, name: "Zawadi Ochieng",
    email: "zawadi.ochieng@uon.ac.ke",
    address: { city: "Kisumu" },
    company: { name: "University of Nairobi" }
  },
  {
    id: 10, name: "Amina Abdi",
    email: "amina.abdi@nhif.or.ke",
    address: { city: "Nairobi" },
    company: { name: "NHIF" }
  }
];

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

// ---------- Part C: loadUsers() – loads from local Kenyan dataset ----------
async function loadUsers() {
  loadButton.disabled = true;
  statusMessage.textContent = "Loading users...";

  try {
    // Simulate a brief async load from the local dataset
    await new Promise(resolve => setTimeout(resolve, 400));
    users = KENYAN_USERS;
    applyFilter();
    statusMessage.textContent = "Loaded " + users.length + " users.";
  } catch (error) {
    statusMessage.textContent = "Something went wrong: " + error.message;
  } finally {
    loadButton.disabled = false;
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
