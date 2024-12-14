import { NextResponse } from "next/server";
import { WebhookRequestBody, WebhookEvent, messagingApi } from "@line/bot-sdk";
const { MessagingApiClient } = messagingApi;
import crypto from "crypto";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

const client = new MessagingApiClient({
  channelAccessToken: channelAccessToken,
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
    await handleEvent(event);
  }
  return NextResponse.json({ status: "ok" });
}

async function handleEvent(event: WebhookEvent) {
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;
    const replyText = `🇯🇵 ${userMessage}`;

    await client.replyMessage({
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
