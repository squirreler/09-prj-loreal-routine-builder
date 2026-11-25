// Only this Worker reads the server credential; the browser calls /api/chat.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const json = (data, status = 200) => Response.json(data, { status, headers });
    if (url.pathname !== "/api/chat") return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);
    if (!env.INFERENCE_URL || !env.OPENAI_API_KEY) {
      return json({ error: "The inference server is not configured yet. Please try again later." }, 503);
    }
    let input;
    try { input = await request.json(); }
    catch { return json({ error: "Invalid JSON." }, 400); }
    if (!Array.isArray(input?.messages) || !input.messages.length ||
        input.messages.some(message => !message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string")) {
      return json({ error: "A conversation is required." }, 400);
    }
    // Keep the topic restriction on the server, ahead of user messages.
    const system = "You are L’Oréal’s product-aware beauty routine advisor. Build routines using only the selected product JSON in the conversation. Remember the generated routine and all follow-up context. Explain order, timing and incompatible selections. Do not add unselected products. Never claim to have searched the web unless actual search results are provided. Answer only about L’Oréal brands, products, beauty routines and recommendations (skincare, haircare, makeup and fragrance). Politely decline unrelated requests and redirect to L’Oréal beauty advice. Do not invent product facts. Give clear, concise answers.";
    const body = {
      model: env.INFERENCE_MODEL || "gpt-4.1",
      messages: [{ role: "system", content: system }, ...input.messages],
    };
    try {
      const response = await fetch(env.INFERENCE_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) return json({ error: "The inference server is unavailable. Please try again later." }, 502);
      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) return json({ error: "The server returned an empty response. Please try again." }, 502);
      return json(data);
    } catch {
      return json({ error: "Could not reach the inference server. Please try again later." }, 502);
    }
  },
};
