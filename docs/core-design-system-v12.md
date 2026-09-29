# CORE V12 — Density & Information Architecture

CORE operational screens are not marketing pages. They optimize for scanning, comparison, low movement cost and predictable state.

## Surface classes

### Overview
Use cards only for genuinely independent summaries or heterogeneous modules. Examples: home dashboard, project overview, team overview.

### Registry
Use lists or semantic data tables when objects are homogeneous and users compare attributes. Examples: members, inventory, repositories, vehicles, tasks.

### Workbench
Bind the application to the viewport and give scroll ownership to internal panes. Examples: Mail, Chat, Code Lab, Control, Project Map.

## Density

CORE exposes two persisted densities:

- **Compact** — default for desktop engineering work.
- **Comfortable** — larger controls and rows without changing the information architecture.

Density changes semantic tokens rather than page-specific pixel values.

## Token layers

1. Primitive spacing: `--core-sp-*`.
2. Semantic purpose: control height, row height, cell padding, surface, border and text.
3. Components consume semantic tokens: registry toolbar, data table, tool surface, segmented control.

Do not add page-specific spacing when an existing semantic token represents the intent.

## Registry rules

- semantic `<table>` for comparable records;
- sticky column headers;
- predictable row hover;
- numeric values use tabular numerals;
- the primary object is the first strong column;
- actions live at the right edge;
- creation/edit forms are closed until explicitly requested;
- filtering does not destroy active query state;
- empty results explain whether the registry is empty or filters returned no matches.

## Operational scroll rule

An operational workspace should normally fit below the portal chrome. The browser page should not become the primary scroll container when the user is working inside a list, reader, canvas or terminal.

## Accessibility baseline

- visible focus;
- controls have semantic labels;
- color is not the only status signal;
- mobile touch targets expand independently from compact desktop density;
- normal text aims for WCAG AA contrast;
- `prefers-reduced-motion` remains respected.
