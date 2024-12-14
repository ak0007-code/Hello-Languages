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
  apiKey: process.env.OPENAI_API_KEY || "", // This is the default and can be omitted
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
    messages: [{ role: "user", content: "Say this is a test" }],
    model: "gpt-3.5-turbo",
  });
  const responseText = chatCompletion.choices[0].message.content;
  return responseText;
}

export async function GET(req: Request) {
  try {
    console.log(process.env.OPENAI_API_KEY);
    const res = await handleGptEvent();
    console.log({ res });

    // リクエストのURLからクエリパラメータを取得（例: ?name=ChatGPT）
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "World";

    // レスポンスとしてJSONを返す
    return NextResponse.json({ message: `Hello, ${name}!` }, { status: 200 });
  } catch (e) {
    // エラーハンドリング
    console.error("APIエラー:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
