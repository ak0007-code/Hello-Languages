import { NextResponse } from "next/server";
import { WebhookRequestBody, WebhookEvent, messagingApi } from "@line/bot-sdk";
const { MessagingApiClient } = messagingApi;
import OpenAI from "openai";
import emojiRegex from "emoji-regex";

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";

const lineClient = new MessagingApiClient({
  channelAccessToken: channelAccessToken,
});

const gptClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const SYSTEM_PROMPT = `
You are an assistant that responds only in JSON format. Users send JSON with a "text" key. If "text" is in Japanese, correct and translate it to English, responding with:
{
  "japanese": "corrected Japanese",
  "english": "translated English"
}
If "text" is in English, correct it and respond with:
{
  "english": "corrected English",
  "japanese": "translated Japanese"
}
Do not use any other format.
`;

export async function POST(req: Request) {
  const body = (await req.json()) as WebhookRequestBody;
  const events = body.events;
  for (const event of events) {
    await handleLineEvent(event);
  }
  return NextResponse.json({ status: "ok" });
}

async function handleGptEvent(userMessage: string) {
  const chatCompletion = await gptClient.chat.completions.create({
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        // 'You are an assistant that always responds in JSON format. Users provide the content in JSON format under the key "text". When the "text" is in Japanese, you should proofread and correct the Japanese as necessary, translate it into English, and respond in the following format:\n{\n "japanese": "japanese",\n "english": "english"\n}\nSimilarly, when the "text" is in English, you should proofread and correct the English, then respond in the following format:\n{\n "english": "english",\n "japanese": "japanese"\n}\nDo not provide responses or comments in any other format; always respond exclusively using the above JSON format.',
      },
      {
        role: "user",
        content: `{ "text": "${userMessage}" }`,
      },
    ],
    model: "gpt-3.5-turbo",
  });
  const responseText = chatCompletion.choices[0].message.content;
  return responseText;
}

async function handleLineEvent(event: WebhookEvent) {
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;
    const responseText = await handleGptEvent(userMessage);
    const jsonData = extractJsonFromString(responseText || "");
    const keys = Object.keys(jsonData);
    let replyText = "";
    keys.forEach((key) => {
      const value = jsonData[key as keyof typeof jsonData];
      if (key == "japanese") {
        if (replyText == "") {
          replyText = replyText + `🇯🇵 ${value}`;
        } else {
          replyText = replyText + `\n\n🇯🇵 ${value}`;
        }
      }
      if (key == "english") {
        if (replyText == "") {
          replyText = replyText + `🇺🇸 ${value}`;
        } else {
          replyText = replyText + `\n\n🇺🇸 ${value}`;
        }
      }
    });
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

function extractJsonFromString(input: string) {
  const jsonPattern = /{[^{}]*}/;
  const match = input.match(jsonPattern);
  if (match && match[0]) {
    try {
      const jsonObject = JSON.parse(match[0]);
      return jsonObject;
    } catch {
      throw new Error("Found JSON string is invalid.");
    }
  } else {
    throw new Error("No JSON object found in the input string.");
  }
}

function removeEmojis(input: string): string {
  const regex = emojiRegex();
  return input.replace(regex, " ");
}

export async function GET() {
  try {
    const input = removeEmojis("こんにちは");
    console.log({ input });
    await handleGptEvent(input);
    const inputString = `
        \`\`\`json
        {
        "japanese": "ここはどこですか？",
        "english": "Where is this place?"
        }
        \`\`\`
        `;
    const jsonData = extractJsonFromString(inputString);
    console.log("Extracted JSON Object:", jsonData);
    // Extract keys in order
    const keys = Object.keys(jsonData);
    let responseText = "";
    keys.forEach((key) => {
      const value = jsonData[key as keyof typeof jsonData];
      console.log(`Key: ${key}, Value: value`);
      if (key == "japanese") {
        if (responseText == "") {
          responseText = responseText + `🇯🇵 ${value}`;
        } else {
          responseText = responseText + `\n\n🇯🇵 ${value}`;
        }
      }
      if (key == "english") {
        if (responseText == "") {
          responseText = responseText + `🇺🇸 ${value}`;
        } else {
          responseText = responseText + `\n\n🇺🇸 ${value}`;
        }
      }
    });
    console.log({ responseText });
    return NextResponse.json({ message: `Hello!` }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: `Internal Server Error: ${e}` },
      { status: 500 }
    );
  }
}
