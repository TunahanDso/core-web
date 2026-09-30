# YTÜ CORE Portal Email Service

The portal invitation flow is designed for transactional membership email, not bulk marketing.

## Production identity

- Sender: `YTÜ CORE Portal <portal@ytucore.com>`
- Reply-To: `portal@ytucore.com`
- Primary provider: the portal's `MAIL_SERVICE` binding calls the isolated `core-mail` Worker, which owns the Cloudflare `EMAIL` send binding
- Optional fallback: Resend through the `RESEND_API_KEY` Worker secret

The invitation secret itself is never stored in plaintext. The D1 invitation table stores only the hash; the raw one-time code exists only at creation/reissue time to be sent in the invitation email. Admin action responses and delivery history never expose the code. Reissuing an invitation invalidates the previous unused code.

## Cloudflare production onboarding

The code and Worker binding are committed, but Cloudflare still requires the sending domain to be onboarded in the account that owns `ytucore.com`.

1. Open Cloudflare Dashboard.
2. Go to **Compute > Email Service > Email Sending**.
3. Choose **Onboard Domain** and select `ytucore.com`.
4. Accept/create the required sending DNS records for the domain. Cloudflare configures the bounce MX/SPF, DKIM and DMARC records used by Email Service.
5. Deploy the Worker after the domain is available for sending.
6. Open **CORE CONTROL > Üyeler & Erişim** and use **Test maili gönder**.
7. Confirm that the admin panel reports provider acceptance with a message ID, then separately confirm receipt and inbox/spam placement with the intended recipient.

If Cloudflare returns `E_SENDER_NOT_VERIFIED` or `E_SENDER_DOMAIN_NOT_AVAILABLE`, the admin test panel translates that into a domain-onboarding error instead of silently reporting success.

## Incoming club mailbox / replies

Outbound transactional sending and an inbox are different things.

To make `portal@ytucore.com` behave like a club mailbox as well:

1. Open **Compute > Email Service > Email Routing**.
2. Add and verify the real destination inbox that club administrators read.
3. Create a routing rule from `portal@ytucore.com` to that verified destination.

That preserves the public club identity while the actual mailbox can remain on an existing Gmail/Outlook/YTU address.

## Resend fallback

For eligible, explicit Cloudflare send failures, the application can use a configured Resend fallback:

1. Verify `ytucore.com` in Resend and publish its requested DNS records.
2. Add `RESEND_API_KEY` as a **Worker secret**, never as a committed Wrangler variable.
3. Keep `PORTAL_MAIL_FROM` on a verified `@ytucore.com` address.

The application tries Cloudflare first. Explicit failures such as an unavailable sender can fall back when the Resend secret exists. Recipient suppression, recipient restrictions and validation errors are not routed around through a second provider. Timeouts, unreadable responses, unknown binding failures and success responses without a message ID remain `pending` (unconfirmed), so an ambiguous send cannot silently trigger a duplicate.

## Invitation delivery diagnostics

The authenticated admin Members & Access page shows the last 30 invitation attempts, including recipient, UTC attempt time, provider, status, message ID and available error. Existing records are shown too; no migration is required. The initial attempt is written before provider contact, and the same record is finalized afterward. If final persistence fails, the action retains the provider result and tracking ID with a warning instead of suggesting another send.

`sent` means accepted/queued by the provider, not delivery to the recipient's mail server. `pending` means the send result is unconfirmed; it does not mean a verified delivery is still progressing. There is no delivery-event subscription in this application yet.

For a missing activation message, copy its tracking ID from **Davet gönderim geçmişi**, then find that message in Cloudflare Email Sending Activity Log (or Resend for a fallback send). Inspect the final status and SMTP/bounce detail before reissuing. If there is no tracking ID, search by exact recipient and attempt time. A test arriving at an administrator's inbox only confirms that particular recipient, not the invited member's address.

Provider references: [Cloudflare send binding](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/) and [delivery activity logs](https://developers.cloudflare.com/email-service/observability/logs/).

## Invitation UX

Invitation messages include:
- member name,
- invited YTU student email,
- a one-time invitation code,
- an expiration time formatted in Europe/Istanbul,
- an activation button that opens `/portal/activate` with the email prefilled.

The raw code is deliberately not placed in the activation URL. This reduces accidental exposure through browser history, reverse-proxy logs and referrer data.

## Operational checks

Before enabling broad invitations:
- send a test email to at least one YTU student mailbox,
- check inbox/spam placement,
- verify SPF/DKIM/DMARC results in the received-message headers,
- verify the activation link opens the correct email,
- verify an invitation cannot be reused after activation,
- verify reissue invalidates the previous unused invitation.


## Deliverability / spam placement

A successful Worker `EMAIL.send()` call means the provider accepted the message. It does **not** guarantee Inbox placement. Gmail, Outlook, Yahoo and institutional mail systems independently classify the message after receipt.

For a new sending domain:

1. Keep volume low and predictable at first. Send only real transactional invitations.
2. Do not repeatedly re-send to invalid or unengaged recipients.
3. Review **Cloudflare Email Service > Email Sending > Activity Log**. Distinguish `Sent`, `Delivered`, `Delivery failed`, `Rejected` and `Failed`.
4. Review **Suppressions** before re-sending to an address that bounced or complained.
5. Add `ytucore.com` to Google Postmaster Tools and monitor authentication, domain reputation, delivery errors and user-reported spam rate.
6. Keep SPF and DKIM healthy. Publish DMARC and tighten the policy only after legitimate senders are confirmed.
7. Ask early invited members who intentionally requested membership to move a misplaced message out of Spam/Junk rather than repeatedly sending duplicates.

The admin Members & Access page performs live public-DNS checks for:
- `cf-bounce.ytucore.com` SPF,
- `cf-bounce._domainkey.ytucore.com` DKIM,
- `_dmarc.ytucore.com` DMARC.

These checks validate public authentication records only; they do not measure Gmail/Outlook reputation or inbox placement.
