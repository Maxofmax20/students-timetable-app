import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Simple file-based store for temporary bot tokens
const TOKENS_FILE = path.join(process.cwd(), "bot_tokens.json");

function saveToken(token: string, data: any) {
  let tokens: any = {};
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
    }
  } catch (e) {}
  
  // Clean up expired tokens
  const now = Date.now();
  for (const t in tokens) {
    if (tokens[t].expiresAt < now) delete tokens[t];
  }
  
  tokens[token] = { ...data, expiresAt: Date.now() + 300000 }; // 5 mins
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 300000).toISOString();
    
    saveToken(token, { botId: body.botId, status: "PENDING" });
    
    return NextResponse.json({
      ok: true,
      token,
      expiresAt,
      connectUrl: `https://demostb.duckdns.org/api/v1/bot/verify?token=${token}`
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
