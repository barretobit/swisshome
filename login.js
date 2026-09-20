async function init() {
  if (session.userId) {
    location.replace("homes.html");
    return;
  }
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value;
  btn.disabled = true;
  btn.textContent = "Signing in\u2026";
  try {
    const res = await authLogin(user, pass);
    if (!res || res.user_id == null) throw new Error("Login failed.");
    session.set(res.user_id);
    session.setIncome(res.combined_income ?? null);
    location.replace("homes.html");
  } catch (err) {
    toast(err.message, false);
    btn.textContent = "Sign in";
  } finally {
    btn.disabled = false;
  }
});

init();