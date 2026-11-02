# DC Consulting website and staff editor

A Node site with no framework on the front end. Public pages are rendered on the server from a content store; staff change that content through a private editor and publish it when ready.

## Run it

```bash
cd app
npm install
npm start            # http://localhost:3000
```

On first start a staff account is created and its one-time password is printed in the console. Set `ADMIN_USER` and `ADMIN_PASSWORD` beforehand to choose your own (12+ characters). You are asked to change a generated password at first sign-in.

The staff editor lives at `/admin/`. It is not linked, listed in the sitemap, or named in `robots.txt`, and it sends `noindex`. Set `ADMIN_PATH=somewhere-else` to move it.

## What staff can do

- Edit every piece of text, link, contact detail and photograph, page by page, with a live draft preview (desktop and phone width).
- Nothing is public until **Publish**. Each publish keeps the version it replaces; any version can be loaded back into the draft.
- Upload, describe, re-crop (focal point) and delete images. AVIF, WebP and JPEG sizes are made automatically.
- Read and export enquiries from the contact form; find and replace across all text; add staff accounts (administrator or editor).

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT`, `HOST` | listen address | `3000`, `0.0.0.0` |
| `DATA_DIR` | content, uploads, users, enquiries | `app/data` |
| `ADMIN_PATH` | URL of the staff editor | `admin` |
| `SITE_ORIGIN` | canonical site URL, e.g. `https://www.example.com` | from request |
| `TRUST_PROXY` | set to `1` behind a TLS-terminating proxy; enables secure cookies and real client IPs | off |
| `COOKIE_SECURE` | force secure cookies | off |

Back up `DATA_DIR`; it is the whole state of the site. Run it behind HTTPS.

## Hosting

The editor needs a server, so it cannot run on GitHub Pages. Any host that runs Node 20+ and keeps a persistent disk works (a small VM, Fly.io, Render, Railway; `Dockerfile` included, mount a volume at `/data`).

For a static-only host, `npm run export` writes the published defaults to `dist-static/` without the editor.

## Security notes

Passwords are hashed with scrypt; sessions are random, stored hashed, expire after 2 idle hours or 12 hours, and use HttpOnly SameSite=Strict cookies. Every write needs a per-session CSRF token and a same-origin request. Login attempts are throttled. Uploads are checked by content, not file name; SVGs containing scripts are refused. All content is escaped on output and limited by length and type by the schema in `server/schema.js`.

## Tests

`npm test` covers rendering, sign-in, CSRF, throttling, draft/publish separation, escaping, uploads, enquiries and find-and-replace.

## Photography

Photographs are from Unsplash, graded to a common look by `tools/prepare-seed.js`. Credits are listed at `/credits`. Replace them with the company's own photographs through the editor when available.
