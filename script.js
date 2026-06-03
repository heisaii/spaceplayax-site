const articles = window.SITE_ARTICLES || [];
const lead = articles.find((item) => item.featured) || articles[0];
const secondary = articles.filter((item) => item.id !== lead.id);

function articleUrl(article) {
  return `./article.html?id=${encodeURIComponent(article.id)}`;
}

function storyMeta(article) {
  return `<p class="meta">${article.section} • ${article.time}</p>`;
}

function renderSmallStory(article) {
  return `
    <a class="small-story story-link" href="${articleUrl(article)}">
      <img src="${article.image}" alt="" loading="lazy" />
      <div>
        <span>${article.label}</span>
        <h3>${article.title}</h3>
        ${storyMeta(article)}
      </div>
    </a>
  `;
}

document.getElementById("tickerItems").innerHTML = secondary
  .slice(0, 4)
  .map((article) => `<a href="${articleUrl(article)}">${article.title}</a>`)
  .join("");

document.getElementById("leadStory").innerHTML = `
  <a class="story-link" href="${articleUrl(lead)}">
    <img src="${lead.image}" alt="" />
    <div class="lead-copy">
      <span>${lead.label}</span>
      <h1>${lead.title}</h1>
      <p>${lead.summary}</p>
      ${storyMeta(lead)}
    </div>
  </a>
`;

document.getElementById("leftColumn").innerHTML = secondary
  .slice(0, 3)
  .map(renderSmallStory)
  .join("");

document.getElementById("mostRead").innerHTML = articles
  .slice(1, 6)
  .map((article) => `<li><a href="${articleUrl(article)}">${article.title}</a></li>`)
  .join("");

document.getElementById("latestGrid").innerHTML = secondary
  .slice(2)
  .map(
    (article) => `
      <a class="news-card story-link" href="${articleUrl(article)}">
        <img src="${article.image}" alt="" loading="lazy" />
        <div>
          <span>${article.section}</span>
          <h3>${article.title}</h3>
          <p>${article.summary}</p>
        </div>
      </a>
    `
  )
  .join("");

document.getElementById("quickList").innerHTML = secondary
  .slice(0, 5)
  .map(
    (article) => `
      <a class="quick-story story-link" href="${articleUrl(article)}">
        <span>${article.section}</span>
        <h3>${article.title}</h3>
      </a>
    `
  )
  .join("");
