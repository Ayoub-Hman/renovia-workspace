/**
 * ==========================================
 * RÉNOVIA | Workspace (EPIC 1)
 * Layout plein écran + navigation modulaire
 * ==========================================
 * Bonnes pratiques :
 * - Le workspace est une "mini app" front
 * - Navigation sans reload : on injecte des vues dans #appContent
 * - Sécurité POC : si pas de token, redirection login
 *
 * Règles métier POC :
 * - Token stocké dans localStorage sous "renovia_token"
 * - User stocké sous "renovia_user" (JSON)
 */

(function () {
  // -------- Utils session --------
  const getToken = () => localStorage.getItem("renovia_token");

  const getUser = () => {
    try {
      const raw = localStorage.getItem("renovia_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const logout = () => {
    // Nettoyage session (POC)
    localStorage.removeItem("renovia_token");
    localStorage.removeItem("renovia_user");
    localStorage.removeItem("renovia_active_conversation_id");
    window.location.href = "/login.html";
  };

  // -------- Guard accès workspace --------
  const token = getToken();
  if (!token) {
    // Pas connecté => login
    window.location.href = "/login.html";
    return;
  }

  // -------- DOM refs --------
  const contentEl = document.getElementById("appContent");
  const titleEl = document.getElementById("viewTitle");
  const userPillEl = document.getElementById("userPill");
  const logoutBtn = document.getElementById("btnLogout");
  const navItems = Array.from(document.querySelectorAll(".nav__item"));

  // -------- Affichage utilisateur --------
  const user = getUser();
  const label = user?.name || user?.email || "Utilisateur";
  userPillEl.textContent = label;

  // -------- Templates de vues (EPIC 1 uniquement) --------
  // Ici, on met du "semi fonctionnel" pour la démo de demain.
  // Les EPIC suivants brancheront les vraies données (chantiers, conversations, calendrier).
  const VIEWS = {
    dashboard: {
      title: "Tableau de bord",
      render: () => `
        <div class="grid2">
          <div class="card">
            <div class="h1">Bienvenue dans le workspace</div>
            <p class="p">
              Ici tu centralises tes dossiers chantier, conversations agents et planning.
              Ce POC pose la base du portail plein écran.
            </p>

            <div class="hr"></div>

            <div class="small">Actions rapides</div>
            <div class="actions">
              <button class="btn btnPrimary" type="button" data-quick="projects">Créer un dossier chantier</button>
              <button class="btn" type="button" data-quick="chat">Démarrer une conversation</button>
              <button class="btn" type="button" data-quick="calendar">Planifier une intervention</button>
            </div>
          </div>

          <div class="card">
            <div class="h1">Statut POC</div>
            <p class="p">
              Le portail est structuré en modules. Les données métier arrivent dans les EPIC suivants :
              chantiers, arborescence fichiers, conversation liée à chantier, calendrier.
            </p>

            <div class="hr"></div>

            <div class="small">Prochaine étape</div>
            <p class="p">
              EPIC 2 : Dossiers chantier (CRUD + recherche) avec une vue centrale propre.
            </p>
          </div>
        </div>
      `,
    },

    projects: {
      title: "Dossiers chantier",
      render: () => `
        <div class="card">
          <div class="h1">Dossiers chantier</div>
          <p class="p">
            Module chantier. Objectif : créer, ouvrir et organiser tes dossiers.
            EPIC 2 branchera la base de données et les formulaires.
          </p>

          <div class="hr"></div>

          <div class="small">Démo (placeholder)</div>
          <p class="p">
            Ici, on affichera la liste des chantiers, la recherche, puis la fiche chantier en zone centrale.
          </p>

          <div class="actions">
            <button class="btn btnPrimary" type="button">Nouveau chantier (bientôt)</button>
          </div>
        </div>
      `,
    },

    chat: {
      title: "Conversations",
      render: () => `
        <div class="card">
          <div class="h1">Conversations</div>
          <p class="p">
            Module chat agents. EPIC 3 ajoutera :
            création conversation guidée, historique, liaison chantier, archivage, synthèse.
          </p>

          <div class="hr"></div>

          <div class="small">Démo (placeholder)</div>
          <p class="p">
            Ici, la zone centrale devient un chat fluide, sans rechargement.
          </p>

          <div class="actions">
            <button class="btn btnPrimary" type="button">Créer une conversation (bientôt)</button>
          </div>
        </div>
      `,
    },

    calendar: {
      title: "Calendrier",
      render: () => `
        <div class="card">
          <div class="h1">Calendrier</div>
          <p class="p">
            Module planning. EPIC 4 ajoutera :
            vue jour semaine mois, filtres chantier, ajout d'interventions.
          </p>

          <div class="hr"></div>

          <div class="small">Démo (placeholder)</div>
          <p class="p">
            Ici, tu navigues entre les périodes et tu ajoutes des RDV liés à un chantier.
          </p>

          <div class="actions">
            <button class="btn btnPrimary" type="button">Ajouter un RDV (bientôt)</button>
          </div>
        </div>
      `,
    },
  };

  // -------- Router front simple --------
  const setActiveNav = (viewKey) => {
    navItems.forEach((btn) => {
      const isActive = btn.dataset.view === viewKey;
      btn.classList.toggle("is-active", isActive);
    });
  };

  const renderView = (viewKey) => {
    const view = VIEWS[viewKey] || VIEWS.dashboard;

    titleEl.textContent = view.title;
    contentEl.innerHTML = view.render();
    setActiveNav(viewKey);

    // Bind actions rapides du dashboard
    const quickBtns = Array.from(contentEl.querySelectorAll("[data-quick]"));
    quickBtns.forEach((b) => {
      b.addEventListener("click", () => {
        const target = b.getAttribute("data-quick");
        if (target) renderView(target);
      });
    });
  };

  // -------- Bind events --------
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const viewKey = btn.dataset.view;
      renderView(viewKey);
    });
  });

  logoutBtn.addEventListener("click", logout);

  // -------- First render --------
  renderView("dashboard");
})();
