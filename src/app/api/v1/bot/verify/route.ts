import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Shared with bridge
const TOKENS_FILE = "/home/ubuntu/DemosCode/bot_tokens.json";

interface BotToken {
  botId: string;
  status: string;
  expiresAt: number;
  user?: {
    id: string;
    email: string | null | undefined;
    displayName: string | null | undefined;
  };
}

function getTokens(): Record<string, BotToken> {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

function saveTokens(tokens: Record<string, BotToken>) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return new NextResponse("Token required", { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const url = new URL("/auth", request.url);
    url.searchParams.set("callbackUrl", `/api/v1/bot/verify?token=${token}`);
    return NextResponse.redirect(url);
  }

  const tokens = getTokens();
  if (!tokens[token]) return new NextResponse("Token invalid or expired", { status: 404 });

  // Update token with user info and status
  const botToken = tokens[token];
  botToken.status = "VERIFIED";
  botToken.user = {
    id: session.user.id || session.user.email || 'unknown',
    email: session.user.email,
    displayName: session.user.name || null
  };
  saveTokens(tokens);

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bot Connected</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
          .card { text-align: center; background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 400px; width: 90%; }
          h1 { color: #2ecc71; margin-bottom: 1rem; }
          p { color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
          .token-box { margin-top: 2rem; background: #f8fafc; padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; word-break: break-all; color: #475569; font-size: 0.9rem; }
          .footer { margin-top: 2rem; font-size: 0.8rem; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ Connected!</h1>
          <p>Your timetable account (<b>${session.user.email}</b>) is now linked to the bot.</p>
          <p>Return to Telegram and send <code>/timetable connect ${token}</code> to finish.</p>
          <div class="token-box">${token}</div>
          <div class="footer">You can safely close this window.</div>
        </div>
      </body>
    </html>
  `, { headers: { "Content-Type": "text/html" } });
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json() as { token: string };
    if (!token) return NextResponse.json({ ok: false, message: "Token required" }, { status: 400 });

    const tokens = getTokens();
    const data = tokens[token];

    if (!data || data.status !== "VERIFIED") {
      return NextResponse.json({ ok: false, message: "Token not verified or expired" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      user: data.user
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
