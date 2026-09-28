"use client";

import { useActionState } from "react";
import {
  activatePortalAction,
  loginPortalAction,
  type PortalAuthState,
} from "@/app/portal/actions";

const initialState: PortalAuthState = {};

export default function PortalAuthForm({
  mode,
}: {
  mode: "login" | "activate";
}) {
  const action = mode === "login" ? loginPortalAction : activatePortalAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form className="portalAuthForm" action={formAction}>
      <label>
        <span>Yıldız student email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@std.yildiz.edu.tr"
          required
        />
      </label>

      {mode === "activate" ? (
        <label>
          <span>Invitation code</span>
          <input
            name="code"
            autoComplete="one-time-code"
            placeholder="CORE-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
            required
          />
        </label>
      ) : null}

      <label>
        <span>{mode === "activate" ? "Create password" : "Password"}</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "activate" ? "new-password" : "current-password"}
          minLength={10}
          required
        />
      </label>

      {mode === "activate" ? (
        <label>
          <span>Confirm password</span>
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
      ) : null}

      {state.error ? <div className="portalAuthError">{state.error}</div> : null}

      <button className="portalAuthButton" type="submit" disabled={pending}>
        {pending
          ? "PROCESSING..."
          : mode === "activate"
            ? "ACTIVATE CORE ACCOUNT →"
            : "ENTER CORE →"}
      </button>
    </form>
  );
}
