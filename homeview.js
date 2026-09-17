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

function lazyMapFrame(container, src) {
  const frame = document.createElement("iframe");
  frame.className = "map-frame";
  frame.loading = "lazy";
  frame.tabIndex = -1;
  container.appendChild(frame);
  if (!("IntersectionObserver" in window)) {
    frame.src = src;
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          frame.src = src;
          io.disconnect();
        }
      });
    },
    { rootMargin: "300px" }
  );
  io.observe(container);
}

function affordabilityPct(total, income, equityPct) {
  const mortgage = total * (1 - equityPct);
  const second = Math.max(0, mortgage - total * 0.67);
  const interest = mortgage * 0.05;
  const amort = second / 15;
  const ancillary = total * 0.01;
  return ((interest + amort + ancillary) / income) * 100;
}

function financeRow(label, value) {
  const row = document.createElement("div");
  row.className = "finance-row";
  const l = document.createElement("span");
  l.textContent = label;
  const v = document.createElement("span");
  v.textContent = value;
  row.appendChild(l);
  row.appendChild(v);
  return row;
}

function downCell(label, amount, total, income, equityPct) {
  const cell = document.createElement("div");
  cell.className = "finance-cell";
  const head = document.createElement("div");
  head.className = "finance-head";
  head.textContent = label;
  cell.appendChild(head);
  cell.appendChild(financeRow("Total", fmtPrice(amount)));
  cell.appendChild(financeRow("Single", fmtPrice(amount / 2)));
  if (income && income > 0) {
    const pct = affordabilityPct(total, income, equityPct);
    const row = document.createElement("div");
    row.className = "finance-afford " + (pct <= 33 ? "ok" : "bad");
    const rl = document.createElement("span");
    rl.textContent = "Affordability";
    const rv = document.createElement("span");
    rv.className = "finance-value";
    rv.textContent = (pct <= 33 ? "Yes" : "No") + " (" + pct.toLocaleString("en-CH", { maximumFractionDigits: 1 }) + "%)";
    row.appendChild(rl);
    row.appendChild(rv);
    cell.appendChild(row);
  }
  return cell;
}

function mortgageCell(label, total, equityPct) {
  const cell = document.createElement("div");
  cell.className = "finance-cell";
  const head = document.createElement("div");
  head.className = "finance-head";
  head.textContent = label;
  cell.appendChild(head);

  const mortgage = total * (1 - equityPct);
  const second = Math.max(0, mortgage - total * 0.67);

  const all = document.createElement("div");
  const rateWrap = document.createElement("div");
  rateWrap.className = "finance-row";
  const rateLabel = document.createElement("span");
  rateLabel.textContent = "Interest rate";
  const rateValue = document.createElement("span");
  rateValue.className = "finance-value";
  rateWrap.appendChild(rateLabel);
  rateWrap.appendChild(rateValue);
  all.appendChild(rateWrap);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "rate-slider";
  slider.min = "0.6";
  slider.max = "2.0";
  slider.step = "0.1";
  slider.value = "0.7";
  all.appendChild(slider);

  const payRow = document.createElement("div");
  payRow.className = "finance-row";
  const payLabel = document.createElement("span");
  payLabel.textContent = "Monthly payment";
  const payValue = document.createElement("span");
  payValue.className = "finance-value";
  payRow.appendChild(payLabel);
  payRow.appendChild(payValue);
  all.appendChild(payRow);

  function update() {
    const rate = parseFloat(slider.value);
    rateValue.textContent = String(rate) + "%";
    const interest = (mortgage * rate) / 100;
    const amort = second / 15;
    payValue.textContent = fmtPrice((interest + amort) / 12) + " / month";
  }
  slider.addEventListener("input", update);
  update();

  cell.appendChild(all);
  return cell;
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
  const grid = document.createElement("div");
  grid.className = "finance-grid";
  grid.appendChild(downCell("20% Down Payment", total * 0.2, total, income, 0.2));
  grid.appendChild(downCell("25% Down Payment", total * 0.25, total, income, 0.25));
  el.appendChild(grid);

  const mGrid = document.createElement("div");
  mGrid.className = "finance-grid mortgage-grid";
  mGrid.appendChild(mortgageCell("20% Mortgage", total, 0.2));
  mGrid.appendChild(mortgageCell("25% Mortgage", total, 0.25));
  el.appendChild(mGrid);

  if (!(income && income > 0)) {
    const p = document.createElement("p");
    p.className = "empty small";
    p.textContent = "Set your Combined Gross Income in the file settings to see affordability.";
    el.appendChild(p);
  }
}

function realtorCell(label, value) {
  const cell = document.createElement("div");
  cell.className = "realtor-cell";
  const l = document.createElement("div");
  l.className = "detail-label";
  l.textContent = label;
  const v = document.createElement("div");
  v.className = "detail-value";
  if (typeof value === "string") v.textContent = value;
  else if (value instanceof Node) v.appendChild(value);
  cell.appendChild(l);
  cell.appendChild(v);
  return cell;
}

function renderRealtor(home) {
  const card = document.getElementById("v-realtor-card");
  const wrap = document.getElementById("v-realtor");
  if (!home.realtorName && !home.realtorPhone && !home.realtorEmail) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  wrap.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "realtor-grid";
  if (home.realtorName) grid.appendChild(realtorCell("Name", home.realtorName));
  if (home.realtorPhone) {
    const tel = document.createElement("a");
    tel.href = "tel:" + String(home.realtorPhone).replace(/\s+/g, "");
    tel.textContent = home.realtorPhone;
    grid.appendChild(realtorCell("Phone", tel));
  }
  if (home.realtorEmail) {
    const mail = document.createElement("a");
    mail.href = "mailto:" + home.realtorEmail;
    mail.textContent = home.realtorEmail;
    grid.appendChild(realtorCell("Email", mail));
  }
  wrap.appendChild(grid);
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
  if (home.houseType) {
    let typeInfo = home.houseType;
    if (home.floor != null && home.floor !== "") {
      typeInfo += home.houseType === "House" ? " (" + home.floor + " floors)" : " (" + home.floor + ")";
    }
    details.appendChild(detailRow("House type", typeInfo));
  }
  if (home.built) details.appendChild(detailRow("Built", String(home.built)));
  if (home.renovated) details.appendChild(detailRow("Last renovation", String(home.renovated)));

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

  if (home.detailUrl && /^https?:\/\//i.test(home.detailUrl)) {
    const link = document.createElement("a");
    link.href = home.detailUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open detailed info";
    details.appendChild(detailRow("Detailed info", link));
  }

  const notesWrap = document.getElementById("v-notes-wrap");
  if (home.notes) {
    notesWrap.hidden = false;
    document.getElementById("v-notes").textContent = home.notes;
  } else {
    notesWrap.hidden = true;
  }

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
    lazyMapFrame(mapEl, "https://www.google.com/maps?q=" + origin + "&output=embed");
    lazyMapFrame(dirEl, "https://maps.google.com/maps?saddr=" + origin + "&daddr=" + encodeURIComponent("Zurich Hauptbahnhof, Switzerland") + "&output=embed");
  } else {
    const p = document.createElement("p");
    p.className = "empty small";
    p.textContent = "No address provided.";
    mapEl.appendChild(p.cloneNode(true));
    dirEl.appendChild(p);
  }

  renderFinance(home);
  renderRealtor(home);
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