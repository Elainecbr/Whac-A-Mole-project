(() => {
  const STORAGE_KEY = "wamLeaderboard";
  const PENDING_KEY = "wamPendingScore";
  const MAX_ENTRIES = 10;

  const defaultRanking = [
    { name: "Asterix", score: 512, date: "2019-07-20", avatar: "images/asterix.jpg" },
    { name: "Obelix", score: 265, date: "2002-01-01", avatar: "images/obelix.jpg" },
    { name: "Panoramix", score: 108, date: "2009-06-26", avatar: "images/panoramix.jpg" },
    { name: "Falbala", score: 64, date: "2005-04-02", avatar: "images/falbala.jpg" },
    { name: "Chatorix", score: 32, date: "2010-07-12", avatar: "images/chatotorix.jpg" },
    { name: "Ideafix", score: 16, date: "2014-11-17", avatar: "images/ideafix.jpg" },
    { name: "Veteranix", score: 8, date: "2019-11-12", avatar: "images/veteranix.png" },
    { name: "Naftalina", score: 4, date: "2018-07-25", avatar: "images/naftalina.jpg" },
    { name: "Automatix", score: 2, date: "2004-02-04", avatar: "images/automatix.jpg" },
    { name: "Ielosubmarina", score: 1, date: "2019-07-28", avatar: "images/ielosubmarina.jpg" }
  ];

  const avatarOptions = [
    { label: "Asterix", value: "images/asterix.jpg" },
    { label: "Obelix", value: "images/obelix.jpg" },
    { label: "Panoramix", value: "images/panoramix.jpg" },
    { label: "Falbala", value: "images/falbala.jpg" },
    { label: "Chatorix", value: "images/chatotorix.jpg" },
    { label: "Ideafix", value: "images/ideafix.jpg" },
    { label: "Veteranix", value: "images/veteranix.png" },
    { label: "Naftalina", value: "images/naftalina.jpg" },
    { label: "Automatix", value: "images/automatix.jpg" },
    { label: "Ielosubmarina", value: "images/ielosubmarina.jpg" }
  ];

  const body = document.getElementById("leaderboardBody");
  const form = document.getElementById("scoreForm");
  const sortBy = document.getElementById("sortBy");
  const clearRanking = document.getElementById("clearRanking");
  const avatarSelect = document.getElementById("playerAvatar");

  const bestScore = document.getElementById("bestScore");
  const totalPlayers = document.getElementById("totalPlayers");
  const averageScore = document.getElementById("averageScore");

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function formatDate(dateStr) {
    if (!dateStr) return "--/--/----";
    const dt = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return "--/--/----";
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  }

  function readRanking() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [...defaultRanking];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return [...defaultRanking];
      return parsed;
    } catch {
      return [...defaultRanking];
    }
  }

  function persistRanking(ranking) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ranking.slice(0, MAX_ENTRIES)));
  }

  function sortRanking(items, mode) {
    const ranking = [...items];
    if (mode === "name") {
      ranking.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      return ranking;
    }
    if (mode === "recent") {
      ranking.sort((a, b) => {
        const ad = new Date(`${a.date}T00:00:00`).getTime();
        const bd = new Date(`${b.date}T00:00:00`).getTime();
        return bd - ad;
      });
      return ranking;
    }
    ranking.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt-BR"));
    return ranking;
  }

  function renderStats(ranking) {
    if (!ranking.length) {
      bestScore.textContent = "0";
      totalPlayers.textContent = "0";
      averageScore.textContent = "0";
      return;
    }
    const best = Math.max(...ranking.map(item => Number(item.score) || 0));
    const total = ranking.length;
    const avg = ranking.reduce((acc, cur) => acc + (Number(cur.score) || 0), 0) / total;

    bestScore.textContent = String(best);
    totalPlayers.textContent = String(total);
    averageScore.textContent = String(Math.round(avg));
  }

  function renderTable(ranking) {
    body.innerHTML = "";
    ranking.slice(0, MAX_ENTRIES).forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>${item.score}</td>
        <td>${formatDate(item.date)}</td>
        <td><img src="${item.avatar}" alt="Avatar de ${item.name}" width="36" height="48" loading="lazy"></td>
      `;
      body.appendChild(tr);
    });

    if (!ranking.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td colspan=\"5\">Nenhuma pontuacao ainda. Jogue uma partida para abrir o ranking.</td>";
      body.appendChild(tr);
    }
  }

  function refresh() {
    const ranking = sortRanking(readRanking(), sortBy.value);
    renderTable(ranking);
    renderStats(ranking);
  }

  function populateAvatars() {
    avatarOptions.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      avatarSelect.appendChild(opt);
    });
  }

  function maybeApplyPendingScore() {
    try {
      const pendingRaw = localStorage.getItem(PENDING_KEY);
      if (!pendingRaw) return;
      const pending = JSON.parse(pendingRaw);
      localStorage.removeItem(PENDING_KEY);

      if (!pending || typeof pending !== "object") return;
      if (!pending.name || Number.isNaN(Number(pending.score))) return;

      const ranking = readRanking();
      ranking.push({
        name: String(pending.name).slice(0, 20),
        score: Math.max(0, Number(pending.score)),
        date: pending.date || new Date().toISOString().slice(0, 10),
        avatar: pending.avatar || "images/asterix.jpg"
      });
      persistRanking(sortRanking(ranking, "score"));
    } catch {
      localStorage.removeItem(PENDING_KEY);
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const fd = new FormData(form);
    const name = String(fd.get("playerName") || "").trim();
    const score = Number(fd.get("playerScore") || 0);
    const date = String(fd.get("playerDate") || "");
    const avatar = String(fd.get("playerAvatar") || "images/asterix.jpg");

    if (!name || Number.isNaN(score) || !date) return;

    const ranking = readRanking();
    ranking.push({ name: name.slice(0, 20), score: Math.max(0, score), date, avatar });
    persistRanking(sortRanking(ranking, "score"));

    form.reset();
    document.getElementById("playerDate").value = new Date().toISOString().slice(0, 10);
    refresh();
  });

  sortBy.addEventListener("change", refresh);

  clearRanking.addEventListener("click", () => {
    const accepted = window.confirm("Deseja limpar todo o ranking salvo neste navegador?");
    if (!accepted) return;
    localStorage.removeItem(STORAGE_KEY);
    persistRanking(defaultRanking);
    refresh();
  });

  populateAvatars();
  document.getElementById("playerDate").value = new Date().toISOString().slice(0, 10);
  maybeApplyPendingScore();
  refresh();
})();
