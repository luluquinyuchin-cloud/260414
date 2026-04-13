// ── Radar Hunt — p5.js ──────────────────────────────────────

let cols, tLimit, lives, score, rnd, tLeft, tInterval;
let tCol, tRow;        // 目標格座標
let cW, cH;            // 每格像素大小（正方形）
let hCol = -1, hRow = -1;  // 滑鼠懸停格
let gActive = false;
let palette;
let gameState = 'title'; // 'title' | 'game' | 'win' | 'lose'

const PALETTES = [
  ['#1a1f2e', '#1e2438'],
  ['#1a2020', '#1e2828'],
  ['#201a2a', '#281e34'],
  ['#1e1e1e', '#242424'],
  ['#1a2030', '#202838'],
];

// 雷達動畫用
let radarPulse = 0;

// 閃爍動畫
let flashFrames = 0;
let flashCol = -1, flashRow = -1;
let flashColor = '';
let flashCallback = null;

// 結果顯示
let resultTitle = '';
let resultSub   = '';
let showNextBtn = false;

// ── p5 setup ────────────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Helvetica Neue');
  noStroke();
  frameRate(60);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (gameState === 'game') calcCellSize();
}

// ── p5 draw ─────────────────────────────────────────────────
function draw() {
  background('#0d0d14');

  if      (gameState === 'title') drawTitle();
  else if (gameState === 'game')  drawGame();
  else if (gameState === 'win' || gameState === 'lose') drawOverlay();
}

// ════════════════════════════════════════════════════════════
// TITLE SCREEN
// ════════════════════════════════════════════════════════════
function drawTitle() {
  // 背景格線
  stroke('rgba(255,255,255,0.05)');
  strokeWeight(1);
  for (let x = 0; x < width; x += 48)  line(x, 0, x, height);
  for (let y = 0; y < height; y += 48) line(0, y, width, y);
  noStroke();

  const cx = width / 2;
  const cy = height / 2;

  // 雷達脈衝動畫
  radarPulse += 0.012;
  const rings = 3;
  for (let i = 0; i < rings; i++) {
    const phase = (radarPulse + i * 0.4) % 1;
    const r = lerp(14, 55, phase);
    const a = (1 - phase) * 180;
    stroke(94, 231, 200, a);
    strokeWeight(1);
    noFill();
    circle(cx, cy - 90, r * 2);
  }
  noStroke();

  // 中心點
  fill(94, 231, 200);
  circle(cx, cy - 90, 10);

  // 標題
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(42);
  textStyle(BOLD);
  text('RADAR HUNT', cx, cy - 12);

  // 底線
  fill(94, 231, 200);
  rect(cx - 24, cy + 16, 48, 1.5);

  // 副標題
  fill(94, 231, 200);
  textSize(11);
  textStyle(NORMAL);
  text('掃描  ·  定位  ·  擊中', cx, cy + 34);

  // 難度按鈕
  drawDiffButtons(cx, cy);

  // 說明文字
  fill(255, 255, 255, 90);
  textSize(11);
  text('滑鼠靠近目標格 · 圓圈越大代表越接近', cx, cy + 168);
  text('找到後點擊格子過關 · 三條命耗盡即失敗', cx, cy + 188);
}

function drawDiffButtons(cx, cy) {
  const btns = [
    { label: 'EASY',   sub: '8×8 · 40s',   c: 8,  t: 40, col: color(94, 231, 200) },
    { label: 'NORMAL', sub: '12×12 · 28s',  c: 12, t: 28, col: color(240, 198, 116) },
    { label: 'HARD',   sub: '16×16 · 20s',  c: 16, t: 20, col: color(240, 120, 120) },
  ];
  const bw = 110, bh = 52, gap = 14;
  const startX = cx - (bw * 3 + gap * 2) / 2;
  const by = cy + 68;

  btns.forEach((b, i) => {
    const bx = startX + i * (bw + gap);
    const inside = mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh;

    // 背景
    if (inside) {
      fill(red(b.col), green(b.col), blue(b.col), 28);
    } else {
      fill(0, 0);
    }
    stroke(red(b.col), green(b.col), blue(b.col), inside ? 220 : 140);
    strokeWeight(1);
    rect(bx, by, bw, bh, 4);
    noStroke();

    // 文字
    fill(b.col);
    textAlign(CENTER, CENTER);
    textSize(12);
    textStyle(BOLD);
    text(b.label, bx + bw / 2, by + bh / 2 - 8);
    textSize(10);
    textStyle(NORMAL);
    text(b.sub, bx + bw / 2, by + bh / 2 + 10);

    // 儲存按鈕資訊（給 mousePressed 用）
    b.bx = bx; b.by = by; b.bw = bw; b.bh = bh;
    btns[i] = b;
  });

  // 儲存到全域供 mousePressed 使用
  window._diffBtns = btns;
}

// ════════════════════════════════════════════════════════════
// GAME SCREEN
// ════════════════════════════════════════════════════════════
function startGame(c, t) {
  cols   = c;
  tLimit = t;
  lives  = 3;
  score  = 0;
  rnd    = 0;
  palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  gameState = 'game';
  nextRound();
}

function nextRound() {
  rnd++;
  gActive = true;
  clearInterval(tInterval);
  tLeft = tLimit;
  hCol  = -1;
  hRow  = -1;
  flashFrames = 0;
  tCol = Math.floor(random(cols));
  tRow = Math.floor(random(cols));
  calcCellSize();
  tInterval = setInterval(() => {
    if (!gActive) return;
    tLeft--;
    if (tLeft <= 0) { clearInterval(tInterval); onTimeout(); }
  }, 1000);
}

function calcCellSize() {
  const hudH = 44;
  const availW = width;
  const availH = height - hudH;
  const cellPx = Math.floor(Math.min(availW, availH) / cols);
  cW = cellPx;
  cH = cellPx;
}

function drawGame() {
  calcCellSize();
  const hudH = 44;
  const gw   = cW * cols;
  const gh   = cH * cols;
  const ox   = Math.floor((width  - gw) / 2);
  const oy   = hudH + Math.floor((height - hudH - gh) / 2);

  // HUD
  drawHUD(hudH);

  // 格子
  for (let r = 0; r < cols; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cW;
      const y = oy + r * cH;
      fill((r + c) % 2 === 0 ? palette[0] : palette[1]);
      noStroke();
      rect(x, y, cW, cH);
      stroke(255, 255, 255, 10);
      strokeWeight(1);
      rect(x + 0.5, y + 0.5, cW - 1, cH - 1);
      noStroke();
    }
  }

  // 閃爍動畫
  if (flashFrames > 0) {
    flashFrames--;
    if (flashFrames % 6 < 3 && flashCol >= 0) {
      fill(flashColor);
      noStroke();
      rect(ox + flashCol * cW, oy + flashRow * cH, cW, cH);
    }
    if (flashFrames === 0 && flashCallback) {
      flashCallback();
      flashCallback = null;
    }
  }

  // 雷達圈圈
  if (hCol >= 0 && hRow >= 0 && gActive) {
    const dist  = dist2D(hCol, hRow, tCol, tRow);
    const maxD  = sqrt(2) * (cols - 1);
    const prox  = max(0, 1 - dist / maxD);
    const cx    = ox + hCol * cW + cW / 2;
    const cy    = oy + hRow * cH + cH / 2;
    const maxR  = cW * 0.42;
    const minR  = cW * 0.04;
    const R     = minR + (maxR - minR) * pow(prox, 1.05);
    const alpha = (0.25 + prox * 0.65) * 255;

    noFill();

    // 外光暈圈
    stroke(255, 255, 255, (0.1 + prox * 0.15) * 255);
    strokeWeight(0.5);
    circle(cx, cy, (R + 4) * 2);

    // 主雷達圈
    stroke(94, 231, 200, alpha);
    strokeWeight(1.8);
    circle(cx, cy, R * 2);

    // 中圈（>50%）
    if (prox > 0.5) {
      stroke(94, 231, 200, (prox - 0.5) * 0.9 * 255);
      strokeWeight(1);
      circle(cx, cy, R * 0.55 * 2);
    }

    // 內圈 + 刻度（>75%）
    if (prox > 0.75) {
      stroke(94, 231, 200, (prox - 0.75) * 2.5 * 255);
      strokeWeight(0.8);
      circle(cx, cy, R * 0.22 * 2);

      // 十字刻度
      stroke(94, 231, 200, (prox - 0.75) * 2 * 255);
      strokeWeight(1);
      for (let a = 0; a < 4; a++) {
        const angle = (a / 4) * TWO_PI;
        const ix = cx + cos(angle) * (R + 6);
        const iy = cy + sin(angle) * (R + 6);
        const ex = cx + cos(angle) * (R + 12);
        const ey = cy + sin(angle) * (R + 12);
        line(ix, iy, ex, ey);
      }
    }

    // 中心點（>90%）
    if (prox > 0.9) {
      noStroke();
      fill(94, 231, 200, (prox - 0.9) * 8 * 255);
      circle(cx, cy, 7);
    }

    noStroke();
  }
}

function drawHUD(hudH) {
  // HUD 背景
  fill('#0d0d14');
  noStroke();
  rect(0, 0, width, hudH);
  stroke(94, 231, 200, 38);
  strokeWeight(1);
  line(0, hudH, width, hudH);
  noStroke();

  // 愛心
  const hx = 18;
  const hy = hudH / 2;
  for (let i = 0; i < 3; i++) {
    drawHeart(hx + i * 22, hy, i < lives);
  }

  // 中央文字
  fill(255, 255, 255, 100);
  textAlign(CENTER, CENTER);
  textSize(11);
  textStyle(NORMAL);
  text('ROUND', width / 2 - 38, hy);
  fill(94, 231, 200);
  textStyle(BOLD);
  text(rnd, width / 2 - 10, hy);
  fill(255, 255, 255, 100);
  textStyle(NORMAL);
  text('·  SCORE', width / 2 + 8, hy);
  fill(94, 231, 200);
  textStyle(BOLD);
  text(score, width / 2 + 56, hy);

  // 計時器
  const timerCol = tLeft <= 7 ? color(240, 120, 120) : color(94, 231, 200);
  stroke(red(timerCol), green(timerCol), blue(timerCol), 80);
  strokeWeight(1);
  noFill();
  rect(width - 80, hy - 13, 64, 26, 3);
  noStroke();
  fill(timerCol);
  textAlign(CENTER, CENTER);
  textSize(13);
  textStyle(BOLD);
  text(tLeft + ' s', width - 48, hy);
}

function drawHeart(x, y, filled) {
  const s = 7;
  if (filled) fill(240, 120, 120);
  else { noFill(); stroke(80, 80, 80); strokeWeight(1); }

  beginShape();
  vertex(x, y + s * 0.4);
  bezierVertex(x, y - s * 0.6, x - s, y - s * 0.6, x - s, y);
  bezierVertex(x - s, y + s * 0.5, x, y + s * 1.1, x, y + s * 1.1);
  bezierVertex(x, y + s * 1.1, x + s, y + s * 0.5, x + s, y);
  bezierVertex(x + s, y - s * 0.6, x, y - s * 0.6, x, y + s * 0.4);
  endShape(CLOSE);
  noStroke();
}

// ════════════════════════════════════════════════════════════
// OVERLAY (win / lose)
// ════════════════════════════════════════════════════════════
function drawOverlay() {
  // 繼續畫格子（背景）
  drawGame();

  // 半透明遮罩
  fill(13, 13, 20, 238);
  noStroke();
  rect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;

  // 標題
  const titleCol = gameState === 'win' ? color(94, 231, 200) : color(240, 120, 120);
  fill(titleCol);
  textAlign(CENTER, CENTER);
  textSize(34);
  textStyle(BOLD);
  text(resultTitle, cx, cy - 30);

  // 分隔線
  fill(255, 255, 255, 28);
  rect(cx - 28, cy - 2, 56, 1);

  // 分數文字
  fill(255, 255, 255, 110);
  textSize(12);
  textStyle(NORMAL);
  text(resultSub, cx, cy + 20);

  // 按鈕
  drawOvButton('主選單', cx - (showNextBtn ? 72 : 0), cy + 62, false);
  if (showNextBtn) drawOvButton('下一關 →', cx + 72, cy + 62, true);
}

function drawOvButton(label, x, y, accent) {
  const bw = 120, bh = 38;
  const bx = x - bw / 2, by = y - bh / 2;
  const inside = mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh;
  const col = accent ? color(94, 231, 200) : color(255, 255, 255, 170);

  fill(red(col), green(col), blue(col), inside ? 25 : 0);
  stroke(red(col), green(col), blue(col), inside ? 220 : 120);
  strokeWeight(1);
  rect(bx, by, bw, bh, 3);
  noStroke();
  fill(col);
  textAlign(CENTER, CENTER);
  textSize(11);
  textStyle(BOLD);
  text(label, x, y);
}

// ════════════════════════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════════════════════════
function mouseMoved() {
  if (gameState !== 'game' || !gActive) return;
  const { c, r } = getHoveredCell();
  if (c >= 0 && c < cols && r >= 0 && r < cols) {
    hCol = c; hRow = r;
  } else {
    hCol = -1; hRow = -1;
  }
}

function mousePressed() {
  // 標題選難度
  if (gameState === 'title' && window._diffBtns) {
    for (const b of window._diffBtns) {
      if (mouseX > b.bx && mouseX < b.bx + b.bw &&
          mouseY > b.by && mouseY < b.by + b.bh) {
        startGame(b.c, b.t);
        return;
      }
    }
  }

  // 遊戲中點格子
  if (gameState === 'game' && gActive) {
    const { c, r } = getHoveredCell();
    if (c >= 0 && c < cols && r >= 0 && r < cols) {
      if (c === tCol && r === tRow) onWin();
      else onWrong(c, r);
    }
  }

  // Overlay 按鈕
  if (gameState === 'win' || gameState === 'lose') {
    const cx   = width / 2;
    const cy   = height / 2;
    const bw   = 120, bh = 38;
    const mainX = cx - (showNextBtn ? 72 : 0);
    const nextX = cx + 72;

    // 主選單
    if (mouseX > mainX - bw/2 && mouseX < mainX + bw/2 &&
        mouseY > cy + 62 - bh/2 && mouseY < cy + 62 + bh/2) {
      clearInterval(tInterval);
      gameState = 'title';
    }
    // 下一關
    if (showNextBtn &&
        mouseX > nextX - bw/2 && mouseX < nextX + bw/2 &&
        mouseY > cy + 62 - bh/2 && mouseY < cy + 62 + bh/2) {
      nextRound();
      gameState = 'game';
    }
  }
}

// ════════════════════════════════════════════════════════════
// WIN / LOSE
// ════════════════════════════════════════════════════════════
function onWin() {
  gActive = false;
  clearInterval(tInterval);
  const bonus = max(0, tLeft);
  score += 10 + bonus;
  startFlash(tCol, tRow, 'rgba(94,231,200,0.45)', 4, () => {
    resultTitle  = 'TARGET LOCKED';
    resultSub    = 'SCORE ' + score + '  ·  TIME BONUS +' + bonus;
    showNextBtn  = true;
    gameState    = 'win';
  });
}

function onWrong(c, r) {
  startFlash(c, r, 'rgba(240,120,120,0.45)', 3, () => {});
  lives--;
  if (lives <= 0) {
    gActive = false;
    clearInterval(tInterval);
    setTimeout(() => showLose('MISSED'), 350);
  }
}

function onTimeout() {
  if (!gActive) return;
  gActive = false;
  lives--;
  if (lives <= 0) {
    setTimeout(() => showLose('TIME OUT'), 200);
  } else {
    startFlash(tCol, tRow, 'rgba(94,231,200,0.3)', 6, () => {
      setTimeout(() => nextRound(), 400);
    });
  }
}

function showLose(reason) {
  resultTitle = reason;
  resultSub   = 'FINAL SCORE ' + score + '  ·  SURVIVED ' + (rnd - 1) + ' ROUNDS';
  showNextBtn = false;
  gameState   = 'lose';
}

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════
function getHoveredCell() {
  const hudH = 44;
  const gw   = cW * cols;
  const gh   = cH * cols;
  const ox   = Math.floor((width  - gw) / 2);
  const oy   = hudH + Math.floor((height - hudH - gh) / 2);
  return {
    c: Math.floor((mouseX - ox) / cW),
    r: Math.floor((mouseY - oy) / cH),
  };
}

function startFlash(c, r, col, times, cb) {
  flashCol      = c;
  flashRow      = r;
  flashColor    = col;
  flashFrames   = times * 6;
  flashCallback = cb;
}

function dist2D(c1, r1, c2, r2) {
  return sqrt((c1 - c2) ** 2 + (r1 - r2) ** 2);
}