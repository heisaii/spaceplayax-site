const articles = window.SITE_ARTICLES || [];
const lead = articles.find((item) => item.featured) || articles[0];
const secondary = articles.filter((item) => item.id !== lead.id);

function storyMeta(article) {
  return `<p class="meta">${article.section} • ${article.time}</p>`;
}

function renderSmallStory(article) {
  return `
    <article class="small-story">
      <img src="${article.image}" alt="" loading="lazy" />
      <div>
        <span>${article.label}</span>
        <h3>${article.title}</h3>
        ${storyMeta(article)}
      </div>
    </article>
  `;
}

document.getElementById("tickerItems").innerHTML = secondary
  .slice(0, 4)
  .map((article) => `<a href="#">${article.title}</a>`)
  .join("");

document.getElementById("leadStory").innerHTML = `
  <img src="${lead.image}" alt="" />
  <div class="lead-copy">
    <span>${lead.label}</span>
    <h1>${lead.title}</h1>
    <p>${lead.summary}</p>
    ${storyMeta(lead)}
  </div>
`;

document.getElementById("leftColumn").innerHTML = secondary
  .slice(0, 3)
  .map(renderSmallStory)
  .join("");

document.getElementById("mostRead").innerHTML = articles
  .slice(1, 6)
  .map((article) => `<li><a href="#">${article.title}</a></li>`)
  .join("");

document.getElementById("latestGrid").innerHTML = secondary
  .slice(2)
  .map(
    (article) => `
      <article class="news-card">
        <img src="${article.image}" alt="" loading="lazy" />
        <div>
          <span>${article.section}</span>
          <h3>${article.title}</h3>
          <p>${article.summary}</p>
        </div>
      </article>
    `
  )
  .join("");

document.getElementById("quickList").innerHTML = secondary
  .slice(0, 5)
  .map(
    (article) => `
      <article>
        <span>${article.section}</span>
        <h3>${article.title}</h3>
      </article>
    `
  )
  .join("");
