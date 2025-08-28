document.addEventListener("DOMContentLoaded", () => {
  console.log("[chat] DOM prêt");

  // ====== CONFIG DIFY ======
  const TOKEN    = "app-TzgNBWukBZCRAi4wQc2OcS3I";           // <-- vérifie que c'est bien la clé APP de CETTE app
  const ENDPOINT = "https://dify.enov.fr/v1/chat-messages";   // <-- endpoint chat de ton instance

  /**
   * Si ton app Dify a des "Inputs" requis (Studio > Inputs),
   * déclare-les ici (noms EXACTS) :
   *
   * Exemple :
   * const REQUIRED_INPUTS = { client: "APEC", dataset: "barometre_2025" };
   */
  const REQUIRED_INPUTS = {}; // ← vide par défaut

  // ====== HOOK UI ======
  const $        = (id) => document.getElementById(id);
  const messages = $("messages");
  const empty    = $("empty");
  const input    = $("q");
  const btn      = $("send");
  const errLine  = $("chat-error");

  if (!messages || !input || !btn) {
    console.error("[chat] IDs manquants:", { messages: !!messages, input: !!input, btn: !!btn });
    if (errLine) errLine.textContent = "Erreur d’initialisation du chat (éléments introuvables).";
    return;
  }

  // bouton actif seulement si texte
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
  let conversationId = null; // pour enchaîner les tours si besoin

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

    // --- payload "blocking" (réponse JSON unique, plus simple/fiable que SSE) ---
    const payload = {
      inputs: { ...REQUIRED_INPUTS },
      response_mode: "blocking",
      auto_generate_name: true,
      query: text,
      user: "web-1",
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

      // Lis TOUJOURS le corps (même en cas d'erreur) pour remonter le détail
      const raw = await res.text();
      let data = null;
      try { data = JSON.parse(raw); } catch { /* pas JSON -> garde raw */ }

      if (!res.ok) {
        const detail = (data && (data.message || data.error)) || raw || (res.status + " " + res.statusText);
        bot.textContent = `Erreur ${res.status} : ${detail}`;
        console.error("[chat] HTTP Error", res.status, res.statusText, data || raw);
        return;
      }

      // OK
      // Dify renvoie typiquement { answer, conversation_id, ... }
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

  // Bind
  btn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  console.log("[chat] Listeners OK");
});
