import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const { name, email, msg } = body ?? {};

  if (!name?.trim() || !email?.trim() || !msg?.trim()) {
    return NextResponse.json({ error: "name, email and msg are required" }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "jecdegois12345@gmail.com",
    subject: `[Arcade Vault] Mensaje de ${name}`,
    text: `De: ${name} <${email}>\n\n${msg}`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
