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
  for (const event of events) {
    await handleLineEvent(event);
  }
  return NextResponse.json({ status: "ok" });
}

async function handleLineEvent(event: WebhookEvent) {
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;
    const responseText = await handleGptEvent();
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
    model: "gpt-4o",
  });
  const responseText = chatCompletion.choices[0].message.content;
  return responseText;
}
