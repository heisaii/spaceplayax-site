#!/usr/bin/env node

import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import vm from "node:vm";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(scriptDir, "..");
const articlesFile = join(siteRoot, "data", "articles.js");
const contentDir = join(siteRoot, "content", "articles");
const imageDir = join(siteRoot, "assets", "images", "posts");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const featureFirst = args.includes("--feature-first");
const replaceAll = args.includes("--replace");
const inputArg = args.find((arg) => !arg.startsWith("--"));

if (!inputArg) {
  printUsage();
  process.exit(1);
}

let tempDir = "";

try {
  const batchRoot = await resolveBatchRoot(inputArg);
  const imported = await readBatch(batchRoot);
  const existingArticles = await readArticles();
  const nextArticles = replaceAll ? imported.map((item) => item.entry) : mergeArticles(existingArticles, imported);

  if (dryRun) {
    console.log(`Dry run OK: ${imported.length} post(s) can be imported.`);
    for (const item of imported) {
      console.log(`- ${item.entry.id}: ${item.entry.title}`);
    }
    process.exit(0);
  }

  await mkdir(contentDir, { recursive: true });
  await mkdir(imageDir, { recursive: true });

  for (const item of imported) {
    const postImageDir = join(imageDir, item.entry.id);
    await mkdir(postImageDir, { recursive: true });
    await copyFile(item.articlePath, join(contentDir, `${item.entry.id}.md`));
    await copyFile(item.coverPath, join(postImageDir, "cover.webp"));
  }

  await writeFile(articlesFile, formatArticlesFile(nextArticles), "utf8");

  console.log(`Imported ${imported.length} post(s).`);
  console.log(`Updated ${relativeToRoot(articlesFile)}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
} finally {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function printUsage() {
  console.log(`
Usage:
  node tools/import-batch.mjs <batch-folder-or-zip> [--dry-run] [--feature-first] [--replace]

Expected batch format:
  spaceplayax-content-batch-YYYY-MM-DD/
    batch-manifest.json
    posts/
      YYYY-MM-DD-slug/
        manifest.json
        article.md
        images/
          cover.webp
`.trim());
}

async function resolveBatchRoot(inputPath) {
  const absoluteInput = resolve(process.cwd(), inputPath);

  if (!existsSync(absoluteInput)) {
    throw new Error(`Input does not exist: ${absoluteInput}`);
  }

  if (extname(absoluteInput).toLowerCase() !== ".zip") {
    const info = await stat(absoluteInput);
    if (!info.isDirectory()) {
      throw new Error(`Input must be a folder or .zip file: ${absoluteInput}`);
    }
    return absoluteInput;
  }

  tempDir = await mkdtemp(join(siteRoot, ".import-"));
  await unzip(absoluteInput, tempDir);

  const entries = await readdir(tempDir, { withFileTypes: true });
  const topDirs = entries.filter((entry) => entry.isDirectory());
  if (topDirs.length !== 1) {
    throw new Error("Zip must contain exactly one top-level folder.");
  }

  return join(tempDir, topDirs[0].name);
}

function unzip(zipPath, destination) {
  return new Promise((resolvePromise, reject) => {
    execFile("unzip", ["-q", zipPath, "-d", destination], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Failed to unzip package: ${stderr || error.message}`));
        return;
      }
      resolvePromise(stdout);
    });
  });
}

async function readBatch(batchRoot) {
  const batchManifestPath = join(batchRoot, "batch-manifest.json");
  const postsRoot = join(batchRoot, "posts");

  if (!existsSync(batchManifestPath)) {
    throw new Error(`Missing ${relativeToRoot(batchManifestPath)}.`);
  }
  if (!existsSync(postsRoot)) {
    throw new Error(`Missing ${relativeToRoot(postsRoot)}.`);
  }

  const batchManifest = await readJson(batchManifestPath);
  const postIds = await getPostIds(batchManifest, postsRoot);
  const imported = [];
  const seenIds = new Set();

  for (const postId of postIds) {
    const postRoot = join(postsRoot, postId);
    const manifestPath = join(postRoot, "manifest.json");
    const articlePath = join(postRoot, "article.md");

    assertSafeId(postId, "post folder");
    assertExists(manifestPath, `Missing manifest.json for ${postId}.`);
    assertExists(articlePath, `Missing article.md for ${postId}.`);

    const manifest = await readJson(manifestPath);
    const id = normalizeRequiredString(manifest.id || postId, `${postId}.manifest.id`);
    const slug = normalizeRequiredString(manifest.slug, `${postId}.manifest.slug`);
    const coverRelative = manifest.coverImage || "images/cover.webp";
    const coverPath = join(postRoot, coverRelative);

    assertSafeId(id, "manifest.id");
    assertSafeSlug(slug);
    assertExists(coverPath, `Missing cover image for ${postId}: ${coverRelative}`);

    if (extname(coverPath).toLowerCase() !== ".webp") {
      throw new Error(`Cover image must be .webp: ${relativeToRoot(coverPath)}`);
    }

    const articleBody = (await readFile(articlePath, "utf8")).trim();
    if (!articleBody) {
      throw new Error(`article.md is empty for ${postId}.`);
    }

    if (seenIds.has(id)) {
      throw new Error(`Duplicate post id in batch: ${id}`);
    }
    seenIds.add(id);

    const entry = {
      id,
      section: manifest.category || manifest.section || "News",
      label: manifest.label || "New",
      title: normalizeRequiredString(manifest.title, `${postId}.manifest.title`),
      summary: normalizeRequiredString(
        manifest.description || manifest.summary || summarizeArticle(articleBody),
        `${postId}.manifest.description`
      ),
      image: `/assets/images/posts/${id}/cover.webp`,
      time: manifest.time || dateLabel(manifest.date),
      author: manifest.author || "Spaceplayax",
      body: `/content/articles/${id}.md`,
    };

    if (featureFirst && imported.length === 0) {
      entry.featured = true;
    } else if (manifest.featured === true) {
      entry.featured = true;
    }

    imported.push({ entry, articlePath, coverPath });
  }

  return imported;
}

async function getPostIds(batchManifest, postsRoot) {
  if (Array.isArray(batchManifest.posts) && batchManifest.posts.length > 0) {
    return batchManifest.posts.map((post) => (typeof post === "string" ? post : post.id));
  }

  const entries = await readdir(postsRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${relativeToRoot(filePath)}: ${error.message}`);
  }
}

async function readArticles() {
  if (!existsSync(articlesFile)) {
    return [];
  }

  const code = await readFile(articlesFile, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: articlesFile });

  if (!Array.isArray(sandbox.window.SITE_ARTICLES)) {
    throw new Error("data/articles.js must assign an array to window.SITE_ARTICLES.");
  }

  return sandbox.window.SITE_ARTICLES;
}

function mergeArticles(existing, imported) {
  const importedIds = new Set(imported.map((item) => item.entry.id));
  const preserved = existing.filter((article) => !importedIds.has(article.id));
  return [...imported.map((item) => item.entry), ...preserved];
}

function formatArticlesFile(articles) {
  return `window.SITE_ARTICLES = ${JSON.stringify(articles, null, 2)};\n`;
}

function dateLabel(dateValue) {
  const date = normalizeRequiredString(dateValue, "manifest.date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`manifest.date must use YYYY-MM-DD: ${date}`);
  }
  return date;
}

function summarizeArticle(markdown) {
  return markdown
    .replace(/^#\s+.+$/gm, "")
    .replace(/[#>*_`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function normalizeRequiredString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
}

function assertSafeId(id, label) {
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error(`${label} must look like YYYY-MM-DD-slug: ${id}`);
  }
}

function assertSafeSlug(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`manifest.slug must use lowercase letters, numbers, and hyphens: ${slug}`);
  }
}

function assertExists(filePath, message) {
  if (!existsSync(filePath)) {
    throw new Error(message);
  }
}

function relativeToRoot(filePath) {
  return filePath.replace(`${siteRoot}/`, "");
}
