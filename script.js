document.addEventListener("DOMContentLoaded", () => {
  // ====== CONFIG ======
  const TOKEN    = "app-TzgNBWukBZCRAi4wQc2OcS3I";
  const ENDPOINT = "https://dify.enov.fr/v1/chat-messages";

  // ====== HELPERS UI ======
  const $ = (id) => document.getElementById(id);
  const messages = $("messages");
  const empty    = $("empty");
  const input    = $("q");
  const btn      = $("send");

  // Garde-fous si un ID manque
  if (!messages || !input || !btn) {
    console.error("[chat] IDs manquants :", { messages: !!messages, input: !!input, btn: !!btn });
    return; // on arrête proprement
  }

  function bubble(text, role) {
    if (empty) empty.remove();
    const line = document.createElement("div");
    line.className = "flex " + (role === "user" ? "justify-end" : "justify-start");
    const b = document.createElement("div");
    b.className = (role === "user"
      ? "max-w-[70%] rounded-xl px-4 py-3 bg-blue-100"
      : "max-w-[70%] rounded-xl px-4 py-3 bg-gray-200");
    b.textContent = text;
    line.appendChild(b);
    messages.appendChild(line);
    messages.scrollTop = messages.scrollHeight;
    return b;
  }

  // ====== ENVOI ======
  let sending = false;

  async function send() {
    if (sending) return;
    const text = input.value.trim();
    if (!text) return;

    sending = true;
    btn.disabled = true;

    const userBubble = bubble(text, "user");
    input.value = "";
    input.focus();

    const bot = bubble("…", "bot");

    const payload = {
      inputs: {},
      response_mode: "streaming",
      auto_generate_name: true,
      query: text,
      user: "1",
    };

    const headers = {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    };

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        bot.textContent = `Erreur ${res.status}: ${res.statusText}`;
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
          } catch {
            // ignore JSON parse errors on keep-alives
          }
        }
      }
    } catch (e) {
      bot.textContent = "Erreur : " + e.message;
      console.error(e);
    } finally {
      sending = false;
      btn.disabled = false;
    }
  }

  // ====== BINDINGS ======
  btn.addEventListener("click", send);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
});
