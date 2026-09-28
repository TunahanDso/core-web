-- YTÜ CORE Portal V6 governance / control-plane additions
-- Additive only. Existing V1-V5 data and role values remain valid.

CREATE TABLE IF NOT EXISTS portal_teams (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'restricted'
    CHECK (visibility IN ('restricted','members')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_team_memberships (
  team_code TEXT NOT NULL,
  member_id TEXT NOT NULL,
  team_role TEXT NOT NULL DEFAULT 'engineer'
    CHECK (team_role IN ('owner','captain','lead','engineer','contributor','observer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive')),
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_code, member_id),
  FOREIGN KEY (team_code) REFERENCES portal_teams(code) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_role_profiles (
  role_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global',
  description TEXT NOT NULL DEFAULT '',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portal_member_capabilities (
  member_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, capability),
  FOREIGN KEY (member_id) REFERENCES portal_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portal_project_registry (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL DEFAULT '',
  team_code TEXT,
  status TEXT NOT NULL DEFAULT 'concept'
    CHECK (status IN ('concept','design','prototype','testing','operational','paused','archived')),
  visibility TEXT NOT NULL DEFAULT 'team'
    CHECK (visibility IN ('team','members','leads','admins')),
  owner_member_id TEXT,
  start_at TEXT,
  target_at TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low','medium','high','critical')),
  readiness INTEGER NOT NULL DEFAULT 0
    CHECK (readiness BETWEEN 0 AND 100),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_code) REFERENCES portal_teams(code) ON DELETE SET NULL,
  FOREIGN KEY (owner_member_id) REFERENCES portal_members(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS portal_project_map_edges (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('project','team','vehicle','repo','vault','task')),
  source_ref TEXT NOT NULL,
  target_type TEXT NOT NULL
    CHECK (target_type IN ('project','team','vehicle','repo','vault','task')),
  target_ref TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'depends_on',
  label TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_type, source_ref, target_type, target_ref, relation)
);

CREATE TABLE IF NOT EXISTS portal_vehicle_profiles (
  vehicle_id TEXT PRIMARY KEY,
  team_code TEXT,
  project_slug TEXT,
  platform_type TEXT NOT NULL DEFAULT 'vehicle',
  lifecycle TEXT NOT NULL DEFAULT 'prototype'
    CHECK (lifecycle IN ('concept','prototype','testing','operational','maintenance','retired')),
  serial_number TEXT NOT NULL DEFAULT '',
  criticality TEXT NOT NULL DEFAULT 'medium'
    CHECK (criticality IN ('low','medium','high','critical')),
  description TEXT NOT NULL DEFAULT '',
  owner_member_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES portal_vehicle_units(id) ON DELETE CASCADE,
  FOREIGN KEY (team_code) REFERENCES portal_teams(code) ON DELETE SET NULL,
  FOREIGN KEY (project_slug) REFERENCES portal_project_registry(slug) ON DELETE SET NULL,
  FOREIGN KEY (owner_member_id) REFERENCES portal_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_member
  ON portal_team_memberships(member_id, status);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team
  ON portal_team_memberships(team_code, status);
CREATE INDEX IF NOT EXISTS idx_member_capabilities_member
  ON portal_member_capabilities(member_id);
CREATE INDEX IF NOT EXISTS idx_project_registry_team
  ON portal_project_registry(team_code, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_project_map_source
  ON portal_project_map_edges(source_type, source_ref);
CREATE INDEX IF NOT EXISTS idx_project_map_target
  ON portal_project_map_edges(target_type, target_ref);
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_team
  ON portal_vehicle_profiles(team_code, lifecycle);

INSERT OR IGNORE INTO portal_teams (code,name,domain,description,visibility) VALUES
('MAR','CORE Marine','USV / surface autonomy','İnsansız suüstü araçları, seyrüsefer ve deniz saha operasyonları.','restricted'),
('SUB','CORE Subsea','AUV / ROV','Sualtı araçları, underwater perception ve test operasyonları.','restricted'),
('LAND','CORE Land','UGV / rover','Kara robotları, rover ve otonom mobil platformlar.','restricted'),
('AIR','CORE Air','UAV','İnsansız hava araçları, avionics ve uçuş sistemleri.','restricted'),
('IND','CORE Industrial','AMR / work machine','Endüstriyel mobil robotlar, tarım ve maden uygulamaları.','restricted'),
('SPACE','CORE Space','CubeSat / payload','Uydu, yer istasyonu, faydalı yük ve uzay sistemleri.','restricted'),
('ROCKET','CORE Rocket','high altitude / propulsion','Roket, itki, yüksek irtifa ve uçuş sistemleri.','restricted'),
('SYS','CORE Systems','runtime / autonomy','Ortak runtime, otonomi, karar ve sistem mimarisi.','restricted'),
('EMB','CORE Embedded','PCB / MCU / power','Gömülü yazılım, PCB, MCU, güç ve elektronik platformlar.','restricted'),
('OPS','CORE Ops','ground / telemetry / field','Yer istasyonu, telemetri, saha ve operasyon koordinasyonu.','restricted'),
('RES','CORE Research','research / patents','Araştırma, rapor, yayın, patent ve ön tasarım.','restricted');

INSERT OR IGNORE INTO portal_role_profiles (role_key,label,scope,description,capabilities_json) VALUES
('admin','Portal Yöneticisi','global','Tüm portal, erişim ve kontrol-plane yetkileri.','["portal.admin","teams.read_all","teams.manage","roles.manage","control.projects","control.vehicles","project.map.edit","vault.approve","ops.read_all"]'),
('lead','Takım / Program Lideri','global','Proje, araç ve teknik yönetim yetkileri; takım görünürlüğü üyelikle sınırlıdır.','["control.projects","control.vehicles","project.map.edit","vault.approve"]'),
('member','Mühendis / Üye','global','Günlük mühendislik çalışma alanı ve takım üyeliği kapsamındaki erişim.','[]'),
('alumni','Mezun','global','Kısıtlı kurumsal hafıza ve davet edilen takım alanı erişimi.','[]'),
('viewer','Görüntüleyici','global','Salt okunur, açıkça izin verilen alanlar.','[]'),
('team_owner','Takım Sahibi','team','Takım sayfası, üyelik, proje ve araç yönetimi.','["team.manage","team.project.manage","team.vehicle.manage"]'),
('team_captain','Kaptan','team','Takım operasyonu ve proje/araç koordinasyonu.','["team.project.manage","team.vehicle.manage"]'),
('team_lead','Takım Lideri','team','Teknik liderlik ve takım iş yönetimi.','["team.project.manage"]'),
('engineer','Mühendis','team','Takım çalışma alanı ve teknik veri erişimi.','[]'),
('contributor','Katkıcı','team','Sınırlı takım çalışma alanı erişimi.','[]'),
('observer','Gözlemci','team','Salt okunur takım görünürlüğü.','[]');

INSERT INTO site_settings (setting_key,value_json,updated_at)
VALUES (
  'portal_control_plane_schema',
  '{"version":"2026.09-v6","features":["team-workspaces","team-memberships","role-profiles","member-capabilities","internal-project-registry","project-mapping","vehicle-profiles","control-plane"]}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json=excluded.value_json,
  updated_at=CURRENT_TIMESTAMP;
