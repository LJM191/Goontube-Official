# GoonTube security audit — 2026-10-10

## Scope and limits

Reviewed the `dev` source tree, authentication wiring, upload handling, Netlify configuration, Supabase public-schema RLS policies, storage buckets/policies, and Supabase security/performance advisors. No penetration test or external production scan was run. The live Supabase project was inspected read-only; no production database settings or rows were changed.

## Findings

### High — public profile table exposes private columns

`public.profiles` contains `email` and `school_level`, while the table has a public SELECT policy and table-level SELECT grants to `anon` and `authenticated`. This makes those columns queryable directly through the Supabase Data API, regardless of whether the UI displays them.

**Code mitigation on dev:** the public profile page now selects only fields it needs. This does not close direct API access by itself. Apply the reviewed column-level grant fix in `security-remediation-pending.sql` only after reconciling the project/migration configuration and coordinating the matching code release.

### High — comment authors can alter moderation metadata

The current owner UPDATE policy restricts row ownership, but does not restrict which columns the owner may change. An author may therefore be able to edit `moderation_status`, `moderated_by`, `moderated_at`, and `moderation_reason` on their own comment.

**Remediation prepared:** `security-remediation-pending.sql` adds a database trigger to reserve moderation metadata for moderators/admins. It has deliberately not been applied to the live database.

### Medium — leaked-password protection is disabled

The Supabase security advisor reports that Auth's leaked-password protection is disabled. Enable it in Supabase Auth settings if the project's plan supports it, and review the password minimum and MFA options. The sign-up form now asks for at least 8 characters, but client-side validation is not a substitute for server-side Auth settings.

### Medium — Supabase project/migration configuration drift

`supabase/config.toml` references a different project ID from the connected project named Goontube-Official, and the repository's migration filenames/history do not line up with the connected project's applied migration history. Do not run `supabase db push` or apply the pending SQL until the intended project and migration history are reconciled; otherwise migrations could target the wrong project or apply out of order.

### Low — dependency reproducibility

The repository tree does not contain a Bun/npm lockfile, while CI runs `bun install`. That makes dependency resolution less reproducible. Generate and commit the correct lockfile from the project's supported Bun version before enforcing frozen installs.

## Changes committed on dev

- Public profile query explicitly selects public fields instead of `*`.
- Upload helper rejects files with missing or unsupported MIME types.
- Password input uses a minimum of 8 characters and correct autocomplete hints.
- Baseline HTTP security headers added to Netlify configuration and server-rendered responses: anti-framing, MIME sniffing protection, referrer policy, restrictive permissions policy, cross-domain policy, and HSTS.
- Existing request middleware already includes CSRF protection for server functions.

## Positive checks

- All inspected public-schema tables had RLS enabled.
- The video bucket is private; its read policy is constrained to public/unlisted videos or the owner's own files.
- Image buckets are public by design and have MIME-type and size restrictions configured.
- No `dangerouslySetInnerHTML` usage was found in the inspected source snippets.

## Not yet closed

The two database findings and the Auth dashboard setting still require the pending SQL/settings work. They are intentionally not described as fixed because no live database changes were made. Netlify headers and code changes are on `dev` only; they are not live until a release is made.
