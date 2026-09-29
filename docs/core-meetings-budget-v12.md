# CORE Meetings, Polls & Budget — V12

## Meetings

CORE owns the meeting lifecycle and engineering record:

1. Meeting Space
2. Scheduled Meeting
3. Calendar record
4. Participant invitations / portal notifications
5. Meeting notes, decisions, actions and transcript chunks
6. Meeting polls
7. Structured meeting report
8. Archive resource

Completing a meeting automatically regenerates the structured report and writes/updates its Archive resource.

### Audio / video boundary

Multi-party real-time media is intentionally separated from the portal database.

The browser meeting surface uses:

- `PORTAL_MEETING_PROVIDER`
- `PORTAL_MEETING_PROVIDER_URL`

The provider URL may contain `{room}`. CORE replaces it with the generated room key and embeds the resulting meeting URL with camera, microphone, fullscreen and display-capture permissions.

When no provider is configured, CORE does **not** silently route audio/video to a public third-party service. The room remains usable for agenda, decisions, notes, polls and reports, and exposes a local camera/microphone device test.

Recommended production direction is a dedicated SFU/WebRTC service with CORE-controlled authentication and short-lived room tokens.

### Transcript / automatic report

The report engine already consumes:
- decisions
- action items
- notes
- transcript chunks
- meeting poll results

Speech-to-text transport is a separate provider boundary. Until an STT provider is connected, transcript chunks can be added to the meeting record manually or by a future provider ingestion endpoint.

The report itself is deterministic and auditable: it is generated from the stored meeting record rather than inventing missing decisions.

## Polls

Poll scope:
- global
- team
- meeting

Global and team polls create Portal notifications automatically. Meeting polls notify meeting participants.

Votes are single-choice and idempotent: voting again changes the member's existing vote instead of creating a duplicate.

## Budget

Money is stored in **minor units** (for example kuruş/cents), never floating-point currency.

Entities:
- Budget Account
- Allocation
- Ledger Entry

Ledger entry types:
- income
- expense
- commitment

Workflow state:
- pending
- approved
- rejected

Admins may auto-approve their own entries. Leads create pending entries and cannot approve their own pending entry, preserving basic separation of duties.

Approved income and expense affect balance. Commitments are tracked separately from cash balance.

## Security / visibility

Meeting access is enforced server-side through creator, participant, space visibility and team membership.

Meeting status changes and report generation require host/moderator authority.

Budget accounts tied to a team are visible to that team's members, account owner, or privileged admin/lead users. General CORE accounts may remain organization-visible.
