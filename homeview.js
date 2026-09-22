const state = { id: null, home: null };
const FIRST_MORTGAGE_LTV = 2 / 3;

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

function affordabilityPct(total, income, mortgage, second) {
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
  if (home.garage && !home.garage_included && home.garage_price != null) extra = home.garage_price;
  const total = price + extra;

  el.appendChild(detailRow("Purchase Price", fmtPrice(price)));
  if (extra > 0) el.appendChild(detailRow("Garage (extra)", fmtPrice(extra)));
  el.appendChild(detailRow("Total Value", fmtPrice(total)));
  const landRegistryRow = financeLine(el, "Land Registry + Notary (0.3%)");
  const schuldbriefRow = financeLine(el, "Schuldbrief (0.2%)");
  const closingCostsRow = financeLine(el, "Closing Costs");

  const income = getIncome();

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
  const cashRequired = financeLine(el, "Total Cash Required");
  const cashRequiredSingle = financeLine(el, "Total Cash Required (Single)");
  const mortgageTotal = financeLine(el, "Mortgage");
  const payInterest = financeLine(el, "Interest / Month");
  const payAmort = financeLine(el, "Amortization / Month");
  const payAncillary = financeLine(el, "Ancillary Costs / Month");
  const payTotal = financeLine(el, "Bank Payment / Month");
  payTotal.classList.add("strong");
  const payTotalCost = financeLine(el, "Total Cost / Month");
  payTotalCost.classList.add("strong");
  const affordValue = financeLine(el, "Affordability");
  const affordCap = document.createElement("p");
  affordCap.className = "finance-caption";
  affordCap.textContent = "Based on a 5% stress-test rate, not the selected Interest Rate.";
  el.appendChild(affordCap);

  function update() {
    const equityPct = parseFloat(down.slider.value) / 100;
    const ratePct = parseFloat(rate.slider.value);

    down.value.textContent = Math.round(equityPct * 100) + "%";
    rate.value.textContent = ratePct.toFixed(1) + "%";

    const downAmount = total * equityPct;
    const mortgage = total - downAmount;
    const second = Math.max(0, mortgage - total * FIRST_MORTGAGE_LTV);
    const ancillaryMonthly = (total * 0.01) / 12;
    const landRegistryAndNotary = total * 0.003;
    const schuldbrief = mortgage * 0.002;
    const interestMonthly = (mortgage * ratePct) / 100 / 12;
    const amortMonthly = second / 15 / 12;

    downTotal.textContent = fmtPrice(downAmount);
    downSingle.textContent = fmtPrice(downAmount / 2);
    cashRequired.textContent = fmtPrice(downAmount + landRegistryAndNotary + schuldbrief);
    cashRequiredSingle.textContent = fmtPrice((downAmount + landRegistryAndNotary + schuldbrief) / 2);
    landRegistryRow.textContent = fmtPrice(landRegistryAndNotary);
    schuldbriefRow.textContent = fmtPrice(schuldbrief);
    closingCostsRow.textContent = fmtPrice(landRegistryAndNotary + schuldbrief);
    mortgageTotal.textContent = fmtPrice(mortgage);
    payInterest.textContent = fmtPrice(interestMonthly);
    payAmort.textContent = fmtPrice(amortMonthly);
    payAncillary.textContent = fmtPrice(ancillaryMonthly);
    payTotal.textContent = fmtPrice(interestMonthly + amortMonthly) + " / month";
    payTotalCost.textContent = fmtPrice(interestMonthly + amortMonthly + ancillaryMonthly) + " / month";

    if (income && income > 0) {
      const pct = affordabilityPct(total, income, mortgage, second);
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
    p.textContent = "No combined income set for this user.";
    el.appendChild(p);
  }
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

  const visit = nextVisit(home.visits);
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

  const links = Array.isArray(home.links) ? home.links : [];
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
  if (!home.realtor_name && !home.realtor_phone && !home.realtor_email) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  wrap.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "realtor-grid";
  if (home.realtor_name) grid.appendChild(realtorCell("Name", home.realtor_name));
  if (home.realtor_phone) {
    const tel = document.createElement("a");
    tel.href = "tel:" + String(home.realtor_phone).replace(/\s+/g, "");
    tel.textContent = home.realtor_phone;
    grid.appendChild(realtorCell("Phone", tel));
  }
  if (home.realtor_email) {
    const mail = document.createElement("a");
    mail.href = "mailto:" + home.realtor_email;
    mail.textContent = home.realtor_email;
    grid.appendChild(realtorCell("Email", mail));
  }
  wrap.appendChild(grid);
}

function render(home) {
  document.getElementById("v-title").textContent = home.title || "Untitled";

  const details = document.getElementById("v-details");
  details.innerHTML = "";

  if (home.main_image && /^https?:\/\//i.test(home.main_image)) {
    const img = document.createElement("img");
    img.className = "main-image";
    img.src = home.main_image;
    img.alt = (home.title || "Home") + " main image";
    img.loading = "lazy";
    img.onerror = () => {
      img.style.display = "none";
    };
    img.addEventListener("click", () => openLightbox(home.main_image, img.alt));
    details.appendChild(img);
  }

  const address = [home.street, [home.zip, home.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const location = address + (address && home.canton ? " - " : "") + (home.canton || "");
  details.appendChild(detailRow("Location", location || "\u2014"));
  details.appendChild(detailRow("Price", fmtPrice(home.price)));
  details.appendChild(detailRow("Size", fmtSize(home.size)));
  details.appendChild(detailRow("Rooms", fmtRooms(home.rooms)));

  let typeInfo = home.house_type || "\u2014";
  if (home.house_type && home.floor != null && home.floor !== "") {
    typeInfo += home.house_type === "House" ? " (" + home.floor + " floors)" : " (" + home.floor + " floor)";
  }
  details.appendChild(detailRow("House Type", typeInfo));
  details.appendChild(detailRow("Built", home.built ? String(home.built) : "\u2014"));
  details.appendChild(detailRow("Last Renovation", home.renovated ? String(home.renovated) : "\u2014"));

  let garageText = "No";
  if (home.garage) {
    garageText = home.garage_included ? "Yes (included in price)" : home.garage_price != null ? "Yes (+ " + fmtPrice(home.garage_price) + ")" : "Yes";
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
  const mapLink = document.getElementById("v-map-open");
  const dirLink = document.getElementById("v-directions-open");
  mapEl.innerHTML = "";
  dirEl.innerHTML = "";
  if (parts.length > 1) {
    const origin = encodeURIComponent(query);
    mapLink.href = "https://www.google.com/maps?q=" + origin;
    mapLink.title = "Open map";
    mapLink.setAttribute("aria-label", "Open map");
    dirLink.href =
      "https://www.google.com/maps/dir/?api=1&origin=" + origin + "&destination=" + encodeURIComponent("Zurich Hauptbahnhof, Switzerland");
    dirLink.title = "Open directions";
    dirLink.setAttribute("aria-label", "Open directions");
    lazyMapFrame(mapEl, "https://www.google.com/maps?q=" + origin + "&output=embed");
    lazyMapFrame(dirEl, "https://maps.google.com/maps?saddr=" + origin + "&daddr=" + encodeURIComponent("Zurich Hauptbahnhof, Switzerland") + "&output=embed");
  } else {
    mapLink.removeAttribute("href");
    dirLink.removeAttribute("href");
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
  if (!requireAuth()) return;
  const id = getParam("id");
  if (!id) {
    location.replace("homes.html");
    return;
  }
  state.id = Number(id);
  try {
    const res = await getHome(state.id);
    const home = res && res.home && typeof res.home === "object" ? res.home : res;
    state.home = home;
    render(home);
  } catch (err) {
    toast(err.message, false);
    location.replace("homes.html");
  }
}

document.getElementById("btn-back").addEventListener("click", () => {
  location.replace("homes.html");
});

document.getElementById("btn-edit").addEventListener("click", () => {
  location.replace("home.html?id=" + encodeURIComponent(state.id));
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
  const notes = document.getElementById("notes-modal-text").value.trim();
  home.notes = notes;
  closeNotesModal();
  renderNotesDocs(home);
  try {
    await updateHome(state.id, { notes: notes || null });
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