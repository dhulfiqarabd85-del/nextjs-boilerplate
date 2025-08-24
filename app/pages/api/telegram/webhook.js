export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).send("OK (telegram webhook alive)");
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-telegram-bot-api-secret-token'] !== process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(401).end();
  const update = req.body;
  const chatId = update?.message?.chat?.id || update?.callback_query?.from?.id || update?.my_chat_member?.chat?.id;
  if (update?.message?.text === "/help") {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Commands:\n/answer <ticketId> <text>\n/approve <ticketId>" })
    });
  }
  return res.status(200).end("OK");
}
