document.addEventListener("DOMContentLoaded", () => {
  console.log("[chat] DOM prêt");

  // ====== CONFIG DIFY ======
  const TOKEN    = "app-TzgNBWukBZCRAi4wQc2OcS3I";
  const ENDPOINT = "https://dify.enov.fr/v1/chat-messages";

  // ====== HOOK UI ======
  const $        = (id) => document.getElementById(id);
  const messages = $("messages");
  const empty    = $("empty");
  const input    = $("q");
  const btn      = $("send");
  const errLine  = $("chat-error");

  // ====== UI Paramètres ======
  const modal     = $("settings-modal");
  const openBtn   = $("open-settings");
  const closeBtn  = $("close-settings");
  const etudeIdEl = $("etude-id");
  const etudeNomEl= $("etude-nom");
  const userNomEl = $("user-nom");
  const userRoleEl= $("user-role");
  const userIdEl  = $("user-id");
  const saveBtn   = $("save-kv");
  const resetBtn  = $("reset-kv");

  // Stockage local
  const LS_KEY = "dify_inputs_v2";
  function loadKV() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveKV(obj) {
    localStorage.setItem(LS_KEY, JSON.stringify(obj || {}));
  }
  function fillEditorFromKV() {
    const kv = loadKV();
    etudeIdEl.value = kv.etude_id || "";
    etudeNomEl.value = kv.etude_nom || "";
    userNomEl.value = kv.user_nom || "";
    userRoleEl.value = kv.user_role || "";
    userIdEl.value = kv.user_id || "";
  }
  function collectKVFromEditor() {
    return {
      etude_id: etudeIdEl.value.trim(),
      etude_nom: etudeNomEl.value.trim(),
      user_nom: userNomEl.value.trim(),
      user_role: userRoleEl.value.trim(),
      user_id: userIdEl.value.trim(),
    };
  }

  // --- Gestion modale (avec fallback display + logs) ---
  if (openBtn && modal && closeBtn) {
    const showModal = () => {
      fillEditorFromKV();
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      modal.style.display = "flex";
      console.log("[settings] open");
    };
    const hideModal = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      modal.style.display = "none";
      console.log("[settings] close");
    };

    openBtn.addEventListener("click", showModal);
    closeBtn.addEventListener("click", hideModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideModal();
    });
  } else {
    console.warn("[settings] elements not found", { openBtn: !!openBtn, modal: !!modal, closeBtn: !!closeBtn });
  }

  if (saveBtn) saveBtn.addEventListener("click", () => {
    saveKV(collectKVFromEditor());
    // ferme le modal
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    modal.style.display = "none";
  });
  if (resetBtn) resetBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    fillEditorFromKV();
  });

  // ====== Chat basique ======
  if (!messages || !input || !btn) {
    console.error("[chat] IDs manquants:", { messages: !!messages, input: !!input, btn: !!btn });
    if (errLine) errLine.textContent = "Erreur d’initialisation du chat (éléments introuvables).";
    return;
  }

  const refreshBtn = () => btn.disabled = !input.value.trim();
  input.addEventListener("input", refreshBtn);
  refreshBtn();

  function bubble(text, role) {
    if (empty) empty.remove();
    const line = document.createElement("div");
    line.className = "flex " + (role === "user" ? "justify-end" : "justify-start");
    const b = document.createElement("div");
    b.className = (role === "user"
      ? "max-w-[70%] rounded-xl px-4 py-3 bg-blue-600 text-white"
      : "max-w-[70%] rounded-xl px-4 py-3 bg-white border shadow-sm text-gray-800");
    b.textContent = text;
    line.appendChild(b);
    messages.appendChild(line);
    messages.scrollTop = messages.scrollHeight;
    return b;
  }

  let sending = false;
  let conversationId = null;

  async function send() {
    if (sending) return;
    const text = input.value.trim();
    if (!text) return;

    sending      = true;
    btn.disabled = true;
    if (errLine) errLine.textContent = "";

    bubble(text, "user");
    input.value = "";
    input.focus();
    refreshBtn();

    const bot = bubble("…", "bot");

    // Récup Firebase user (si dispo)
    let fbUser = null;
    try { fbUser = firebase.auth().currentUser || null; } catch {}

    const kv = loadKV();
    const user_id    = (kv.user_id || (fbUser && fbUser.uid) || "");
    const user_email = (fbUser && fbUser.email) || "";
    const user_nom   = (kv.user_nom || (fbUser && (fbUser.displayName || fbUser.email)) || "");
    const user_role  = (kv.user_role || "user");
    const etude_id   = (kv.etude_id || "");
    const etude_nom  = (kv.etude_nom || "");

    // Inputs "plats" ET "imbriqués" — maximise la compatibilité avec ce que Dify attend
    const inputs = {
      // PLATS
      user_id, user_nom, user_email, user_role,
      etude_id, etude_nom,
      // IMBRIQUÉS
      user: {
        id: user_id || null,
        nom: user_nom || null,
        email: user_email || null,
        role: user_role || null
      },
      etude: {
        id: etude_id || null,
        nom: etude_nom || null,
        id_user: user_id || null
      }
    };

    const payload = {
      inputs,
      response_mode: "blocking",
      auto_generate_name: true,
      query: text,
      user: user_id || "web-1",
      ...(conversationId ? { conversation_id: conversationId } : {})
    };

    try {
      console.log("[chat] POST →", ENDPOINT, payload);
      const res = await fetch(ENDPOINT, {
        method: "POST",
        mode: "cors",
        headers: {
          Authorization: "Bearer " + TOKEN,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        const detail = (data && (data.message || data.error)) || raw || (res.status + " " + res.statusText);
        bot.textContent = `Erreur ${res.status} : ${detail}`;
        console.error("[chat] HTTP Error", res.status, res.statusText, data || raw);

        if (String(detail).toLowerCase().includes("input")) {
          if (errLine) errLine.innerHTML =
            'Des <strong>inputs</strong> semblent manquants. Cliquez sur <em>⚙️ Paramètres</em> et renseignez <code>etude_id</code>, <code>etude_nom</code>, <code>user_role</code>…';
        }
        return;
      }

      conversationId = data?.conversation_id || conversationId;
      const answer = data?.answer || (data ? JSON.stringify(data) : "(réponse vide)");
      bot.textContent = answer;
      messages.scrollTop = messages.scrollHeight;
    } catch (e) {
      console.error("[chat] Network/JS error:", e);
      bot.textContent = "Erreur : " + (e?.message || "réseau.");
      if (errLine) errLine.textContent = "Impossible d’envoyer le message (réseau/CORS ?).";
    } finally {
      sending = false;
      refreshBtn();
    }
  }

  btn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });

  console.log("[chat] Listeners OK");
});
