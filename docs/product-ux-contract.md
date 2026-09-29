# CORE Product UX Contract

CORE is an engineering work environment, not a collection of decorated pages. Every web, desktop and mobile surface follows the same product contract.

## Decision filters

1. **One job, one primary path.** Alternate expert paths may exist, but the default path is singular and obvious.
2. **State is explicit.** Every action communicates ready / working / complete / failed and why.
3. **Defaults are safe and useful.** Common and reversible behavior wins over configuration.
4. **Recovery beats confirmation fatigue.** Prefer undo, drafts, revisions and recoverable trash over repeated "are you sure?" dialogs.
5. **Vocabulary is stable.** Person, Team, Task, File, Repo, Project and Vehicle mean the same thing everywhere.
6. **Speed is a feature.** Heavy work is deferred, lists are bounded, layout does not jump and the UI never blocks without explanation.
7. **Empty, loading, error and unauthorized are first-class states.**
8. **Permissions explain themselves.** A blocked action says what is missing and what the user can do next.
9. **Density serves work.** Remove ornamental panels, repeated metadata and duplicated controls.
10. **User time is more valuable than feature count.**
11. **Platform adapts; the product model does not split.**
12. **Silence is designed.** Badges, animation, sound and notifications remain restrained by default.

## Interaction standards

- Primary actions use verbs: Kaydet, Gönder, Yükle, İndir, Arşivle.
- Global search is Ctrl/Cmd+K.
- Enter submits only where expected; Escape backs out of transient UI.
- Long work shows progress or stage, can be retried, and preserves partial results.
- Forms do not silently lose work.
- Destructive operations are recoverable where possible.
- No hidden-only right-click / long-press requirement for essential actions.
- Focus is visible and all daily workflows are keyboard reachable.

## Layout standards

- 4/8 spacing rhythm.
- Limited type scale and one primary accent.
- Panels exist only when they provide a real interaction or information boundary.
- Workbench screens prioritize the working object over explanation.
- Large headings are for orientation, not decoration.
- Nested scrolling is avoided. When a dedicated viewport is necessary, scroll chaining is contained.
- The current object and its Project / Team / Revision context stay visible on deep screens.

## Completion gate

A surface is not done until it has:
- empty state
- populated state
- loading/working state
- error state
- unauthorized/read-only behavior where applicable
- safe repeated action behavior
- stable refresh/back behavior
- desktop and narrow-screen layout
- consistent naming

## CORE platform rule

Web, Desktop and Mobile share identity, authorization, object IDs, revision semantics, danger semantics and vocabulary. Platform-specific affordances may differ, but the mental model must not.
