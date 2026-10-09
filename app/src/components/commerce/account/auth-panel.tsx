// Signed-out account view: Sign in / Create account tabs with designed forms.
import { useRouter } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";

import { createAccount, signIn } from "@/lib/api/account.functions";
import type { AuthResult } from "@/lib/api/account.functions";
import { PASSWORD_MIN, checkField, emailRule, nameRule, newPasswordRule, signInPasswordRule } from "@/lib/api/account.rules";
import type { AuthField } from "@/lib/api/account.rules";
import { CONTACT } from "@/lib/site";

import { announce } from "../announcer";
import { WordsRise } from "../words-rise";
import { Field } from "./field";
import { notifySessionChanged } from "./session-event";

type Mode = "signin" | "create";

const COPY: Record<Mode, { title: string; intro: string }> = {
  signin: { title: "Welcome back.", intro: "Sign in to see your orders and the details we keep for you." },
  create: { title: "Join the regulars.", intro: "Create an account so every order you place is kept in one place." },
};

export function AuthPanel({ unavailable }: { unavailable: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const tabsId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const modes: Mode[] = ["signin", "create"];

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % modes.length;
    if (e.key === "ArrowLeft") next = (index - 1 + modes.length) % modes.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = modes.length - 1;
    if (next === null) return;
    e.preventDefault();
    setMode(modes[next]);
    tabRefs.current[next]?.focus();
  };

  return (
    <main className="acct" id="main">
      <div className="acct-split">
        <section aria-labelledby={`${tabsId}-title`} className="acct-panel">
          <p className="t-label acct-kicker">Your account</p>
          <WordsRise as="h1" className="acct-title" id={`${tabsId}-title`} italicFrom={1} key={mode} text={COPY[mode].title} />
          <p className="acct-intro" key={`${mode}-intro`}>
            {COPY[mode].intro}
          </p>

          {unavailable ? (
            <div className="acct-notice" role="status">
              <span aria-hidden="true" className="acct-notice__dot" />
              <p>
                Accounts aren't switched on yet. You can still shop and check out as a guest, and nothing in your bag is lost.
              </p>
            </div>
          ) : null}

          <div aria-label="Account options" className="acct-tabs" data-mode={mode} role="tablist">
            {modes.map((m, i) => (
              <button
                aria-controls={`${tabsId}-panel`}
                aria-selected={mode === m}
                className="acct-tab"
                id={`${tabsId}-${m}`}
                key={m}
                onClick={() => setMode(m)}
                onKeyDown={(e) => onTabKey(e, i)}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                tabIndex={mode === m ? 0 : -1}
                type="button"
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
            <span aria-hidden="true" className="acct-tabs__ink" />
          </div>

          <div aria-labelledby={`${tabsId}-${mode}`} className="acct-tabpanel" id={`${tabsId}-panel`} role="tabpanel">
            {mode === "signin" ? (
              <SignInForm key="signin" onSwitch={() => setMode("create")} />
            ) : (
              <CreateAccountForm key="create" onSwitch={() => setMode("signin")} />
            )}
          </div>
        </section>

        <aside aria-hidden="true" className="acct-visual">
          <div className="acct-visual__frame">
            <img alt="" decoding="async" height={1333} src="/assets/community/baristas-smile.webp" width={2000} />
          </div>
          <p className="acct-visual__caption">
            <span className="t-label">Platō</span>
            <span className="acct-visual__line">They know your name. And your order.</span>
          </p>
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

type Values = Partial<Record<AuthField, string>>;
type Errors = Partial<Record<AuthField, string | null>>;

function useAuthForm(fields: AuthField[], rules: Record<AuthField, Parameters<typeof checkField>[0]>) {
  const [values, setValues] = useState<Values>(() => Object.fromEntries(fields.map((f) => [f, ""])));
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<{ message: string; tone: "error" | "info" } | null>(null);
  const [busy, setBusy] = useState(false);
  const refs = useRef<Partial<Record<AuthField, HTMLInputElement | null>>>({});

  const errorFor = (f: AuthField): string | null => {
    if (serverErrors[f]) return serverErrors[f] ?? null;
    if (!touched[f]) return null;
    return checkField(rules[f], values[f] ?? "");
  };

  const bind = (f: AuthField) => ({
    value: values[f] ?? "",
    onChange: (v: string) => {
      setValues((prev) => ({ ...prev, [f]: v }));
      if (serverErrors[f]) setServerErrors((prev) => ({ ...prev, [f]: null }));
      if (formError) setFormError(null);
    },
    onBlur: () => {
      if ((values[f] ?? "").length > 0) setTouched((prev) => ({ ...prev, [f]: true }));
    },
    error: errorFor(f),
    inputRef: (el: HTMLInputElement | null) => {
      refs.current[f] = el;
    },
    disabled: busy,
  });

  /** Validates everything; focuses the first invalid field. Returns true when valid. */
  const validateAll = () => {
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));
    const first = fields.find((f) => checkField(rules[f], values[f] ?? ""));
    if (first) {
      refs.current[first]?.focus();
      return false;
    }
    return true;
  };

  const applyResult = (result: AuthResult) => {
    if (result.ok) return;
    if (result.fields) {
      setServerErrors(result.fields);
      const first = fields.find((f) => result.fields?.[f]);
      if (first) refs.current[first]?.focus();
    }
    setFormError({ message: result.message, tone: result.code === "unavailable" ? "info" : "error" });
  };

  return { values, bind, busy, setBusy, formError, setFormError, validateAll, applyResult };
}

function FormError({ error }: { error: { message: string; tone: "error" | "info" } | null }) {
  // role="alert" is announced when it is inserted.
  if (!error) return null;
  return (
    <p className="acct-form-error" data-tone={error.tone} role="alert">
      {error.message}
    </p>
  );
}

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const id = useId();
  const form = useAuthForm(["email", "password"], { email: emailRule, password: signInPasswordRule, name: nameRule });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.busy) return;
    form.setFormError(null);
    if (!form.validateAll()) return;
    form.setBusy(true);
    try {
      const result = await signIn({ data: { email: form.values.email ?? "", password: form.values.password ?? "" } });
      if (result.ok) {
        announce(`Signed in. Welcome back, ${result.name.split(" ")[0]}.`);
        notifySessionChanged();
        await router.invalidate();
        return;
      }
      form.applyResult(result);
    } catch {
      form.setFormError({ message: "We couldn't reach our server. Check your connection and try again.", tone: "error" });
    } finally {
      form.setBusy(false);
    }
  };

  return (
    <form className="acct-form" noValidate onSubmit={submit}>
      <Field autoComplete="email" id={`${id}-email`} inputMode="email" label="Email" type="email" {...form.bind("email")} />
      <Field autoComplete="current-password" id={`${id}-password`} label="Password" revealable {...form.bind("password")} />
      <FormError error={form.formError} />
      <AccountSubmit busy={form.busy} busyLabel="Signing in" label="Sign in" />
      <p className="acct-switch">
        New here?{" "}
        <button className="acct-switch__btn" onClick={onSwitch} type="button">
          Create an account
        </button>
      </p>
      <p className="acct-small">
        Forgotten your password? Contact us at{" "}
        <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("Account password")}`}>{CONTACT.email}</a>.
      </p>
    </form>
  );
}

function CreateAccountForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const id = useId();
  const form = useAuthForm(["name", "email", "password"], { name: nameRule, email: emailRule, password: newPasswordRule });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.busy) return;
    form.setFormError(null);
    if (!form.validateAll()) return;
    form.setBusy(true);
    try {
      const result = await createAccount({
        data: { name: form.values.name ?? "", email: form.values.email ?? "", password: form.values.password ?? "" },
      });
      if (result.ok) {
        announce(`Account created. Welcome, ${result.name.split(" ")[0]}.`);
        notifySessionChanged();
        await router.invalidate();
        return;
      }
      form.applyResult(result);
    } catch {
      form.setFormError({ message: "We couldn't reach our server. Check your connection and try again.", tone: "error" });
    } finally {
      form.setBusy(false);
    }
  };

  return (
    <form className="acct-form" noValidate onSubmit={submit}>
      <Field autoComplete="name" id={`${id}-name`} label="Your name" {...form.bind("name")} />
      <Field autoComplete="email" id={`${id}-email`} inputMode="email" label="Email" type="email" {...form.bind("email")} />
      <Field
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN} characters. A short phrase is easy to remember and hard to guess.`}
        id={`${id}-password`}
        label="Password"
        revealable
        {...form.bind("password")}
      />
      <FormError error={form.formError} />
      <AccountSubmit busy={form.busy} busyLabel="Creating your account" label="Create account" />
      <p className="acct-switch">
        Already a regular?{" "}
        <button className="acct-switch__btn" onClick={onSwitch} type="button">
          Sign in
        </button>
      </p>
    </form>
  );
}

/** Ink capsule; the round end (like the ō) grows to fill it on hover. */
function AccountSubmit({ label, busyLabel, busy }: { label: string; busyLabel: string; busy: boolean }): ReactNode {
  return (
    <button aria-busy={busy || undefined} aria-disabled={busy || undefined} className="acct-submit" data-busy={busy || undefined} type="submit">
      <span aria-hidden="true" className="acct-submit__fill" />
      <span className="acct-submit__label">
        {busy ? busyLabel : label}
        {busy ? (
          <span aria-hidden="true" className="acct-submit__dots">
            <i />
            <i />
            <i />
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" className="acct-submit__end">
        <ArrowRight size={18} strokeWidth={1.5} />
      </span>
    </button>
  );
}
