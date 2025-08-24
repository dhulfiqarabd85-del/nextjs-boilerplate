import OpenAI from "openai";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function GET() {
  return new Response(JSON.stringify({ ok: true, alive: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

// إشعار تيليغرام عند الشك/الخطأ (اختياري)
async function notifyAdmin(msg) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: msg }),
      }
    );
  } catch {}
}

export async function POST(req) {
  const headers = { "Content-Type": "application/json", ...cors };

  try {
    const { message = "", lang = "auto" } = await req.json().catch(() => ({}));
    if (!message.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "No message" }), {
        status: 400,
        headers,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const resp = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You are Dhu-Bot. Answer briefly in user's language (AR/EN). " +
            "If you are NOT SURE, begin the reply with the token [UNCERTAIN] and give your best attempt.",
        },
        { role: "user", content: message },
      ],
    });

    // استخراج النص من Responses API
    let text = "";
    for (const item of resp.output ?? []) {
      for (const c of item.content ?? []) {
        if (c.type === "output_text" && c.text) text += c.text;
      }
    }
    if (!text && resp.output_text) text = resp.output_text;
    if (!text) text = "تمت المعالجة، لكن لم يصلني نص واضح من المحرك.";

    // تمييز عدم اليقين + إشعارك
    let uncertain = false;
    if (text.startsWith("[UNCERTAIN]")) {
      uncertain = true;
      await notifyAdmin(`🤖⚠️ UNCERTAIN\nQ: ${message}\nA: ${text}`);
      text = text.replace(/^\[UNCERTAIN\]\s*/, "") + "\n\nسأتأكد من الإجابة وأعود إليك قريبًا.";
    }

    return new Response(
      JSON.stringify({ ok: true, ready: true, uncertain, text, answer: text, message: text }),
      { status: 200, headers }
    );
  } catch (e) {
    try { await notifyAdmin(`❌ Chat API error: ${e?.message || e}`); } catch {}
    const fallback = "واجهتني مشكلة مؤقتة في الاتصال بالمحرك. تم إشعار المشرف على تيليغرام.";
    return new Response(JSON.stringify({ ok: true, ready: true, text: fallback, answer: fallback }), {
      status: 200,
      headers,
    });
  }
}
