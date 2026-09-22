const state = { homes: [], query: "", hideRejected: false, sort: { key: null, dir: 1 } };

function sortKey(item, key) {
  const home = item.home;
  switch (key) {
    case "image":
      return home.main_image ? "0" : "1";
    case "title":
      return (home.title || "").toLowerCase();
    case "realtor":
      return (home.realtor_name || "").toLowerCase();
    case "phone":
      return (home.realtor_phone || "").toLowerCase();
    case "address":
      return [home.street, home.zip, home.city, home.canton].filter(Boolean).join(", ").toLowerCase();
    case "price":
      return home.price == null ? null : home.price;
    case "status": {
      const idx = home.status ? STATUS_ORDER.indexOf(home.status) : -1;
      return idx === -1 ? null : idx;
    }
    case "nextvisit": {
      const nv = nextVisit(item.visits);
      return nv ? visitKey(nv) : null;
    }
  }
}

function compareSort(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" || typeof b === "number") {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  }
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function sortedItems(list) {
  const { key, dir } = state.sort;
  if (!key) return list;
  const sorted = list.slice();
  sorted.sort((x, y) => {
    let c = compareSort(sortKey(x, key), sortKey(y, key));
    if (c === 0) c = compareSort((x.home.title || "").toLowerCase(), (y.home.title || "").toLowerCase());
    return c * dir;
  });
  return sorted;
}

function updateSortHeaders() {
  document.querySelectorAll("#homes-table th[data-sort]").forEach((th) => {
    const arrow = th.querySelector(".sort-arrow");
    if (!arrow) return;
    const key = th.getAttribute("data-sort");
    if (state.sort.key === key) {
      arrow.textContent = state.sort.dir === 1 ? "\u25B2" : "\u25BC";
      arrow.classList.add("active");
    } else {
      arrow.textContent = "\u21C5";
      arrow.classList.remove("active");
    }
  });
}

function wireSort() {
  document.querySelectorAll("#homes-table th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (state.sort.key === key) {
        if (state.sort.dir === 1) state.sort.dir = -1;
        else state.sort = { key: null, dir: 1 };
      } else {
        state.sort = { key, dir: 1 };
      }
      renderTable();
    });
  });
}

function renderVisits() {
  const body = document.getElementById("visits-body");
  body.innerHTML = "";
  const rows = [];
  state.homes.forEach((item) => {
    (Array.isArray(item.visits) ? item.visits : []).forEach((v) => {
      if (v.date && visitKey(v) >= nowKey()) rows.push({ home: item.home, v });
    });
  });
  rows.sort((a, b) => (visitKey(a.v) < visitKey(b.v) ? -1 : 1));
  document.getElementById("visits-empty").hidden = rows.length > 0;

  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const address = [r.home.street, [r.home.zip, r.home.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const cellProp = document.createElement("td");
    cellProp.textContent = r.home.title || "Untitled";
    const cellAddr = document.createElement("td");
    cellAddr.className = "muted";
    cellAddr.textContent = address || "\u2014";
    const cellRealtor = document.createElement("td");
    cellRealtor.textContent = r.home.realtor_name || "\u2014";
    const d = new Date(visitKey(r.v));
    const cellDate = document.createElement("td");
    cellDate.textContent = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const cellTime = document.createElement("td");
    cellTime.textContent = r.v.time || "\u2014";
    tr.appendChild(cellProp);
    tr.appendChild(cellAddr);
    tr.appendChild(cellRealtor);
    tr.appendChild(cellDate);
    tr.appendChild(cellTime);
    tr.addEventListener("click", () => location.href = "home-view.html?id=" + encodeURIComponent(idOf(r.home)));
    body.appendChild(tr);
  });
}

function renderTable() {
  const body = document.getElementById("homes-body");
  body.innerHTML = "";
  const empty = document.getElementById("empty-state");
  const query = state.query.trim().toLowerCase();
  let list = state.homes;
  if (state.hideRejected) list = list.filter((item) => item.home.status !== "Rejected");
  if (query)
    list = list.filter((item) =>
      [
        item.home.title,
        item.home.street,
        item.home.zip,
        item.home.city,
        item.home.canton,
        item.home.realtor_name,
        item.home.realtor_phone,
        item.home.realtor_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  list = sortedItems(list);
  const filtered = state.hideRejected && !query && !list.length && state.homes.length > 0;
  empty.textContent = filtered
    ? "All homes are hidden by the Hide Rejected filter."
    : query && !list.length
      ? "No homes match your search."
      : "No homes yet \u2014 add your first one.";
  empty.hidden = list.length > 0;

  list.forEach((item) => {
    const home = item.home;
    const tr = document.createElement("tr");
    const address = [home.street, [home.zip, home.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

    const cellImg = document.createElement("td");
    if (home.main_image && /^https?:\/\//i.test(home.main_image)) {
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = home.main_image;
      img.alt = (home.title || "Home") + " thumbnail";
      img.loading = "lazy";
      img.onerror = () => {
        img.style.display = "none";
      };
      cellImg.appendChild(img);
    }
    const cellTitle = document.createElement("td");
    cellTitle.className = "main-col";
    cellTitle.textContent = home.title || "Untitled";
    const cellAddress = document.createElement("td");
    cellAddress.className = "muted";
    const addrSpan = document.createElement("span");
    addrSpan.className = "truncate";
    addrSpan.textContent = address || "\u2014";
    if (address) addrSpan.title = address;
    cellAddress.appendChild(addrSpan);
    const cellPrice = document.createElement("td");
    cellPrice.className = "num";
    cellPrice.textContent = fmtPrice(home.price);
    const cellVisit = document.createElement("td");
    cellVisit.className = "muted";
    const nv = nextVisit(item.visits);
    cellVisit.textContent = nv ? fmtVisit(nv) : "\u2014";
    const cellRealtor = document.createElement("td");
    cellRealtor.textContent = home.realtor_name || "\u2014";
    const cellPhone = document.createElement("td");
    cellPhone.className = "muted";
    cellPhone.textContent = home.realtor_phone || "\u2014";
    const cellStatus = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge";
    const status = home.status || "";
    badge.textContent = status || "\u2014";
    if (status) badge.classList.add(STATUS_STYLE[status] || "gray");
    cellStatus.appendChild(badge);
    const cellActions = document.createElement("td");
    cellActions.className = "right";
    const btnDel = button("\uD83D\uDDD1", ["btn", "ghost", "sm", "danger"]);
    btnDel.title = "Delete home";
    btnDel.setAttribute("aria-label", "Delete home");
    btnDel.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      if (!confirm("Delete this home?")) return;
      try {
        await deleteHome(idOf(home));
        toast("Home deleted.");
        await load();
      } catch (err) {
        toast(err.message, false);
      }
    });
    cellActions.appendChild(btnDel);
    const btnEdit = button("Edit", ["btn", "ghost", "sm"]);
    btnEdit.addEventListener("click", (ev) => {
      ev.stopPropagation();
      location.href = "home.html?id=" + encodeURIComponent(idOf(home));
    });
    cellActions.appendChild(btnEdit);

    tr.appendChild(cellImg);
    tr.appendChild(cellTitle);
    tr.appendChild(cellRealtor);
    tr.appendChild(cellPhone);
    tr.appendChild(cellAddress);
    tr.appendChild(cellPrice);
    tr.appendChild(cellStatus);
    tr.appendChild(cellVisit);
    tr.appendChild(cellActions);
    tr.addEventListener("click", () => { location.href = "home-view.html?id=" + encodeURIComponent(idOf(home)); });
    body.appendChild(tr);
  });

  updateSortHeaders();
  renderVisits();
}

async function load() {
  const empty = document.getElementById("empty-state");
  empty.hidden = false;
  empty.textContent = "Loading\u2026";
  try {
    const list = await listHomes();
    const items = await Promise.all(
      listPayload(list, "homes").map(async (home) => {
        try {
          const vres = await visitsApi.list(idOf(home));
          return { home, visits: listPayload(vres, "visits") };
        } catch {
          return { home, visits: [] };
        }
      })
    );
    state.homes = items;
  } catch (err) {
    toast(err.message, false);
    state.homes = [];
  }
  renderTable();
}

document.getElementById("btn-add").addEventListener("click", () => {
  location.href = "home.html";
});

document.getElementById("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  renderTable();
});

document.getElementById("hide-rejected").addEventListener("change", (e) => {
  state.hideRejected = e.target.checked;
  renderTable();
});

const BACKUP_HOME_COLUMNS = [
  "id", "user_id", "title", "street", "zip", "city", "canton", "price", "size", "rooms",
  "built", "renovated", "house_type", "floor", "url", "main_image", "status", "notes",
  "realtor_name", "realtor_phone", "realtor_email", "garage", "garage_included", "garage_price",
];
const BACKUP_VISIT_COLUMNS = ["id", "home_id", "date", "time"];
const BACKUP_LINK_COLUMNS = ["id", "home_id", "title", "url"];

function sqlLit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function sqlInsert(table, columns, row) {
  return "INSERT INTO " + table + " (" + columns.join(", ") + ") VALUES (" + columns.map((c) => sqlLit(row[c])).join(", ") + ");";
}

function backupCreateSql() {
  return [
    "CREATE TABLE IF NOT EXISTS homes (",
    "  id TEXT PRIMARY KEY,",
    "  user_id INTEGER,",
    "  title TEXT,",
    "  street TEXT,",
    "  zip TEXT,",
    "  city TEXT,",
    "  canton TEXT,",
    "  price REAL,",
    "  size REAL,",
    "  rooms REAL,",
    "  built TEXT,",
    "  renovated TEXT,",
    "  house_type TEXT,",
    "  floor TEXT,",
    "  url TEXT,",
    "  main_image TEXT,",
    "  status TEXT,",
    "  notes TEXT,",
    "  realtor_name TEXT,",
    "  realtor_phone TEXT,",
    "  realtor_email TEXT,",
    "  garage INTEGER,",
    "  garage_included INTEGER,",
    "  garage_price REAL",
    ");",
    "CREATE TABLE IF NOT EXISTS visits (",
    "  id TEXT PRIMARY KEY,",
    "  home_id TEXT,",
    "  date TEXT,",
    "  time TEXT",
    ");",
    "CREATE TABLE IF NOT EXISTS links (",
    "  id TEXT PRIMARY KEY,",
    "  home_id TEXT,",
    "  title TEXT,",
    "  url TEXT",
    ");",
  ].join("\n");
}

async function buildBackupSql() {
  const base = listPayload(await listHomes(), "homes");
  const homes = await Promise.all(
    base.map(async (home) => {
      try {
        return await getHome(idOf(home));
      } catch {
        const cached = state.homes.find((it) => idOf(it.home) === idOf(home));
        return { ...home, visits: cached ? cached.visits : [] };
      }
    })
  );

  const lines = [
    "-- Swiss Home backup",
    "-- Generated: " + new Date().toISOString(),
    "-- Homes: " + homes.length,
    "",
    "BEGIN;",
    "",
    backupCreateSql(),
    "",
  ];

  homes.forEach((h) => {
    const homeId = idOf(h);
    const homeRow = { ...h, id: homeId, user_id: h.user_id ?? session.userId };
    lines.push(sqlInsert("homes", BACKUP_HOME_COLUMNS, homeRow));
    (Array.isArray(h.visits) ? h.visits : []).forEach((v) => {
      lines.push(sqlInsert("visits", BACKUP_VISIT_COLUMNS, { ...v, id: idOf(v), home_id: homeId }));
    });
    (Array.isArray(h.links) ? h.links : []).forEach((l) => {
      lines.push(sqlInsert("links", BACKUP_LINK_COLUMNS, { ...l, id: idOf(l), home_id: homeId }));
    });
  });

  lines.push("");
  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function backupStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

const backupModal = document.getElementById("backup-modal");

function openBackupModal() {
  backupModal.hidden = false;
}

function closeBackupModal() {
  backupModal.hidden = true;
}

document.getElementById("btn-backup").addEventListener("click", openBackupModal);
document.getElementById("backup-modal-cancel").addEventListener("click", closeBackupModal);
backupModal.addEventListener("click", (e) => {
  if (e.target.id === "backup-modal") closeBackupModal();
});

document.getElementById("backup-modal-ok").addEventListener("click", async () => {
  closeBackupModal();
  const btn = document.getElementById("btn-backup");
  btn.disabled = true;
  btn.textContent = "Preparing\u2026";
  try {
    const sql = await buildBackupSql();
    downloadText("swisshome_backup_" + backupStamp() + ".sql", sql, "application/sql");
    toast("Backup downloaded.");
  } catch (err) {
    toast(err.message, false);
  } finally {
    btn.disabled = false;
    btn.textContent = "Download Backup";
  }
});

document.getElementById("btn-signout").addEventListener("click", signOut);

wireSort();

function init() {
  if (!requireAuth()) return;
  load();
}

init();