const articlePage = document.getElementById("articlePage");
const params = new URLSearchParams(window.location.search);
const articleId = params.get("id");
const articles = window.SITE_ARTICLES || [];
const article = articles.find((item) => item.id === articleId);

if (!article) {
  renderNotFound();
} else {
  renderArticle(article);
}

async function renderArticle(item) {
  document.title = `${item.title} - Tech A`;
  setMetaDescription(item.summary);

  articlePage.innerHTML = `
    <header class="article-hero">
      <p class="eyebrow">${escapeHtml(item.section)} • ${escapeHtml(item.time)}</p>
      <h1>${escapeHtml(item.title)}</h1>
      <p class="article-summary">${escapeHtml(item.summary)}</p>
      <p class="meta">By ${escapeHtml(item.author || "Spaceplayax")}</p>
      <img src="${item.image}" alt="" />
    </header>
    <div class="article-body" id="articleBody">
      <p class="meta">Loading article...</p>
    </div>
  `;

  try {
    const response = await fetch(item.body);
    if (!response.ok) {
      throw new Error(`Article file returned ${response.status}`);
    }
    const markdown = await response.text();
    document.getElementById("articleBody").innerHTML = markdownToHtml(markdown);
  } catch (error) {
    document.getElementById("articleBody").innerHTML = `
      <p class="article-error">
        The article file could not be loaded. Check that ${escapeHtml(item.body)}
        exists in the deployed repository.
      </p>
    `;
  }
}

function renderNotFound() {
  document.title = "Article not found - Tech A";
  articlePage.innerHTML = `
    <div class="article-missing">
      <p class="eyebrow">Not found</p>
      <h1>Article not found</h1>
      <p>The article link is missing or no longer matches data/articles.js.</p>
      <a class="back-link" href="./index.html">Back to home</a>
    </div>
  `;
}

function setMetaDescription(description) {
  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    meta.setAttribute("content", description || "Read the latest Tech A article.");
  }
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listItems = [];
  let blockquote = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  const flushBlockquote = () => {
    if (!blockquote.length) return;
    html.push(`<blockquote>${blockquote.map((item) => `<p>${inlineMarkdown(item)}</p>`).join("")}</blockquote>`);
    blockquote = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      flushBlockquote();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      flushBlockquote();
      const level = Math.min(heading[1].length, 3);
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const list = line.match(/^[-*]\s+(.+)$/);
    if (list) {
      flushParagraph();
      flushBlockquote();
      listItems.push(list[1]);
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blockquote.push(quote[1]);
      continue;
    }

    flushList();
    flushBlockquote();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushBlockquote();

  return html.join("");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
