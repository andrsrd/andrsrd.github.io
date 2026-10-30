// Turns posts/*.md into a website in docs/. Run: node build.js
const fs = require('fs');

const NAME = 'Anders Rød';
const INITIAL = 'A';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// `code`, ![image](src), [link](url), **bold**, *italic*
const inline = s => esc(s).split(/(`[^`]+`)/).map((part, i) => i % 2
  ? `<code>${part.slice(1, -1)}</code>`
  : part
    .replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
).join('');

const list = (tag, lines) =>
  `<${tag}>${lines.map(l => `<li>${inline(l.replace(/^(- |\d+\. )/, ''))}</li>`).join('')}</${tag}>`;

function block(text) {
  const lines = text.split('\n');
  const heading = text.match(/^(#{1,3}) (.*)/);
  if (heading) return `<h2>${inline(heading[2])}</h2>`;
  if (lines.every(l => l.startsWith('- '))) return list('ul', lines);
  if (lines.every(l => /^\d+\. /.test(l))) return list('ol', lines);
  if (lines.every(l => l.startsWith('>'))) return `<blockquote><p>${inline(lines.map(l => l.replace(/^> ?/, '')).join(' '))}</p></blockquote>`;
  return `<p>${inline(lines.join(' '))}</p>`;
}

// Code fences are split out first; odd pieces are the code.
const markdown = md => md
  .split(/^```.*\n([\s\S]*?)^```$/m)
  .map((part, i) => i % 2
    ? `<pre><code>${esc(part)}</code></pre>`
    : part
      .replace(/^(#{1,3} .*)$/gm, '\n$1\n')
      .split(/\n\s*\n/)
      .map(b => b.trim())
      .filter(Boolean)
      .map(block)
      .join('\n'))
  .join('\n');

const prettyDate = date => new Date(date + 'T00:00:00Z')
  .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<main>
<a class="mark" href="./"><span>${INITIAL}</span>${NAME}</a>
${body}
</main>
</body>
</html>
`;

// A post is posts/YYYY-MM-DD-url-name.md, and its first line is "# Title".
const posts = fs.readdirSync('posts')
  .filter(f => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f))
  .sort()
  .reverse()
  .map(file => {
    const md = fs.readFileSync(`posts/${file}`, 'utf8').replace(/\r/g, '');
    return {
      date: file.slice(0, 10),
      slug: file.slice(11, -3),
      title: md.match(/^# (.*)/m)?.[1] ?? file,
      body: md.replace(/^# .*\n?/m, ''),
    };
  });

for (const f of fs.readdirSync('docs')) if (f.endsWith('.html')) fs.unlinkSync(`docs/${f}`);

// A post in full, with links to all the other posts at the bottom.
function postPage(p) {
  const others = posts.filter(o => o !== p);
  return `<article>
<h1>${inline(p.title)}</h1>
<p class="meta">${NAME}<br>${prettyDate(p.date)}${others.length ? '<br><a href="#more">More</a>' : ''}</p>
${markdown(p.body)}
</article>
${others.length ? `<ul class="posts" id="more">
${others.map(o => `<li><a href="${o.slug}.html">${inline(o.title)}</a><br><span class="meta">${prettyDate(o.date)}</span></li>`).join('\n')}
</ul>` : ''}`;
}

for (const p of posts) fs.writeFileSync(`docs/${p.slug}.html`, page(`${esc(p.title)} | ${NAME}`, postPage(p)));

// The home page is the newest post.
fs.writeFileSync('docs/index.html', page(NAME, posts.length ? postPage(posts[0]) : ''));

console.log(`Built ${posts.length} post(s).`);
