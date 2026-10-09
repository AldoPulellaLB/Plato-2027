// Account field rules, shared by the server functions and the forms (client safe).
import { z } from "zod";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MAX = 80;

export const emailRule = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address, like name@example.com.");

export const signInPasswordRule = z.string().min(1, "Enter your password.").max(PASSWORD_MAX, "That password is too long.");

export const newPasswordRule = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use ${PASSWORD_MAX} characters or fewer.`);

export const nameRule = z
  .string()
  .trim()
  .min(1, "Tell us what to call you.")
  .max(NAME_MAX, "That name is a little long. Try a shorter version.");

export const signInSchema = z.object({ email: emailRule, password: signInPasswordRule });
export const createAccountSchema = z.object({ name: nameRule, email: emailRule, password: newPasswordRule });

export type AuthField = "name" | "email" | "password";

/** First message for a single value, or null when it passes. */
export function checkField(rule: z.ZodType, value: string): string | null {
  const result = rule.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? "Please check this field.");
}
