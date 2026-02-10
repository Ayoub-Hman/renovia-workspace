/* =========================================================
   RÉNOVIA WORKSPACE POC | app.js
   ---------------------------------------------------------
   Contient:
   - Login
   - Register POC
   - Toggle visibilité mot de passe (réutilisable partout)
   - Mot de passe oublié (modal)
   - Reset password (page reset-password.html)

   Bonnes pratiques:
   - Code défensif (checks)
   - PreventDefault sur forms
   - Messages neutres sur forgot-password (anti énumération)
   - Commentaires métier pour reprise par un dev
========================================================= */

const API_AUTH = "/api/auth";

/* =========================
   UI Helpers
========================= */

/**
 * Affiche un toast simple.
 * @param {HTMLElement} el
 * @param {string} message
 * @param {"ok"|"err"} type
 */
function showToast(el, message, type = "ok") {
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
  el.style.background = type === "ok" ? "#163a2a" : "#3a1616";
  el.style.border = "1px solid " + (type === "ok" ? "#2ecc71" : "#e74c3c");

  setTimeout(() => {
    el.style.display = "none";
  }, 5000);
}

/**
 * Récupère un paramètre query string
 */
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

/* =========================
   Toggle password visibility
========================= */

/**
 * Toggle générique basé sur data-target.
 * Réutilisable login, register, reset.
 */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-password");
  if (!btn) return;

  const inputId = btn.dataset.target;
  const input = document.getElementById(inputId);
  if (!input) return;

  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.textContent = isHidden ? "🙈" : "👁";
});

/* =========================
   Login
========================= */

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail")?.value?.trim();
    const password = document.getElementById("login_password")?.value;
    const out = document.getElementById("loginOut");

    try {
      const res = await fetch(API_AUTH + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(out, data.error || "Erreur de connexion", "err");
        return;
      }

      // POC: stockage JWT côté navigateur (simple)
      // Prod: préférer cookie httpOnly
      localStorage.setItem("renovia_token", data.token);
      localStorage.setItem("renovia_user", JSON.stringify(data.user));

      showToast(out, "Connexion réussie ✅", "ok");

      setTimeout(() => {
        window.location.href = "/index.html";
      }, 500);

    } catch (err) {
      console.error(err);
      showToast(out, "Erreur réseau serveur", "err");
    }
  });
}

/* =========================
   Register (POC)
========================= */

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("regName")?.value?.trim();
    const email = document.getElementById("regEmail")?.value?.trim();
    const password = document.getElementById("regPassword")?.value;
    const out = document.getElementById("regOut");

    try {
      const res = await fetch(API_AUTH + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(out, data.error || "Erreur création compte", "err");
        return;
      }

      showToast(out, "Compte créé ✅ Vous pouvez vous connecter", "ok");
      registerForm.reset();

    } catch (err) {
      console.error(err);
      showToast(out, "Erreur réseau serveur", "err");
    }
  });
}

/* =========================
   Forgot password modal
========================= */

const btnForgot = document.getElementById("btnForgotPassword");
const overlay = document.getElementById("forgotOverlay");
const btnClose = document.getElementById("btnCloseForgot");
const forgotForm = document.getElementById("forgotForm");

function openForgotModal() {
  if (!overlay) return;
  overlay.style.display = "flex";
  // Focus user friendly
  setTimeout(() => document.getElementById("forgotEmail")?.focus(), 50);
}

function closeForgotModal() {
  if (!overlay) return;
  overlay.style.display = "none";
}

if (btnForgot) btnForgot.addEventListener("click", openForgotModal);
if (btnClose) btnClose.addEventListener("click", closeForgotModal);

// Clic hors carte: ferme la modal (UX standard)
if (overlay) {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeForgotModal();
  });
}

if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail")?.value?.trim();
    const out = document.getElementById("forgotOut");

    try {
      const res = await fetch(API_AUTH + "/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      // Règle UX sécurité: message neutre toujours
      // POC: on redirige directement vers la page reset si dev_reset_url présent
      if (data.dev_reset_url) {
        closeForgotModal();
        window.location.href = data.dev_reset_url;
        return;
      }

      // Mode email plus tard: on afficherait le message et on laisserait la modal ouverte
      showToast(out, data.message || "Demande prise en compte", "ok");

    } catch (err) {
      console.error(err);
      showToast(out, "Erreur réseau serveur", "err");
    }
  });
}

/* =========================
   Reset password page logic
   Page: /reset-password.html
========================= */

const resetForm = document.getElementById("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const p1 = document.getElementById("resetPassword1")?.value || "";
    const p2 = document.getElementById("resetPassword2")?.value || "";
    const errEl = document.getElementById("resetErr");
    const outEl = document.getElementById("resetOut");

    // Règle métier UX demandée
    if (p1 !== p2) {
      showToast(errEl, "Les deux mots de passe doivent être identiques", "err");
      return;
    }

    // Règle minimale côté front
    if (p1.length < 8) {
      showToast(errEl, "Le mot de passe doit contenir au moins 8 caractères", "err");
      return;
    }

    const email = getQueryParam("email");
    const token = getQueryParam("token");

    if (!email || !token) {
      showToast(errEl, "Lien de réinitialisation invalide", "err");
      return;
    }

    try {
      const res = await fetch(API_AUTH + "/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          newPassword: p1
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(errEl, data.error || "Impossible de réinitialiser", "err");
        return;
      }

      showToast(outEl, "Mot de passe mis à jour ✅ Redirection...", "ok");

      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1200);

    } catch (err) {
      console.error(err);
      showToast(errEl, "Erreur réseau serveur", "err");
    }
  });
}

/* =========================
   Debug helpers (POC)
========================= */
window.renoviaDebug = {
  token: () => localStorage.getItem("renovia_token"),
  user: () => JSON.parse(localStorage.getItem("renovia_user") || "null"),
  logout: () => {
    localStorage.removeItem("renovia_token");
    localStorage.removeItem("renovia_user");
    console.log("Logged out");
  }
};
