import { env } from "cloudflare:workers";
import { splitSqlStatements } from "@/lib/shared/sql";
import {
  PORTAL_SCHEMA_SQL,
  PORTAL_V2_SQL,
  PORTAL_V4_SQL,
  PORTAL_V5_SQL,
  PORTAL_V6_SQL,
  PORTAL_V7_SQL,
  PORTAL_V8_SQL,
  PORTAL_V9_SQL,
  PORTAL_V10_SQL,
  PORTAL_V11_SQL,
  PORTAL_V12_SQL,
  PORTAL_MIGRATION_SQL,
} from "@/lib/generated/portal-migrations";

const REQUIRED_PORTAL_TABLES = [
  "portal_members",
  "portal_invites",
  "portal_sessions",
  "portal_notifications",
  "portal_tasks",
  "portal_task_comments",
  "portal_resources",
  "portal_resource_versions",
  "portal_repositories",
  "portal_inventory_items",
  "portal_inventory_movements",
  "portal_channels",
  "portal_messages",
  "portal_mail_threads",
  "portal_mail_participants",
  "portal_mail_messages",
  "portal_calendar_events",
  "portal_vehicle_units",
  "portal_telemetry_snapshots",
  "portal_activity_log",
  "portal_security_devices",
  "portal_invite_deliveries",
  "portal_member_profiles",
  "portal_channel_reads",
  "portal_vault_files",
  "portal_vault_versions",
  "portal_design_derivatives",
  "portal_mail_state",
  "portal_mail_drafts",
  "portal_mail_attachments",
  "portal_native_repositories",
  "portal_repo_gateways",
  "portal_code_runs",
  "portal_mobile_devices",
  "portal_teams",
  "portal_team_memberships",
  "portal_role_profiles",
  "portal_member_capabilities",
  "portal_project_registry",
  "portal_project_map_edges",
  "portal_vehicle_profiles",
  "portal_repo_reviews",
  "portal_repo_review_threads",
  "portal_repo_review_comments",
  "portal_repo_review_submissions",
  "portal_code_run_execution",
  "portal_code_run_events",
  "portal_code_run_artifacts",
  "portal_code_terminal_sessions",
  "portal_vault_upload_sessions",
  "portal_mail_groups",
  "portal_mail_group_members",
  "portal_mail_thread_groups",
  "portal_meeting_spaces",
  "portal_meetings",
  "portal_meeting_participants",
  "portal_meeting_notes",
  "portal_meeting_reports",
  "portal_polls",
  "portal_poll_options",
  "portal_poll_votes",
  "portal_budget_accounts",
  "portal_budget_allocations",
  "portal_budget_entries",
] as const;

let repoReviewSchemaPromise: Promise<void> | null = null;

export async function ensurePortalRepoReviewSchema() {
  if (repoReviewSchemaPromise) return repoReviewSchemaPromise;
  repoReviewSchemaPromise = (async () => {
    const db = env.DB;
    if (!db) throw new Error("DB binding is not available.");
    const statements = splitSqlStatements(PORTAL_V7_SQL);
    if (!statements.length) throw new Error("Repository review migration is empty.");
    await db.batch(statements.map((statement) => db.prepare(statement)));
  })().catch((error) => {
    repoReviewSchemaPromise = null;
    throw error;
  });
  return repoReviewSchemaPromise;
}

let codeLabSchemaPromise: Promise<void> | null = null;

export async function ensurePortalCodeLabSchema() {
  if (codeLabSchemaPromise) return codeLabSchemaPromise;
  codeLabSchemaPromise = (async () => {
    const db = env.DB;
    if (!db) throw new Error("DB binding is not available.");
    const statements = splitSqlStatements(PORTAL_V8_SQL + "\n" + PORTAL_V9_SQL + "\n" + PORTAL_V10_SQL);
    if (!statements.length) throw new Error("Code Lab migration is empty.");
    await db.batch(statements.map((statement) => db.prepare(statement)));
  })().catch((error) => {
    codeLabSchemaPromise = null;
    throw error;
  });
  return codeLabSchemaPromise;
}


let vaultUploadSchemaPromise: Promise<void> | null = null;

export async function ensurePortalVaultUploadSchema() {
  if (vaultUploadSchemaPromise) return vaultUploadSchemaPromise;
  vaultUploadSchemaPromise = (async () => {
    const db = env.DB;
    if (!db) throw new Error("DB binding is not available.");
    const statements = splitSqlStatements(PORTAL_V10_SQL);
    if (!statements.length) throw new Error("Vault upload migration is empty.");
    await db.batch(statements.map((statement) => db.prepare(statement)));
  })().catch((error) => {
    vaultUploadSchemaPromise = null;
    throw error;
  });
  return vaultUploadSchemaPromise;
}


let mailWorkspaceSchemaPromise: Promise<void> | null = null;

export async function ensurePortalMailWorkspaceSchema() {
  if (mailWorkspaceSchemaPromise) return mailWorkspaceSchemaPromise;
  mailWorkspaceSchemaPromise = (async () => {
    const db = env.DB;
    if (!db) throw new Error("DB binding is not available.");
    const statements = splitSqlStatements(PORTAL_V11_SQL);
    if (!statements.length) throw new Error("Mail workspace migration is empty.");
    await db.batch(statements.map((statement) => db.prepare(statement)));
  })().catch((error) => {
    mailWorkspaceSchemaPromise = null;
    throw error;
  });
  return mailWorkspaceSchemaPromise;
}


let collaborationFinanceSchemaPromise: Promise<void> | null = null;

export async function ensurePortalCollaborationFinanceSchema() {
  if (collaborationFinanceSchemaPromise) return collaborationFinanceSchemaPromise;
  collaborationFinanceSchemaPromise = (async () => {
    const db = env.DB;
    if (!db) throw new Error("DB binding is not available.");
    const statements = splitSqlStatements(PORTAL_V12_SQL);
    if (!statements.length) throw new Error("Collaboration & finance migration is empty.");
    await db.batch(statements.map((statement) => db.prepare(statement)));
  })().catch((error) => {
    collaborationFinanceSchemaPromise = null;
    throw error;
  });
  return collaborationFinanceSchemaPromise;
}

export async function portalBootstrapStatus() {
  const db = env.DB;
  if (!db) {
    return {
      ready: false,
      tableCount: 0,
      requiredTableCount: REQUIRED_PORTAL_TABLES.length,
      memberCount: 0,
      taskCount: 0,
      resourceCount: 0,
    };
  }

  try {
    const placeholders = REQUIRED_PORTAL_TABLES.map(() => "?").join(",");
    const tableRow = await db
      .prepare(
        "SELECT COUNT(*) AS table_count FROM sqlite_master " +
        "WHERE type = 'table' AND name IN (" + placeholders + ")"
      )
      .bind(...REQUIRED_PORTAL_TABLES)
      .first<{ table_count: number }>();

    const tableCount = Number(tableRow?.table_count ?? 0);
    const ready = tableCount === REQUIRED_PORTAL_TABLES.length;

    let row: { member_count: number; task_count: number; resource_count: number } | null = null;
    try {
      row = await db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM portal_members) AS member_count,
          (SELECT COUNT(*) FROM portal_tasks) AS task_count,
          (SELECT COUNT(*) FROM portal_resources) AS resource_count
      `).first<{ member_count: number; task_count: number; resource_count: number }>();
    } catch {
      row = null;
    }

    if (!ready) {
      return {
        ready: false,
        tableCount,
        requiredTableCount: REQUIRED_PORTAL_TABLES.length,
        memberCount: Number(row?.member_count ?? 0),
        taskCount: Number(row?.task_count ?? 0),
        resourceCount: Number(row?.resource_count ?? 0),
      };
    }

    return {
      ready: true,
      tableCount,
      requiredTableCount: REQUIRED_PORTAL_TABLES.length,
      memberCount: Number(row?.member_count ?? 0),
      taskCount: Number(row?.task_count ?? 0),
      resourceCount: Number(row?.resource_count ?? 0),
    };
  } catch {
    return {
      ready: false,
      tableCount: 0,
      requiredTableCount: REQUIRED_PORTAL_TABLES.length,
      memberCount: 0,
      taskCount: 0,
      resourceCount: 0,
    };
  }
}

export async function applyPortalFoundation(actor: string) {
  const db = env.DB;
  if (!db) throw new Error("DB binding is not available.");

  const statements = splitSqlStatements(PORTAL_MIGRATION_SQL);
  if (!statements.length) throw new Error("Portal migration is empty.");

  await db.batch(statements.map((statement) => db.prepare(statement)));

  await db.prepare(`
    INSERT INTO audit_log (actor, action, entity_type, entity_id, details_json)
    VALUES (?, 'portal.bootstrap', 'portal', 'foundation', ?)
  `).bind(
    actor,
    JSON.stringify({
      version: "2026.09-v13-authority-cleanup",
      statementCount: statements.length,
      modules: [
        "members","auth","tasks","resources","repositories","inventory",
        "chat","mail","calendar","notifications","vault","cad","pcb","repo-gateway","runner-jobs","mobile-shell","mobile-devices","deep-links","vehicles","telemetry","devices","teams","governance","role-profiles","project-registry","project-map","vehicle-profiles","control-plane","repo-review","repo-native-r2","code-lab-runner","code-lab-events","code-lab-artifacts","code-lab-live-terminal","vault-raw-upload","mail-groups","mail-locked-groups","mail-integrated-reader","meeting-spaces","meeting-calendar","meeting-decisions","meeting-reports","polls","poll-notifications","budget-ledger","budget-allocations","budget-approvals"
      ],
    })
  ).run();

  return portalBootstrapStatus();
}
