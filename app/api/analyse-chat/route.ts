import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import JSZip from 'jszip';

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

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.zip')) {
      try {
        const zipBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        const contents = await zip.loadAsync(zipBuffer);
        
        const txtFile = Object.values(contents.files).find(file => 
          !file.dir && file.name.toLowerCase().endsWith('.txt')
        );

        if (!txtFile) {
          return NextResponse.json({ error: "No text file found in ZIP" }, { status: 400 });
        }

        const fileContent = await txtFile.async("text");
        return await processChat(fileContent);
      } catch (zipError) {
        console.error("Error processing ZIP file:", zipError);
        return NextResponse.json({ error: "Invalid ZIP file format" }, { status: 400 });
      }
    } 
    else if (fileName.endsWith('.txt')) {
      const fileBuffer = await file.arrayBuffer();
      const fileContent = new TextDecoder("utf-8").decode(fileBuffer);
      return await processChat(fileContent);
    }
    else {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload a ZIP file containing a text file or a direct text file",
        uploadedFileType: file.type,
        uploadedFileName: file.name
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Error analyzing chat:", error);
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

async function processChat(fileContent: string) {
  const lines = fileContent.split("\n");
  const pattern1 = /(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}) ?(AM|PM|am|pm)? - ([^:]+):? ?(.*)?/;;
  const pattern2 = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}), (\d{1,2}:\d{2}:\d{2})\s?(AM|PM|am|pm)?\]?\s([^:]+):\s?(.*)/;




  let data = lines
    .map(line => {
      const match1 = line.match(pattern1);
      if (match1) {
        const [_, date, time, ampm, sender, message] = match1;
        return {
          timestamp: new Date(`${date} ${time}${ampm ? ' ' + ampm : ''}`),
          sender: sender.trim(),
          message: message ? message.trim() : '',
        };
      }

      const match2 = line.match(pattern2);
if (match2) {
  const [_, date, time, ampm, sender, message] = match2;
  return {
    timestamp: new Date(`${date} ${time}${ampm ? ' ' + ampm : ''}`),
    sender: sender.trim(),
    message: message ? message.trim() : '',
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
   console.log("Recent Messages (Last 5000):", recentMessages);
  const responseTimesMs = calculateResponseTimes(recentMessages);
  const avgResponseTime = formatResponseTime(responseTimesMs);
  const topWords = getTopWords(recentMessages);

  const chatHistory = recentMessages.map(item => `${item.sender}: ${item.message}`).join("\n");

  const roastPrompt = `Analyze the following WhatsApp chat and deliver a brutally honest reality-check-style roast. Highlight communication patterns, overused phrases, and any underlying behaviors that stand out. Be witty, sarcastic, and brutally real—no sugarcoating. Call out the lack of originality, unnecessary drama, or any cringeworthy habits while keeping it sharp and engaging. Format the response properly in a well-structured paragraph with clear, natural flow. Use relevant emojis for added emphasis.\n\nChat Data:\n${chatHistory}`;


  const relationshipPrompt = `Based on the communication style in this chat, create a phrase (maximum 5 words) that describes the relationship between the participants.\n\nChat Data:\n${chatHistory}`;

  const roastModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const roastResult = await roastModel.generateContent(roastPrompt);
  const roastResponse = await roastResult.response;
  const roast = roastResponse.text();

  const relationshipModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
}

function calculateResponseTimes(messages: ChatMessage[]): number[] {
  const responseTimes: number[] = [];

  for (let i = 1; i < messages.length; i++) {
    const currentMsg = messages[i];
    const prevMsg = messages[i - 1];

    // Ensure timestamps are valid
    if (currentMsg.sender !== prevMsg.sender) {
      const currentTime = currentMsg.timestamp.getTime();
      const prevTime = prevMsg.timestamp.getTime();

      // Check if timestamps are valid and avoid negative differences
      if (!isNaN(currentTime) && !isNaN(prevTime) && currentTime > prevTime) {
        const timeDiff = currentTime - prevTime;

        // Exclude long gaps (> 12 hours)
        if (timeDiff < 12 * 60 * 60 * 1000) {
          responseTimes.push(timeDiff);
        }
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
    "but", "hai", "kya", "dont", "bhi", "toh","not","good","tha","what","have","why","this","null","omitted","deleted","message","media",
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