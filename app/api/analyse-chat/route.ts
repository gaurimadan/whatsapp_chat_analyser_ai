import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface ChatMessage {
  timestamp: Date;
  sender: string;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const fileContent = new TextDecoder("utf-8").decode(fileBuffer);
    const lines = fileContent.split("\n");

    const pattern = /(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}\s?[APM]*) - ([^:]+): (.*)/;

   
    let data = lines
      .map(line => {
        const match = line.match(pattern);
        if (match) {
          const [_, dateTime, sender, message] = match;
          return {
            timestamp: new Date(dateTime),
            sender: sender.trim(),
            message: message.trim(),
          };
        }
        return null;
      })
      .filter((item): item is ChatMessage => item !== null)
      .filter(item => !isNaN(item.timestamp.getTime()));

  
    data = data.filter(
      item =>
        !item.message.toLowerCase().includes("end-to-end encrypted") &&
        !item.message.toLowerCase().includes("waiting for this message")
    );

    const recentMessages = data.slice(-5000);

    const responseTimesMs = calculateResponseTimes(recentMessages);
    const avgResponseTime = formatResponseTime(responseTimesMs);

    const topWords = getTopWords(recentMessages);

    // Combine messages into chat history
    const chatHistory = recentMessages.map(item => `${item.sender}: ${item.message}`).join("\n");

    // Prompts
    const roastPrompt = `Analyze this WhatsApp chat and provide a fun, sarcastic roast based on the overall sentiment and tone. Use humor and relevant emojis.\n\nChat Data:\n${chatHistory}`;
    const relationshipPrompt = `Based on the communication style in this chat, create a playful phrase (maximum 5 words) that describes the relationship between the participants.\n\nChat Data:\n${chatHistory}`;

   
    const roastModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const roastResult = await roastModel.generateContent(roastPrompt);
    const roastResponse = await roastResult.response;
    const roast = roastResponse.text();

    const relationshipModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const relationshipResult = await relationshipModel.generateContent(relationshipPrompt);
    const relationshipResponse = await relationshipResult.response;
    const relationshipPhrase = relationshipResponse.text();

    return NextResponse.json({
      analysis: {
        roast,
        averageResponseTime: avgResponseTime,
        topWords,
        relationshipPhrase,
      },
    });
  } catch (error) {
    console.error("Error analyzing chat:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function calculateResponseTimes(messages: ChatMessage[]): number[] {
  const responseTimes: number[] = [];

  for (let i = 1; i < messages.length; i++) {
    const currentMsg = messages[i];
    const prevMsg = messages[i - 1];

    if (currentMsg.sender !== prevMsg.sender) {
      const timeDiff = currentMsg.timestamp.getTime() - prevMsg.timestamp.getTime();
      // // Filter out response times longer than 12 hours to avoid skewing the average
      if (timeDiff < 12 * 60 * 60 * 1000) {
        responseTimes.push(timeDiff);
      }
    }
  }

  return responseTimes;
}

function formatResponseTime(responseTimes: number[]): string {
  if (responseTimes.length === 0) return "N/A";

  const avgMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

  if (avgMs < 60000) {
    return `${Math.round(avgMs / 1000)} seconds`;
  } else if (avgMs < 3600000) {
    return `${Math.round(avgMs / 60000)} minutes`;
  } else {
    return `${Math.round(avgMs / 3600000)} hours`;
  }
}

function getTopWords(messages: ChatMessage[]): string[] {
  const wordCounts = new Map<string, number>();
  const excludedWords = new Set([
    "the", "and", "to", "a", "in", "that", "is", "was", "for", "on", "ok", "okay",
    "with", "at", "by", "an", "be", "this", "which", "or", "from", "as",
    "your", "my", "you", "i", "me", "we", "our", "it", "its", "am", "are", "nahi",
    "but", "hai", "kya", "dont", "bhi", "toh","not","good","tha","what","have","why","this","null","omitted","deleted","message",
  ]);

  messages.forEach(msg => {
    const words = msg.message.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => !excludedWords.has(word) && word.length > 2);

    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
  });

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}
