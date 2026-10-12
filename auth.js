const USERS_KEY = "keuanganku_demo_users";
const SESSION_KEY = "keuanganku_demo_session";

const authForm = document.getElementById("authForm");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const nameGroup = document.getElementById("nameGroup");
const confirmGroup = document.getElementById("confirmGroup");
const fullName = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirmPassword");
const message = document.getElementById("authMessage");
const title = document.getElementById("authTitle");
const subtitle = document.getElementById("authSubtitle");
const submitButton = document.getElementById("submitButton");
const switchText = document.getElementById("switchText");
const switchMode = document.getElementById("switchMode");

let mode = "login";

function getUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}

function showMessage(text, kind = "error") {
  message.textContent = text;
  message.className = `auth-message ${kind}`;
}

function setMode(nextMode) {
  mode = nextMode;
  const registering = mode === "register";
  nameGroup.classList.toggle("hidden", !registering);
  confirmGroup.classList.toggle("hidden", !registering);
  fullName.required = registering;
  confirmInput.required = registering;
  passwordInput.autocomplete = registering ? "new-password" : "current-password";
  loginTab.classList.toggle("active", !registering);
  registerTab.classList.toggle("active", registering);
  title.textContent = registering ? "Buat akun KeuanganKu" : "Selamat datang kembali";
  subtitle.textContent = registering
    ? "Buat akun demo untuk mulai mengatur keuangan."
    : "Masuk untuk melanjutkan ke dashboard keuanganmu.";
  submitButton.querySelector("span:first-child").textContent = registering ? "Buat akun" : "Masuk ke akun";
  switchText.firstChild.textContent = registering ? "Sudah punya akun? " : "Belum punya akun? ";
  switchMode.textContent = registering ? "Masuk" : "Buat akun";
  message.textContent = "";
  message.className = "auth-message";
}

async function hashPassword(password, salt) {
  // Hash ini hanya untuk demo browser, bukan pengganti autentikasi server.
  if (!crypto.subtle) throw new Error("Browser ini tidak mendukung fitur keamanan yang diperlukan. Gunakan browser modern melalui localhost.");
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function makeSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function startSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, startedAt: Date.now() }));
  window.location.href = "dashboard.html";
}

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));
switchMode.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));

function setupPasswordToggle(buttonId, input) {
  document.getElementById(buttonId).addEventListener("click", () => {
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    document.getElementById(buttonId).textContent = visible ? "Sembunyi" : "Lihat";
    document.getElementById(buttonId).setAttribute("aria-label", visible ? "Sembunyikan password" : "Tampilkan password");
  });
}
setupPasswordToggle("togglePassword", passwordInput);
setupPasswordToggle("toggleConfirm", confirmInput);

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const users = getUsers();

  if (password.length < 8) {
    showMessage("Password harus terdiri dari minimal 8 karakter.");
    return;
  }

  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Memproses...";

  try {
    if (mode === "register") {
      const name = fullName.value.trim();
      if (name.length < 2) {
        showMessage("Masukkan nama minimal 2 karakter.");
        return;
      }
      if (password !== confirmInput.value) {
        showMessage("Konfirmasi password belum sama.");
        return;
      }
      if (users.some((user) => user.email === email)) {
        showMessage("Email ini sudah terdaftar. Silakan masuk.");
        return;
      }
      const salt = makeSalt();
      const passwordHash = await hashPassword(password, salt);
      const user = { name, email, salt, passwordHash, createdAt: new Date().toISOString() };
      users.push(user);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      startSession(user);
    } else {
      const user = users.find((item) => item.email === email);
      if (!user) {
        showMessage("Akun tidak ditemukan. Periksa email atau buat akun baru.");
        return;
      }
      const passwordHash = await hashPassword(password, user.salt);
      if (passwordHash !== user.passwordHash) {
        showMessage("Password salah. Silakan coba lagi.");
        return;
      }
      startSession(user);
    }
  } catch (error) {
    showMessage(error.message || "Terjadi kesalahan. Coba lagi.");
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = mode === "register" ? "Buat akun" : "Masuk ke akun";
  }
});

try {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (session && getUsers().some((user) => user.email === session.email)) {
    window.location.replace("dashboard.html");
  }
} catch {
  localStorage.removeItem(SESSION_KEY);
}
