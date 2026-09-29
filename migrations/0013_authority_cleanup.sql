-- CORE Portal V13 authority cleanup
-- Backfill legacy member teams into the authoritative membership table.
-- portal_members.teams_json remains for compatibility reads only and is no longer mutated.

INSERT OR IGNORE INTO portal_team_memberships
  (team_code,member_id,team_role,status,capabilities_json)
SELECT
  UPPER(TRIM(j.value)) AS team_code,
  m.id,
  CASE WHEN m.role='lead' THEN 'lead' ELSE 'engineer' END,
  'active',
  '[]'
FROM portal_members m
JOIN json_each(COALESCE(NULLIF(m.teams_json,''),'[]')) j
JOIN portal_teams t ON t.code=UPPER(TRIM(j.value))
WHERE json_valid(COALESCE(NULLIF(m.teams_json,''),'[]'))
  AND TRIM(j.value)!='';

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_authority_schema',
  '{"version":"2026.09-v13","membership_source":"portal_team_memberships","native_repository_source":"portal_native_repositories","legacy_teams_json":"compatibility-only","legacy_portal_repositories":"external-catalog-only"}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
