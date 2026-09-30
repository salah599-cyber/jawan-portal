# Incident response

Use this when a jawaninvest.com system is suspected compromised. Do not put new passwords, API keys, or session tokens in chat, email, or tickets.

## Roles

- Incident lead: decides containment and talks to vendors.
- App owner: Vercel project, Clerk, Stripe, and this repository.
- Mail owner: Bluehost account for mail.jawaninvest.com (WordPress, Exim, cPanel).
- Security inbox: security@jawaninvest.com. Create this mailbox before relying on DMARC reports or Clerk sign-in alerts.

## Contain

1. In Clerk, revoke active sessions for the affected user and turn sign-up back to invitation-only if it was changed.
2. In Stripe, roll the secret key and the publishable key that was exposed through Jetpack, then revoke the old key. Check the payments list for charges you do not recognize.
3. In Vercel, rotate `CLERK_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, and database credentials if they may have been exposed. Update them only in the Vercel project environment.
4. In Bluehost, change the cPanel password and the WordPress user `salah599` from the hosting panel, then sign out other WordPress sessions.
5. Change the mailbox password for admin@jawaninvest.com from cPanel email accounts.

## Communicate

Tell affected staff: what is down, what was accessed if known, and that they should not forward unexpected mail that asks them to open webmail or enter a code. Send that note from an account you still control.

## Recover

- App: redeploy from this repository after secrets are rotated. Private Vercel Blob stays private. CSP reports go to `/api/csp-report`.
- WordPress: upload `legacy-wordpress/wp-content/mu-plugins/*.php` and merge `legacy-wordpress/.htaccess` into the live site root. Update WordPress core, Yoast, Jetpack, and every other plugin and theme from wp-admin after a full cPanel backup.
- Mail: ask Bluehost to apply `legacy-wordpress/mail-server-hardening.conf`. Roundcube on shared hosting is upgraded by Bluehost, not by a site plugin.
- DNS: apply `legacy-wordpress/dns-zone-changes.txt` in the Bluehost Zone Editor.

## Escalate

- Bluehost support for Exim, Roundcube, ModSecurity, and firewall ports.
- Clerk support if Frontend API restrictions or rate limits cannot be saved.
- Stripe support if a live charge is not recognized.
- Vercel support if a deployment or blob store cannot be locked to private.

## After the incident

Review WordPress login records, Clerk Dashboard activity, Exim logs, and cPanel login logs for the window of the event. Keep notes of what was rotated and when. Do not store the new secret values in this repository.

## Staff briefing

Cover these points with anyone who can sign in to WordPress, Clerk, cPanel, Stripe, or Vercel:

- Unexpected mail that claims to be from admin@jawaninvest.com, cpanel@jawaninvest.com, or a Clerk reset is not proof the sender is real. Open the site by typing the address, not by using a link in that mail.
- Passwords are at least 12 characters, with upper and lower case, a number, and a symbol. Do not reuse the WordPress, cPanel, email, Clerk, Stripe, or Vercel passwords across those systems.
- A request to read a code aloud, install a plugin, or open webmail to "verify the account" stops with the incident lead. Do not complete it on the call.
