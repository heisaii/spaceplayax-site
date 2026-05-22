# Deploying Tech A to spaceplayax.top

This folder is a static site and can be deployed directly to Cloudflare Pages, Vercel, Netlify, or any CDN-backed static hosting.

## Recommended: Cloudflare Pages

1. Back up the current `spaceplayax.top` game site before switching DNS or replacing files.
2. Create a GitHub repository for this folder, or upload the folder directly to Cloudflare Pages.
3. In Cloudflare Pages, create a new project.
4. Use these settings:
   - Build command: leave empty
   - Output directory: `/` if this folder is the repository root
   - Output directory: `news-static-site` if the repository root is `/Users/yuedu/Documents/New project`
5. Add the custom domain `spaceplayax.top`.
6. Add `www.spaceplayax.top` and redirect it to `spaceplayax.top`.
7. Confirm these URLs work after deployment:
   - `https://spaceplayax.top/`
   - `https://spaceplayax.top/robots.txt`
   - `https://spaceplayax.top/sitemap.xml`
   - `https://spaceplayax.top/ads.txt`

## AdSense

Create `ads.txt` in this folder before final deployment. Use your real AdSense publisher ID:

```txt
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Do not use the placeholder value in production.

## Content Updates

Short term:

1. Upload article images to Cloudflare R2, OSS, COS, S3, or another CDN-backed image host.
2. Edit `data/articles.js`.
3. Replace article titles, summaries, sections, image URLs, and author names.
4. Redeploy the static site.

Long term:

Use a CMS or database-backed workflow:

```text
Admin upload
-> draft status
-> image stored in R2/S3/OSS
-> editorial review
-> published status
-> static frontend displays only published content
```

Good next options are Cloudflare R2 + Supabase, Directus, Strapi, or Sanity.
