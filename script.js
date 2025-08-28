// ====== CONFIG ======
    const TOKEN    = "app-TzgNBWukBZCRAi4wQc2OcS3I";
    const ENDPOINT = "https://dify.enov.fr/v1/chat-messages";

    // ====== HELPERS UI ======
    const $ = (id) => document.getElementById(id);
    const messages = $("messages");
    const empty    = $("empty");
    const input    = $("q");
    const btn      = $("send");

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
    async function send() {
      const text = input.value.trim();
      if (!text) return;

      bubble(text, "user");
      input.value = "";
      btn.disabled = true;
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
          btn.disabled = false;
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
            } catch {}
          }
        }
      } catch (e) {
        bot.textContent = "Erreur : " + e.message;
      } finally {
        btn.disabled = false;
      }
    }

    // Bind
    btn.addEventListener("click", send);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
