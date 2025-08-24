// ضعها أعلى الملف (قبل POST)
async function notifyAdmin(msg) {
  // لن نرسل شيئًا إن لم تكن المتغيرات موجودة
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: msg })
      }
    );
  } catch {}
}

// ====== استبدل دالة POST الحالية بهذه ======
export async function POST(req) {
  // نجمع ترويسات CORS (لو كان عندك const cors في نفس الملف سيُستخدم)
  const baseCors =
    (typeof cors !== "undefined" && cors) ||
    { "Access-Control-Allow-Origin": "*" };
  const headers = { "Content-Type": "application/json", ...baseCors };

  try {
    const { message = "", lang = "auto" } = await req.json().catch(() => ({}));
    if (!message.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "No message" }), {
        status: 400,
        headers
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
            "If you are NOT SURE, begin the reply with the token [UNCERTAIN] and give your best attempt."
        },
        { role: "user", content: message }
      ]
    });

    // استخراج النص من الشكل الجديد لواجهة Responses
    let text = "";
    for (const item of resp.output ?? []) {
      for (const c of item.content ?? []) {
        if (c.type === "output_text" && c.text) text += c.text;
      }
    }
    if (!text && resp.output_text) text = resp.output_text;

    // لو ما زال النص فارغًا
    if (!text) text = "تمت المعالجة، لكن لم يصلني نص واضح من المحرك.";

    // تمييز حالة عدم اليقين + تنبيهك على التيليغرام
    let uncertain = false;
    if (text.startsWith("[UNCERTAIN]")) {
      uncertain = true;
      await notifyAdmin(`🤖⚠️ UNCERTAIN\nQ: ${message}\nA: ${text}`);
      text = text.replace(/^\[UNCERTAIN\]\s*/, "");
      text += "\n\nسأتأكد من الإجابة وأعود إليك قريبًا.";
    }

    const payload = {
      ok: true,
      ready: true,
      uncertain,
      text,
      answer: text,   // توافق مع واجهات أخرى
      message: text   // توافق قديم
    };

    return new Response(JSON.stringify(payload), { status: 200, headers });
  } catch (e) {
    // إشعار الإداري عند الخطأ
    try {
      await notifyAdmin(`❌ Chat API error: ${e?.message || e}`);
    } catch {}

    const fallback =
      "واجهتني مشكلة مؤقتة في الاتصال بالمحرك. تم إشعار المشرف على تيليغرام، حاول ثانية لاحقًا.";
    return new Response(
      JSON.stringify({ ok: true, ready: true, text: fallback, answer: fallback, message: fallback }),
      { status: 200, headers }
    );
  }
}
