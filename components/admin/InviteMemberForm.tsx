"use client";

import { useActionState } from "react";
import {
  createPortalInviteAdminAction,
  type InviteAdminState,
} from "@/app/admin/portal-actions";

const initialState: InviteAdminState = {};

export default function InviteMemberForm() {
  const [state, action, pending] = useActionState(
    createPortalInviteAdminAction,
    initialState
  );

  return (
    <div className="adminInviteBlock">
      <form className="adminLightForm" action={action}>
        <label><span>Student full name</span><input name="fullName" required /></label>
        <label><span>Yıldız student email</span><input name="email" type="email" placeholder="name@std.yildiz.edu.tr" required /></label>
        <label>
          <span>Portal role</span>
          <select name="role" defaultValue="member">
            <option value="member">Member</option>
            <option value="lead">Team lead</option>
            <option value="admin">Portal admin</option>
            <option value="alumni">Alumni</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <label><span>Teams</span><input name="teams" placeholder="MAR, SYS, EMB" /></label>
        <button type="submit" disabled={pending}>
          {pending ? "GENERATING..." : "CREATE INVITATION →"}
        </button>
      </form>

      {state.error ? <div className="adminInviteError">{state.error}</div> : null}

      {state.code ? (
        <div className="adminInviteResult">
          <span>SHOW THIS CODE ONCE</span>
          <b>{state.code}</b>
          <p>{state.email}</p>
          <small>Expires: {state.expiresAt}</small>
        </div>
      ) : null}
    </div>
  );
}
