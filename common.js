const API = "https://randombit.tail541a06.ts.net";
const APP_VERSION = "v0.1";

if (!document.getElementById("app-version")) {
  const versionEl = document.createElement("div");
  versionEl.id = "app-version";
  versionEl.textContent = APP_VERSION;
  document.body.appendChild(versionEl);
}

const session = {
  get user() {
    return sessionStorage.getItem("sh_user") || "";
  },
  get password() {
    return sessionStorage.getItem("sh_pass") || "";
  },
  set(user, password) {
    sessionStorage.setItem("sh_user", user);
    sessionStorage.setItem("sh_pass", password);
  },
  clear() {
    sessionStorage.removeItem("sh_user");
    sessionStorage.removeItem("sh_pass");
  },
};

const JSON_HEADERS = { "Content-Type": "application/json" };

async function api(path, opts = {}) {
  let res;
  try {
    res = await fetch(API + path, { ...opts, cache: "no-store" });
  } catch {
    throw new Error("Cannot reach the server. Check your connection.");
  }
  let body = null;
  try {
    body = await res.json();
  } catch {}
  if (!res.ok) {
    let msg = "Request failed.";
    if (body && typeof body.detail === "string") msg = body.detail;
    else if (body && body.detail) msg = "Invalid request.";
    throw new Error(msg);
  }
  return body;
}

function login(user, password) {
  return api("/storage/auth", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ user, password }) });
}
function listFiles(user, password) {
  return api("/storage/list?user=" + encodeURIComponent(user) + "&password=" + encodeURIComponent(password));
}
function createFile(user, password, code, data) {
  return api("/storage/create", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ user, password, code, data }) });
}
function getFile(user, password, code) {
  return api("/storage/" + encodeURIComponent(code) + "?user=" + encodeURIComponent(user) + "&password=" + encodeURIComponent(password));
}
function saveFile(user, password, code, data) {
  return api("/storage/" + encodeURIComponent(code), { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify({ user, password, data }) });
}
function deleteFile(user, password, code) {
  return api("/storage/" + encodeURIComponent(code), { method: "DELETE", headers: JSON_HEADERS, body: JSON.stringify({ user, password }) });
}

function requireAuth() {
  if (!session.user || !session.password) {
    location.replace("index.html");
    return null;
  }
  return { user: session.user, password: session.password };
}

function signOut() {
  session.clear();
  Object.keys(sessionStorage)
    .filter((k) => String(k).startsWith("sh_draft_"))
    .forEach((k) => sessionStorage.removeItem(k));
  location.replace("index.html");
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function draftKey(code) {
  return "sh_draft_" + code;
}
function getDraft(code) {
  try {
    const raw = sessionStorage.getItem(draftKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setDraft(code, homes) {
  sessionStorage.setItem(draftKey(code), JSON.stringify(homes));
}
function clearDraft(code) {
  sessionStorage.removeItem(draftKey(code));
}

function getNames() {
  try {
    return JSON.parse(localStorage.getItem("sh_names") || "{}");
  } catch {
    return {};
  }
}
function setNames(names) {
  localStorage.setItem("sh_names", JSON.stringify(names));
}

let toastTimer;
function toast(msg, ok = true) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "show" + (ok ? "" : " err");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 3200);
}

function button(text, classes) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = classes.join(" ");
  b.textContent = text;
  return b;
}

function parseNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}
function fmtPrice(v) {
  return v != null ? "CHF " + Number(v).toLocaleString("en-CH", { maximumFractionDigits: 0 }) : "\u2014";
}
function fmtSize(v) {
  return v != null ? Number(v) + " m\u00b2" : "\u2014";
}
function fmtRooms(v) {
  return v != null ? String(Number(v)) : "\u2014";
}