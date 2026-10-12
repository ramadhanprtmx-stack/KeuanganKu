const USERS_KEY = "keuanganku_demo_users";
const SESSION_KEY = "keuanganku_demo_session";

function getSessionUser() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    if (!session || !Array.isArray(users)) return null;
    return users.find((user) => user.email === session.email) || null;
  } catch {
    return null;
  }
}

const currentUser = getSessionUser();
if (!currentUser) {
  window.location.replace("index.html");
} else {
  document.getElementById("welcomeName").textContent = currentUser.name;
  document.getElementById("userAvatar").textContent = (currentUser.name.trim()[0] || "K").toUpperCase();
}

document.getElementById("logoutButton").addEventListener("click", () => {
  if (confirm("Yakin ingin keluar dari akun?")) {
    localStorage.removeItem(SESSION_KEY);
    window.location.replace("index.html");
  }
});

const userSuffix = currentUser ? encodeURIComponent(currentUser.email) : "guest";
const STORAGE_KEY = `keuanganku_transaksi_${userSuffix}`;
const BUDGET_KEY = `keuanganku_anggaran_${userSuffix}`;

const form = document.getElementById("transactionForm");
const typeInput = document.getElementById("type");
const descriptionInput = document.getElementById("description");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");

let transactions = loadTransactions();
let editingId = null;

function loadTransactions() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function saveTransactions() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); return true; }
  catch { alert("Data gagal disimpan. Periksa penyimpanan browser kamu."); return false; }
}
function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function currentMonth() { return todayString().slice(0, 7); }
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(amount) || 0);
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
function loadBudget() {
  try {
    const budgets = JSON.parse(localStorage.getItem(BUDGET_KEY) || "{}");
    return budgets && typeof budgets === "object" ? budgets : {};
  } catch { return {}; }
}
function saveBudget(amount) {
  try {
    const budgets = loadBudget();
    budgets[currentMonth()] = amount;
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
    return true;
  } catch { alert("Anggaran gagal disimpan di browser."); return false; }
}
function getMonthlyTransactions() {
  return transactions.filter((item) => item.date && item.date.startsWith(currentMonth()));
}
function sumTransactions(list, type) {
  return list.filter((item) => item.type === type).reduce((total, item) => total + Number(item.amount), 0);
}
function renderSummary() {
  const income = sumTransactions(transactions, "pemasukan");
  const expense = sumTransactions(transactions, "pengeluaran");
  document.getElementById("totalIncome").textContent = formatRupiah(income);
  document.getElementById("totalExpense").textContent = formatRupiah(expense);
  document.getElementById("balance").textContent = formatRupiah(income - expense);
  const today = todayString();
  const dailyTransactions = transactions.filter((item) => item.date === today);
  const monthlyTransactions = getMonthlyTransactions();
  document.getElementById("dailyIncome").textContent = formatRupiah(sumTransactions(dailyTransactions, "pemasukan"));
  document.getElementById("dailyExpense").textContent = formatRupiah(sumTransactions(dailyTransactions, "pengeluaran"));
  const monthlyIncome = sumTransactions(monthlyTransactions, "pemasukan");
  const monthlyExpense = sumTransactions(monthlyTransactions, "pengeluaran");
  document.getElementById("monthlyIncome").textContent = formatRupiah(monthlyIncome);
  document.getElementById("monthlyExpense").textContent = formatRupiah(monthlyExpense);
  document.getElementById("monthlyBalance").textContent = formatRupiah(monthlyIncome - monthlyExpense);
}
function renderTransactions() {
  const list = document.getElementById("transactionList");
  const emptyMessage = document.getElementById("emptyMessage");
  const sortedTransactions = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  list.innerHTML = sortedTransactions.map((item) => {
    const typeLabel = item.type === "pemasukan" ? "Pemasukan" : "Pengeluaran";
    return `<tr>
      <td>${escapeHTML(item.date)}</td><td>${typeLabel}</td>
      <td>${escapeHTML(item.description)}</td><td>${escapeHTML(item.category)}</td>
      <td class="${item.type === "pemasukan" ? "income" : "expense"}">${formatRupiah(item.amount)}</td>
      <td><div class="action-buttons">
        <button class="edit-button" data-action="edit" data-id="${item.id}">Edit</button>
        <button class="delete-button" data-action="delete" data-id="${item.id}">Hapus</button>
      </div></td></tr>`;
  }).join("");
  emptyMessage.classList.toggle("hidden", transactions.length > 0);
}
function renderBudget() {
  const budgets = loadBudget();
  const budget = Number(budgets[currentMonth()] || 0);
  const monthlyExpense = sumTransactions(getMonthlyTransactions(), "pengeluaran");
  const info = document.getElementById("budgetInfo");
  const progress = document.getElementById("budgetProgress");
  const warning = document.getElementById("budgetWarning");
  const budgetInput = document.getElementById("budget");
  if (budget > 0) {
    budgetInput.value = budget;
    info.textContent = `Pengeluaran ${formatRupiah(monthlyExpense)} dari anggaran ${formatRupiah(budget)}.`;
    const percentage = (monthlyExpense / budget) * 100;
    progress.style.width = `${Math.min(percentage, 100)}%`;
    if (monthlyExpense >= budget) {
      warning.textContent = "Peringatan: anggaran bulanan sudah habis atau terlampaui!";
      progress.style.background = "#c0392b";
    } else if (percentage >= 80) {
      warning.textContent = "Perhatian: pengeluaran sudah mencapai minimal 80% dari anggaran.";
      progress.style.background = "#e39b25";
    } else {
      warning.textContent = "Pengeluaran masih dalam batas anggaran.";
      progress.style.background = "#2d995b";
    }
  } else {
    info.textContent = "Belum ada anggaran bulan ini.";
    progress.style.width = "0%";
    progress.style.background = "#2d995b";
    warning.textContent = "";
    budgetInput.value = "";
  }
}
function renderAll() { renderSummary(); renderTransactions(); renderBudget(); }
function resetForm() {
  editingId = null;
  form.reset();
  dateInput.value = todayString();
  document.getElementById("formTitle").textContent = "Tambah Transaksi";
  document.getElementById("saveButton").textContent = "Simpan Transaksi";
  document.getElementById("cancelEdit").classList.add("hidden");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;
  if (!description || !date || !Number.isFinite(amount) || amount <= 0) {
    alert("Periksa kembali data transaksi kamu."); return;
  }
  const transaction = {
    id: editingId ?? Date.now(), type: typeInput.value, description,
    category: categoryInput.value, amount, date
  };
  const previousTransactions = [...transactions];
  if (editingId !== null) transactions = transactions.map((item) => item.id === editingId ? transaction : item);
  else transactions.push(transaction);
  if (!saveTransactions()) { transactions = previousTransactions; return; }
  resetForm(); renderAll();
});
document.getElementById("cancelEdit").addEventListener("click", resetForm);

document.getElementById("transactionList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;
  if (button.dataset.action === "edit") {
    editingId = id;
    typeInput.value = transaction.type;
    descriptionInput.value = transaction.description;
    categoryInput.value = transaction.category;
    amountInput.value = transaction.amount;
    dateInput.value = transaction.date;
    document.getElementById("formTitle").textContent = "Edit Transaksi";
    document.getElementById("saveButton").textContent = "Simpan Perubahan";
    document.getElementById("cancelEdit").classList.remove("hidden");
    document.getElementById("formTitle").scrollIntoView({ behavior: "smooth" });
  }
  if (button.dataset.action === "delete") {
    if (!confirm(`Hapus transaksi "${transaction.description}"?`)) return;
    const previousTransactions = [...transactions];
    transactions = transactions.filter((item) => item.id !== id);
    if (!saveTransactions()) { transactions = previousTransactions; return; }
    if (editingId === id) resetForm();
    renderAll();
  }
});

document.getElementById("budgetForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(document.getElementById("budget").value);
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Masukkan anggaran yang lebih besar dari Rp0."); return;
  }
  if (saveBudget(amount)) { renderBudget(); alert("Anggaran bulanan berhasil disimpan."); }
});

dateInput.value = todayString();
renderAll();
