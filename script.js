document.addEventListener("DOMContentLoaded", () => {
  console.log("[chat] DOMContentLoaded");

  // ====== CONFIG ======
  const TOKEN    = "app-TzgNBWukBZCRAi4wQc2OcS3I";
  const ENDPOINT = "https://dify.enov.fr/v1/chat-messages";

  // ====== HELPERS UI ======
  const $ = (id) => document.getElementById(id);
  const messages = $("messages");
  const empty    = $("empty");
  const input    = $("q");
  const btn      = $("send");
  const errLine  = $("chat-error");

  // Vérifs de base
  if (!messages || !input || !btn) {
    console.error("[chat] IDs manquants:", { messages: !!messages, input: !!input, btn: !!btn });
    if (errLine) errLine.textContent = "Erreur d’initialisation du chat (éléments introuvables).";
    return;
  }
  console.log("[chat] Elements OK");

  // État bouton en fonction du champ
  function refreshButton() {
    btn.disabled = !input.value.trim();
  }
  input.addEventListener("input", refreshButton);
  refreshButton();

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

  async function send() {
    if (sending) return;
    const text = input.value.trim();
    if (!text) return;

    sending = true;
    btn.disabled = true;
    errLine && (errLine.textContent = "");

    bubble(text, "user");
    input.value = "";
    input.focus();
    refreshButton();

    const bot = bubble("…", "bot");

    // Payload par défaut : streaming
    const payloadStreaming = {
      inputs: {},
      response_mode: "streaming",
      auto_generate_name: true,
      query: text,
      user: "web-1",
    };

    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    };

    try {
      console.log("[chat] fetch streaming →", ENDPOINT);
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(payloadStreaming),
        // mode: "cors" // (par défaut déjà 'cors' pour cross-origin)
      });

      if (!res.ok) {
        const msg = `Erreur ${res.status}: ${res.statusText}`;
        console.error("[chat]", msg);
        bot.textContent = msg;
        return;
      }

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/event-stream")) {
        // Certains reverse proxy (ou CORS) coupent le SSE : on tente un fallback non-streaming
        console.warn("[chat] Pas de SSE, fallback en mode blocking (JSON).");
        await handleBlocking(text, bot);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith("data:")) continue;
          const jsonStr = part.slice(5).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const evt = JSON.parse(jsonStr);
            if (evt.answer) {
              acc += evt.answer;
              bot.textContent = acc;
              messages.scrollTop = messages.scrollHeight;
            }
          } catch (e) {
            // Keep-alive / ping non JSON
          }
        }
      }
    } catch (e) {
      console.error("[chat] Streaming error:", e);
      bot.textContent = "Erreur réseau. Tentative en mode standard…";
      // Fallback si le streaming échoue (CORS, proxy, etc.)
      try {
        await handleBlocking(text, bot);
      } catch (e2) {
        console.error("[chat] Fallback blocking error:", e2);
        bot.textContent = "Erreur : " + (e2?.message || "imprévue.");
        errLine && (errLine.textContent = "Impossible d’envoyer le message (réseau ou CORS).");
      }
    } finally {
      sending = false;
      refreshButton();
    }
  }

  // Fallback non-streaming (réponse JSON unique)
  async function handleBlocking(text, botBubbleEl) {
    const payloadBlocking = {
      inputs: {},
      response_mode: "blocking",
      auto_generate_name: true,
      query: text,
      user: "web-1",
    };

    const headersBlocking = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: headersBlocking,
      body: JSON.stringify(payloadBlocking),
    });

    if (!res.ok) {
      const msg = `Erreur ${res.status}: ${res.statusText}`;
      botBubbleEl.textContent = msg;
      throw new Error(msg);
    }

    const data = await res.json();
    // Dify renvoie généralement { answer: "...", ... }
    const answer = data?.answer || JSON.stringify(data);
    botBubbleEl.textContent = answer;
    messages.scrollTop = messages.scrollHeight;
  }

  // Bindings
  btn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  console.log("[chat] Listeners OK");
});
