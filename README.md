# March Madness bracket (Next.js)

Compare multi-participant brackets: Pin me, diff vs pinned viewer, URL `?participant=` / `?diff=`.

## Deploy for team testing (Vercel)

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In [Vercel](https://vercel.com), **Add New Project** → import the repo.
3. Framework preset: **Next.js**. Defaults work:
   - **Build command:** `npm run build`
   - **Output:** (leave default)
4. Deploy. Vercel will install dependencies and run the build.

**Data:** Bracket data lives in `data/*.json` (teams, meta, `participants/*.json`). It is **baked in at build time** (the home page is statically generated). After you change JSON or add participants, **redeploy** (push a commit or use “Redeploy” in Vercel) so testers see updates.

**PDFs:** `data/pdfs/*.pdf` are gitignored and not required in production. Only the committed JSON under `data/` matters for the site.

**Share with testers:** Send them the production URL (and optional preview URLs from pull requests if you enable Vercel previews). For a private smoke test, use Vercel [Deployment Protection](https://vercel.com/docs/security/deployment-protection) (team/Pro) or keep the repo private and share only the deployment URL.

## Local

```bash
npm install
npm run dev
```

## Scripts (local only)

- `npm run pdf:text` — extract text from a PDF  
- `npm run pdf:import` — import `data/pdfs/*.pdf` → `data/participants/*.json`  
- `npm run pdf:validate` — validate participant JSON against `teams.json` and the Tomy template  
