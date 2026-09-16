const state = { code: "", id: null, visits: [] };

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
    try {
      const res = await getFile(creds.user, creds.password, code);
      const data = res && res.json && typeof res.json === "object" ? res.json : {};
      saved = Array.isArray(data.homes) ? data.homes : [];
    } catch (err) {
      if (err.message === "Invalid credentials.") {
        signOut();
        return;
      }
      toast(err.message, false);
    }
    homes = saved;
    setDraft(code, { name: "", homes });
  }
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
});

document.getElementById("home-form").addEventListener("submit", (e) => {
  e.preventDefault();
  let d = getDraft(state.code);
  if (Array.isArray(d)) d = { name: "", homes: d };
  d = d || { name: "", homes: [] };
  const homes = Array.isArray(d.homes) ? d.homes : [];
  const phoneRaw = document.getElementById("f-realtor-phone").value.replace(/\s+/g, "").replace(/^\+41/, "");
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
  };
  const i = homes.findIndex((h) => h.id === home.id);
  if (i >= 0) homes[i] = home;
  else homes.push(home);
  d.homes = homes;
  setDraft(state.code, d);
  location.replace("file.html?code=" + encodeURIComponent(state.code));
});

document.getElementById("btn-home-cancel").addEventListener("click", () => {
  location.replace("file.html?code=" + encodeURIComponent(state.code));
});

init();