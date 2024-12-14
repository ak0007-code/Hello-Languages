// import { NextResponse } from "next/server";
// import { WebhookRequestBody, WebhookEvent, messagingApi } from "@line/bot-sdk";
// const { MessagingApiClient } = messagingApi;
// import crypto from "crypto";

// const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

// const client = new MessagingApiClient({
//   channelAccessToken: channelAccessToken,
// });

// export async function POST(req: Request) {
//   // 1. Parse the incoming request body (from LINE)
//   const body = (await req.json()) as WebhookRequestBody;

//   // 2. Retrieve the X-Line-Signature from the headers
//   const signature = req.headers.get("X-Line-Signature") || "";

//   // 3. Verify the signature
//   const bodyString = JSON.stringify(body);
//   const hash = crypto
//     .createHmac("sha256", channelAccessToken)
//     .update(bodyString)
//     .digest("base64");

//   if (hash !== signature) {
//     // Signature didn't match, return 401 Unauthorized
//     return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
//   }

//   // 4. Process each event
//   const events = body.events;
//   for (const event of events) {
//     await handleEvent(event);
//   }

//   // 5. Return a 200 OK response so that LINE knows we've successfully received the webhook
//   return NextResponse.json({ status: "ok" });
// }

// // This function handles each incoming event from LINE
// async function handleEvent(event: WebhookEvent) {
//   // Check the event type
//   if (event.type === "message" && event.message.type === "text") {
//     // If it's a text message, let's reply with something simple
//     const userMessage = event.message.text;

//     const replyText = `You said: ${userMessage}`;
//     // await client.replyMessage(replyToken, { type: "text", text: replyText });
//     await client.replyMessage({
//       replyToken: event.replyToken,
//       messages: [
//         {
//           type: "text",
//           text: replyText,
//         },
//       ],
//     });
//   } else {
//     // For other event types (e.g. follow, unfollow, join, leave, postback)
//     // you can add custom logic here.
//     console.log("Received an event:", event.type);
//   }
// }

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
  // 1. Parse the incoming request body (from LINE)
  const body = (await req.json()) as WebhookRequestBody;

  // 2. Retrieve the X-Line-Signature from the headers
  const signature = req.headers.get("X-Line-Signature") || "";

  // 3. Verify the signature using channelSecret
  const bodyString = JSON.stringify(body);
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(bodyString)
    .digest("base64");

  if (hash !== signature) {
    // Signature didn't match, return 401 Unauthorized
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 4. Process each event
  const events = body.events;
  for (const event of events) {
    await handleEvent(event);
  }

  // 5. Return a 200 OK response so that LINE knows we've successfully received the webhook
  return NextResponse.json({ status: "ok" });
}

// This function handles each incoming event from LINE
async function handleEvent(event: WebhookEvent) {
  // Check the event type
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;
    const replyText = `You said: ${userMessage}`;

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
