const state = { id: null, visits: [], links: [], serverVisitIds: new Set(), serverLinkIds: new Set() };

function $(id) {
  return document.getElementById(id);
}

function val(id) {
  return $(id).value.trim();
}

function num(id) {
  return parseNum($(id).value);
}

function fmtVisit(v) {
  const d = v.date ? new Date(v.date + "T" + (v.time || "00:00")) : null;
  const date = d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";
  return (date ? date : "") + (v.time ? ", " + v.time : "");
}

function updateHouseTypeUI() {
  const type = $("f-house-type").value;
  const wrap = $("house-floor-wrap");
  if (type === "Apartment" || type === "Duplex") {
    $("house-floor-label").textContent = "Floor";
    wrap.hidden = false;
  } else if (type === "House") {
    $("house-floor-label").textContent = "Floors";
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
  }
}

function updateGarageUI() {
  const has = $("f-garage").checked;
  const included = $("f-garage-included").checked;
  $("garage-extra").hidden = !has;
  $("garage-value-wrap").hidden = !has || included;
  if (!has) {
    $("f-garage-included").checked = false;
    $("f-garage-price").value = "";
  }
}

function renderVisits() {
  const el = $("visits-list");
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
    });
    row.appendChild(label);
    row.appendChild(del);
    el.appendChild(row);
  });
}

function renderLinks() {
  const el = $("docs-links-list");
  el.innerHTML = "";
  if (!state.links.length) {
    const p = document.createElement("p");
    p.className = "empty small";
    p.textContent = "No links yet.";
    el.appendChild(p);
    return;
  }
  state.links.forEach((l, i) => {
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
      state.links.splice(i, 1);
      renderLinks();
    });
    row.appendChild(info);
    row.appendChild(del);
    el.appendChild(row);
  });
}

function fillForm(home) {
  $("home-heading").textContent = home.title || "Edit home";
  $("f-title").value = home.title || "";
  $("f-street").value = home.street || "";
  $("f-zip").value = home.zip || "";
  $("f-city").value = home.city || "";
  $("f-canton").value = home.canton || "";
  $("f-price").value = home.price ?? "";
  $("f-size").value = home.size ?? "";
  $("f-rooms").value = home.rooms ?? "";
  $("f-built").value = home.built ?? "";
  $("f-renovated").value = home.renovated ?? "";
  $("f-house-type").value = home.house_type || "";
  $("f-floor").value = home.floor ?? "";
  $("f-url").value = home.url || "";
  $("f-main-image").value = home.main_image || "";
  $("f-status").value = home.status || "";
  $("f-notes").value = home.notes || "";
  $("f-realtor").value = home.realtor_name || "";
  $("f-realtor-phone").value = home.realtor_phone ? String(home.realtor_phone).replace(/\s+/g, "").replace(/^\+41/, "") : "";
  $("f-realtor-email").value = home.realtor_email || "";
  $("f-garage").checked = !!home.garage;
  $("f-garage-included").checked = !!home.garage_included;
  $("f-garage-price").value = home.garage_price ?? "";
  updateHouseTypeUI();
  updateGarageUI();
  state.visits = (Array.isArray(home.visits) ? home.visits : []).map((v) => ({ id: idOf(v), date: v.date, time: v.time }));
  state.serverVisitIds = new Set(state.visits.map((v) => v.id).filter((v) => v != null));
  renderVisits();
  const rawLinks = Array.isArray(home.links) ? home.links : [];
  state.links = rawLinks.map((l) => ({ id: idOf(l), title: l.title, url: l.url }));
  state.serverLinkIds = new Set(state.links.map((l) => l.id).filter((l) => l != null));
  renderLinks();
}

function collectHome() {
  const phoneRaw = $("f-realtor-phone").value.replace(/\s+/g, "").replace(/^\+41/, "");
  return {
    title: val("f-title"),
    street: val("f-street"),
    zip: val("f-zip"),
    city: val("f-city"),
    canton: val("f-canton"),
    price: num("f-price"),
    size: num("f-size"),
    rooms: num("f-rooms"),
    built: num("f-built"),
    renovated: num("f-renovated"),
    house_type: val("f-house-type") || null,
    floor: num("f-floor"),
    url: val("f-url") || null,
    main_image: val("f-main-image") || null,
    status: val("f-status") || null,
    notes: val("f-notes") || null,
    realtor_name: val("f-realtor") || null,
    realtor_phone: phoneRaw ? "+41" + phoneRaw : null,
    realtor_email: val("f-realtor-email") || null,
    garage: $("f-garage").checked ? 1 : 0,
    garage_included: $("f-garage-included").checked,
    garage_price: num("f-garage-price"),
  };
}

async function saveChildren(homeId) {
  const keptVisitIds = new Set(state.visits.map((v) => v.id).filter((v) => v != null));
  for (const id of state.serverVisitIds) {
    if (!keptVisitIds.has(id)) await visitsApi.remove(homeId, id);
  }
  for (const v of state.visits) {
    if (v.id == null) {
      await visitsApi.create(homeId, { date: v.date || null, time: v.time || null });
    }
  }
  const keptLinkIds = new Set(state.links.map((l) => l.id).filter((l) => l != null));
  for (const id of state.serverLinkIds) {
    if (!keptLinkIds.has(id)) await linksApi.remove(homeId, id);
  }
  for (const l of state.links) {
    if (l.id == null) {
      await linksApi.create(homeId, { title: l.title || null, url: l.url || null });
    }
  }
}

async function init() {
  if (!requireAuth()) return;
  const id = getParam("id");
  if (id) {
    state.id = Number(id);
    try {
      const res = await getHome(state.id);
      const home = res && res.home && typeof res.home === "object" ? res.home : res;
      fillForm(home);
    } catch (err) {
      toast(err.message, false);
      location.replace("homes.html");
      return;
    }
  } else {
    $("home-heading").textContent = "New home";
    $("f-title").focus();
    renderVisits();
    renderLinks();
  }
}

$("f-house-type").addEventListener("change", updateHouseTypeUI);
$("f-garage").addEventListener("change", updateGarageUI);
$("f-garage-included").addEventListener("change", updateGarageUI);

$("home-form").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const tag = e.target && e.target.tagName;
  if (tag === "TEXTAREA" || tag === "BUTTON") return;
  e.preventDefault();
});

$("btn-add-visit").addEventListener("click", () => {
  const date = $("v-date").value;
  const time = $("v-time").value;
  if (!date) {
    toast("Please pick a date.", false);
    return;
  }
  state.visits.push({ id: null, date, time });
  $("v-date").value = "";
  $("v-time").value = "";
  renderVisits();
});

$("btn-add-docs-link").addEventListener("click", () => {
  const title = $("dl-title").value.trim();
  const url = $("dl-url").value.trim();
  if (!url) {
    toast("Please enter a URL.", false);
    return;
  }
  state.links.push({ id: null, title, url });
  $("dl-title").value = "";
  $("dl-url").value = "";
  renderLinks();
});

$("home-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (["Apartment", "Duplex"].includes($("f-house-type").value) && $("f-floor").value === "") {
    toast("Please enter the floor.", false);
    return;
  }
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = "Saving\u2026";
  const data = collectHome();
  try {
    let homeId = state.id;
    if (homeId) {
      await updateHome(homeId, data);
    } else {
      const res = await createHome({ ...data, user_id: session.userId });
      homeId = createdHomeId(res) ?? (await newestHomeId());
      if (homeId == null) throw new Error("Could not determine the new home.");
    }
    await saveChildren(homeId);
    location.replace("home-view.html?id=" + encodeURIComponent(homeId));
  } catch (err) {
    toast(err.message, false);
    btn.disabled = false;
    btn.textContent = "Save home";
  }
});

$("btn-home-cancel").addEventListener("click", () => {
  if (state.id) location.replace("home-view.html?id=" + encodeURIComponent(state.id));
  else location.replace("homes.html");
});

init();