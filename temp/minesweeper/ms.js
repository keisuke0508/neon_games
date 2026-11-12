/* ==========================================================
   マインスイーパ — デザインモック用エンジン
   ルール・盤面・画面の組み立てを持つ。見た目は ms.css（骨格）と design.html（発掘現場）が担当。
   盤面の大きさと爆弾の数は暫定値（仕様書に記載なし）。
   ========================================================== */
(() => {
  const LEVELS = {
    easy:   { key: 'easy',   name: 'かんたん',   cols: 10, rows: 6,  mines: 8 },
    normal: { key: 'normal', name: 'ふつう',     cols: 14, rows: 8,  mines: 18 },
    hard:   { key: 'hard',   name: 'むずかしい', cols: 18, rows: 10, mines: 35 },
  };
  const STEP_MS = 28;       // 0のマスが連鎖して開くとき、1マス進むごとの遅れ
  const OPEN_MS = 180;      // 1マスが開く演出の長さ

  const ICON = {
    flag: '<svg class="ic ic-flag" viewBox="0 0 24 24" aria-hidden="true"><path class="ic-pole" d="M6 2h2v20H6z"/><path class="ic-cloth" d="M8 3l12 5-12 5z"/><path class="ic-base" d="M3 20h8v2H3z"/></svg>',
    mine: '<svg class="ic ic-mine" viewBox="0 0 24 24" aria-hidden="true"><path class="ic-spike" d="M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4zM15.6 17l1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4-2.8 2.8z"/><circle class="ic-body" cx="12" cy="12" r="6.5"/><circle class="ic-shine" cx="9.6" cy="9.6" r="1.8"/></svg>',
    clock: '<svg class="ic ic-clock" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3h2v5.6l3.7 2.2-1 1.7L11 13.7z"/></svg>',
  };

  const ICON_HOME = '<svg class="ic ic-home" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 11.5l1.3 1.5L5 11.6V21h5.5v-6h3v6H19v-9.4l1.7 1.4 1.3-1.5z"/></svg>';
  const pad = (n) => String(n).padStart(2, '0');
  const hms = (sec) => `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
  const html = String.raw;

  function mount(root, cfg) {
    const L = cfg.labels;
    root.innerHTML = html`
      <div class="ms-bg" aria-hidden="true"><div class="ms-bg__board" data-ms="bgboard"></div></div>

      <div class="ms-top">
        <p class="ms-level" data-ms="level"></p>
        <p class="ms-hint" data-ms="hint"></p>
        <div class="ms-hud">
          <p class="ms-hud__item ms-hud__mines" aria-label="残りの爆弾">${ICON.mine}<b data-ms="mines">0 / 0</b></p>
          <p class="ms-hud__item ms-hud__time" aria-label="経過時間">${ICON.clock}<b data-ms="time">00:00:00</b></p>
          <button type="button" class="ms-home-btn" data-ms="home" aria-label="${L.home}" title="${L.home}">${ICON_HOME}</button>
        </div>
      </div>

      <div class="ms-stage" data-ms="stage">
        <div class="ms-board" data-ms="board" role="grid" aria-label="盤面"></div>
      </div>

      <div class="ms-menu" data-ms="menu" role="menu" hidden></div>

      <div class="ms-banner" data-ms="banner" hidden><p></p></div>

      <div class="ms-layer ms-confirm" data-ms="confirm" role="dialog" aria-modal="true" aria-labelledby="ms-confirm-title" hidden>
        <div class="ms-confirm__panel">
          <p class="ms-confirm__title" id="ms-confirm-title">${L.homeQ}</p>
          <p class="ms-confirm__text">${L.homeNote}</p>
          <div class="ms-confirm__actions">
            <button type="button" class="ms-btn ms-btn--ghost" data-ms="confirm-no">${L.no}</button>
            <button type="button" class="ms-btn ms-btn--danger" data-ms="confirm-yes">${L.yes}</button>
          </div>
        </div>
      </div>

      <div class="ms-layer ms-start" data-ms="start">
        <div class="ms-start__inner" data-ms="start-main">
          ${cfg.startHTML}
          <button type="button" class="ms-btn ms-btn--start" data-ms="start-btn">${L.start}</button>
        </div>
        <div class="ms-start__inner ms-levels" data-ms="levels" hidden>
          <p class="ms-levels__title">${L.chooseLevel}</p>
          ${Object.values(LEVELS).map((lv) => html`<button type="button" class="ms-level-btn ms-level-btn--${lv.key}" data-level="${lv.key}">
            <span class="ms-level-btn__name">${lv.name}</span><span class="ms-level-btn__info">${lv.cols}×${lv.rows}・爆弾 ${lv.mines}</span></button>`).join('')}
        </div>
      </div>

      <div class="result-modal" data-ms="over" role="dialog" aria-modal="true" aria-labelledby="result-title" hidden>
        <div class="result-modal__panel">
          <p class="result-modal__label" id="result-title" data-ms="score-label">クリアタイム</p>
          <p class="result-modal__score"><span data-ms="score">00:00:00</span></p>
          <button type="button" class="result-modal__retry" data-ms="retry">もう1度プレイする</button>
          <div class="result-modal__share" data-share data-text="">
            <p class="share__title">結果をシェア</p>
            <div class="share">
              <button type="button" class="share__btn" data-share-to="x"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h4.6l4.4 6.1L17.2 3H20l-6.8 8 7.3 10h-4.6l-4.8-6.6L5.4 21H2.6l7.3-8.6z"/></svg><span class="share__label">ポスト</span></button>
              <button type="button" class="share__btn" data-share-to="line"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.6 2 11c0 3.9 3.5 7.2 8.3 7.9l-.6 2.8 3.5-2.7C18.3 18.6 22 15.2 22 11c0-4.4-4.5-8-10-8z"/></svg><span class="share__label">LINE</span></button>
              <button type="button" class="share__btn" data-share-to="facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4 1.8-4 4.3V10H7v4h3v8h4v-8h3l1-4h-4V8.6c0-.4.2-.6.6-.6z"/></svg><span class="share__label">Facebook</span></button>
              <button type="button" class="share__btn" data-share-to="copy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 1.4 1.4 1-1a2 2 0 0 1 2.9 2.9l-3 3a2 2 0 0 1-2.9 0zm4-4a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1-1.4-1.4-1 1a2 2 0 0 1-2.9-2.9l3-3a2 2 0 0 1 2.9 0z"/></svg><span class="share__label">URLをコピー</span></button>
            </div>
          </div>
        </div>
      </div>`;

    const $ = (k) => root.querySelector(`[data-ms="${k}"]`);
    const speed = location.hash.includes('fast') ? 0.1 : 1;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms * speed));
    let g = null;           // ゲームの状態
    let timerId = 0;
    let menuFor = null;     // メニューを開いているマスの番号

    // ---------- 盤面 ----------
    const nbrs = (i) => {
      const { cols, rows } = g.lv; const x = i % cols, y = Math.floor(i / cols); const out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
      }
      return out;
    };
    function newGame(levelKey) {
      const lv = LEVELS[levelKey];
      g = { lv, cells: Array.from({ length: lv.cols * lv.rows }, () => ({ mine: false, open: false, flag: false, n: 0 })),
        placed: false, over: false, startAt: 0, elapsed: 0, opened: 0, busy: false };
      clearInterval(timerId);
      root.style.setProperty('--cols', lv.cols); root.style.setProperty('--rows', lv.rows);
      root.dataset.difficulty = lv.key;
      $('level').textContent = lv.name;
      $('time').textContent = hms(0);
      renderBoard();
      updateMines();
      hint(L.firstHint);
      closeMenu();
      $('over').hidden = true;
      root.dataset.state = 'ready';
    }
    function placeMines(safe) {
      const avoid = new Set([safe, ...nbrs(safe)]);
      const pool = g.cells.map((_, i) => i).filter((i) => !avoid.has(i));
      for (let k = 0; k < g.lv.mines; k++) { const j = k + Math.floor(Math.random() * (pool.length - k)); [pool[k], pool[j]] = [pool[j], pool[k]]; g.cells[pool[k]].mine = true; }
      g.cells.forEach((c, i) => { c.n = nbrs(i).filter((j) => g.cells[j].mine).length; });
      g.placed = true;
    }
    function renderBoard() {
      const b = $('board');
      b.innerHTML = g.cells.map((_, i) => `<button type="button" class="ms-cell" data-i="${i}" aria-label="${cellLabel(i)}"></button>`).join('');
    }
    function cellLabel(i) {
      const c = g.cells[i], x = i % g.lv.cols + 1, y = Math.floor(i / g.lv.cols) + 1;
      const st = c.open ? (c.mine ? '爆弾' : (c.n ? `数字${c.n}` : '空き')) : (c.flag ? '旗' : '未開封');
      return `${y}行${x}列 ${st}`;
    }
    const cellEl = (i) => $('board').children[i];
    function paint(i) {
      const c = g.cells[i], el = cellEl(i);
      el.classList.toggle('is-open', c.open);
      el.classList.toggle('is-flag', c.flag && !c.open);
      el.dataset.n = c.open && !c.mine ? c.n : '';
      el.innerHTML = c.open ? (c.mine ? ICON.mine : (c.n ? `<span>${c.n}</span>` : '')) : (c.flag ? ICON.flag : '');
      el.setAttribute('aria-label', cellLabel(i));
    }
    function updateMines() {
      const flags = g.cells.filter((c) => c.flag).length;
      const left = g.lv.mines - flags;
      $('mines').textContent = `${left} / ${g.lv.mines}`;
      $('mines').parentElement.classList.toggle('is-over', left < 0);
    }
    function hint(t) { $('hint').textContent = t || ''; }

    // ---------- 掘る（0のマスは周りへ連鎖。遠いマスほど遅れて開く） ----------
    async function dig(starts) {
      const order = []; const seen = new Set(); let q = [];
      starts.forEach((i) => { if (!g.cells[i].open && !g.cells[i].flag) { q.push([i, 0]); seen.add(i); } });
      while (q.length) {
        const nq = [];
        for (const [i, d] of q) {
          order.push([i, d]);
          const c = g.cells[i];
          if (!c.mine && c.n === 0) nbrs(i).forEach((j) => { const cj = g.cells[j]; if (!seen.has(j) && !cj.open && !cj.flag) { seen.add(j); nq.push([j, d + 1]); } });
        }
        q = nq;
      }
      let maxD = 0;
      for (const [i, d] of order) {
        const c = g.cells[i]; c.open = true; if (!c.mine) g.opened++;
        maxD = Math.max(maxD, d);
        const el = cellEl(i); el.style.setProperty('--d', `${d * STEP_MS * speed}ms`);
        paint(i); el.classList.add('is-popping');
      }
      const boom = order.find(([i]) => g.cells[i].mine);
      await sleep(maxD * STEP_MS + OPEN_MS);
      order.forEach(([i]) => cellEl(i).classList.remove('is-popping'));
      return boom ? boom[0] : -1;
    }

    // ---------- 時間 ----------
    function startTimer() {
      g.startAt = performance.now();
      const tick = () => { g.elapsed = Math.floor((performance.now() - g.startAt) / 1000 * (1 / speed)); $('time').textContent = hms(g.elapsed); };
      tick(); timerId = setInterval(tick, 250);
    }
    function resumeTimer() {
      const tick = () => { g.elapsed = Math.floor((performance.now() - g.startAt) / 1000 * (1 / speed)); $('time').textContent = hms(g.elapsed); };
      tick(); timerId = setInterval(tick, 250);
    }
    function stopTimer() { clearInterval(timerId); if (g.startAt) { g.elapsed = Math.floor((performance.now() - g.startAt) / 1000 * (1 / speed)); $('time').textContent = hms(g.elapsed); } }

    // ---------- 選択メニュー（掘る / 旗を置く / キャンセル） ----------
    function openMenu(i) {
      const c = g.cells[i];
      let items;
      if (!c.open && !c.flag) items = [['dig', L.dig, 'primary'], ['flag', L.flag, 'flag'], ['cancel', L.cancel, 'ghost']];
      else if (c.flag) items = [['unflag', L.unflag, 'flag'], ['cancel', L.cancel, 'ghost']];
      else items = [['chord', L.dig, 'primary'], ['cancel', L.cancel, 'ghost']];
      menuFor = i;
      const m = $('menu');
      m.innerHTML = items.map(([a, t, k]) => `<button type="button" class="ms-menu__btn ms-menu__btn--${k}" data-act="${a}" role="menuitem">${t}</button>`).join('');
      m.hidden = false;
      root.querySelectorAll('.ms-cell.is-target, .ms-cell.is-around').forEach((e) => e.classList.remove('is-target', 'is-around'));
      cellEl(i).classList.add('is-target');
      if (c.open) nbrs(i).forEach((j) => { if (!g.cells[j].open && !g.cells[j].flag) cellEl(j).classList.add('is-around'); });
      // 選んだマスの上に出す。上に入らなければ下に。左右は GameFrame の内側に収める
      // 数字のマスを選んだときは、周りの3×3を隠さないよう、その外側に出す
      const rr = root.getBoundingClientRect(), mr = m.getBoundingClientRect();
      const box = (c.open ? [i, ...nbrs(i)] : [i]).map((j) => cellEl(j).getBoundingClientRect());
      const cr = { left: cellEl(i).getBoundingClientRect().left, width: cellEl(i).getBoundingClientRect().width,
        top: Math.min(...box.map((r) => r.top)), bottom: Math.max(...box.map((r) => r.bottom)) };
      let left = cr.left - rr.left + cr.width / 2 - mr.width / 2;
      left = Math.max(8, Math.min(rr.width - mr.width - 8, left));
      // 上に出すと右上の表示（爆弾の数・時間）に重なる場合は、下に出す
      const minTop = $('stage').getBoundingClientRect().top - rr.top;
      let top = cr.top - rr.top - mr.height - 8;
      const below = top < minTop;
      m.classList.toggle('is-below', below);
      if (below) top = cr.bottom - rr.top + 8;
      m.style.left = `${left}px`; m.style.top = `${top}px`;
      m.style.setProperty('--arrow', `${cr.left - rr.left + cr.width / 2 - left}px`);
      m.querySelector('button').focus({ preventScroll: true });
    }
    // ---------- スタート画面に戻る ----------
    function goStart() {
      closeMenu(); clearInterval(timerId); timerId = 0; pausedAt = 0;
      $('confirm').hidden = true;
      if (g) g.over = true;
      $('over').hidden = true; $('banner').hidden = true;
      root.classList.remove('is-cleared', 'is-shake');
      $('start').hidden = false; $('start-main').hidden = false; $('levels').hidden = true;
      root.dataset.state = 'start';
      $('start-btn').focus({ preventScroll: true });
    }
    // 「もう1度プレイする」：難易度選択に戻る
    function goLevels() {
      goStart();
      $('start-main').hidden = true; $('levels').hidden = false;
      root.querySelector('[data-level]').focus({ preventScroll: true });
    }
    // 確認モーダル。開いている間は経過時間を止め、「いいえ」で閉じたら止めた分を差し引いて再開する
    let pausedAt = 0;
    function askHome() {
      closeMenu();
      if (timerId && g.startAt) { pausedAt = performance.now(); clearInterval(timerId); timerId = 0; }
      $('confirm').hidden = false;
      $('confirm-no').focus({ preventScroll: true });
    }
    function closeConfirm() {
      $('confirm').hidden = true;
      if (pausedAt) { g.startAt += performance.now() - pausedAt; pausedAt = 0; resumeTimer(); }
      $('home').focus({ preventScroll: true });
    }

    function closeMenu() {
      $('menu').hidden = true;
      root.querySelectorAll('.ms-cell.is-target, .ms-cell.is-around').forEach((e) => e.classList.remove('is-target', 'is-around'));
      const back = menuFor; menuFor = null;
      return back;
    }
    // 数字のマス：周りの旗の数が数字と同じで、まだ開いていないマスがあるときだけ選べる
    const canChord = (i) => { const c = g.cells[i]; if (!c.open || !c.n) return false; const ns = nbrs(i);
      return ns.filter((j) => g.cells[j].flag).length === c.n && ns.some((j) => !g.cells[j].open && !g.cells[j].flag); };

    async function act(a) {
      const i = closeMenu();
      if (a === 'cancel' || i === null) { if (i !== null) cellEl(i).focus({ preventScroll: true }); return; }
      if (a === 'flag' || a === 'unflag') { g.cells[i].flag = a === 'flag'; paint(i); cellEl(i).classList.add('is-flagging'); setTimeout(() => cellEl(i).classList.remove('is-flagging'), 300); updateMines(); cellEl(i).focus({ preventScroll: true }); return; }
      g.busy = true;
      const boom = await dig(a === 'chord' ? nbrs(i) : [i]);
      g.busy = false;
      if (boom >= 0) return lose(boom);
      if (g.opened === g.cells.length - g.lv.mines) return win();
      cellEl(i).focus({ preventScroll: true });
    }

    // ---------- 終わり ----------
    async function lose(at) {
      const me = g; const gone = () => g !== me || root.dataset.state === 'start';
      g.over = true; stopTimer(); root.dataset.state = 'over-anim';
      cellEl(at).classList.add('is-boom');
      root.classList.add('is-shake'); setTimeout(() => root.classList.remove('is-shake'), 500);
      await sleep(450);
      const rest = g.cells.map((c, i) => i).filter((i) => g.cells[i].mine && i !== at && !g.cells[i].flag);
      rest.forEach((i, k) => setTimeout(() => { g.cells[i].open = true; paint(i); cellEl(i).classList.add('is-reveal'); }, k * 40 * speed));
      g.cells.forEach((c, i) => { if (c.flag && !c.mine) cellEl(i).classList.add('is-wrong'); });
      await sleep(rest.length * 40 + 400);
      if (gone()) return;
      await banner(L.lose, 1300, 'is-lose');
      if (gone()) return;
      showResult(false);
    }
    async function win() {
      const me = g; const gone = () => g !== me || root.dataset.state === 'start';
      g.over = true; stopTimer(); root.dataset.state = 'over-anim';
      g.cells.forEach((c, i) => { if (c.mine && !c.flag) { c.flag = true; paint(i); } });
      updateMines();
      root.classList.add('is-cleared');
      await sleep(500);
      if (gone()) return;
      await banner(L.win, 1300, 'is-win');
      if (gone()) return;
      showResult(true);
    }
    async function banner(text, ms, cls) {
      const b = $('banner'); b.className = `ms-banner ${cls}`; b.querySelector('p').innerHTML = text; b.hidden = false;
      await sleep(ms); b.hidden = true;
    }
    function showResult(cleared) {
      root.dataset.state = 'over';
      const t = hms(g.elapsed);
      $('score-label').textContent = cleared ? `クリアタイム（${g.lv.name}）` : `ゲームオーバー（${g.lv.name}）`;
      $('score').textContent = t;
      $('over').querySelector('[data-share]').dataset.text = cleared ? `マインスイーパ（${g.lv.name}）を ${t} でクリア！ #NEON_GAMES` : `マインスイーパ（${g.lv.name}）で ${t} 粘ったけど爆発…！ #NEON_GAMES`;
      $('over').hidden = false;
      $('retry').focus();
    }

    // ---------- 入力 ----------
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('button');
      if (!t) { if (!$('menu').hidden) closeMenu(); return; }
      if (t.dataset.ms === 'home') return askHome();
      if (t.dataset.ms === 'confirm-yes') return goStart();
      if (t.dataset.ms === 'confirm-no') return closeConfirm();
      if (t.dataset.ms === 'start-btn') { $('start-main').hidden = true; $('levels').hidden = false; root.querySelector('[data-level]').focus(); return; }
      if (t.dataset.level) { $('start').hidden = true; newGame(t.dataset.level); return; }
      if (t.dataset.ms === 'retry') return goLevels();
      if (t.dataset.act) return act(t.dataset.act);
      if (!t.classList.contains('ms-cell') || !g || g.over || g.busy) return;
      const i = +t.dataset.i;
      if (!$('menu').hidden) { const was = closeMenu(); if (was === i) return; }
      // 最初の1手：メニューを出さずに、すぐ掘る（そのマスと周りには爆弾を置かない）
      if (!g.placed) {
        placeMines(i); hint(''); root.dataset.state = 'play';
        g.busy = true; await dig([i]); g.busy = false;
        startTimer();                                   // 開け終わってから計測を始める
        if (g.opened === g.cells.length - g.lv.mines) win();
        return;
      }
      const c = g.cells[i];
      if (c.open && !canChord(i)) { t.classList.remove('is-nope'); void t.offsetWidth; t.classList.add('is-nope'); return; }
      openMenu(i);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('confirm').hidden) { closeConfirm(); return; }
      if (e.key === 'Escape' && !$('menu').hidden) { const i = closeMenu(); if (i !== null) cellEl(i).focus(); }
      // 盤面の中を矢印キーで移動
      const t = e.target.closest && e.target.closest('.ms-cell');
      if (t && /^Arrow/.test(e.key) && $('menu').hidden) {
        const i = +t.dataset.i, { cols } = g.lv, n = g.cells.length;
        const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
        const j = i + d; if (j >= 0 && j < n && !(d === 1 && j % cols === 0) && !(d === -1 && i % cols === 0)) { e.preventDefault(); cellEl(j).focus(); }
      }
    });

    // ---------- スタート画面の背景：マインスイーパらしい盤面の模様 ----------
    (() => {
      const cols = 22, rows = 12; const bg = $('bgboard');
      bg.style.setProperty('--bgcols', cols);
      const mines = new Set(); while (mines.size < 30) mines.add(Math.floor(Math.random() * cols * rows));
      const cnt = (i) => { const x = i % cols, y = Math.floor(i / cols); let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < cols && ny < rows && mines.has(ny * cols + nx)) n++; } return n; };
      const cx = cols / 2, cy = rows / 2;
      bg.innerHTML = Array.from({ length: cols * rows }, (_, i) => {
        const x = i % cols, y = Math.floor(i / cols); const dist = Math.hypot((x - cx) / 1.6, y - cy);
        const open = dist < 4.2 + Math.sin(x * 1.3 + y) * 1.2 && !mines.has(i);
        if (open) { const n = cnt(i); return `<span class="ms-cell is-open" data-n="${n}">${n ? `<span>${n}</span>` : ''}</span>`; }
        return `<span class="ms-cell ${mines.has(i) && Math.random() < 0.5 ? 'is-flag' : ''}">${mines.has(i) && Math.random() < 0.5 ? ICON.flag : ''}</span>`;
      }).join('');
    })();
    root.dataset.state = 'start';

    // モック確認用：#levels で難易度選択、#play-normal などで盤面、#over でクリア後のモーダル
    const h = location.hash;
    if (h.includes('levels')) { $('start-main').hidden = true; $('levels').hidden = false; }
    const m = h.match(/play-(easy|normal|hard)/);
    if (m) { $('start').hidden = true; newGame(m[1]); }
    if (h.includes('over')) { $('start').hidden = true; newGame('normal'); g.elapsed = 83; showResult(true); }
    root._ms = { get g() { return g; }, LEVELS };
  }

  // ---------- ShareButtons（共通コンポーネントのモック） ----------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-share-to]');
    if (!btn) return;
    const text = btn.closest('[data-share]').dataset.text;
    const url = location.href.split('#')[0];
    const enc = encodeURIComponent;
    const to = btn.dataset.shareTo;
    if (to === 'copy') {
      navigator.clipboard?.writeText(`${text} ${url}`).then(() => {
        const label = btn.querySelector('.share__label'); const prev = label.textContent;
        label.textContent = 'コピーしました'; setTimeout(() => { label.textContent = prev; }, 1600);
      });
      return;
    }
    const map = {
      x: `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`,
      line: `https://social-plugins.line.me/lineit/share?url=${enc(url)}&text=${enc(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    };
    window.open(map[to], '_blank', 'noopener,width=600,height=560');
  });

  window.Minesweeper = { mount };
})();
