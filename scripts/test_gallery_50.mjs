import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome_cdp_gallery_'));

async function main() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9226',
    `--user-data-dir=${tmpProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--window-size=1280,800',
    'http://localhost:8000/#home'
  ]);

  await setTimeout(2500);

  try {
    const listRes = await fetch('http://127.0.0.1:9226/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find((t) => t.type === 'page') || tabs[0];
    const wsUrl = pageTab.webSocketDebuggerUrl;
    console.log('Target tab URL:', pageTab.url);
    console.log('Connected to Chrome DevTools Protocol at:', wsUrl);

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));

    let msgId = 0;
    const pending = new Map();

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', data.params.type, data.params.args?.map((a) => a.value ?? a.description).join(' '));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails?.text, data.params.exceptionDetails?.exception?.description);
      }
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
    });

    function sendCmd(method, params = {}) {
      return new Promise((resolve) => {
        const id = ++msgId;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCmd('Page.enable');
    await sendCmd('Runtime.enable');

    async function evaluate(expr) {
      const res = await sendCmd('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.result?.value;
    }

    // 1. Home
    console.log('--> Waiting for app initialization...');
    await setTimeout(2000);
    const title = await evaluate('document.title');
    console.log('Page Title:', title);

    // 2. Collection grid (50 artworks)
    console.log('--> Testing #collection');
    await sendCmd('Page.navigate', { url: 'http://localhost:8000/#collection' });
    await setTimeout(1500);
    const colCount = await evaluate("document.querySelectorAll('#editorial-grid .artwork-card').length");
    console.log(`Rendered collection cards: ${colCount} / 50`);
    if (colCount !== 50) throw new Error(`Expected 50 cards, found ${colCount}`);

    // 3. Rooms
    const rooms = [
      { id: 'I', expected: 11 },
      { id: 'II', expected: 20 },
      { id: 'III', expected: 10 },
      { id: 'IV', expected: 9 }
    ];
    for (const r of rooms) {
      console.log(`--> Testing #room/${r.id}`);
      await sendCmd('Page.navigate', { url: `http://localhost:8000/#room/${r.id}` });
      await setTimeout(1000);
      const roomCards = await evaluate("document.querySelectorAll('.room-artworks-grid .room-art-card').length");
      console.log(`Room ${r.id} count: ${roomCards} / ${r.expected}`);
      if (roomCards !== r.expected) throw new Error(`Room ${r.id} count mismatch: ${roomCards} vs ${r.expected}`);
    }

    // 4. Detail page of newly added artwork: van-gogh-starry-night
    console.log('--> Testing #artwork/van-gogh-starry-night');
    await sendCmd('Page.navigate', { url: 'http://localhost:8000/#artwork/van-gogh-starry-night' });
    await setTimeout(1000);
    const artTitle = await evaluate("document.querySelector('.artwork-page-title')?.innerText");
    const artSpecs = await evaluate("document.querySelectorAll('.artwork-specs-card .spec-row').length");
    const artMaterial = await evaluate("document.querySelectorAll('.artwork-specs-card .spec-row dd')[1]?.innerText");
    console.log('Artwork Title:', artTitle);
    console.log('Artwork Specs Count:', artSpecs);
    console.log('Artwork Material:', artMaterial);
    if (!artTitle?.includes('Đêm Đầy Sao')) throw new Error('Artwork title mismatch');
    if (artSpecs < 4) throw new Error(`Artwork specs too few: ${artSpecs}`);

    // Detail page of another newly added artwork: lady-unicorn-touch
    console.log('--> Testing #artwork/lady-unicorn-touch');
    await sendCmd('Page.navigate', { url: 'http://localhost:8000/#artwork/lady-unicorn-touch' });
    await setTimeout(1000);
    const artTitleTouch = await evaluate("document.querySelector('.artwork-page-title')?.innerText");
    const artDimTouch = await evaluate("document.querySelectorAll('.artwork-specs-card .spec-row dd')[0]?.innerText");
    console.log('Artwork Title (Touch):', artTitleTouch);
    console.log('Artwork Dimensions (Touch):', artDimTouch);
    if (!artTitleTouch?.includes('Xúc Giác')) throw new Error('Touch title mismatch');

    // 4.5. Test all 4 Curatorial Stories & Aliases
    console.log('--> Testing #stories index');
    await sendCmd('Page.navigate', { url: 'http://localhost:8000/#stories' });
    await setTimeout(1000);
    const storiesCount = await evaluate("document.querySelectorAll('.story-index-card').length");
    console.log(`Stories Index count: ${storiesCount} / 4`);
    if (storiesCount !== 4) throw new Error(`Expected 4 stories, found ${storiesCount}`);

    const testStories = [
      { url: '#story/alchemy-polychromy', expectedTitle: 'Vết Tích Sắc Màu Thất Lạc' },
      { url: '#story/alchemy-impasto', expectedTitle: 'Địa Hình 1cm² Sơn Dầu' },
      { url: '#story/alchemy-matrix', expectedTitle: 'Thuật Toán Ma Trận Sợi Dệt' },
      { url: '#story/alchemy-shadows', expectedTitle: 'Khoảng Lặng Của Bóng Tối' },
      { url: '#story/alchemy-fresco', expectedTitle: 'Vết Tích Sắc Màu Thất Lạc' }, // Alias 1
      { url: '#story/alchemy-loom', expectedTitle: 'Thuật Toán Ma Trận Sợi Dệt' } // Alias 3
    ];

    for (const ts of testStories) {
      console.log(`--> Testing ${ts.url}`);
      await sendCmd('Page.navigate', { url: `http://localhost:8000/${ts.url}` });
      await setTimeout(1000);
      const sTitle = await evaluate("document.querySelector('.single-story-title')?.innerText");
      console.log(`Loaded ${ts.url} -> Title: '${sTitle}'`);
      if (!sTitle || !sTitle.includes(ts.expectedTitle)) {
        throw new Error(`Failed to load story ${ts.url}: expected '${ts.expectedTitle}', got '${sTitle}'`);
      }
    }

    // 5. Mobile responsive check (390x844)
    console.log('--> Testing Mobile Viewport (390x844)');
    await sendCmd('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });
    await setTimeout(1000);

    const routes = ['#home', '#room/I', '#artwork/van-gogh-starry-night', '#collection', '#stories'];
    for (const route of routes) {
      await sendCmd('Page.navigate', { url: `http://localhost:8000/${route}` });
      await setTimeout(1000);
      const scrollW = await evaluate('document.documentElement.scrollWidth');
      const clientW = await evaluate('document.documentElement.clientWidth');
      console.log(`Mobile ${route} -> scrollWidth: ${scrollW}, clientWidth: ${clientW}`);
      if (scrollW > clientW) throw new Error(`Horizontal overflow on ${route}: ${scrollW} > ${clientW}`);
    }

    console.log('\n=============================================');
    console.log('✓ ALL TESTS PASSED SUCCESSFULLY! 50 MASTERPIECES VERIFIED.');
    console.log('=============================================\n');

    ws.close();
  } finally {
    chrome.kill();
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
