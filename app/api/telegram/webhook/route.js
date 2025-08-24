export async function GET() {
  return new Response("OK (telegram webhook alive)", { status: 200 });
}
export async function POST(req) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });
  const update = await req.json();
  const chatId = update?.message?.chat?.id || update?.callback_query?.from?.id || update?.my_chat_member?.chat?.id;
  if (update?.message?.text === "/help") {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Commands:\n/answer <ticketId> <text>\n/approve <ticketId>" })
    });
  }
  return new Response("OK", { status: 200 });
}
