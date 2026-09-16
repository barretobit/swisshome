const state = { code: "", id: null };

function detailRow(label, value) {
  const row = document.createElement("div");
  row.className = "detail";
  const l = document.createElement("span");
  l.className = "detail-label";
  l.textContent = label;
  const v = document.createElement("div");
  v.className = "detail-value";
  if (typeof value === "string") v.textContent = value;
  else if (value instanceof Node) v.appendChild(value);
  row.appendChild(l);
  row.appendChild(v);
  return row;
}

function mapFrame(src) {
  const frame = document.createElement("iframe");
  frame.className = "map-frame";
  frame.loading = "lazy";
  frame.src = src;
  return frame;
}

function render(home) {
  document.getElementById("v-title").textContent = home.title || "Untitled";

  const details = document.getElementById("v-details");
  details.innerHTML = "";

  const address = [home.street, [home.zip, home.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  if (address) details.appendChild(detailRow("Address", address));
  if (home.canton) details.appendChild(detailRow("Canton", home.canton));
  details.appendChild(detailRow("Price", fmtPrice(home.price)));
  details.appendChild(detailRow("Size", fmtSize(home.size)));
  details.appendChild(detailRow("Rooms", fmtRooms(home.rooms)));
  if (home.built) details.appendChild(detailRow("Built", String(home.built)));
  if (home.renovated) details.appendChild(detailRow("Last renovation", String(home.renovated)));

  const status = home.status || "";
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = status || "\u2014";
  if (status) badge.classList.add({ "To visit": "blue", Visited: "green", Applied: "amber", "Not interested": "gray" }[status] || "gray");
  details.appendChild(detailRow("Status", badge));

  if (home.url && /^https?:\/\//i.test(home.url)) {
    const link = document.createElement("a");
    link.href = home.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open listing";
    details.appendChild(detailRow("Listing", link));
  }

  const notesWrap = document.getElementById("v-notes-wrap");
  if (home.notes) {
    notesWrap.hidden = false;
    document.getElementById("v-notes").textContent = home.notes;
  } else {
    notesWrap.hidden = true;
  }

  const ul = document.getElementById("v-visits");
  ul.innerHTML = "";
  const visits = (Array.isArray(home.visits) ? home.visits : []).slice().sort((a, b) => ((a.date + a.time || "") < (b.date + b.time || "") ? -1 : 1));
  document.getElementById("v-visits-empty").hidden = visits.length > 0;
  visits.forEach((v) => {
    const li = document.createElement("li");
    const d = v.date ? new Date(v.date + "T" + (v.time || "00:00")) : null;
    li.textContent =
      (d ? d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "") +
      (v.time ? ", " + v.time : "");
    ul.appendChild(li);
  });

  const parts = [];
  if (home.street) parts.push(home.street);
  const zipCity = [home.zip, home.city].filter(Boolean).join(" ");
  if (zipCity) parts.push(zipCity);
  if (home.canton) parts.push(home.canton);
  parts.push("Switzerland");
  const query = parts.join(", ");

  const mapEl = document.getElementById("v-map");
  const dirEl = document.getElementById("v-directions");
  mapEl.innerHTML = "";
  dirEl.innerHTML = "";
  if (parts.length > 1) {
    const origin = encodeURIComponent(query);
    mapEl.appendChild(mapFrame("https://www.google.com/maps?q=" + origin + "&output=embed"));
    dirEl.appendChild(mapFrame("https://maps.google.com/maps?saddr=" + origin + "&daddr=" + encodeURIComponent("Zurich Hauptbahnhof, Switzerland") + "&output=embed"));
  } else {
    const p = document.createElement("p");
    p.className = "empty small";
    p.textContent = "No address provided.";
    mapEl.appendChild(p.cloneNode(true));
    dirEl.appendChild(p);
  }
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
  const home = homes.find((h) => h.id === state.id);
  if (!home) {
    location.replace("file.html?code=" + encodeURIComponent(code));
    return;
  }
  render(home);
}

document.getElementById("btn-back").addEventListener("click", () => {
  location.replace("file.html?code=" + encodeURIComponent(state.code));
});

document.getElementById("btn-edit").addEventListener("click", () => {
  location.replace("home.html?code=" + encodeURIComponent(state.code) + "&id=" + encodeURIComponent(state.id));
});

init();