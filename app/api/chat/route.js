// app/api/chat/route.js
import OpenAI from "openai";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function OPTIONS(){ return new Response(null,{status:204,headers:cors}); }
export async function GET(){ return new Response(JSON.stringify({ok:true,alive:true}),{status:200,headers:{"Content-Type":"application/json",...cors}}); }

export async function POST(req){
  try{
    const {message="", lang="auto"} = await req.json().catch(()=>({}));
    if(!message) return new Response(JSON.stringify({ok:false,error:"No message"}),{status:400,headers:{"Content-Type":"application/json",...cors}});
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        { role:"system", content:"You are Dhu-Bot. Answer briefly in user's language (AR/EN)." },
        { role:"user", content: message }
      ]
    });
    let text="…";
    for(const item of resp.output??[]) for(const c of item.content??[]) if(c.type==="output_text"&&c.text) text=c.text;
    return new Response(JSON.stringify({ok:true,text}),{status:200,headers:{"Content-Type":"application/json",...cors}});
  }catch(e){
    console.error(e);
    return new Response(JSON.stringify({ok:false,error:"chat error"}),{status:500,headers:{"Content-Type":"application/json",...cors}});
  }
}
