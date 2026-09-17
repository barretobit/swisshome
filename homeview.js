const state = { code: "", id: null, name: "", settings: {}, homes: [], home: null };

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

function urlLink(url) {
  if (url && /^https?:\/\//i.test(url)) {
    const link = document.createElement("a");
    link.className = "btn ghost sm icon-btn";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.title = "Open listing";
    link.setAttribute("aria-label", "Open listing");
    link.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
    return link;
  }
  return "\u2014";
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

function financeLine(parent, label) {
  const row = document.createElement("div");
  row.className = "detail";
  const l = document.createElement("span");
  l.className = "detail-label";
  l.textContent = label;
  const v = document.createElement("div");
  v.className = "detail-value";
  row.appendChild(l);
  row.appendChild(v);
  parent.appendChild(row);
  return v;
}

function financeControl(labelText, valueText) {
  const control = document.createElement("div");
  control.className = "finance-control";
  const head = document.createElement("div");
  head.className = "finance-control-head";
  const label = document.createElement("span");
  label.textContent = labelText;
  const value = document.createElement("span");
  value.className = "finance-value";
  value.textContent = valueText;
  head.appendChild(label);
  head.appendChild(value);
  control.appendChild(head);
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "rate-slider";
  control.appendChild(slider);
  return { control, slider, value };
}

function renderFinance(home) {
  const el = document.getElementById("v-finance");
  el.innerHTML = "";
  const price = home.price || 0;
  let extra = 0;
  if (home.garage && !home.garageIncluded && home.garagePrice != null) extra = home.garagePrice;
  const total = price + extra;

  el.appendChild(detailRow("Purchase Price", fmtPrice(price)));
  if (extra > 0) el.appendChild(detailRow("Garage (extra)", fmtPrice(extra)));
  el.appendChild(detailRow("Total Value", fmtPrice(total)));
  el.appendChild(detailRow("Closing Costs (0.25%)", fmtPrice(total * 0.0025)));

  const income = state.settings && state.settings.combinedIncome;

  const down = financeControl("Down Payment", "25%");
  down.slider.min = "20";
  down.slider.max = "30";
  down.slider.step = "1";
  down.slider.value = "25";

  const rate = financeControl("Interest Rate", "0.7%");
  rate.slider.min = "0.6";
  rate.slider.max = "2.0";
  rate.slider.step = "0.1";
  rate.slider.value = "0.7";

  const controls = document.createElement("div");
  controls.className = "finance-sliders";
  controls.appendChild(down.control);
  controls.appendChild(rate.control);
  el.appendChild(controls);

  const downTotal = financeLine(el, "Down Payment");
  const downSingle = financeLine(el, "Down Payment (Single)");
  const mortgageTotal = financeLine(el, "Mortgage");
  const payInterest = financeLine(el, "Interest / Month");
  const payAmort = financeLine(el, "Amortization / Month");
  const payTotal = financeLine(el, "Monthly Payment");
  payTotal.classList.add("strong");
  const affordValue = financeLine(el, "Affordability");

  function update() {
    const equityPct = parseFloat(down.slider.value) / 100;
    const ratePct = parseFloat(rate.slider.value);

    down.value.textContent = Math.round(equityPct * 100) + "%";
    rate.value.textContent = ratePct.toFixed(1) + "%";

    const downAmount = total * equityPct;
    const mortgage = total - downAmount;
    const second = Math.max(0, mortgage - total * 0.67);
    const interestMonthly = (mortgage * ratePct) / 100 / 12;
    const amortMonthly = second / 15 / 12;

    downTotal.textContent = fmtPrice(downAmount);
    downSingle.textContent = fmtPrice(downAmount / 2);
    mortgageTotal.textContent = fmtPrice(mortgage);
    payInterest.textContent = fmtPrice(interestMonthly);
    payAmort.textContent = fmtPrice(amortMonthly);
    payTotal.textContent = fmtPrice(interestMonthly + amortMonthly) + " / month";

    if (income && income > 0) {
      const pct = affordabilityPct(total, income, equityPct);
      affordValue.className = "detail-value " + (pct <= 33 ? "ok" : "bad");
      affordValue.textContent = (pct <= 33 ? "Yes" : "No") + " (" + pct.toLocaleString("en-CH", { maximumFractionDigits: 1 }) + "%)";
    } else {
      affordValue.className = "detail-value";
      affordValue.textContent = "\u2014";
    }
  }
  down.slider.addEventListener("input", update);
  rate.slider.addEventListener("input", update);
  update();

  if (!(income && income > 0)) {
    const p = document.createElement("p");
    p.className = "empty small";
    p.textContent = "Set your Combined Gross Income in the file settings to see affordability.";
    el.appendChild(p);
  }
}

function visitKey(v) {
  return v.date + "T" + (v.time || "00:00");
}

function nowKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

function nextVisit(home) {
  const now = nowKey();
  const vs = (Array.isArray(home.visits) ? home.visits : []).filter((v) => v && v.date && visitKey(v) >= now);
  vs.sort((a, b) => (visitKey(a) < visitKey(b) ? -1 : 1));
  return vs[0] || null;
}

function fmtVisit(v) {
  const d = new Date(visitKey(v));
  const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return date + (v.time ? ", " + v.time : "");
}

function notesBlock(title) {
  const block = document.createElement("div");
  block.className = "nd-block";
  const h = document.createElement("h3");
  h.className = "nd-title";
  h.textContent = title;
  block.appendChild(h);
  return block;
}

function renderNotesDocs(home) {
  const el = document.getElementById("v-notes-docs");
  el.innerHTML = "";

  const visit = nextVisit(home);
  if (visit) {
    const visitBlockEl = notesBlock("Next Scheduled View");
    const v = document.createElement("div");
    v.className = "nd-visit";
    v.textContent = fmtVisit(visit);
    visitBlockEl.appendChild(v);
    el.appendChild(visitBlockEl);
  }

  const notes = notesBlock("Notes");
  const editNotes = document.createElement("button");
  editNotes.type = "button";
  editNotes.className = "nd-edit";
  editNotes.textContent = "Edit";
  editNotes.addEventListener("click", () => openNotesModal(home.notes || ""));
  notes.querySelector(".nd-title").appendChild(editNotes);
  if (home.notes) {
    const p = document.createElement("p");
    p.className = "prewrap nd-text";
    p.textContent = home.notes;
    notes.appendChild(p);
  } else {
    const p = document.createElement("p");
    p.className = "nd-empty";
    p.textContent = "No notes yet.";
    notes.appendChild(p);
  }
  el.appendChild(notes);

  const links = Array.isArray(home.docsLinks) ? home.docsLinks : [];
  const docs = notesBlock("Docs Links");
  if (links.length) {
    const list = document.createElement("div");
    list.className = "nd-links";
    links.forEach((l) => {
      const a = document.createElement("a");
      if (l.url && /^https?:\/\//i.test(l.url)) {
        a.href = l.url;
        a.target = "_blank";
        a.rel = "noopener";
      }
      a.textContent = l.title || l.url || "Link";
      list.appendChild(a);
    });
    docs.appendChild(list);
  } else {
    const p = document.createElement("p");
    p.className = "nd-empty";
    p.textContent = "No links yet.";
    docs.appendChild(p);
  }
  el.appendChild(docs);
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
  state.home = home;
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
    img.addEventListener("click", () => openLightbox(home.mainImage, img.alt));
    details.appendChild(img);
  }

  const address = [home.street, [home.zip, home.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const location = address + (address && home.canton ? " - " : "") + (home.canton || "");
  details.appendChild(detailRow("Location", location || "\u2014"));
  details.appendChild(detailRow("Price", fmtPrice(home.price)));
  details.appendChild(detailRow("Size", fmtSize(home.size)));
  details.appendChild(detailRow("Rooms", fmtRooms(home.rooms)));

  let typeInfo = home.houseType || "\u2014";
  if (home.houseType && home.floor != null && home.floor !== "") {
    typeInfo += home.houseType === "House" ? " (" + home.floor + " floors)" : " (" + home.floor + ")";
  }
  details.appendChild(detailRow("House Type", typeInfo));
  details.appendChild(detailRow("Built", home.built ? String(home.built) : "\u2014"));
  details.appendChild(detailRow("Last Renovation", home.renovated ? String(home.renovated) : "\u2014"));

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

  details.appendChild(detailRow("Listing URL", urlLink(home.url)));

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

  renderNotesDocs(home);
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
    let name = "";
    try {
      const res = await getFile(creds.user, creds.password, code);
      const data = res && res.json && typeof res.json === "object" ? res.json : {};
      saved = Array.isArray(data.homes) ? data.homes : [];
      name = typeof data.name === "string" ? data.name : "";
      state.settings = data.settings || {};
    } catch (err) {
      if (err.message === "Invalid credentials.") {
        signOut();
        return;
      }
      toast(err.message, false);
    }
    homes = saved;
    state.name = name;
    setDraft(code, { name, homes, settings: state.settings });
  } else {
    state.name = (d && !Array.isArray(d) && d.name) || "";
    state.settings = (d && !Array.isArray(d) && d.settings) || {};
  }
  state.homes = homes;
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

function openLightbox(src, alt) {
  const box = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  img.alt = alt || "";
  box.hidden = false;
}

function closeLightbox() {
  const box = document.getElementById("lightbox");
  if (!box || box.hidden) return;
  box.hidden = true;
  document.getElementById("lightbox-img").src = "";
}

function openNotesModal(text) {
  const modal = document.getElementById("notes-modal");
  const input = document.getElementById("notes-modal-text");
  input.value = text;
  modal.hidden = false;
  input.focus();
}

function closeNotesModal() {
  const modal = document.getElementById("notes-modal");
  if (modal) modal.hidden = true;
}

async function saveNotes() {
  const home = state.home;
  if (!home) return;
  home.notes = document.getElementById("notes-modal-text").value.trim();
  const data = { name: state.name, homes: state.homes, settings: state.settings };
  setDraft(state.code, data);
  closeNotesModal();
  renderNotesDocs(home);
  try {
    await saveFile(session.user, session.password, state.code, data);
  } catch (err) {
    toast(err.message, false);
  }
}

document.getElementById("lightbox").addEventListener("click", closeLightbox);
document.getElementById("notes-modal-cancel").addEventListener("click", closeNotesModal);
document.getElementById("notes-modal-save").addEventListener("click", saveNotes);
document.getElementById("notes-modal").addEventListener("click", (e) => {
  if (e.target.id === "notes-modal") closeNotesModal();
});
document.getElementById("notes-modal-text").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveNotes();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeLightbox();
    closeNotesModal();
  }
});

init();