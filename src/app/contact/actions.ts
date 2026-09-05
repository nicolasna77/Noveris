"use server";

import { db } from "@/lib/db";
import { sendNewContactMessageInternalEmail } from "@/lib/email/notifications";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  error?: string;
};

export async function submitContactMessage(
  input: {
    name: string;
    email: string;
    activity: string;
    message: string;
  }
): Promise<ContactFormState> {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  if (!name || !email || !message) {
    return { status: "error", error: "Merci de renseigner votre nom, votre e-mail et votre message." };
  }
  if (!email.includes("@")) {
    return { status: "error", error: "L'adresse e-mail saisie n'est pas valide." };
  }

  const activity = input.activity.trim() || null;

  await db.contactMessage.create({
    data: { name, email, activity, message },
  });
  await sendNewContactMessageInternalEmail({ name, email, activity, message });

  return { status: "success" };
}
