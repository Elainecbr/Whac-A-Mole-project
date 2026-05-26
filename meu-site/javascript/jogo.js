 // ====== CONFIGURAÇÃO ======
  const GAME_DURATION_S = 30;            // duração do jogo (sugestão: 60s)
  const SPAWN_INTERVAL_MS = 700;         // intervalo entre “rodadas” de surgimento
  const MOLE_VISIBLE_MS = 600;           // tempo que cada toupeira fica visível
  const MAX_SIMULT_MOLES = 2;            // ocasionalmente 1 ou 2 ao mesmo tempo
  const DIGITS_PATH = "images/caractere_"; // prefixo dos dígitos (0..9).gif
  const MOLE_IMG = "images/mole2.png";    // troque para .gif se preferir animado
  const PENDING_KEY = "wamPendingScore";
  const avatarPool = [
    "images/asterix.jpg",
    "images/obelix.jpg",
    "images/panoramix.jpg",
    "images/falbala.jpg",
    "images/chatotorix.jpg",
    "images/ideafix.jpg",
    "images/veteranix.png",
    "images/naftalina.jpg",
    "images/automatix.jpg",
    "images/ielosubmarina.jpg"
  ];
  const stopBtn = document.getElementById("stop");
  // ====== ELEMENTOS ======
  const cells = Array.from(document.querySelectorAll(".holes .hole-cell"));
  const startBtn = document.getElementById("start");

  // Placar: IDs dos <td> com três <img> cada (sem espaço entre as tags!)
  const ui = {
    acertos: document.getElementById("acertos"),
    perdidos: document.getElementById("perdidos"),
    errados:  document.getElementById("errados"),
    saldo:    document.getElementById("saldo"),
  };

  // ====== ESTADO ======
  let running = false;
  let t0 = 0;
  let timerId = null;
  let spawnId = null;
  let timeLeft = GAME_DURATION_S;

  let score = {
    acertos: 0,
    perdidos: 0,
    errados: 0,
    saldo: 0
  };

  // Moles ativas por índice da célula -> timeoutId de sumir
  const active = new Map();

  // ====== PREPARO: cria uma <img class="mole"> em cada célula ======
  cells.forEach((td, idx) => {
    const mole = document.createElement("img");
    mole.src = MOLE_IMG;
    mole.alt = "toupeira";
    mole.className = "mole";
    td.appendChild(mole);

    // Clique na célula = tentativa
    td.addEventListener("click", () => {
      if (!running) return;

      // Dentro do clique no buraco
if (active.has(idx)) {
  clearTimeout(active.get(idx));
  active.delete(idx);
  hideMole(td);

  // ACERTO vale 10 pontos
  score.acertos += 10;
  updateSaldo();
  renderAll();
} else {
  // ERRO vale 10 pontos
  score.errados += 10;
  updateSaldo();
  renderAll();
}
      
    });
  });

  // ====== START ======
  startBtn.addEventListener("click", () => {
    if (running) return;  // evita reiniciar no meio
    startGame();
  });
   // ====== STOP ======

   stopBtn.addEventListener("click", () => {
  if (!stopBtn.disabled) {
    stopGame({ saveResult: true, reason: "manual" });
  }
});
  function startGame() {
    // reset
    running = true;
    Object.assign(score, { acertos:0, perdidos:0, errados:0, saldo:0 });
    renderAll();

    // UI
    startBtn.classList.add("running");
    startBtn.textContent = "JOGANDO...";
    document.body.classList.add("hammer-cursor");

    // tempo
    timeLeft = GAME_DURATION_S;
    t0 = performance.now();
    timerId = requestAnimationFrame(tick);

    // spawner de toupeiras
    spawnId = setInterval(spawnRound, SPAWN_INTERVAL_MS);
    stopBtn.disabled = false;
    stopBtn.classList.add("enabled");
    document.body.classList.add("game-running"); // ativa animação da mascotinha
  }

  function stopGame(options = {}) {
    const { saveResult = false, reason = "manual" } = options;
    const finalSaldo = score.saldo;

    if (!running) return;
    running = false;
    startBtn.classList.remove("running", "almost-over");
    startBtn.textContent = "START";

    // limpa mole(s) ativa(s)
    active.forEach(timeoutId => clearTimeout(timeoutId));
    active.clear();
    cells.forEach(hideMole);

    // timers
    if (spawnId) clearInterval(spawnId);
    spawnId = null;
    if (timerId) cancelAnimationFrame(timerId);
    timerId = null;

    document.body.classList.remove("hammer-cursor");
    stopBtn.disabled = true;
    stopBtn.classList.remove("enabled");
    document.body.classList.remove("game-running"); // pausa animação da mascotinha

    if (saveResult) {
      savePendingScore(finalSaldo, reason);
    }
  }

  // ====== Relógio do jogo ======
  function tick(now) {
    if (!running) return;

    const elapsed = (now - t0) / 1000;
    timeLeft = Math.max(0, GAME_DURATION_S - elapsed);

    // muda estado visual do botão nos últimos 15s
    if (timeLeft <= 15) startBtn.classList.add("almost-over");

    if (timeLeft <= 0.02) {
      stopGame({ saveResult: true, reason: "timeout" });
      return;
    }
    timerId = requestAnimationFrame(tick);
  }

  function pickAvatar(name) {
    const clean = (name || "").trim();
    if (!clean) return avatarPool[0];
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash + clean.charCodeAt(i) * (i + 1)) % avatarPool.length;
    }
    return avatarPool[hash];
  }

  function savePendingScore(finalSaldo, reason) {
    const safeScore = Math.max(0, Math.round(finalSaldo));
    const timeMessage = reason === "timeout" ? "Tempo esgotado!" : "Partida encerrada!";
    const suggested = `Jogador-${Math.floor(Math.random() * 90) + 10}`;
    const playerName = window.prompt(`${timeMessage} Digite seu nome para salvar no ranking:`, suggested);

    if (!playerName || !playerName.trim()) return;

    const payload = {
      name: playerName.trim().slice(0, 20),
      score: safeScore,
      date: new Date().toISOString().slice(0, 10),
      avatar: pickAvatar(playerName)
    };

    localStorage.setItem(PENDING_KEY, JSON.stringify(payload));

    const shouldOpenRanking = window.confirm(`Pontuacao ${safeScore} salva. Abrir a pagina de recordes agora?`);
    if (shouldOpenRanking) {
      window.location.href = "recordes.html";
    }
  }

  // ====== Spawner de toupeiras ======
  function spawnRound() {
    if (!running) return;

    // escolhe quantas toupeiras (1 ou 2) aleatoriamente
    const n = Math.random() < 0.4 ? 2 : 1;
    const freeIdxs = cells
      .map((_, i) => i)
      .filter(i => !active.has(i));

    if (freeIdxs.length === 0) return;

    shuffleInPlace(freeIdxs);
    const chosen = freeIdxs.slice(0, Math.min(n, freeIdxs.length));

    chosen.forEach(idx => {
      const td = cells[idx];
      showMole(td);

      // agenda para sumir sozinha
      const timeoutId = setTimeout(() => {
        // se ainda está ativa e não foi clicada -> PERDIDA
        if (active.has(idx)) {
          active.delete(idx);
          hideMole(td);
          score.perdidos++;
          updateSaldo();
          renderAll();
        }
      }, MOLE_VISIBLE_MS);

      active.set(idx, timeoutId);
    });
  }

  // ====== Mostrar/Esconder toupeira ======
  function showMole(td) {
    const mole = td.querySelector(".mole");
    mole.classList.add("show");
  }
  function hideMole(td) {
    const mole = td.querySelector(".mole");
    mole.classList.remove("show");
  }

  // ====== Util: embaralhar ======
  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ====== Placar: renderiza 000–999 por imagens ======
  function renderAll() {
    renderDigits("acertos", score.acertos);
    renderDigits("perdidos", score.perdidos);
    renderDigits("errados",  score.errados);
    renderDigits("saldo",    score.saldo);
  }

  // saldo: hits - (errados + perdidos)  → se preferir “soma de tudo”, mude aqui
  function updateSaldo() {
    score.saldo = score.acertos - (score.errados + score.perdidos);
  }

  function renderDigits(containerId, value) {
    const td = ui[containerId];
    if (!td) return;

    // garante 3 dígitos com zero à esquerda, clamp entre -99 e 999
    const v = Math.max(-99, Math.min(999, value));
    const isNeg = v < 0;
    const s = Math.abs(v).toString().padStart(3, "0");

    // espera exatamente 3 <img> dentro do <td>
    const imgs = td.querySelectorAll("img");
    if (imgs.length < 3) return;

    // negativo? opcionalmente, mostra “-” no primeiro dígito
    if (isNeg) {
      // se existir caractere '-' como imagem, use: images/caractere_menos.gif
      // caso não exista, usa 0 mesmo e deixa negativo apenas no cálculo
      imgs[0].src = DIGITS_PATH + s[0] + ".gif";
    } else {
      imgs[0].src = DIGITS_PATH + s[0] + ".gif";
    }
    imgs[1].src = DIGITS_PATH + s[1] + ".gif";
    imgs[2].src = DIGITS_PATH + s[2] + ".gif";
  }

  renderAll();

