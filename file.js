const state = { code: "", name: "", homes: [], settings: { combinedIncome: null }, query: "", sort: { key: null, dir: 1 } };

let saveTimer = null;
let saving = false;

const STATUS_STYLE = {
  "Awaiting Information": "gray",
  "Applied for Visit": "amber",
  "In Contact": "blue",
  "To Visit": "green",
  Rejected: "red",
  Thinking: "amber",
};

const STATUS_ORDER = ["Awaiting Information", "In Contact", "Applied for Visit", "To Visit", "Thinking", "Rejected"];

function saveDraft() {
  setDraft(state.code, { name: state.name, homes: state.homes, settings: state.settings });
}

function setTitle() {
  document.getElementById("file-title").textContent = state.name || state.code;
}

function updateSaveState() {
  const el = document.getElementById("save-state");
  if (!el) return;
  el.textContent = saving ? "Saving\u2026" : "All changes saved";
  el.classList.toggle("dirty", saving);
}

function payload() {
  return { name: state.name, homes: state.homes, settings: state.settings };
}

async function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  saveDraft();
  saving = true;
  updateSaveState();
  try {
    await saveFile(session.user, session.password, state.code, payload());
  } catch (err) {
    toast(err.message, false);
  } finally {
    saving = false;
    updateSaveState();
  }
}

function persist() {
  saveDraft();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 500);
}

async function go(url) {
  await flushSave();
  location.href = url;
}

async function goHome(i) {
  await flushSave();
  const id = i >= 0 ? "&id=" + encodeURIComponent(state.homes[i].id) : "";
  location.href = "home.html?code=" + encodeURIComponent(state.code) + id;
}

async function goView(i) {
  await flushSave();
  location.href = "home-view.html?code=" + encodeURIComponent(state.code) + "&id=" + encodeURIComponent(state.homes[i].id);
}

function nowKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

function visitKey(v) {
  return v.date + "T" + (v.time || "00:00");
}

function nextVisit(home) {
  const now = nowKey();
  const vs = (Array.isArray(home.visits) ? home.visits : []).filter((v) => v && v.date && visitKey(v) >= now);
  vs.sort((a, b) => (visitKey(a) < visitKey(b) ? -1 : 1));
  return vs[0] || null;
}

function fmtVisitCell(v) {
  const d = new Date(visitKey(v));
  const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return date + (v.time ? ", " + v.time : "");
}

function sortKey(home, key) {
  switch (key) {
    case "image":
      return home.mainImage ? "0" : "1";
    case "title":
      return (home.title || "").toLowerCase();
    case "realtor":
      return (home.realtorName || "").toLowerCase();
    case "phone":
      return (home.realtorPhone || "").toLowerCase();
    case "address":
      return [home.street, home.zip, home.city, home.canton].filter(Boolean).join(", ").toLowerCase();
    case "price":
      return home.price == null ? null : home.price;
    case "status": {
      const idx = home.status ? STATUS_ORDER.indexOf(home.status) : -1;
      return idx === -1 ? null : idx;
    }
    case "nextvisit": {
      const nv = nextVisit(home);
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

function sortList(list) {
  const { key, dir } = state.sort;
  if (!key) return list;
  const sorted = list.slice();
  sorted.sort((x, y) => {
    let c = compareSort(sortKey(x, key), sortKey(y, key));
    if (c === 0) c = compareSort((x.title || "").toLowerCase(), (y.title || "").toLowerCase());
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
  state.homes.forEach((home) => {
    (Array.isArray(home.visits) ? home.visits : []).forEach((v) => {
      if (v.date && visitKey(v) >= nowKey()) rows.push({ home, v });
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
    cellRealtor.textContent = r.home.realtorName || "\u2014";
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
    tr.addEventListener("click", () => goView(state.homes.indexOf(r.home)));
    body.appendChild(tr);
  });
}

function renderTable() {
  const body = document.getElementById("homes-body");
  body.innerHTML = "";
  const empty = document.getElementById("empty-state");
  const query = state.query.trim().toLowerCase();
  let list = query
    ? state.homes.filter((h) =>
        [
          h.title,
          h.street,
          h.zip,
          h.city,
          h.canton,
          h.realtorName,
          h.realtorPhone,
          h.realtorEmail,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
    : state.homes;
  list = sortList(list);
  empty.textContent = query && !list.length ? "No homes match your search." : "No homes yet \u2014 add your first one.";
  empty.hidden = list.length > 0;

  list.forEach((home) => {
    const i = state.homes.indexOf(home);
    const tr = document.createElement("tr");
    const address = [home.street, [home.zip, home.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

    const cellImg = document.createElement("td");
    if (home.mainImage && /^https?:\/\//i.test(home.mainImage)) {
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = home.mainImage;
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
    cellAddress.textContent = address || "\u2014";
    const cellPrice = document.createElement("td");
    cellPrice.className = "num";
    cellPrice.textContent = fmtPrice(home.price);
    const cellVisit = document.createElement("td");
    cellVisit.className = "muted";
    const nv = nextVisit(home);
    cellVisit.textContent = nv ? fmtVisitCell(nv) : "\u2014";
    const cellRealtor = document.createElement("td");
    cellRealtor.textContent = home.realtorName || "\u2014";
    const cellPhone = document.createElement("td");
    cellPhone.className = "muted";
    cellPhone.textContent = home.realtorPhone || "\u2014";
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
    btnDel.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (!confirm("Delete this home?")) return;
      state.homes.splice(i, 1);
      renderTable();
      persist();
    });
    cellActions.appendChild(btnDel);

    tr.appendChild(cellImg);
    tr.appendChild(cellTitle);
    tr.appendChild(cellRealtor);
    tr.appendChild(cellPhone);
    tr.appendChild(cellAddress);
    tr.appendChild(cellPrice);
    tr.appendChild(cellStatus);
    tr.appendChild(cellVisit);
    tr.appendChild(cellActions);
    tr.addEventListener("click", () => goView(i));
    body.appendChild(tr);
  });

  updateSortHeaders();
  updateSaveState();
  renderVisits();
}

function wireMeta() {
  const nameEl = document.getElementById("f-name");
  const codeEl = document.getElementById("f-code");
  nameEl.addEventListener("input", () => {
    state.name = nameEl.value.trim();
    setTitle();
    persist();
  });
  codeEl.addEventListener("change", async () => {
    const newCode = codeEl.value.trim();
    if (!newCode) {
      codeEl.value = state.code;
      return;
    }
    if (newCode === state.code) return;
    await flushSave();
    const data = payload();
    try {
      await createFile(session.user, session.password, newCode, data);
      await deleteFile(session.user, session.password, state.code);
      clearDraft(state.code);
      const names = getNames();
      delete names[state.code];
      if (state.name) names[newCode] = state.name;
      else delete names[newCode];
      setNames(names);
      state.code = newCode;
      setDraft(newCode, data);
      history.replaceState(null, "", "file.html?code=" + encodeURIComponent(newCode));
    } catch (err) {
      toast(err.message, false);
      codeEl.value = state.code;
    }
  });
  document.getElementById("f-income").addEventListener("input", (e) => {
    state.settings.combinedIncome = parseNum(e.target.value);
    persist();
  });
}

const btnEdit = document.getElementById("btn-edit");
const metaCard = document.getElementById("file-meta");
btnEdit.addEventListener("click", () => {
  const open = metaCard.hidden;
  metaCard.hidden = !open;
  btnEdit.textContent = open ? "Done" : "Edit";
  if (open) document.getElementById("f-name").focus();
});

document.getElementById("btn-back").addEventListener("click", () => go("files.html"));
document.getElementById("btn-add").addEventListener("click", () => goHome(-1));

document.getElementById("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  renderTable();
});

async function init() {
  const creds = requireAuth();
  if (!creds) return;
  const code = getParam("code");
  if (!code) {
    location.replace("files.html");
    return;
  }
  state.code = code;

  const empty = document.getElementById("empty-state");
  empty.hidden = false;
  empty.textContent = "Loading\u2026";

  const draft = getDraft(code);
  let homes;
  if (draft) {
    const arr = Array.isArray(draft);
    homes = arr ? draft : draft.homes || [];
    state.name = arr ? "" : draft.name || "";
    state.settings = arr || !draft.settings ? { combinedIncome: null } : draft.settings;
  } else {
    try {
      const res = await getFile(creds.user, creds.password, code);
      const data = res && res.json && typeof res.json === "object" ? res.json : {};
      homes = Array.isArray(data.homes) ? data.homes : [];
      state.name = typeof data.name === "string" ? data.name : "";
      state.settings = data.settings || { combinedIncome: null };
    } catch (err) {
      if (err.message === "Invalid credentials.") {
        signOut();
        return;
      }
      toast(err.message, false);
      homes = [];
      state.name = "";
      state.settings = { combinedIncome: null };
    }
  }
  state.homes = homes;

  wireMeta();
  wireSort();
  document.getElementById("f-code").value = state.code;
  document.getElementById("f-name").value = state.name;
  document.getElementById("f-income").value = state.settings.combinedIncome ?? "";
  setTitle();
  renderTable();
}

init();