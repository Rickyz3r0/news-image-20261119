import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const MAX_BYTES = 1048576;
const TARGET_SIZE = 1024;
const PREVIEW_SIZE = 300;

const DEFAULT_ASSETS_DIR =
  'C:\\Users\\Desain\\.gemini\\antigravity\\brain\\d1516c3d-d08a-4f24-942f-701422ae11ad\\scratch\\panels';
const DEFAULT_PREVIEW_PATH =
  'C:\\Users\\Desain\\.gemini\\antigravity\\brain\\d1516c3d-d08a-4f24-942f-701422ae11ad\\scratch\\preview-300px.png';

function parseArgs(argv) {
  let assetsDir = DEFAULT_ASSETS_DIR;
  let outPath = resolve('./entry.png');
  let previewPath = DEFAULT_PREVIEW_PATH;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--assets-dir' && argv[i + 1]) {
      assetsDir = resolve(argv[++i]);
    } else if (arg === '--out' && argv[i + 1]) {
      outPath = resolve(argv[++i]);
    } else if (arg === '--preview' && argv[i + 1]) {
      previewPath = resolve(argv[++i]);
    }
  }
  return { assetsDir, outPath, previewPath };
}

function loadDataUri(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing panel image: ${filePath}`);
  }
  const bytes = readFileSync(filePath);
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const mime = isPng ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function readPngDimensions(pngPath) {
  const buf = readFileSync(pngPath);
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error(`Not a valid PNG file: ${pngPath}`);
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error('No headless Chromium/Edge binary found.');
}

function buildHtml(panels) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body {
    width: ${TARGET_SIZE}px;
    height: ${TARGET_SIZE}px;
    overflow: hidden;
    background: #F5F0E6;
    color: #141923;
    -webkit-font-smoothing: antialiased;
  }
  .page {
    width: 1024px;
    height: 1024px;
    padding: 14px 20px 16px 20px;
    background: #F5F0E6;
    display: flex;
    flex-direction: column;
  }
  .masthead {
    height: 98px;
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .top-rules {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .rule-thick {
    height: 4px;
    background: #141923;
  }
  .rule-crimson {
    height: 2px;
    background: #B8292F;
  }
  .masthead-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0;
  }
  .brand-kicker {
    font-family: 'Bahnschrift', 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2.8px;
    color: #4B5563;
    margin-bottom: 2px;
  }
  .brand-title {
    font-family: Georgia, Cambria, 'Times New Roman', serif;
    font-size: 50px;
    font-weight: 700;
    letter-spacing: 0.5px;
    line-height: 0.96;
    color: #141923;
  }
  .date-badge {
    background: #B8292F;
    color: #FFFFFF;
    padding: 7px 18px 8px 18px;
    border-radius: 4px;
    border: 2px solid #141923;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 248px;
  }
  .date-day {
    font-family: 'Bahnschrift', 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 3px;
    color: #FDE8E8;
    line-height: 1.1;
  }
  .date-num {
    font-family: 'Bahnschrift', 'Segoe UI', Arial, sans-serif;
    font-size: 34px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #FFFFFF;
    line-height: 1.05;
  }
  .rule-bottom {
    height: 2px;
    background: #141923;
  }
  .grid {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 882px;
  }
  .row-1 {
    display: flex;
    gap: 14px;
    height: 336px;
  }
  .row-2, .row-3 {
    display: flex;
    gap: 14px;
    height: 259px;
  }
  .card {
    display: flex;
    flex-direction: column;
    border: 2.5px solid #141923;
    border-radius: 4px;
    overflow: hidden;
    background: #141923;
  }
  .card-lead {
    width: 604px;
    height: 336px;
  }
  .card-side {
    width: 366px;
    height: 336px;
  }
  .card-half {
    width: 485px;
    height: 259px;
  }
  .art {
    width: 100%;
    overflow: hidden;
    position: relative;
    background: #F5F0E6;
  }
  .art img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  .card-lead .art {
    height: 204px;
  }
  .card-side .art {
    height: 204px;
    background: #F6F2E9;
  }
  .card-side .art img {
    object-fit: contain;
    padding-top: 4px;
  }
  .card-half .art {
    height: 145px;
  }
  .art-berlin {
    background: linear-gradient(180deg, #1A3A77 0%, #1C3D7D 74%, #111622 74%, #111622 100%);
  }
  .art-berlin img {
    object-fit: contain;
    height: 112%;
    transform: translateY(-3%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%);
    mask-image: linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%);
  }
  .footer {
    background: #141923;
    color: #FFFFFF;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-top: 2px solid #141923;
  }
  .card-lead .footer {
    height: 132px;
    padding: 8px 16px 10px 16px;
    gap: 6px;
  }
  .card-side .footer {
    height: 132px;
    padding: 8px 14px 10px 14px;
    gap: 5px;
  }
  .card-half .footer {
    height: 114px;
    padding: 7px 14px 8px 14px;
    gap: 4px;
  }
  .pill {
    display: inline-block;
    align-self: flex-start;
    font-family: 'Bahnschrift', 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1.4px;
    color: #FFFFFF;
    padding: 2px 8px;
    border-radius: 2px;
    line-height: 1.25;
  }
  .headline {
    font-family: Georgia, Cambria, 'Times New Roman', serif;
    font-weight: 700;
    color: #FFFFFF;
    line-height: 1.12;
  }
  .card-lead .headline {
    font-size: 29px;
  }
  .card-side .headline {
    font-size: 26.5px;
  }
  .card-half .headline {
    font-size: 25.5px;
  }
  .subhead {
    font-family: 'Bahnschrift', 'Segoe UI', Arial, sans-serif;
    font-weight: 400;
    color: #E5DFD3;
    line-height: 1.22;
  }
  .card-lead .subhead {
    font-size: 18px;
  }
  .card-side .subhead {
    font-size: 17.5px;
  }
  .card-half .subhead {
    font-size: 17.5px;
  }
</style>
</head>
<body>
  <div class="page">
    <header class="masthead">
      <div class="top-rules">
        <div class="rule-thick"></div>
        <div class="rule-crimson"></div>
      </div>
      <div class="masthead-main">
        <div>
          <div class="brand-kicker">DAILY GLOBAL EDITION</div>
          <div class="brand-title">WORLD NEWS</div>
        </div>
        <div class="date-badge">
          <div class="date-day">THURSDAY</div>
          <div class="date-num">19 NOV 2026</div>
        </div>
      </div>
      <div class="rule-bottom"></div>
    </header>

    <main class="grid">
      <section class="row-1">
        <article class="card card-lead">
          <div class="art">
            <img src="${panels.shenzhen}" style="object-position: 50% 44%;" alt="Shenzhen summit" />
          </div>
          <div class="footer">
            <span class="pill" style="background:#B8292F;">ASIA · DIPLOMACY</span>
            <h2 class="headline">Xi, Trump &amp; Putin Meet in Shenzhen</h2>
            <p class="subhead">Rare 3-way APEC talks cover trade, AI rules &amp; arms control</p>
          </div>
        </article>

        <article class="card card-side">
          <div class="art">
            <img src="${panels.anthropic}" alt="Anthropic IPO" />
          </div>
          <div class="footer">
            <span class="pill" style="background:#1B5E3F;">MARKETS · AI</span>
            <h2 class="headline">Anthropic $81.3B IPO</h2>
            <p class="subhead">Record Nasdaq debut (“ANT”) at $83/share</p>
          </div>
        </article>
      </section>

      <section class="row-2">
        <article class="card card-half">
          <div class="art art-berlin">
            <img src="${panels.berlin}" alt="Berlin summit" />
          </div>
          <div class="footer">
            <span class="pill" style="background:#1E3A8A;">EUROPE · SECURITY</span>
            <h2 class="headline">Berlin Ukraine Summit</h2>
            <p class="subhead">Merz, Macron &amp; Burnham align security plan</p>
          </div>
        </article>

        <article class="card card-half">
          <div class="art">
            <img src="${panels.hormuz}" style="object-position: 50% 42%;" alt="Hormuz crisis" />
          </div>
          <div class="footer">
            <span class="pill" style="background:#B45309;">MIDDLE EAST · ENERGY</span>
            <h2 class="headline">Hormuz &amp; Gulf Crisis</h2>
            <p class="subhead">Tanker strikes &amp; drone intercepts; IEA warns</p>
          </div>
        </article>
      </section>

      <section class="row-3">
        <article class="card card-half">
          <div class="art">
            <img src="${panels.cop31}" style="object-position: 50% 53%;" alt="COP31 talks" />
          </div>
          <div class="footer">
            <span class="pill" style="background:#0F766E;">CLIMATE · TÜRKIYE</span>
            <h2 class="headline">COP31 Final-Day Deadlock</h2>
            <p class="subhead">Antalya climate finance &amp; fossil talks stall</p>
          </div>
        </article>

        <article class="card card-half">
          <div class="art">
            <img src="${panels.colombia}" style="object-position: 50% 66%;" alt="Colombia strike" />
          </div>
          <div class="footer">
            <span class="pill" style="background:#9A3412;">AMERICAS · SOCIETY</span>
            <h2 class="headline">Colombia National Strike</h2>
            <p class="subhead">Unions march in Bogotá &amp; Cali on tax bill</p>
          </div>
        </article>
      </section>
    </main>
  </div>
</body>
</html>`;
}

function runPowerShell(script) {
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { stdio: 'inherit' },
  );
}

function normalizeImageAndCompress(rawPngPath, outPath, previewPath) {
  const { width, height } = readPngDimensions(rawPngPath);
  if (width !== TARGET_SIZE || height !== TARGET_SIZE) {
    throw new Error(`Expected ${TARGET_SIZE}x${TARGET_SIZE} screenshot, got ${width}x${height}`);
  }

  const rawSize = statSync(rawPngPath).size;
  if (rawSize <= MAX_BYTES) {
    copyFileSync(rawPngPath, outPath);
  } else {
    let saved = false;
    for (const quality of [92, 90, 88, 86, 82]) {
      const ps = `
        Add-Type -AssemblyName System.Drawing
        $bmp = [System.Drawing.Bitmap]::FromFile('${rawPngPath.replace(/'/g, "''")}')
        try {
          $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
          $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
          $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]${quality})
          $bmp.Save('${outPath.replace(/'/g, "''")}', $codec, $encParams)
        } finally {
          $bmp.Dispose()
        }
      `;
      runPowerShell(ps);
      if (statSync(outPath).size <= MAX_BYTES) {
        saved = true;
        console.log(`Compressed to JPEG quality=${quality} (${statSync(outPath).size} bytes)`);
        break;
      }
    }
    if (!saved) {
      throw new Error('Could not fit entry image within 1 MiB limit.');
    }
  }

  mkdirSync(dirname(previewPath), { recursive: true });
  const psPreview = `
    Add-Type -AssemblyName System.Drawing
    $src = [System.Drawing.Image]::FromFile('${outPath.replace(/'/g, "''")}')
    $dst = New-Object System.Drawing.Bitmap(${PREVIEW_SIZE}, ${PREVIEW_SIZE})
    try {
      $g = [System.Drawing.Graphics]::FromImage($dst)
      try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($src, 0, 0, ${PREVIEW_SIZE}, ${PREVIEW_SIZE})
      } finally {
        $g.Dispose()
      }
      $dst.Save('${previewPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $dst.Dispose()
      $src.Dispose()
    }
  `;
  runPowerShell(psPreview);
}

function main() {
  const { assetsDir, outPath, previewPath } = parseArgs(process.argv.slice(2));
  const panels = {
    shenzhen: loadDataUri(join(assetsDir, 'panel1-shenzhen.jpg')),
    anthropic: loadDataUri(join(assetsDir, 'panel2-anthropic.jpg')),
    berlin: loadDataUri(join(assetsDir, 'panel3-berlin.jpg')),
    hormuz: loadDataUri(join(assetsDir, 'panel4-hormuz.jpg')),
    cop31: loadDataUri(join(assetsDir, 'panel5-cop31.jpg')),
    colombia: loadDataUri(join(assetsDir, 'panel6-colombia.jpg')),
  };

  const workDir = join(tmpdir(), 'makefun-render');
  mkdirSync(workDir, { recursive: true });
  const htmlPath = join(workDir, 'layout.html');
  const rawPngPath = join(workDir, 'raw-1024.png');

  writeFileSync(htmlPath, buildHtml(panels), 'utf8');

  const chrome = findChrome();
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${TARGET_SIZE},${TARGET_SIZE}`,
      `--screenshot=${rawPngPath}`,
      fileUrl,
    ],
    { stdio: 'inherit' },
  );

  mkdirSync(dirname(outPath), { recursive: true });
  normalizeImageAndCompress(rawPngPath, outPath, previewPath);
  const finalSize = statSync(outPath).size;
  console.log(`Built ${outPath} (${finalSize} bytes) and ${previewPath}`);
}

main();
