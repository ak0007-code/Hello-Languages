import { NextResponse } from "next/server";
import { WebhookRequestBody, WebhookEvent, messagingApi } from "@line/bot-sdk";
const { MessagingApiClient } = messagingApi;
import crypto from "crypto";
import OpenAI from "openai";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

const lineClient = new MessagingApiClient({
  channelAccessToken: channelAccessToken,
});

const gptClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  const body = (await req.json()) as WebhookRequestBody;
  const signature = req.headers.get("X-Line-Signature") || "";
  const bodyString = JSON.stringify(body);
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(bodyString)
    .digest("base64");
  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const events = body.events;
  const responseText = await handleGptEvent();
  for (const event of events) {
    await handleLineEvent(event, responseText || "");
  }
  return NextResponse.json({ status: "ok" });
}

async function handleLineEvent(event: WebhookEvent, responseText: string) {
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;
    const replyText = `🇯🇵 ${userMessage}, ${responseText}`;
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        {
          type: "text",
          text: replyText,
        },
      ],
    });
  } else {
    console.log("Received an event:", event.type);
  }
}

async function handleGptEvent() {
  const chatCompletion = await gptClient.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          'あなたは常にJSON形式で回答するアシスタントです。ユーザーが行う質問もJSON形式で与えられます。質問への回答も以下の形式で返してください:\n{\n  "answer": "...回答..."\n}\n他の形式での回答やコメントは一切行わず、必ず上記のJSON形式のみで返答してください。',
      },
      {
        role: "user",
        content: '{ "question": "日本の首都はどこですか？" }',
      },
    ],
    model: "gpt-4o",
  });
  const responseText = chatCompletion.choices[0].message.content;
  return responseText;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "World";
    return NextResponse.json({ message: `Hello, ${name}!` }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: `Internal Server Error: ${e}` },
      { status: 500 }
    );
  }
}
