import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const isAdmin = email.toLowerCase() === (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, isAdmin },
    select: { id: true, name: true, email: true, isAdmin: true },
  });

  return NextResponse.json(user, { status: 201 });
}
