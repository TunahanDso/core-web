export const portalNavigation = [
  {
    label: "WORKSPACE",
    items: [
      ["Overview", "/portal", "OV"],
      ["Projects & Tasks", "/portal/tasks", "PM"],
      ["Calendar", "/portal/calendar", "CL"],
      ["Notifications", "/portal/notifications", "NT"],
    ],
  },
  {
    label: "KNOWLEDGE",
    items: [
      ["Library", "/portal/library", "LB"],
      ["Documents", "/portal/documents", "DC"],
      ["Archive", "/portal/archive", "AR"],
      ["Repositories", "/portal/repositories", "RP"],
      ["PCB / Electronics", "/portal/electronics", "PCB"],
    ],
  },
  {
    label: "COLLABORATION",
    items: [
      ["Chat", "/portal/chat", "CH"],
      ["Internal Mail", "/portal/mail", "ML"],
      ["Members", "/portal/members", "MB"],
      ["Security & Devices", "/portal/security", "SEC"],
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      ["Inventory", "/portal/inventory", "ST"],
      ["Vehicle Live", "/portal/ops", "OP"],
      ["Activity", "/portal/activity", "AC"],
      ["Analytics", "/portal/analytics", "AN"],
    ],
  },
] as const;

export const portalModuleCards = [
  ["Projects", "Tasks, milestones, ownership and review flow.", "/portal/tasks", "PM"],
  ["Knowledge", "Documents, reports, drawings and institutional memory.", "/portal/library", "LB"],
  ["Repositories", "Project repositories, ownership and integration registry.", "/portal/repositories", "RP"],
  ["Electronics", "PCB, BOM, drawings and hardware documentation.", "/portal/electronics", "PCB"],
  ["Inventory", "Parts, tools, locations, reservations and minimum stock.", "/portal/inventory", "ST"],
  ["Chat", "Internal technical and field coordination channels.", "/portal/chat", "CH"],
  ["Mail", "Long-form internal correspondence and decision trails.", "/portal/mail", "ML"],
  ["Vehicle Live", "Read-only vehicle state and approved telemetry.", "/portal/ops", "OP"],
  ["Calendar", "Tests, meetings, deadlines and field operations.", "/portal/calendar", "CL"],
  ["Analytics", "Team, content and operations health at a glance.", "/portal/analytics", "AN"],
] as const;
