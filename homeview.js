const state = { code: "", id: null, settings: {} };

const STATUS_STYLE = {
  "Awaiting Information": "gray",
  "Applied for Visit": "amber",
  "In Contact": "blue",
  "To Visit": "green",
  Rejected: "red",
  Thinking: "amber",
};

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

function renderFinance(home) {
  const el = document.getElementById("v-finance");
  el.innerHTML = "";
  const price = home.price || 0;
  let extra = 0;
  if (home.garage && !home.garageIncluded && home.garagePrice != null) extra = home.garagePrice;
  const total = price + extra;

  el.appendChild(detailRow("Purchase price", fmtPrice(price)));
  if (extra > 0) el.appendChild(detailRow("Garage (extra)", fmtPrice(extra)));
  el.appendChild(detailRow("Total value", fmtPrice(total)));
  el.appendChild(detailRow("Closing costs (0.25%)", fmtPrice(total * 0.0025)));

  const income = state.settings && state.settings.combinedIncome;
  if (income && income > 0) {
    const mortgage = total * 0.8;
    const second = Math.max(0, mortgage - total * 0.67);
    const interest = mortgage * 0.05;
    const amort = second / 15;
    const ancillary = total * 0.01;
    const housingCosts = interest + amort + ancillary;
    const pct = (housingCosts / income) * 100;

    el.appendChild(detailRow("Mortgage (80%)", fmtPrice(mortgage)));
    el.appendChild(detailRow("Imputed interest (5%)", fmtPrice(interest)));
    el.appendChild(detailRow("Amortization 2nd mortgage", fmtPrice(amort)));
    el.appendChild(detailRow("Ancillary costs (1%)", fmtPrice(ancillary)));
    el.appendChild(detailRow("Housing costs / year", fmtPrice(housingCosts)));
    el.appendChild(detailRow("Affordability", pct.toLocaleString("en-CH", { maximumFractionDigits: 1 }) + " % of annual gross income"));
    el.appendChild(detailRow("Verdict", pct <= 33 ? "Affordable (\u2264 33%)" : "Not affordable (limit \u2264 33%)"));
  } else {
    const p = document.createElement("p");
    p.className = "empty small";
    p.textContent = "Set your Combined Gross Income in the file settings to see affordability.";
    el.appendChild(p);
  }

  el.appendChild(detailRow("20% down payment", fmtPrice(total * 0.2)));
  el.appendChild(detailRow("25% down payment", fmtPrice(total * 0.25)));
}

function render(home) {
  document.getElementById("v-title").textContent = home.title || "Untitled";

  const details = document.getElementById("v-details");
  details.innerHTML = "";

  if (home.mainImage && /^https?:\/\//i.test(home.mainImage)) {
    const img = document.createElement("img");
    img.className = "main-image";
    img.src = home.mainImage;
    img.alt = (home.title || "Home") + " main image";
    img.loading = "lazy";
    img.onerror = () => {
      img.style.display = "none";
    };
    details.appendChild(img);
  }

  const address = [home.street, [home.zip, home.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  if (address) details.appendChild(detailRow("Address", address));
  if (home.canton) details.appendChild(detailRow("Canton", home.canton));
  details.appendChild(detailRow("Price", fmtPrice(home.price)));
  details.appendChild(detailRow("Size", fmtSize(home.size)));
  details.appendChild(detailRow("Rooms", fmtRooms(home.rooms)));
  if (home.built) details.appendChild(detailRow("Built", String(home.built)));
  if (home.renovated) details.appendChild(detailRow("Last renovation", String(home.renovated)));

  if (home.realtorName) details.appendChild(detailRow("Realtor name", home.realtorName));
  if (home.realtorPhone) details.appendChild(detailRow("Realtor phone", home.realtorPhone));
  if (home.realtorEmail) {
    const mail = document.createElement("a");
    mail.href = "mailto:" + home.realtorEmail;
    mail.textContent = home.realtorEmail;
    details.appendChild(detailRow("Realtor email", mail));
  }

  let garageText = "No";
  if (home.garage) {
    garageText = home.garageIncluded ? "Yes (included in price)" : home.garagePrice != null ? "Yes (+ " + fmtPrice(home.garagePrice) + ")" : "Yes";
  }
  details.appendChild(detailRow("Garage", garageText));

  const status = home.status || "";
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = status || "\u2014";
  if (status) badge.classList.add(STATUS_STYLE[status] || "gray");
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

  renderFinance(home);
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
      state.settings = data.settings || {};
    } catch (err) {
      if (err.message === "Invalid credentials.") {
        signOut();
        return;
      }
      toast(err.message, false);
    }
    homes = saved;
    setDraft(code, { name: "", homes, settings: state.settings });
  } else {
    state.settings = (d && !Array.isArray(d) && d.settings) || {};
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