const state = { code: "", id: null, visits: [], docsLinks: [], homes: [], name: "", settings: {} };

function currentData() {
  const d = getDraft(state.code);
  if (Array.isArray(d)) return { name: state.name, homes: d, settings: state.settings };
  if (d) return d;
  return { name: state.name, homes: state.homes, settings: state.settings };
}

async function persistHome() {
  try {
    await saveFile(session.user, session.password, state.code, currentData());
  } catch (err) {
    toast(err.message, false);
  }
}

function syncVisits() {
  if (!state.id) return;
  const d = getDraft(state.code);
  if (!d) return;
  const homes = Array.isArray(d) ? d : d.homes || [];
  const home = homes.find((h) => h.id === state.id);
  if (!home) return;
  home.visits = state.visits.map((v) => ({ ...v }));
  if (Array.isArray(d)) setDraft(state.code, homes);
  else setDraft(state.code, d);
  persistHome();
}

function fmtVisit(v) {
  const d = v.date ? new Date(v.date + "T" + (v.time || "00:00")) : null;
  const date = d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
  return (date ? date : "") + (v.time ? ", " + v.time : "");
}

function fillForm(home) {
  document.getElementById("home-heading").textContent = home.title || "Edit home";
  document.getElementById("f-title").value = home.title || "";
  document.getElementById("f-street").value = home.street || "";
  document.getElementById("f-zip").value = home.zip || "";
  document.getElementById("f-city").value = home.city || "";
  document.getElementById("f-canton").value = home.canton || "";
  document.getElementById("f-price").value = home.price ?? "";
  document.getElementById("f-size").value = home.size ?? "";
  document.getElementById("f-rooms").value = home.rooms ?? "";
  document.getElementById("f-built").value = home.built ?? "";
  document.getElementById("f-renovated").value = home.renovated ?? "";
  document.getElementById("f-house-type").value = home.houseType || "";
  document.getElementById("f-floor").value = "";
  document.getElementById("f-floors").value = "";
  if (home.houseType === "House") {
    document.getElementById("f-floors").value = home.floor ?? "";
  } else if (home.houseType === "Apartment" || home.houseType === "Duplex") {
    let floorVal = home.floor;
    if (typeof floorVal === "number") floorVal = floorVal === 0 ? "EG" : String(floorVal) + " OG";
    document.getElementById("f-floor").value = floorVal ?? "";
  }
  updateHouseTypeUI();
  document.getElementById("f-url").value = home.url || "";
  document.getElementById("f-main-image").value = home.mainImage || "";
  document.getElementById("f-status").value = home.status || "";
  document.getElementById("f-notes").value = home.notes || "";
  document.getElementById("f-realtor").value = home.realtorName || "";
  document.getElementById("f-realtor-phone").value = home.realtorPhone ? String(home.realtorPhone).replace(/\s+/g, "").replace(/^\+41/, "") : "";
  document.getElementById("f-realtor-email").value = home.realtorEmail || "";
  document.getElementById("f-garage").checked = !!home.garage;
  document.getElementById("f-garage-included").checked = !!home.garageIncluded;
  document.getElementById("f-garage-price").value = home.garagePrice ?? "";
  updateGarageUI();
  state.visits = Array.isArray(home.visits) ? home.visits.map((v) => ({ ...v })) : [];
  renderVisits();
  state.docsLinks = Array.isArray(home.docsLinks) ? home.docsLinks.map((l) => ({ ...l })) : [];
  renderDocsLinks();
}

function renderDocsLinks() {
  const el = document.getElementById("docs-links-list");
  el.innerHTML = "";
  if (!state.docsLinks.length) {
    const p = document.createElement("p");
    p.className = "empty small";
    p.textContent = "No links yet.";
    el.appendChild(p);
    return;
  }
  state.docsLinks.forEach((l, i) => {
    const row = document.createElement("div");
    row.className = "link-row";
    const info = document.createElement("div");
    const title = document.createElement("div");
    title.className = "link-title";
    title.textContent = l.title || l.url || "Link";
    info.appendChild(title);
    if (l.url) {
      const url = document.createElement("div");
      url.className = "link-url";
      url.textContent = l.url;
      info.appendChild(url);
    }
    const del = button("Remove", ["btn", "ghost", "sm", "danger"]);
    del.addEventListener("click", () => {
      state.docsLinks.splice(i, 1);
      renderDocsLinks();
    });
    row.appendChild(info);
    row.appendChild(del);
    el.appendChild(row);
  });
}

function renderVisits() {
  const el = document.getElementById("visits-list");
  el.innerHTML = "";
  if (!state.visits.length) {
    const p = document.createElement("p");
    p.className = "empty small";
    p.textContent = "No visits yet.";
    el.appendChild(p);
    return;
  }
  state.visits.sort((a, b) => ((a.date + a.time || "") < (b.date + b.time || "") ? -1 : 1));
  state.visits.forEach((v, i) => {
    const row = document.createElement("div");
    row.className = "visit-row";
    const label = document.createElement("span");
    label.textContent = fmtVisit(v);
    const del = button("Remove", ["btn", "ghost", "sm", "danger"]);
    del.addEventListener("click", () => {
      state.visits.splice(i, 1);
      renderVisits();
      syncVisits();
    });
    row.appendChild(label);
    row.appendChild(del);
    el.appendChild(row);
  });
}

async function init() {
  const creds = requireAuth();
  if (!creds) return;
  const code = getParam("code");
  if (!code) {
    location.replace("files.html");
    return;
  }
  state.code = code;
  state.id = getParam("id");
  let d = getDraft(code);
  let homes = d ? (Array.isArray(d) ? d : d.homes || []) : null;
  if (!homes) {
    let saved = [];
    let name = "";
    let settings = {};
    try {
      const res = await getFile(creds.user, creds.password, code);
      const data = res && res.json && typeof res.json === "object" ? res.json : {};
      saved = Array.isArray(data.homes) ? data.homes : [];
      name = typeof data.name === "string" ? data.name : "";
      settings = data.settings || {};
    } catch (err) {
      if (err.message === "Invalid credentials.") {
        signOut();
        return;
      }
      toast(err.message, false);
    }
    homes = saved;
    state.name = name;
    state.settings = settings;
    setDraft(code, { name, homes, settings });
  } else if (Array.isArray(d)) {
    state.name = "";
    state.settings = {};
  } else {
    state.name = d.name || "";
    state.settings = d.settings || {};
  }
  state.homes = homes;
  if (state.id) {
    const home = homes.find((h) => h.id === state.id);
    if (home) {
      fillForm(home);
    } else {
      location.replace("file.html?code=" + encodeURIComponent(code));
    }
  } else {
    document.getElementById("home-heading").textContent = "New home";
    document.getElementById("f-title").focus();
    state.visits = [];
    renderVisits();
    state.docsLinks = [];
    renderDocsLinks();
  }
}

function updateGarageUI() {
  const has = document.getElementById("f-garage").checked;
  const included = document.getElementById("f-garage-included").checked;
  document.getElementById("garage-extra").hidden = !has;
  document.getElementById("garage-value-wrap").hidden = !has || included;
  if (!has) {
    document.getElementById("f-garage-included").checked = false;
    document.getElementById("f-garage-price").value = "";
  }
}

function updateHouseTypeUI() {
  const type = document.getElementById("f-house-type").value;
  const wrap = document.getElementById("house-floor-wrap");
  const floorSel = document.getElementById("f-floor");
  const floorsInp = document.getElementById("f-floors");
  if (type === "Apartment" || type === "Duplex") {
    document.getElementById("house-floor-label").textContent = "Floor";
    floorSel.hidden = false;
    floorsInp.hidden = true;
    wrap.hidden = false;
  } else if (type === "House") {
    document.getElementById("house-floor-label").textContent = "Floors";
    floorSel.hidden = true;
    floorsInp.hidden = false;
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
  }
}

document.getElementById("f-house-type").addEventListener("change", updateHouseTypeUI);

document.getElementById("home-form").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const tag = e.target && e.target.tagName;
  if (tag === "TEXTAREA" || tag === "BUTTON") return;
  e.preventDefault();
});

document.getElementById("f-garage").addEventListener("change", updateGarageUI);
document.getElementById("f-garage-included").addEventListener("change", updateGarageUI);

document.getElementById("btn-add-visit").addEventListener("click", () => {
  const date = document.getElementById("v-date").value;
  const time = document.getElementById("v-time").value;
  if (!date) {
    toast("Please pick a date.", false);
    return;
  }
  state.visits.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), date, time });
  document.getElementById("v-date").value = "";
  document.getElementById("v-time").value = "";
  renderVisits();
  syncVisits();
});

document.getElementById("btn-add-docs-link").addEventListener("click", () => {
  const title = document.getElementById("dl-title").value.trim();
  const url = document.getElementById("dl-url").value.trim();
  if (!url) {
    toast("Please enter a URL.", false);
    return;
  }
  state.docsLinks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title, url });
  document.getElementById("dl-title").value = "";
  document.getElementById("dl-url").value = "";
  renderDocsLinks();
});

document.getElementById("home-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  let d = getDraft(state.code);
  if (Array.isArray(d)) d = { name: state.name, homes: d, settings: state.settings };
  d = d || { name: state.name, homes: [], settings: state.settings };
  d.name = d.name || state.name;
  d.settings = d.settings || state.settings;
  const homes = Array.isArray(d.homes) ? d.homes : [];
  const phoneRaw = document.getElementById("f-realtor-phone").value.replace(/\s+/g, "").replace(/^\+41/, "");
  const ht = document.getElementById("f-house-type").value;
  const floorRaw = ht === "House" ? document.getElementById("f-floors").value : document.getElementById("f-floor").value;
  if ((ht === "Apartment" || ht === "Duplex") && !floorRaw) {
    toast("Please select the floor.", false);
    return;
  }
  const home = {
    id: state.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title: document.getElementById("f-title").value.trim(),
    street: document.getElementById("f-street").value.trim(),
    zip: document.getElementById("f-zip").value.trim(),
    city: document.getElementById("f-city").value.trim(),
    canton: document.getElementById("f-canton").value,
    price: parseNum(document.getElementById("f-price").value),
    size: parseNum(document.getElementById("f-size").value),
    rooms: parseNum(document.getElementById("f-rooms").value),
    built: parseNum(document.getElementById("f-built").value),
    renovated: parseNum(document.getElementById("f-renovated").value),
    houseType: ht,
    floor: ht === "House" ? parseNum(floorRaw) : floorRaw,
    url: document.getElementById("f-url").value.trim(),
    mainImage: document.getElementById("f-main-image").value.trim(),
    status: document.getElementById("f-status").value,
    notes: document.getElementById("f-notes").value.trim(),
    realtorName: document.getElementById("f-realtor").value.trim(),
    realtorPhone: phoneRaw ? "+41" + phoneRaw : "",
    realtorEmail: document.getElementById("f-realtor-email").value.trim(),
    garage: document.getElementById("f-garage").checked,
    garageIncluded: document.getElementById("f-garage-included").checked,
    garagePrice: parseNum(document.getElementById("f-garage-price").value),
    visits: state.visits.map((v) => ({ ...v })),
    docsLinks: state.docsLinks.map((l) => ({ ...l })),
  };
  const i = homes.findIndex((h) => h.id === home.id);
  if (i >= 0) homes[i] = home;
  else homes.push(home);
  d.homes = homes;
  setDraft(state.code, d);
  state.homes = homes;
  try {
    await saveFile(session.user, session.password, state.code, d);
  } catch (err) {
    toast(err.message, false);
    return;
  }
  location.replace("home-view.html?code=" + encodeURIComponent(state.code) + "&id=" + encodeURIComponent(home.id));
});

document.getElementById("btn-home-cancel").addEventListener("click", () => {
  if (state.id) {
    location.replace("home-view.html?code=" + encodeURIComponent(state.code) + "&id=" + encodeURIComponent(state.id));
  } else {
    location.replace("file.html?code=" + encodeURIComponent(state.code));
  }
});

init();