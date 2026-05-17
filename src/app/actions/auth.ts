"use server";

import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export type LoginState = {
  error?: string;
} | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return { error: "Invalid email or password" };
  }

  if (!user.isActive) {
    return { error: "Account is deactivated. Contact your administrator." };
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id, user.role);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
