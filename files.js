async function load() {
  const creds = requireAuth();
  if (!creds) return;
  let codes = [];
  try {
    const res = await listFiles(creds.user, creds.password);
    codes = (res.codes || []).map((c) => ({ code: c.code, last: c.last_updated || "" }));
  } catch (err) {
    if (err.message === "Invalid credentials.") {
      signOut();
      return;
    }
  }
  renderCodes(codes);
}

function renderCodes(codes) {
  const el = document.getElementById("file-list");
  el.innerHTML = "";
  if (!codes.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No files yet \u2014 create your first one below.";
    el.appendChild(p);
    return;
  }
  const names = getNames();
  codes.forEach((f) => {
    const row = document.createElement("div");
    row.className = "file-row";
    const link = document.createElement("a");
    link.className = "file-main";
    link.href = "file.html?code=" + encodeURIComponent(f.code);
    const wrap = document.createElement("div");
    const name = names[f.code] || "";
    if (name) {
      const nameEl = document.createElement("div");
      nameEl.className = "file-name";
      nameEl.textContent = name;
      wrap.appendChild(nameEl);
    }
    const codeEl = document.createElement("div");
    codeEl.className = "file-code" + (name ? "" : " no-name");
    codeEl.textContent = f.code;
    wrap.appendChild(codeEl);
    const date = document.createElement("span");
    date.className = "file-date";
    date.textContent = f.last ? f.last.slice(0, 10) : "";
    link.appendChild(wrap);
    link.appendChild(date);
    const del = button("Delete", ["btn", "ghost", "sm", "danger"]);
    del.addEventListener("click", () => openDeleteModal(f.code));
    row.appendChild(link);
    row.appendChild(del);
    el.appendChild(row);
  });
}

let deleteCode = null;

function openDeleteModal(code) {
  deleteCode = code;
  document.getElementById("del-code").textContent = code;
  document.getElementById("del-confirm").value = "";
  document.getElementById("del-go").disabled = true;
  document.getElementById("delete-modal").hidden = false;
  document.getElementById("del-confirm").focus();
}

function closeDeleteModal() {
  document.getElementById("delete-modal").hidden = true;
  deleteCode = null;
}

document.getElementById("del-confirm").addEventListener("input", (e) => {
  document.getElementById("del-go").disabled = e.target.value !== "i am pretty pretty sure";
});

document.getElementById("del-cancel").addEventListener("click", closeDeleteModal);

document.getElementById("delete-modal").addEventListener("click", (e) => {
  if (e.target.id === "delete-modal") closeDeleteModal();
});

document.getElementById("del-go").addEventListener("click", async () => {
  const btn = document.getElementById("del-go");
  btn.disabled = true;
  try {
    await deleteFile(session.user, session.password, deleteCode);
    const names = getNames();
    delete names[deleteCode];
    setNames(names);
    clearDraft(deleteCode);
    closeDeleteModal();
    toast("File deleted.");
    await load();
  } catch (err) {
    toast(err.message, false);
    closeDeleteModal();
  }
});

document.getElementById("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const code = document.getElementById("create-code").value.trim();
  btn.disabled = true;
  try {
    await createFile(session.user, session.password, code, { homes: [] });
    location.replace("file.html?code=" + encodeURIComponent(code));
  } catch (err) {
    toast(err.message, false);
    btn.disabled = false;
  }
});

document.getElementById("btn-signout").addEventListener("click", signOut);

document.getElementById("view").hidden = false;

load();