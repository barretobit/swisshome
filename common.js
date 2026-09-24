const API = "https://randata.onrender.com";
const APP_VERSION = "v0.2";

if (!document.getElementById("app-version")) {
  const el = document.createElement("div");
  el.id = "app-version";
  el.textContent = APP_VERSION;
  document.body.appendChild(el);
}

const session = {
  get userId() {
    const v = sessionStorage.getItem("sh_user_id");
    return v == null || v === "" ? null : Number(v);
  },
  set(userId) {
    sessionStorage.setItem("sh_user_id", String(userId));
  },
  get income() {
    const v = sessionStorage.getItem("sh_income");
    return v != null && v !== "" ? Number(v) : null;
  },
  setIncome(v) {
    if (v == null || v === "" || isNaN(Number(v))) sessionStorage.removeItem("sh_income");
    else sessionStorage.setItem("sh_income", String(Number(v)));
  },
  clear() {
    sessionStorage.removeItem("sh_user_id");
    sessionStorage.removeItem("sh_income");
  },
};

function requireAuth() {
  if (!session.userId) {
    location.replace("index.html");
    return null;
  }
  return session.userId;
}

function signOut() {
  session.clear();
  location.replace("index.html");
}

const JSON_HEADERS = { "Content-Type": "application/json" };

async function api(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  let res;
  try {
    res = await fetch(API + path, { ...opts, method });
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

async function authLogin(user, pass) {
  return api("/homes/auth/login", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ user, pass }) });
}

function listHomes() {
  return api("/homes?user_id=" + session.userId);
}
function getHome(id) {
  return api("/homes/" + encodeURIComponent(id));
}
function createHome(data) {
  return api("/homes", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) });
}
function updateHome(id, data) {
  return api("/homes/" + encodeURIComponent(id), { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(data) });
}
function deleteHome(id) {
  return api("/homes/" + encodeURIComponent(id), { method: "DELETE" });
}

const visitsApi = {
  list(homeId) {
    return api("/homes/" + encodeURIComponent(homeId) + "/visits");
  },
  create(homeId, data) {
    return api("/homes/" + encodeURIComponent(homeId) + "/visits", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) });
  },
  remove(homeId, visitId) {
    return api("/homes/" + encodeURIComponent(homeId) + "/visits/" + encodeURIComponent(visitId), { method: "DELETE" });
  },
};

const linksApi = {
  create(homeId, data) {
    return api("/homes/" + encodeURIComponent(homeId) + "/links", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) });
  },
  remove(homeId, linkId) {
    return api("/homes/" + encodeURIComponent(homeId) + "/links/" + encodeURIComponent(linkId), { method: "DELETE" });
  },
};

function idOf(obj) {
  return obj && (obj.home_id ?? obj.id ?? obj.visit_id ?? obj.link_id);
}

function childId(obj) {
  return obj && (obj.id ?? obj.link_id ?? obj.visit_id);
}

function listPayload(payload, key) {
  if (payload && Array.isArray(payload[key])) return payload[key];
  if (Array.isArray(payload)) return payload;
  return [];
}

function createdHomeId(res) {
  if (!res) return null;
  const direct = idOf(res);
  if (direct != null) return direct;
  if (res.home && typeof res.home === "object") return idOf(res.home);
  return null;
}

async function newestHomeId() {
  const list = await listHomes();
  const arr = listPayload(list, "homes");
  return arr.length ? idOf(arr[0]) : null;
}

function getIncome() {
  const v = session.income;
  return v != null && v > 0 ? v : null;
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

const STATUS_STYLE = {
  "Awaiting Information": "gray",
  "Reviewing Information": "gray",
  "Applied for Visit": "amber",
  "To Visit": "green",
  Rejected: "red",
  Thinking: "blue",
};

const STATUS_ORDER = ["Awaiting Information", "Reviewing Information", "Applied for Visit", "To Visit", "Thinking", "Rejected"];

function statusPicker(value, onChange) {
  let current = value || "";
  const wrap = document.createElement("span");
  wrap.className = "status-picker";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "badge status-btn";
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-label", "Change status");

  const menu = document.createElement("div");
  menu.className = "status-menu";
  menu.hidden = true;

  function renderLabel() {
    btn.className = "badge status-btn " + (STATUS_STYLE[current] || "gray");
    btn.textContent = current || "\u2014";
  }

  function renderItems() {
    menu.innerHTML = "";
    const add = (value, label) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "badge " + (STATUS_STYLE[value] || "gray");
      item.textContent = label;
      item.addEventListener("click", () => {
        close();
        if (value !== current) {
          current = value;
          renderLabel();
        }
        if (onChange) onChange(value);
      });
      menu.appendChild(item);
    };
    add("", "\u2014");
    STATUS_ORDER.forEach((s) => add(s, s));
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  function onDoc(e) {
    if (!wrap.contains(e.target)) close();
  }

  function open() {
    renderItems();
    const r = btn.getBoundingClientRect();
    menu.style.top = r.bottom + 6 + "px";
    menu.style.left = Math.min(r.left, window.innerWidth - 180) + "px";
    menu.hidden = false;
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    btn.setAttribute("aria-expanded", "true");
  }

  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    menu.innerHTML = "";
    document.removeEventListener("click", onDoc);
    document.removeEventListener("keydown", onKey);
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    menu.hidden ? open() : close();
  });
  btn.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      menu.hidden ? open() : close();
    }
  });

  wrap.appendChild(btn);
  wrap.appendChild(menu);
  renderLabel();

  return { el: wrap, set: (v) => { current = v || ""; renderLabel(); } };
}

function nowKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

function visitKey(v) {
  return v.date + "T" + (v.time || "00:00");
}

function nextVisit(visits) {
  const now = nowKey();
  const vs = (Array.isArray(visits) ? visits : []).filter((v) => v && v.date && visitKey(v) >= now);
  vs.sort((a, b) => (visitKey(a) < visitKey(b) ? -1 : 1));
  return vs[0] || null;
}

function fmtTime(t) {
  if (t == null || t === "") return "";
  const parts = String(t).split(":");
  return parts.length > 2 ? parts[0] + ":" + parts[1] : String(t);
}

function fmtVisit(v) {
  const d = new Date(visitKey(v));
  const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return date + (v.time ? ", " + fmtTime(v.time) : "");
}

function floorLabel(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n === 0) return "EG";
  if (n >= 1 && n <= 5) return String(n) + " OG";
  return String(n);
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