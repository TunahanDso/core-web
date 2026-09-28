# YTÜ CORE Portal Email Service

The portal invitation flow is designed for transactional membership email, not bulk marketing.

## Production identity

- Sender: `YTÜ CORE Portal <portal@ytucore.com>`
- Reply-To: `portal@ytucore.com`
- Primary provider: Cloudflare Email Service through the Worker `EMAIL` send binding
- Optional fallback: Resend through the `RESEND_API_KEY` Worker secret

The invitation secret itself is never stored in plaintext. The D1 invitation table stores only the hash; the raw one-time code exists only at creation/reissue time so it can be shown once in the admin UI and sent in the invitation email.

## Cloudflare production onboarding

The code and Worker binding are committed, but Cloudflare still requires the sending domain to be onboarded in the account that owns `ytucore.com`.

1. Open Cloudflare Dashboard.
2. Go to **Compute > Email Service > Email Sending**.
3. Choose **Onboard Domain** and select `ytucore.com`.
4. Accept/create the required sending DNS records for the domain. Cloudflare configures the bounce MX/SPF, DKIM and DMARC records used by Email Service.
5. Deploy the Worker after the domain is available for sending.
6. Open **CORE CONTROL > Üyeler & Erişim** and use **Test maili gönder**.
7. Confirm that the admin panel reports `sent` and that the message arrives outside spam.

If Cloudflare returns `E_SENDER_NOT_VERIFIED` or `E_SENDER_DOMAIN_NOT_AVAILABLE`, the admin test panel translates that into a domain-onboarding error instead of silently reporting success.

## Incoming club mailbox / replies

Outbound transactional sending and an inbox are different things.

To make `portal@ytucore.com` behave like a club mailbox as well:

1. Open **Compute > Email Service > Email Routing**.
2. Add and verify the real destination inbox that club administrators read.
3. Create a routing rule from `portal@ytucore.com` to that verified destination.

That preserves the public club identity while the actual mailbox can remain on an existing Gmail/Outlook/YTU address.

## Resend fallback

If the Cloudflare account cannot use arbitrary-recipient Email Sending yet, the same application can fall back to Resend without changing the invitation flow:

1. Verify `ytucore.com` in Resend and publish its requested DNS records.
2. Add `RESEND_API_KEY` as a **Worker secret**, never as a committed Wrangler variable.
3. Keep `PORTAL_MAIL_FROM` on a verified `@ytucore.com` address.

The application tries Cloudflare first. If Cloudflare fails and the Resend secret exists, Resend becomes the automatic fallback provider.

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
