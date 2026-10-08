"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";

export function LoginForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const params = useSearchParams();
  const error =
    state.error ?? (params.get("error") === "noprofile" ? "This account isn't on the class list." : undefined);

  return (
    <form action={action} className="card space-y-4 p-6">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Name</span>
        <input
          name="name"
          autoComplete="username"
          autoFocus={!defaultName}
          defaultValue={defaultName}
          required
          className="input w-full"
          placeholder="Your name"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Password</span>
        <input
          name="passcode"
          type="password"
          autoComplete="current-password"
          autoFocus={!!defaultName}
          required
          className="input w-full"
        />
      </label>
      {error && <p className="text-sm text-hard">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
