(function () {
  const $ = (id) => document.getElementById(id);

  const isLoginPage = !!$("btnLogin");
  const isWorkspacePage = !!$("btnSend");

  const api = {
    async post(url, body, token) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {})
        },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    },
    async get(url, token) {
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: "Bearer " + token } : {})
        }
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    }
  };

  function showToast(el, text, kind) {
    if (!el) return;
    el.style.display = "block";
    el.classList.remove("ok", "err");
    if (kind) el.classList.add(kind);
    el.textContent = text;
  }

  function setAuth(token, user) {
    localStorage.setItem("renovia_token", token);
    localStorage.setItem("renovia_user", JSON.stringify(user || {}));
  }

  function getToken() {
    return localStorage.getItem("renovia_token");
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("renovia_user") || "{}");
    } catch {
      return {};
    }
  }

  function clearAuth() {
    localStorage.removeItem("renovia_token");
    localStorage.removeItem("renovia_user");
    localStorage.removeItem("renovia_active_conv");
  }

  function setActiveConv(id) {
    localStorage.setItem("renovia_active_conv", String(id));
  }

  function getActiveConv() {
    const v = localStorage.getItem("renovia_active_conv");
    return v ? Number(v) : null;
  }

  if (isLoginPage) {
    $("btnRegister").addEventListener("click", async () => {
      const name = $("regName").value.trim();
      const email = $("regEmail").value.trim();
      const password = $("regPassword").value;

      const out = await api.post("/api/auth/register", { name, email, password });

      if (!out.ok) {
        showToast($("regOut"), out.text || "Erreur", "err");
        return;
      }
      showToast($("regOut"), out.text, "ok");
    });

    $("btnLogin").addEventListener("click", async () => {
      const email = $("loginEmail").value.trim();
      const password = $("loginPassword").value;

      const out = await api.post("/api/auth/login", { email, password });

      if (!out.ok) {
        showToast($("loginOut"), out.text || "Erreur", "err");
        return;
      }

      try {
        const data = JSON.parse(out.text);
        setAuth(data.token, data.user);
        window.location.href = "/index.html";
      } catch {
        showToast($("loginOut"), out.text, "err");
      }
    });

    const token = getToken();
    if (token) {
      window.location.href = "/index.html";
    }
  }

  if (isWorkspacePage) {
    const token = getToken();
    if (!token) {
      window.location.href = "/login.html";
      return;
    }

    const user = getUser();
    $("userBadge").textContent = user.email ? user.email : "Connecté";

    $("btnLogout").addEventListener("click", () => {
      clearAuth();
      window.location.href = "/login.html";
    });

    function renderMessages(messages) {
      const box = $("chatBox");
      box.innerHTML = "";
      (messages || []).forEach((m) => {
        const row = document.createElement("div");
        row.className = "msg " + (m.role === "user" ? "user" : "assistant");

        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.textContent = m.content;

        row.appendChild(bubble);
        box.appendChild(row);
      });
      box.scrollTop = box.scrollHeight;
    }

    async function refreshConversations() {
      const out = await api.get("/api/chat/conversations", token);
      if (!out.ok) {
        showToast($("convOut"), out.text || "Erreur", "err");
        return;
      }

      let data = {};
      try { data = JSON.parse(out.text); } catch {}

      const list = data.conversations || [];
      if (!list.length) {
        $("convList").textContent = "Aucune conversation pour le moment.";
        return;
      }

      $("convList").innerHTML = list
        .map((c) => {
          const label = `#${c.id} - ${c.agent_type} - ${new Date(c.created_at).toLocaleString()}`;
          return `<div style="padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer" data-id="${c.id}">${label}</div>`;
        })
        .join("");

      Array.from($("convList").querySelectorAll("[data-id]")).forEach((el) => {
        el.addEventListener("click", async () => {
          const id = Number(el.getAttribute("data-id"));
          setActiveConv(id);
          $("activeConv").textContent = String(id);
          await refreshMessages();
        });
      });
    }

    async function refreshMessages() {
      const id = getActiveConv();
      if (!id) {
        renderMessages([]);
        return;
      }
      const out = await api.get(`/api/chat/conversations/${id}/messages`, token);
      if (!out.ok) {
        showToast($("msgOut"), out.text || "Erreur", "err");
        return;
      }
      let data = {};
      try { data = JSON.parse(out.text); } catch {}
      renderMessages(data.messages || []);
    }

    $("btnCreateConv").addEventListener("click", async () => {
      const agent_type = $("agentType").value;
      const out = await api.post("/api/chat/conversations", { agent_type }, token);

      if (!out.ok) {
        showToast($("convOut"), out.text || "Erreur", "err");
        return;
      }

      try {
        const data = JSON.parse(out.text);
        setActiveConv(data.conversation_id);
        $("activeConv").textContent = String(data.conversation_id);
        showToast($("convOut"), `Conversation créée: ${data.conversation_id}`, "ok");
        await refreshConversations();
        await refreshMessages();
      } catch {
        showToast($("convOut"), out.text, "err");
      }
    });

    $("btnSend").addEventListener("click", async () => {
      const conversation_id = getActiveConv();
      const content = $("messageInput").value.trim();

      if (!conversation_id) {
        showToast($("msgOut"), "Crée une conversation d’abord.", "err");
        return;
      }
      if (!content) return;

      $("btnSend").disabled = true;

      const out = await api.post("/api/chat/messages", { conversation_id, content }, token);
      $("btnSend").disabled = false;

      if (!out.ok) {
        showToast($("msgOut"), out.text || "Erreur", "err");
        return;
      }

      $("messageInput").value = "";
      await refreshMessages();
    });

    $("btnRefresh").addEventListener("click", async () => {
      await refreshMessages();
      await refreshConversations();
    });

    const active = getActiveConv();
    $("activeConv").textContent = active ? String(active) : "Aucune";
    refreshConversations().then(refreshMessages);
  }
})();
