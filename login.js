async function tryLogin(user, password) {
  await login(user, password);
  session.set(user, password);
  location.replace("files.html");
}

async function init() {
  if (session.user && session.password) {
    try {
      await login(session.user, session.password);
      location.replace("files.html");
      return;
    } catch {}
  }
  session.clear();
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const user = document.getElementById("login-user").value.trim();
  const password = document.getElementById("login-pass").value;
  btn.disabled = true;
  btn.textContent = "Signing in\u2026";
  try {
    await tryLogin(user, password);
  } catch (err) {
    toast(err.message, false);
    btn.textContent = "Sign in";
  } finally {
    btn.disabled = false;
  }
});

init();