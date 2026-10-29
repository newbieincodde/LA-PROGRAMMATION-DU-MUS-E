import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const contentJsonPath = path.join(rootDir, 'assets', 'data', 'content.json');
const distDir = path.join(rootDir, 'dist');
const shareDir = path.join(distDir, 'share');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createHtmlPage({ title, description, image, imageAlt, hashTarget, type = 'article' }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph / Facebook / Zalo -->
  <meta property="og:site_name" content="ÉTHÉRÉ Atelier">
  <meta property="og:type" content="${escapeHtml(type)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:alt" content="${escapeHtml(imageAlt || title)}">
  <meta property="og:locale" content="vi_VN">
  <meta property="og:locale:alternate" content="fr_FR">
  <meta property="og:locale:alternate" content="en_US">
  
  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt || title)}">
  
  <style>
    body {
      background: #0d0e12;
      color: #e4dfd7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #14161d;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 12px;
      padding: 32px;
      max-width: 520px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 12px;
      color: #d4af37;
    }
    p {
      color: #9ba1b0;
      line-height: 1.6;
    }
    a.btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background: #d4af37;
      color: #0d0e12;
      text-decoration: none;
      font-weight: 600;
      border-radius: 6px;
      transition: opacity 0.2s;
    }
    a.btn:hover {
      opacity: 0.9;
    }
  </style>

  <!-- Instant client redirection for real human visitors -->
  <script>
    (function() {
      var target = '../' + '${hashTarget}';
      window.location.replace(target);
    })();
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=../${hashTarget}">
  </noscript>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>Đang chuyển hướng bạn tới không gian triển lãm 3D thời gian thực của ÉTHÉRÉ Atelier...</p>
    <a href="../${hashTarget}" class="btn">Vào Thưởng Lãm Ngay →</a>
  </div>
</body>
</html>
`;
}

async function generate() {
  console.log('--- Generating Static Prerendered Social Crawler Pages ---');
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist/ directory not found. Please run npm run build first.');
    process.exit(1);
  }

  if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
  }

  const raw = fs.readFileSync(contentJsonPath, 'utf8');
  const data = JSON.parse(raw);
  const artworks = data.artworks || [];
  const stories = data.stories || [];

  let count = 0;

  // 1. Generate for 4 Wings (Rooms)
  const roomData = [
    { id: 'I', name: 'Cổ Vật & Phù Điêu Đá', desc: 'Đá bazan và cẩm thạch lưu giữ dấu vết của lưỡi đục kim loại đầu tiên từ 883 TCN.' },
    { id: 'II', name: 'Bậc Thầy Sơn Dầu & Impasto', desc: 'Mỗi vệt phết dao và nhát cọ dày là một ngọn đồi nhỏ hứng lấy ánh sáng (1620 – 1890).' },
    { id: 'III', name: 'Khắc Gỗ Ukiyo-e & Mỹ Nghệ Á Đông', desc: 'Thớ gỗ dâu tằm in vào giấy washi, vết ép bản khắc sáng lên dưới ánh đèn ngang.' },
    { id: 'IV', name: 'Sợi Dệt & Thảm Tapestry', desc: 'Hàng triệu nút thắt len và tơ tằm hòa quyện thành bản trường ca xúc giác thời Phục hưng.' }
  ];

  for (const room of roomData) {
    const pageHtml = createHtmlPage({
      title: `Cánh ${room.id}: ${room.name} — ÉTHÉRÉ Atelier`,
      description: room.desc,
      image: '../assets/images/assyrian-relief.jpg',
      imageAlt: `Cánh triển lãm ${room.id} - ${room.name}`,
      hashTarget: `#room/${room.id}`,
      type: 'website'
    });
    fs.writeFileSync(path.join(shareDir, `room-${room.id}.html`), pageHtml, 'utf8');
    count++;
  }

  // 2. Generate for All 50 Artworks
  for (const art of artworks) {
    const desc = art.narrative
      ? art.narrative.slice(0, 160) + '...'
      : `Kiệt tác ${art.title} của ${art.artist} (${art.year}) tại ÉTHÉRÉ Atelier.`;
    let cleanImg = art.image || '';
    if (cleanImg.startsWith('./')) cleanImg = cleanImg.slice(1);
    else if (!cleanImg.startsWith('/')) cleanImg = '/' + cleanImg;
    const imagePath = '..' + cleanImg;

    const pageHtml = createHtmlPage({
      title: `${art.title} — ${art.artist} | ÉTHÉRÉ Atelier`,
      description: desc,
      image: imagePath,
      imageAlt: art.alt || art.title,
      hashTarget: `#artwork/${art.id}`,
      type: 'article'
    });
    fs.writeFileSync(path.join(shareDir, `${art.id}.html`), pageHtml, 'utf8');
    count++;
  }

  // 3. Generate for 4 Curatorial Stories
  for (const story of stories) {
    const desc = story.subtitle || story.historicalSecret || 'Tiểu luận giám tuyển chuyên sâu tại bảo tàng số ÉTHÉRÉ Atelier.';
    const pageHtml = createHtmlPage({
      title: `${story.title} | Bài Luận Giám Tuyển — ÉTHÉRÉ Atelier`,
      description: desc,
      image: '../assets/images/assyrian-relief.jpg',
      imageAlt: story.title,
      hashTarget: `#story/${story.id}`,
      type: 'article'
    });
    fs.writeFileSync(path.join(shareDir, `${story.id}.html`), pageHtml, 'utf8');
    count++;
  }

  console.log(`✓ Successfully generated ${count} static social crawler pages in dist/share/!`);
}

generate();
