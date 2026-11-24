
    // Dados dos veículos: a lista abaixo é um array JSON válido.
    const TANKS = window.WMK_TANKS;

    const CLASS_LABELS = {
      light: "Leve",
      medium: "Médio",
      heavy: "Pesado",
      td: "Caça-tanques",
      spg: "AAP · Artilharia autopropulsada"
    };

    const CLASS_ICONS = {
      light: "◈",
      medium: "◉",
      heavy: "⬟",
      td: "▰",
      spg: "⌖"
    };

    const ROLE_TEXT = {
      light: "Reconhecimento rápido, mobilidade alta e boa visão.",
      medium: "Versátil: equilibra mobilidade, blindagem e poder de fogo.",
      heavy: "Blindagem e durabilidade para enfrentar a linha de frente.",
      td: "Caça-tanques: canhão potente e boa precisão à distância.",
      spg: "AAP: use a mira estratégica para atingir alvos pelo mapa."
    };

    const ROMAN = ["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
    let WORLD_W = 2200;
    let WORLD_H = 1500;
    const SAVE_KEY = "WMK TankWar-blindados-save-v1";

    const DEFAULT_STATE = {
      credits: 32000,
      xp: 1500,
      battles: 0,
      wins: 0,
      selectedTank: "l1",
      owned: { l1: true },
      researched: {},
      modulesOwned: {},
      modulesEquipped: {}
    };

    function loadState() {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
        return {
          ...DEFAULT_STATE,
          ...saved,
          owned: { ...DEFAULT_STATE.owned, ...(saved.owned || {}) },
          researched: saved.researched || {},
          modulesOwned: saved.modulesOwned || {},
          modulesEquipped: saved.modulesEquipped || {}
        };
      } catch {
        return { ...DEFAULT_STATE };
      }
    }

    let state = loadState();
    if (!TANKS.some(t => t.id === state.selectedTank)) state.selectedTank = "l1";
    if (!state.owned.l1) state.owned.l1 = true;

    let currentPage = "garage";
    let game = null;
    let loopRunning = false;
    let lastFrame = 0;
    let pressedKeys = {};
    let toastTimer = null;
    let battleMessageTimer = null;

    const $ = id => document.getElementById(id);
    const formatNumber = n => new Intl.NumberFormat("pt-BR").format(Math.round(n));
    const getTank = id => TANKS.find(t => t.id === id);
    const isOwned = id => !!state.owned[id];
    const isResearched = id => !!state.researched[id];

    function saveState() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
      renderWallet();
    }

    function notify(message) {
      const el = $("toast");
      el.textContent = message;
      el.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
    }

    function renderWallet() {
      $("creditsValue").textContent = formatNumber(state.credits);
      $("xpValue").textContent = formatNumber(state.xp);
      $("battlesValue").textContent = formatNumber(state.battles);
    }

    function moduleConfig(tank) {
      const tier = tank.tier;
      return [
        {
          slot: "motor",
          title: "Motor",
          options: [
            { id: "motor-stock", name: "Motor de fábrica", price: 0, detail: "Configuração padrão", effects: {} },
            { id: "motor-tuned", name: "Motor preparado", price: 3500 + tier * 1800, detail: "+8 km/h · +3 mobilidade", effects: { speed: 8, turn: 3 } }
          ]
        },
        {
          slot: "gun",
          title: "Canhão",
          options: [
            { id: "gun-stock", name: "Canhão padrão", price: 0, detail: "Configuração padrão", effects: {} },
            { id: "gun-pressure", name: "Cano de alta pressão", price: 4800 + tier * 2200, detail: "+14% dano · +15 pen. · +0,3 s recarga", effects: { damage: Math.round(tank.stats.damage * .14), pen: 15, reload: .3 } }
          ]
        },
        {
          slot: "turret",
          title: "Torre",
          options: [
            { id: "turret-stock", name: "Torre padrão", price: 0, detail: "Configuração padrão", effects: {} },
            { id: "turret-reinforced", name: "Torre reforçada", price: 4200 + tier * 2300, detail: "+8% HP · +14 blindagem · +15 visão", effects: { hp: Math.round(tank.stats.hp * .08), armor: 14, view: 15 } }
          ]
        },
        {
          slot: "tracks",
          title: "Suspensão",
          options: [
            { id: "tracks-stock", name: "Suspensão padrão", price: 0, detail: "Configuração padrão", effects: {} },
            { id: "tracks-wide", name: "Lagartas reforçadas", price: 3000 + tier * 1600, detail: "+2 km/h · +8 mobilidade", effects: { speed: 2, turn: 8 } }
          ]
        },
        {
          slot: "radio",
          title: "Rádio",
          options: [
            { id: "radio-stock", name: "Rádio padrão", price: 0, detail: "Configuração padrão", effects: {} },
            { id: "radio-long", name: "Rádio de longo alcance", price: 2600 + tier * 1400, detail: "+60 m de visão", effects: { view: 60 } }
          ]
        }
      ];
    }

    function effectiveStats(tank) {
      const result = { ...tank.stats };
      const equipped = state.modulesEquipped[tank.id] || {};

      for (const group of moduleConfig(tank)) {
        const selectedId = equipped[group.slot] || group.options[0].id;
        const option = group.options.find(o => o.id === selectedId) || group.options[0];
        for (const [key, value] of Object.entries(option.effects)) {
          result[key] = (result[key] || 0) + value;
        }
      }

      result.reload = Math.max(1, result.reload);
      return result;
    }

    function tankThumb(t) {
      const long=t.class==="spg"?52:t.class==="heavy"?49:42;
      return '<svg viewBox="0 0 100 50" aria-hidden="true"><ellipse cx="48" cy="42" rx="40" ry="4" fill="#0007"/><rect x="12" y="28" width="'+(long+20)+'" height="13" rx="6" fill="#161c17" stroke="#829078"/>'+Array.from({length:5},(_,i)=>'<circle cx="'+(20+i*12)+'" cy="34" r="5" fill="#65715e" stroke="#252c25"/>').join("")+'<path d="M12 28 L20 18 H70 L83 28 Z" fill="'+t.color+'" stroke="#bbc4aa"/><path d="M32 18 L39 9 H59 L69 18 Z" fill="'+t.color+'" stroke="#aab69a"/><path d="M57 13 H94 V17 H57Z" fill="#8f9c84"/></svg>';
    }
    function renderFleet() {
      const filter = $("classFilter").value;
      const list = TANKS.filter(t => filter === "all" || t.class === filter);
      $("fleetCount").textContent = `${TANKS.filter(t => isOwned(t.id)).length} / ${TANKS.length}`;

      $("tankList").innerHTML = list.map(t => {
        const owned = isOwned(t.id);
        return `
          <button class="vehicle-row ${state.selectedTank === t.id ? "selected" : ""} ${owned ? "" : "is-locked"}" data-tank="${t.id}">
            <span class="vehicle-icon">${tankThumb(t)}</span>
            <span>
              <span class="vehicle-row-name">${t.name}</span>
              <span class="vehicle-row-meta">Tier ${ROMAN[t.tier]} · ${CLASS_LABELS[t.class]}</span>
            </span>
            <span class="vehicle-row-status">${owned ? "GARAGEM" : "BLOQUEADO"}</span>
          </button>
        `;
      }).join("");
    }

    function renderStats(tank, stats) {
      const bars = [
        { label: "Durabilidade", value: `${stats.hp} HP`, pct: stats.hp / 1800 * 100 },
        { label: "Blindagem", value: `${stats.armor} mm`, pct: stats.armor / 210 * 100 },
        { label: "Dano por disparo", value: `${stats.damage}`, pct: stats.damage / 560 * 100 },
        { label: "Penetração", value: `${stats.pen} mm`, pct: stats.pen / 270 * 100 }
      ];

      $("vehicleStats").innerHTML = bars.map(item => `
        <div class="stat-row">
          <div class="stat-row-head"><span>${item.label}</span><strong>${item.value}</strong></div>
          <div class="stat-track"><i style="width:${Math.max(5, Math.min(100, item.pct))}%"></i></div>
        </div>
      `).join("");

      $("detailGrid").innerHTML = `
        <div class="detail-chip"><span>Recarga</span><strong>${stats.reload.toFixed(1)} s</strong></div>
        <div class="detail-chip"><span>Velocidade</span><strong>${stats.speed} km/h</strong></div>
        <div class="detail-chip"><span>Visão</span><strong>${stats.view} m</strong></div>
        <div class="detail-chip"><span>Precisão</span><strong>${Math.round((1 - stats.accuracy) * 100)}%</strong></div>
      `;
    }

    function renderModules(tank) {
      const container = $("moduleList");

      if (!isOwned(tank.id)) {
        container.innerHTML = `<div class="locked-module-note">Pesquise e compre este veículo na árvore tecnológica para instalar módulos.</div>`;
        return;
      }

      const equipped = state.modulesEquipped[tank.id] || {};
      const ownedModules = state.modulesOwned[tank.id] || [];

      container.innerHTML = moduleConfig(tank).map(group => {
        const selected = equipped[group.slot] || group.options[0].id;

        return `
          <div class="module-slot">
            <h4 class="module-slot-title">${group.title}</h4>
            ${group.options.map(option => {
              const owned = option.price === 0 || ownedModules.includes(option.id);
              const isEquipped = selected === option.id;
              return `
                <button class="module-option ${isEquipped ? "equipped" : ""} ${owned ? "" : "locked"}"
                  data-module-slot="${group.slot}" data-module-id="${option.id}">
                  <span>
                    <strong>${option.name}${isEquipped ? " · EQUIPADO" : ""}</strong>
                    <small>${option.detail}</small>
                  </span>
                  <span class="module-price">${owned ? (isEquipped ? "ATIVO" : "EQUIPAR") : formatNumber(option.price)}</span>
                </button>
              `;
            }).join("")}
          </div>
        `;
      }).join("");
    }

    function renderGarage() {
      const tank = getTank(state.selectedTank) || getTank("l1");
      const stats = effectiveStats(tank);
      const owned = isOwned(tank.id);

      $("tankName").textContent = tank.name;
      $("tankClassTag").textContent = `Tier ${ROMAN[tank.tier]} · ${CLASS_LABELS[tank.class]}`;
      $("tankDescription").textContent = ROLE_TEXT[tank.class];
      $("tierBadge").textContent = `Tier ${ROMAN[tank.tier]}`;
      $("stageMeta").textContent = `${CLASS_LABELS[tank.class]} · ${tank.nation}`;

      $("quickHp").textContent = formatNumber(stats.hp);
      $("quickDamage").textContent = formatNumber(stats.damage);
      $("quickSpeed").textContent = stats.speed;
      $("quickArmor").textContent = stats.armor;

      const availability = $("availability");
      availability.textContent = owned ? "Veículo disponível na garagem" : "Pré-visualização · veículo bloqueado";
      availability.classList.toggle("locked", !owned);

      $("battleButton").disabled = !owned;
      $("battleButton").textContent = owned ? "Entrar em combate" : "Veículo não disponível";
      if ($("wmkBattleTop")) $("wmkBattleTop").disabled = !owned;
      if ($("wmkTrainTop")) $("wmkTrainTop").disabled = !owned;

      renderStats(tank, stats);
      renderModules(tank);

      if (currentPage === "garage") requestAnimationFrame(drawHangar);
    }

    function canResearch(tank) {
      return !tank.prev || isOwned(tank.prev);
    }

    function renderTree() {
      const filter = $("treeFilter").value;
      const order = ["light", "medium", "heavy", "td", "spg"];
      const groups = order.filter(type => filter === "all" || type === filter);

      $("treeGrid").innerHTML = `<div class="tree-row tree-tiers"><div>CLASSE</div>${[1,2,3,4].map(i=>`<div>TIER ${ROMAN[i]}</div>`).join("")}</div>` + groups.map(type => {
        const vehicles = TANKS.filter(t => t.class === type).sort((a, b) => a.tier - b.tier);

        return `
          <div class="tree-row">
            <div class="tree-line-label">
              ${CLASS_ICONS[type]} ${CLASS_LABELS[type]}
              <small>Linha da Liga WMK</small>
            </div>
            ${vehicles.map(tank => {
              const owned = isOwned(tank.id);
              const researched = isResearched(tank.id);
              const available = canResearch(tank);
              let status = "";
              let action = "";

              if (owned) {
                status = "Já está na sua garagem.";
                action = `<button class="node-action" disabled>NA GARAGEM</button>`;
              } else if (researched) {
                status = "Projeto pesquisado. Pronto para compra.";
                action = `<button class="node-action" data-action="buy" data-id="${tank.id}">COMPRAR · ${formatNumber(tank.price)} CR</button>`;
              } else if (available) {
                status = "Disponível para pesquisa.";
                action = `<button class="node-action" data-action="research" data-id="${tank.id}">PESQUISAR · ${formatNumber(tank.research)} XP</button>`;
              } else {
                const previous = getTank(tank.prev);
                status = `Requer ${previous ? previous.name : "veículo anterior"} na garagem.`;
                action = `<button class="node-action" disabled>BLOQUEADO</button>`;
              }

              return `
                <article class="tree-node ${owned ? "owned" : researched ? "researched" : available ? "" : "locked"}">
                  <div class="node-top"><span class="node-tier">TIER ${ROMAN[tank.tier]}</span><span>${CLASS_ICONS[tank.class]} ${CLASS_LABELS[tank.class]}</span></div>
                  <button class="node-preview" data-preview="${tank.id}">${tankThumb(tank)}<span>${tank.name}</span></button>
                  <div class="node-stats">${tank.stats.hp} HP · ${tank.stats.damage} dano · ${tank.stats.speed} km/h</div>
                  <div class="node-status">${status}</div>
                  ${action}
                </article>
              `;
            }).join("")}
          </div>
        `;
      }).join("");
    }

    function renderAll() {
      renderWallet();
      renderFleet();
      renderGarage();
      renderTree();
    }

    function showPage(page) {
      if (page === "battle" && !game) {
        startBattle();
        return;
      }

      currentPage = page;
      document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
      const pageId = page === "garage" ? "garagePage" : page === "tree" ? "treePage" : "battlePage";
      $(pageId).classList.add("active");

      document.querySelectorAll(".nav button").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
      });

      if (page === "garage") renderGarage();
      if (page === "tree") renderTree();
      if (page === "battle" && game) {
        renderBattle();
        startBattleLoop();
      }
    }

    function researchTank(tank) {
      if (isOwned(tank.id) || isResearched(tank.id)) return;
      if (!canResearch(tank)) {
        notify("Compre primeiro o veículo anterior desta linha.");
        return;
      }
      if (state.xp < tank.research) {
        notify(`Experiência insuficiente. Necessário: ${formatNumber(tank.research)} XP.`);
        return;
      }

      state.xp -= tank.research;
      state.researched[tank.id] = true;
      saveState();
      renderAll();
      notify(`${tank.name} pesquisado.`);
    }

    function buyTank(tank) {
      if (!isResearched(tank.id)) {
        notify("Pesquise o veículo antes de comprá-lo.");
        return;
      }
      if (state.credits < tank.price) {
        notify(`Créditos insuficientes. Necessário: ${formatNumber(tank.price)}.`);
        return;
      }

      state.credits -= tank.price;
      state.owned[tank.id] = true;
      state.selectedTank = tank.id;
      saveState();
      renderAll();
      notify(`${tank.name} adicionado à garagem.`);
    }

    function buyOrEquipModule(slot, moduleId) {
      const tank = getTank(state.selectedTank);
      if (!tank || !isOwned(tank.id)) return;

      const group = moduleConfig(tank).find(item => item.slot === slot);
      const option = group && group.options.find(item => item.id === moduleId);
      if (!option) return;

      const owned = state.modulesOwned[tank.id] || [];
      const alreadyOwned = option.price === 0 || owned.includes(option.id);

      if (!alreadyOwned) {
        if (state.credits < option.price) {
          notify("Créditos insuficientes para este módulo.");
          return;
        }
        state.credits -= option.price;
        state.modulesOwned[tank.id] = [...owned, option.id];
        notify(`${option.name} comprado e equipado.`);
      } else {
        notify(`${option.name} equipado.`);
      }

      state.modulesEquipped[tank.id] = {
        ...(state.modulesEquipped[tank.id] || {}),
        [slot]: option.id
      };

      saveState();
      renderGarage();
    }

    function fitCanvas(canvas) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w: rect.width, h: rect.height };
    }

    function roundedRect(ctx, x, y, w, h, r) {
      const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    function drawHangar() {
      const canvas = $("hangarCanvas");
      const { ctx, w, h } = fitCanvas(canvas);
      const tank = getTank(state.selectedTank);
      if (!tank || !w || !h) return;

      const stats = effectiveStats(tank);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#28332b");
      bg.addColorStop(.65, "#1b231d");
      bg.addColorStop(1, "#111713");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 5; i++) {
        const x = w * (.12 + i * .19);
        ctx.fillStyle = "rgba(208, 222, 191, .045)";
        ctx.beginPath();
        ctx.moveTo(x - 32, 0);
        ctx.lineTo(x + 32, 0);
        ctx.lineTo(x + 105, h * .72);
        ctx.lineTo(x - 105, h * .72);
        ctx.closePath();
        ctx.fill();
      }

      const floorY = h * .69;
      const floor = ctx.createLinearGradient(0, floorY, 0, h);
      floor.addColorStop(0, "#333b31");
      floor.addColorStop(1, "#171d18");
      ctx.fillStyle = floor;
      ctx.fillRect(0, floorY, w, h - floorY);

      ctx.strokeStyle = "rgba(201, 211, 192, .09)";
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * 55, floorY);
        ctx.lineTo(w / 2 + i * 145, h);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, floorY + 20);
      ctx.lineTo(w, floorY + 20);
      ctx.stroke();

      const scale = Math.min(w / 600, h / 235);
      const y = h * .84;

      ctx.save();
      ctx.translate(w / 2, y);
      ctx.scale(scale, scale);

      const length = tank.class === "spg" ? 430 : tank.class === "heavy" ? 420 : tank.class === "light" ? 330 : 380;
      const hullHeight = tank.class === "spg" ? 83 : tank.class === "td" ? 68 : 77;
      const turretWidth = tank.class === "heavy" ? 142 : tank.class === "spg" ? 105 : 118;

      ctx.fillStyle = "rgba(0,0,0,.42)";
      ctx.beginPath();
      ctx.ellipse(0, 2, length * .56, 23, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lagartas
      ctx.fillStyle = "#202522";
      roundedRect(ctx, -length / 2, -54, length, 49, 15);
      ctx.fill();
      ctx.strokeStyle = "#6c7467";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Rodas
      const wheelCount = tank.class === "light" ? 5 : 7;
      for (let i = 0; i < wheelCount; i++) {
        const x = -length * .41 + i * (length * .82 / (wheelCount - 1));
        ctx.fillStyle = "#555d50";
        ctx.beginPath();
        ctx.arc(x, -29, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1c211d";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#a0a48a";
        ctx.beginPath();
        ctx.arc(x, -29, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Casco
      ctx.fillStyle = tank.color;
      ctx.beginPath();
      ctx.moveTo(-length * .43, -54);
      ctx.lineTo(-length * .37, -54 - hullHeight * .75);
      ctx.lineTo(-length * .19, -54 - hullHeight);
      ctx.lineTo(length * .30, -54 - hullHeight);
      ctx.lineTo(length * .44, -54 - hullHeight * .70);
      ctx.lineTo(length * .48, -54);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(16,22,17,.8)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Painéis de camuflagem
      ctx.fillStyle = "rgba(34,49,34,.42)";
      for (let i = 0; i < 5; i++) {
        const x = -length * .29 + i * length * .12;
        ctx.beginPath();
        ctx.moveTo(x, -60 - hullHeight * .72);
        ctx.lineTo(x + 23, -61 - hullHeight * .66);
        ctx.lineTo(x + 12, -66 - hullHeight * .43);
        ctx.closePath();
        ctx.fill();
      }

      // Torre e canhão
      ctx.fillStyle = tank.color;
      roundedRect(ctx, -turretWidth * .45, -54 - hullHeight - 42, turretWidth * .9, 48, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(16,22,17,.9)";
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = "#4c5748";
      roundedRect(ctx, -10, -54 - hullHeight - 33, length * .72, 13, 4);
      ctx.fill();
      ctx.fillStyle = "#273027";
      ctx.fillRect(length * .52, -54 - hullHeight - 30, 12, 7);

      // Escotilha e detalhes
      ctx.fillStyle = "#4d5947";
      ctx.beginPath();
      ctx.ellipse(-10, -54 - hullHeight - 19, 20, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1d251e";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#c1c398";
      ctx.fillRect(-length * .31, -58, 30, 4);
      ctx.fillRect(length * .25, -58, 27, 4);

      ctx.restore();

      // Indicador visual do veículo
      ctx.fillStyle = "rgba(232, 238, 225, .75)";
      ctx.font = "10px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${tank.name.toUpperCase()} · TIER ${ROMAN[tank.tier]} · ${stats.speed} KM/H`, w / 2, h - 10);
    }

    // Cenário de batalha: decoração e obstáculos determinísticos.
    function seededRandom(seed) {
      let value = seed >>> 0;
      return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
      };
    }

    const mapRandom = seededRandom(1947);
    const decorations = Array.from({ length: 260 }, () => ({
      x: 30 + mapRandom() * (WORLD_W - 60),
      y: 30 + mapRandom() * (WORLD_H - 60),
      size: 2 + mapRandom() * 5,
      alpha: .04 + mapRandom() * .10
    }));

    const obstacles = [];
    for (let i = 0; i < 28; i++) {
      const x = 100 + mapRandom() * (WORLD_W - 200);
      const y = 100 + mapRandom() * (WORLD_H - 200);
      if (Math.hypot(x - WORLD_W / 2, y - WORLD_H / 2) < 250) continue;

      if (i % 3 === 0) {
        obstacles.push({ kind: "building", x, y, w: 85 + mapRandom() * 65, h: 60 + mapRandom() * 55 });
      } else {
        obstacles.push({ kind: "rock", x, y, r: 22 + mapRandom() * 22 });
      }
    }

    const trainingObstacles = [
      {kind:"building",x:330,y:940,w:170,h:90},{kind:"building",x:590,y:1130,w:130,h:90},
      {kind:"building",x:1500,y:940,w:170,h:90},{kind:"building",x:1750,y:1130,w:130,h:90},
      {kind:"rock",x:410,y:700,r:35},{kind:"rock",x:1780,y:700,r:35}
    ];
    function makeTrainingTargets(){
      return [25,45,75,110,160].map((armor,i)=>({x:700+i*200,y:480,angle:Math.PI/2,turretAngle:Math.PI/2,hp:300,maxHp:300,armor,damage:0,pen:0,class:["light","medium","heavy","td","spg"][i],alive:true,cooldown:999,passive:true}));
    }
    function drawMap(ctx) {
      if(game?.map){WMKMaps.paint(ctx,game.map);return;}
      if(game?.training){
        ctx.fillStyle="#646e50";ctx.fillRect(0,0,WORLD_W,WORLD_H);
        ctx.fillStyle="#777b64";ctx.fillRect(580,320,1040,820);
        ctx.strokeStyle="#c2bc8a";ctx.lineWidth=3;
        for(let x=600;x<=1600;x+=200){ctx.beginPath();ctx.moveTo(x,330);ctx.lineTo(x,1130);ctx.stroke()}
        for(let y=350;y<=1150;y+=100){ctx.setLineDash([16,15]);ctx.beginPath();ctx.moveTo(590,y);ctx.lineTo(1610,y);ctx.stroke()}ctx.setLineDash([]);
        ctx.font="bold 24px Segoe UI";ctx.textAlign="center";ctx.fillStyle="#e9e4ba";ctx.fillText("CAMPO DE TREINAMENTO WMK",1100,280);ctx.fillText("LINHA DE ALVOS",1100,410);ctx.fillText("ÁREA DE MANOBRAS",1100,1240);
        for(const o of trainingObstacles){ctx.fillStyle="#414b3c";if(o.kind==="building"){ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeRect(o.x,o.y,o.w,o.h)}else{ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fill()}}
        ctx.strokeStyle="#d6ce96";ctx.lineWidth=7;ctx.strokeRect(4,4,WORLD_W-8,WORLD_H-8);
        return;
      }
      ctx.fillStyle = "#68764f";
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);

      for (const d of decorations) {
        ctx.fillStyle = `rgba(28, 42, 25, ${d.alpha})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Estradas
      ctx.lineCap = "round";
      ctx.strokeStyle = "#444b3d";
      ctx.lineWidth = 118;
      ctx.beginPath();
      ctx.moveTo(-60, WORLD_H * .70);
      ctx.lineTo(WORLD_W + 80, WORLD_H * .34);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(WORLD_W * .48, -80);
      ctx.lineTo(WORLD_W * .61, WORLD_H + 90);
      ctx.stroke();

      ctx.strokeStyle = "#8a8568";
      ctx.lineWidth = 86;
      ctx.beginPath();
      ctx.moveTo(-60, WORLD_H * .70);
      ctx.lineTo(WORLD_W + 80, WORLD_H * .34);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(WORLD_W * .48, -80);
      ctx.lineTo(WORLD_W * .61, WORLD_H + 90);
      ctx.stroke();

      ctx.strokeStyle = "rgba(216, 204, 154, .42)";
      ctx.lineWidth = 3;
      ctx.setLineDash([25, 25]);
      ctx.beginPath();
      ctx.moveTo(-60, WORLD_H * .70);
      ctx.lineTo(WORLD_W + 80, WORLD_H * .34);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const o of (game?.training ? trainingObstacles : game?.map?.obstacles || obstacles)) {
        if (o.kind === "building") {
          ctx.fillStyle = "rgba(0,0,0,.20)";
          ctx.fillRect(o.x + 8, o.y + 9, o.w, o.h);
          ctx.fillStyle = "#615f4d";
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = "#77725a";
          ctx.fillRect(o.x + 7, o.y + 7, o.w - 14, o.h - 14);
          ctx.strokeStyle = "#353a31";
          ctx.lineWidth = 5;
          ctx.strokeRect(o.x, o.y, o.w, o.h);
          ctx.fillStyle = "#34392f";
          for (let wx = o.x + 17; wx < o.x + o.w - 8; wx += 29) {
            ctx.fillRect(wx, o.y + 18, 11, 8);
          }
        } else {
          ctx.fillStyle = "rgba(0,0,0,.18)";
          ctx.beginPath();
          ctx.ellipse(o.x + 5, o.y + 8, o.r * 1.2, o.r * .82, .3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#626656";
          ctx.beginPath();
          ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#81826d";
          ctx.beginPath();
          ctx.arc(o.x - o.r * .25, o.y - o.r * .25, o.r * .42, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = "#b0b78d";
      ctx.lineWidth = 9;
      ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
      ctx.strokeStyle = "#303a2c";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
    }

    function tankSize(tankClass) {
      if (tankClass === "heavy") return { length: 67, width: 39 };
      if (tankClass === "spg") return { length: 64, width: 35 };
      if (tankClass === "td") return { length: 60, width: 35 };
      if (tankClass === "light") return { length: 49, width: 29 };
      return { length: 56, width: 33 };
    }

    function drawWorldTank(ctx, entity, tankClass, color, isPlayer) {
      const base = tankSize(tankClass); const length=base.length*1.42,width=base.width*1.42;

      ctx.save();
      ctx.translate(entity.x, entity.y);
      ctx.rotate(entity.angle);

      ctx.fillStyle = "#222823";
      roundedRect(ctx, -length * .49, -width * .53, length * .98, width * 1.06, 7);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-length * .40, -width * .39);
      ctx.lineTo(-length * .31, -width * .47);
      ctx.lineTo(length * .34, -width * .43);
      ctx.lineTo(length * .45, -width * .20);
      ctx.lineTo(length * .45, width * .20);
      ctx.lineTo(length * .34, width * .43);
      ctx.lineTo(-length * .31, width * .47);
      ctx.lineTo(-length * .40, width * .39);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = entity.team==="blue"||isPlayer ? "#8dcaff" : "#ff9b91";
      ctx.lineWidth = isPlayer ? 2.5 : 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(29,38,29,.55)";
      roundedRect(ctx, -length * .15, -width * .27, length * .47, width * .54, 5);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(entity.x, entity.y);
      ctx.rotate(entity.turretAngle);

      ctx.fillStyle = "#3a4037";
      roundedRect(ctx, 2, -3.5, length * .56, 7, 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, width * .32, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = entity.team==="blue"||isPlayer ? "#b0ddff" : "#ff9b91";
      ctx.lineWidth = isPlayer ? 2 : 1.5;
      ctx.stroke();

      ctx.restore();

      if (!isPlayer) {
        const barW = 42;
        const ratio = Math.max(0, entity.hp / entity.maxHp);
        ctx.fillStyle = "rgba(0,0,0,.6)";
        ctx.fillRect(entity.x - barW / 2, entity.y - 48, barW, 5);
        ctx.fillStyle = entity.team==="blue" ? "#58aaff" : "#e76b60";
        ctx.fillRect(entity.x - barW / 2, entity.y - 48, barW * ratio, 5);
      }
    }

    function cameraFor(width, height) {
      if (game && game.mode === "arty") {
        const scale = Math.max(.01,Math.min((width - 24) / WORLD_W, (height - 40) / WORLD_H));
        return { x: WORLD_W / 2, y: WORLD_H / 2, scale: scale * .98 };
      }

      const scale = game && game.mode === "sniper" ? 1.45 : (game.zoom || .72);
      return { x: game.player.x, y: game.player.y, scale };
    }

    function mouseWorld(width, height) {
      const cam = cameraFor(width, height);
      const mx = game.mouse.x;
      const my = game.mouse.y;
      return {
        x: Math.max(0, Math.min(WORLD_W, cam.x + (mx - width / 2) / cam.scale)),
        y: Math.max(0, Math.min(WORLD_H, cam.y + (my - height / 2) / cam.scale))
      };
    }

    function dispersionRadius() {
      return (70 + game.stats.accuracy * 85) * (game.aimBloom || 1);
    }

    function drawCrosshair(ctx, width, height, cam) {
      const mx = Math.max(0, Math.min(width, game.mouse.x));
      const my = Math.max(0, Math.min(height, game.mouse.y));
      const color = game.mode === "arty" ? "#f0c46b" : "#e9eee4";

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.4;

      if (game.mode === "arty") {
        const radius = Math.max(8, dispersionRadius() * cam.scale);
        ctx.beginPath();
        ctx.ellipse(mx, my, radius, radius * .72, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mx - radius - 8, my);
        ctx.lineTo(mx + radius + 8, my);
        ctx.moveTo(mx, my - radius - 8);
        ctx.lineTo(mx, my + radius + 8);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const radius = (10 + game.stats.accuracy * 22) * (game.aimBloom || 1);
        ctx.beginPath();
        ctx.arc(mx, my, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mx - radius - 12, my);
        ctx.lineTo(mx - 4, my);
        ctx.moveTo(mx + 4, my);
        ctx.lineTo(mx + radius + 12, my);
        ctx.moveTo(mx, my - radius - 12);
        ctx.lineTo(mx, my - 4);
        ctx.moveTo(mx, my + 4);
        ctx.lineTo(mx, my + radius + 12);
        ctx.stroke();

        if (game.mode === "sniper") {
          const scopeR = Math.min(width, height) * .48;
          const gradient = ctx.createRadialGradient(width / 2, height / 2, scopeR * .62, width / 2, height / 2, scopeR);
          gradient.addColorStop(0, "rgba(0,0,0,0)");
          gradient.addColorStop(.72, "rgba(0,0,0,.08)");
          gradient.addColorStop(1, "rgba(0,0,0,.76)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          ctx.strokeStyle = "rgba(220,230,214,.58)";
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, scopeR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = "rgba(230,238,225,.46)";
          ctx.beginPath();
          ctx.moveTo(width / 2, 0);
          ctx.lineTo(width / 2, height);
          ctx.moveTo(0, height / 2);
          ctx.lineTo(width, height / 2);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    function updateBattleHud() {
      if (!game) return;

      const alive = game.enemies.filter(enemy => enemy.alive).length;
      $("battleVehicleName").textContent = `${game.tank.name.toUpperCase()} · TIER ${ROMAN[game.tank.tier]}`;
      $("battleVehicleMeta").textContent = `${CLASS_LABELS[game.tank.class]} · ${game.mode === "arty" ? "Mira estratégica" : game.mode === "sniper" ? "Mira telescópica" : "Mira arcade"}`;
      $("objectiveText").textContent = game.teamSize ? `AZUL ${Number(game.player.hp>0)+(game.allies||[]).filter(u=>u.alive).length} × ${alive} VERMELHO` : `Alvos: ${game.enemies.length-alive} / ${game.enemies.length}`;

      const hpRatio = Math.max(0, game.player.hp / game.player.maxHp);
      $("hpFill").style.width = `${hpRatio * 100}%`;
      $("hpFill").style.background = hpRatio < .28
        ? "linear-gradient(90deg,#a73f39,#e77c64)"
        : "linear-gradient(90deg,#718f45,#b1d46b)";
      $("hpText").textContent = `${Math.max(0, Math.ceil(game.player.hp))} / ${game.player.maxHp}`;

      const reloadRatio = Math.max(0, Math.min(1, 1 - game.reload / game.stats.reload));
      $("reloadFill").style.width = `${reloadRatio * 100}%`;
      $("reloadText").textContent = game.reload > 0 ? `${game.reload.toFixed(1)} s` : "PRONTO";

      const aimText = game.mode === "arty"
        ? "AAP · clique no mapa para disparar · elipse = dispersão"
        : game.mode === "sniper"
          ? "MIRA TELESCÓPICA · zoom · clique para disparar"
          : "MIRA ARCADE · WASD move · mouse aponta · clique dispara";

      $("aimLabel").textContent = aimText;

      document.querySelectorAll(".mode-button").forEach(button => {
        button.classList.toggle("active", button.dataset.mode === game.mode);
        button.disabled = button.dataset.mode === "arty" && game.tank.class !== "spg";
      });
    }

    function renderBattle() {
      if (!game) return;

      const canvas = $("battleCanvas");
      const { ctx, w, h } = fitCanvas(canvas);
      if (!w || !h) return;

      const cam = cameraFor(w, h);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#273329";
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 - cam.x * cam.scale, h / 2 - cam.y * cam.scale);
      ctx.scale(cam.scale, cam.scale);

      drawMap(ctx);

      if (game.mode === "arty") {
        const aim = mouseWorld(w, h);
        ctx.save();
        ctx.strokeStyle = "rgba(239,196,108,.55)";
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 12]);
        ctx.beginPath();
        ctx.moveTo(game.player.x, game.player.y);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      for (const shell of game.artyShells) {
        const progress = 1 - shell.timer / shell.duration;
        const x = shell.startX + (shell.targetX - shell.startX) * progress;
        const y = shell.startY + (shell.targetY - shell.startY) * progress;
        const height = Math.sin(progress * Math.PI) * 150;

        ctx.fillStyle = "rgba(0,0,0,.28)";
        ctx.beginPath();
        ctx.ellipse(shell.targetX, shell.targetY, 13, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffd379";
        ctx.beginPath();
        ctx.arc(x, y - height, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const shell of game.shots) {
        ctx.fillStyle = shell.owner === "enemy" ? "#ee7764" : "#a9dfff";
        ctx.beginPath();
        ctx.arc(shell.x, shell.y, shell.owner === "player" ? 4 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const effect of game.effects) {
        const p = 1 - effect.life / effect.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, effect.life / effect.maxLife);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, 10 + p * 34, 0, Math.PI * 2);
        ctx.stroke();
        if (effect.label) {
          ctx.fillStyle = effect.color;
          ctx.font = "bold 14px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(effect.label, effect.x, effect.y - 23 - p * 20);
        }
        ctx.restore();
      }

      for (const enemy of game.enemies) {
        if (enemy.alive) drawWorldTank(ctx, enemy, enemy.class, "#b9574e", false);
      }

      for(const ally of game.allies||[])if(ally.alive)drawWorldTank(ctx,ally,ally.class,"#427eb1",false);
      if(game.player.hp>0)drawWorldTank(ctx, game.player, game.tank.class, "#428fcb", true);

      ctx.restore();
      drawCrosshair(ctx, w, h, cam);
      updateBattleHud();
      drawMinimap();
    }

    function isBlocked(x, y, radius = 22) {
      if (x < 35 || y < 35 || x > WORLD_W - 35 || y > WORLD_H - 35) return true;

      for (const o of (game?.training ? trainingObstacles : game?.map?.obstacles || obstacles)) {
        if (o.kind === "building") {
          const closestX = Math.max(o.x, Math.min(x, o.x + o.w));
          const closestY = Math.max(o.y, Math.min(y, o.y + o.h));
          if (Math.hypot(x - closestX, y - closestY) < radius) return true;
        } else if (Math.hypot(x - o.x, y - o.y) < radius + o.r * .7) {
          return true;
        }
      }
      return false;
    }

    function addEffect(x, y, color, label = "") {
      game.effects.push({ x, y, color, label, life: .7, maxLife: .7 });
      if(label)WMKAudio.play(label==='RICOCHETE'||label==='BLINDAGEM'?'bounce':'hit');
    }

    function showBattleMessage(message) {
      const el = $("battleMessage");
      el.textContent = message;
      el.classList.add("visible");
      clearTimeout(battleMessageTimer);
      battleMessageTimer = setTimeout(() => el.classList.remove("visible"), 950);
    }

    function firePlayer() {
      if (!game || !game.active || game.player.hp<=0 || game.reload > 0) return;

      const rect = $("battleCanvas").getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const p = game.player;
      const aim = mouseWorld(width, height);
      const aimAngle = Math.atan2(aim.y - p.y, aim.x - p.x);

      p.turretAngle = aimAngle;
      game.reload = game.stats.reload;
      WMKAudio.play('fire');

      if (game.tank.class === "spg" && game.mode === "arty") {
        const radius = dispersionRadius();
        const theta = Math.random() * Math.PI * 2;
        const distance = Math.sqrt(Math.random()) * radius;

        game.artyShells.push({
          startX: p.x,
          startY: p.y,
          targetX: Math.max(15, Math.min(WORLD_W - 15, aim.x + Math.cos(theta) * distance)),
          targetY: Math.max(15, Math.min(WORLD_H - 15, aim.y + Math.sin(theta) * distance)),
          timer: 1.25,
          duration: 1.25,
          damage: game.stats.damage,
          pen: game.stats.pen,
          splash: 145
        });
        showBattleMessage("Projétil AAP em trajetória.");
        return;
      }

      const spread = (8 + game.stats.accuracy * 34) * (game.aimBloom || 1);
      const randomAngle = (Math.random() - .5) * spread * .006;
      const angle = aimAngle + randomAngle;
      const startX = p.x + Math.cos(angle) * 28;
      const startY = p.y + Math.sin(angle) * 28;
      const damageScale = game.tank.class === "spg" ? .55 : 1;

      game.shots.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * 800,
        vy: Math.sin(angle) * 800,
        owner: "player",
        damage: game.stats.damage * damageScale,
        pen: game.stats.pen,
        life: 2.8
      });
    }

    function damageEnemy(enemy, damage, pen, splashDistance = null, splashRadius = 0) {
      if(!enemy.alive)return;
      const armor = enemy.armor + Math.random() * 22;
      if (pen >= armor) {
        const dealt = Math.max(1, Math.round(damage * (.82 + Math.random() * .30)));
        enemy.hp -= dealt;
        addEffect(enemy.x, enemy.y, "#f4d081", `-${dealt}`);
        showBattleMessage(`Penetração · ${dealt} de dano`);
      } else if (splashDistance !== null && splashRadius > 0) {
        const factor = Math.max(.12, 1 - splashDistance / splashRadius);
        const dealt = Math.max(8, Math.round(damage * .23 * factor));
        enemy.hp -= dealt;
        addEffect(enemy.x, enemy.y, "#e5a765", `-${dealt}`);
        showBattleMessage(`Dano de explosão · ${dealt}`);
      } else {
        addEffect(enemy.x, enemy.y, "#c9c9ad", "RICOCHETE");
        showBattleMessage("Ricochete · blindagem não penetrada");
      }

      if (enemy.hp <= 0 && enemy.alive) {
        enemy.hp = 0;
        enemy.alive = false;
        game.kills++;
        addEffect(enemy.x, enemy.y, "#f0ad68", "ALVO DESTRUÍDO");
      }
    }

    function damagePlayer(shell) {
      const p = game.player;
      const incomingFrom = Math.atan2(shell.y - p.y, shell.x - p.x);
      let difference = Math.atan2(Math.sin(incomingFrom - p.angle), Math.cos(incomingFrom - p.angle));
      difference = Math.abs(difference);

      let effectiveArmor = game.stats.armor;
      if (difference < Math.PI / 4) effectiveArmor *= 1.28;
      else if (difference > Math.PI * .72) effectiveArmor *= .78;

      if (shell.pen >= effectiveArmor + Math.random() * 24) {
        const dealt = Math.max(8, Math.round(shell.damage * (.8 + Math.random() * .28)));
        p.hp -= dealt;
        addEffect(p.x, p.y, "#e47861", `-${dealt}`);
        showBattleMessage(`Impacto recebido · ${dealt} de dano`);
      } else {
        addEffect(p.x, p.y, "#c9c9ad", "BLINDAGEM");
        showBattleMessage("Seu blindado resistiu ao impacto.");
      }
    }

    function resolveArtyShell(shell) {
      let hits = 0;

      for (const enemy of game.enemies) {
        if (!enemy.alive) continue;
        const distance = Math.hypot(enemy.x - shell.targetX, enemy.y - shell.targetY);
        if (distance <= shell.splash) {
          damageEnemy(enemy, shell.damage, shell.pen, distance, shell.splash);
          hits++;
        }
      }

      addEffect(shell.targetX, shell.targetY, "#ffb760", "IMPACTO");
      if (hits === 0) showBattleMessage("Projétil explodiu. Nenhum inimigo na área.");
    }

    function finishBattle(victory) {
      if (!game || game.finished) return;

      game.finished = true;
      game.active = false;

      const tier = game.tank.tier;
      const creditReward = Math.round((650 + game.kills * 420 + (victory ? 2100 : 0)) * (1 + tier * .12));
      const xpReward = Math.round((100 + game.kills * 75 + (victory ? 380 : 0)) * (1 + tier * .10));

      const practice=!!game.teamSize;
      if(!practice){state.credits += creditReward; state.xp += xpReward;state.battles++;if(victory)state.wins++;}

      saveState();
      renderAll();

      $("resultTitle").textContent = victory ? "Vitória" : "Missão encerrada";
      $("resultText").textContent = victory
        ? `Equipe azul venceu. Eliminações do jogador: ${game.kills}.`
        : `O combate terminou. Veículos eliminados: ${game.kills}.`;
      $("resultRewards").textContent = practice ? "Treino em equipe · sem recompensas" : `+${formatNumber(creditReward)} créditos  ·  +${formatNumber(xpReward)} XP`;
      $("battleResult").classList.add("show");
      updateBattleHud();
    }

    function updateGame(dt) {
      if (!game || !game.active) return;

      const p = game.player;
      const keys = pressedKeys;

      game.reload = Math.max(0, game.reload - dt);

      const turn = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      const forward = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);

      if (p.hp>0 && turn) p.angle += turn * game.stats.turn * .006 * dt;

      const moving = !!(turn || forward);
      if (moving) {
        game.aimBloom = Math.min(1.8, game.aimBloom + dt * .44);
      } else {
        game.aimBloom = Math.max(.72, game.aimBloom - dt * .30);
      }

      if (p.hp>0 && forward) {
        const reverseScale = forward < 0 ? .48 : 1;
        const distance = game.stats.speed * 1.75 * forward * reverseScale * dt;
        const nx = p.x + Math.cos(p.angle) * distance;
        const ny = p.y + Math.sin(p.angle) * distance;

        if (!isBlocked(nx, ny, 34) && ![...game.enemies,...(game.allies||[])].some(u=>u.alive&&Math.hypot(u.x-nx,u.y-ny)<64)) {
          p.x = nx;
          p.y = ny;
        }
      }

      const rect = $("battleCanvas").getBoundingClientRect();
      const aim = mouseWorld(rect.width, rect.height);
      p.turretAngle = Math.atan2(aim.y - p.y, aim.x - p.x);

      const blue=[...((p.hp>0)?[p]:[]),...(game.allies||[]).filter(u=>u.alive)];
      const red=game.enemies.filter(u=>u.alive);
      for(const bot of [...red,...(game.allies||[]).filter(u=>u.alive)]){
        if(bot.passive)continue;
        const targets=bot.team==="blue"?red:blue;
        if(!targets.length)continue;
        const target=targets.reduce((best,u)=>Math.hypot(u.x-bot.x,u.y-bot.y)<Math.hypot(best.x-bot.x,best.y-bot.y)?u:best);
        const dx=target.x-bot.x,dy=target.y-bot.y,dist=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
        bot.turretAngle=angle;
        if(dist>300){
          const choices=[angle,angle+.8,angle-.8,angle+1.5,angle-1.5];
          for(const heading of choices){
            const nx=bot.x+Math.cos(heading)*70*dt,ny=bot.y+Math.sin(heading)*70*dt;
            if(!isBlocked(nx,ny,34)&&![...blue,...red].some(u=>u!==bot&&Math.hypot(u.x-nx,u.y-ny)<64)){bot.x=nx;bot.y=ny;bot.angle=heading;break}
          }
        }
        bot.cooldown-=dt;
        if(dist<900&&bot.cooldown<=0&&clearLine(bot,target)){
          const angle2=angle+(Math.random()-.5)*.09;
          game.shots.push({x:bot.x+Math.cos(angle2)*35,y:bot.y+Math.sin(angle2)*35,vx:Math.cos(angle2)*550,vy:Math.sin(angle2)*550,owner:bot.team==="blue"?"ally":"enemy",damage:bot.damage,pen:bot.pen,life:2.8});
          bot.cooldown=3+Math.random()*2;
          if(dist<450)WMKAudio.play("bot");
        }
      }
      for(let i=game.shots.length-1;i>=0;i--){
        const shell=game.shots[i]; const ox=shell.x,oy=shell.y;
        shell.x+=shell.vx*dt;shell.y+=shell.vy*dt;shell.life-=dt;
        const n=Math.max(1,Math.ceil(Math.hypot(shell.x-ox,shell.y-oy)/10));
        const targets=shell.owner==="enemy"?blue:red;
        for(let j=1;j<=n&&shell.life>0;j++){
          const x=ox+(shell.x-ox)*j/n,y=oy+(shell.y-oy)*j/n;
          if(isBlocked(x,y,1)){shell.life=0;addEffect(x,y,"#c7b897");break}
          const target=targets.find(u=>u.hp>0&&Math.hypot(u.x-x,u.y-y)<34);
          if(target){if(target===p){damagePlayer({...shell,x,y});p.hp=Math.max(0,p.hp)}else if(shell.owner==="player"){damageEnemy(target,shell.damage,shell.pen)}else{botDamage(target,shell)}shell.life=0;}
        }
        if(shell.life<=0)game.shots.splice(i,1);
      }
      for (let i = game.artyShells.length - 1; i >= 0; i--) {
        const shell = game.artyShells[i];
        shell.timer -= dt;
        if (shell.timer <= 0) {
          resolveArtyShell(shell);
          game.artyShells.splice(i, 1);
        }
      }

      for (let i = game.effects.length - 1; i >= 0; i--) {
        game.effects[i].life -= dt;
        if (game.effects[i].life <= 0) game.effects.splice(i, 1);
      }

      if (game.training) return;
      if (p.hp <= 0 && !(game.allies||[]).some(u=>u.alive)) {
        p.hp = 0;
        finishBattle(false);
      } else if (game.enemies.every(enemy => !enemy.alive)) {
        finishBattle(true);
      }
    }

    function startBattleLoop() {
      if (loopRunning) return;
      loopRunning = true;
      lastFrame = performance.now();

      function frame(now) {
        if (!game || !game.active) {
          loopRunning = false;
          return;
        }

        const dt = Math.min(.05, Math.max(0, (now - lastFrame) / 1000));
        lastFrame = now;

        if (currentPage === "battle") {
          updateGame(dt);
          renderBattle();
        }

        requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    }

    function startBattle(training = false) {
      const config = typeof training === 'object' && training ? training : {training:training===true};
      training = config.training===true;
      const tank = getTank(state.selectedTank);
      if (!tank || !isOwned(tank.id)) {
        notify("Selecione um veículo que esteja na sua garagem.");
        return;
      }

      const stats = effectiveStats(tank);
      const selectedMap = training ? null : WMKMaps.validate(config.map || WMKMaps.defaultMap);
      WORLD_W = selectedMap ? selectedMap.width : 2200; WORLD_H = selectedMap ? selectedMap.height : 1500;
      const centerX = WORLD_W / 2;
      const centerY = WORLD_H / 2;
      const offsets = [
        { x: 550, y: -230 },
        { x: 620, y: 220 },
        { x: -570, y: 40 },
        { x: -260, y: -560 },
        { x: 190, y: 610 }
      ];

      const enemies = offsets.map((offset, index) => {
        const x = centerX + offset.x;
        const y = centerY + offset.y;
        const angle = Math.atan2(centerY - y, centerX - x);
        const maxHp = Math.round(185 + tank.tier * 48);

        return {
          x, y,
          angle,
          turretAngle: angle,
          hp: maxHp,
          maxHp,
          armor: 25 + tank.tier * 11,
          damage: 20 + tank.tier * 4,
          pen: 56 + tank.tier * 8,
          class: ["light", "medium", "heavy", "td", "light"][index],
          alive: true,
          cooldown: 2 + Math.random() * 2
        };
      });

      const rect = $("battleCanvas").getBoundingClientRect();
      game = {
        training, map:selectedMap, teamSize:config.teamSize||0, zoom:0.72,
        tank,
        stats,
        mode: tank.class === "spg" ? "arty" : "arcade",
        active: true,
        finished: false,
        kills: 0,
        player: {
          x: centerX,
          y: training ? 1050 : centerY,
          angle: -Math.PI / 2,
          turretAngle: -Math.PI / 2,
          hp: stats.hp,
          maxHp: stats.hp
        },
        enemies: training ? makeTrainingTargets() : enemies,
        shots: [],
        artyShells: [],
        effects: [],
        reload: 0,
        aimBloom: 1,
        mouse: { x: rect.width / 2, y: rect.height / 2 }
      };

      if(selectedMap){
        game.player.x=selectedMap.blue[0].x;game.player.y=selectedMap.blue[0].y;game.player.angle=-Math.PI/2;game.player.turretAngle=-Math.PI/2;
        game.enemies=selectedMap.red.slice(0,game.teamSize||5).map((p,i)=>makeBot(p,i,"red",stats,tank.tier));
        game.allies=game.teamSize?selectedMap.blue.slice(1,game.teamSize).map((p,i)=>makeBot(p,i,"blue",stats,tank.tier)):[];
      }else game.allies=[];
      game.player.team="blue";
      pressedKeys = {};
      $("battleResult").classList.remove("show");
      showPage("battle");
      const visibleRect=$("battleCanvas").getBoundingClientRect();game.mouse={x:visibleRect.width/2,y:visibleRect.height/2};
      startBattleLoop();
      updateBattleHud();
    }

    function exitBattle() {
      if (game) game.active = false;
      game = null;
      pressedKeys = {};
      $("battleResult").classList.remove("show");
      showPage("garage");
      notify("Você saiu da missão.");
    }

    // Eventos da interface
    document.querySelectorAll(".nav button").forEach(button => {
      button.addEventListener("click", () => showPage(button.dataset.page));
    });

    $("classFilter").addEventListener("change", renderFleet);
    $("treeFilter").addEventListener("change", renderTree);

    $("tankList").addEventListener("click", event => {
      const button = event.target.closest("[data-tank]");
      if (!button) return;
      state.selectedTank = button.dataset.tank;
      saveState();
      renderAll();
    });

    $("treeGrid").addEventListener("click", event => {
      const actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        const tank = getTank(actionButton.dataset.id);
        if (!tank) return;
        if (actionButton.dataset.action === "research") researchTank(tank);
        if (actionButton.dataset.action === "buy") buyTank(tank);
        return;
      }

      const previewButton = event.target.closest("[data-preview]");
      if (previewButton) {
        state.selectedTank = previewButton.dataset.preview;
        saveState();
        renderAll();
        showPage("garage");
      }
    });

    $("moduleList").addEventListener("click", event => {
      const button = event.target.closest("[data-module-id]");
      if (!button) return;
      buyOrEquipModule(button.dataset.moduleSlot, button.dataset.moduleId);
    });

    $("battleButton").addEventListener("click", startBattle);
    $("leaveBattle").addEventListener("click", exitBattle);

    document.querySelectorAll(".mode-button").forEach(button => {
      button.addEventListener("click", () => {
        if (!game || !game.active) return;
        if (button.dataset.mode === "arty" && game.tank.class !== "spg") {
          notify("A mira AAP só está disponível para artilharia autopropulsada.");
          return;
        }
        game.mode = button.dataset.mode;
        renderBattle();
      });
    });

    $("resultGarage").addEventListener("click", exitBattle);
    $("resultAgain").addEventListener("click", ()=>startBattle({training:game?.training,teamSize:game?.teamSize,map:game?.map}));

    $("resetButton").addEventListener("click", () => {
      if (!confirm("Apagar o progresso salvo e reiniciar a garagem?")) return;
      localStorage.removeItem(SAVE_KEY);
      state = {
        ...DEFAULT_STATE,
        owned: { l1: true },
        researched: {},
        modulesOwned: {},
        modulesEquipped: {}
      };
      game = null;
      renderAll();
      showPage("garage");
      notify("Progresso reiniciado.");
    });

    const battleCanvas = $("battleCanvas");

    battleCanvas.addEventListener("mousemove", event => {
      if (!game) return;
      const rect = battleCanvas.getBoundingClientRect();
      game.mouse.x = event.clientX - rect.left;
      game.mouse.y = event.clientY - rect.top;
    });

    battleCanvas.addEventListener("mousedown", event => {
      if (event.button === 0 && currentPage === "battle") firePlayer();
    });

    battleCanvas.addEventListener("contextmenu", event => event.preventDefault());

    window.addEventListener("keydown", event => {
      if (currentPage !== "battle" || !game || !game.active) return;

      if (event.target.closest("input,select,textarea,dialog,[contenteditable]")) return;
      const key = event.key.toLowerCase();
      const controlled = ["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "];

      if (controlled.includes(key)) event.preventDefault();
      pressedKeys[key] = true;

      if (event.repeat) return;
      if (key === " ") firePlayer();
      if (key === "1") game.mode = "arcade";
      if (key === "2") game.mode = "sniper";
      if (key === "3" && game.tank.class === "spg") game.mode = "arty";
      renderBattle();
    });

    window.addEventListener("keyup", event => {
      pressedKeys[event.key.toLowerCase()] = false;
    });

    window.addEventListener("blur", () => { pressedKeys = {}; });

    window.addEventListener("resize", () => {
      requestAnimationFrame(() => {
        if (currentPage === "garage") drawHangar();
        if (currentPage === "battle" && game) renderBattle();
      });
    });

    renderAll();
    requestAnimationFrame(drawHangar);

(() => {
const key='wmk-tankwar-layout-v2'; const work={garage:document.querySelector('.garage-layout'),battle:document.querySelector('.battle-shell')};
const panels={garage:{},battle:{}}; let z=10; let saved={}; try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{}; let layouts=saved.layouts||{}; let active=saved.active||'Padrão';
const presets={garage:{fleet:[0,.76,1,.24],viewport:[0,0,.74,.60],summary:[0,.60,.74,.16],stats:[.74,0,.26,.39],modules:[.74,.39,.26,.37]},battle:{vehicle:[0,0,.22,.13],modes:[.34,0,.32,.13],objective:[.78,0,.22,.18],hp:[0,.85,.23,.15],reload:[.24,.85,.23,.15],help:[.68,.80,.32,.20]}};
const toolbar=document.createElement('div');toolbar.className='wmk-tools';toolbar.innerHTML=`<details><summary>▦ Painéis</summary><div class="wmk-menu" id="wmkPanelMenu"></div></details><a class="wmk-docs" href="roadmap.html" target="_blank" rel="noopener">Roadmap</a><a class="wmk-docs" href="manuais/manual.html" target="_blank" rel="noopener">Manual</a><button id="wmkDefault">Restaurar</button><button id="wmkClean">Visão limpa</button><select id="wmkLayouts" aria-label="Layouts salvos"></select><button id="wmkSave">Salvar como</button><button id="wmkExport">Exportar JSON</button><button id="wmkImport">Importar JSON</button><input id="wmkFile" type="file" accept=".json"><span class="wmk-credit">Walney Moreira Klein — walneyk@hotmail.com · v1.3</span>`;document.querySelector('.topbar').after(toolbar);
function persist(){try{localStorage.setItem(key,JSON.stringify({active,layouts,current:collect()}))}catch{}}
function repaint(){if(currentPage==='garage')drawHangar();else if(currentPage==='battle'&&game)renderBattle()}
function rect(p,r){p.style.left=(r[0]*100)+'%';p.style.top=(r[1]*100)+'%';p.style.width=(r[2]*100)+'%';p.style.height=(r[3]*100)+'%'}
function collect(){let out={};for(const [page,group] of Object.entries(panels)){out[page]={};for(const [id,p] of Object.entries(group)){out[page][id]={r:['left','top','width','height'].map(k=>parseFloat(p.style[k])/100),hidden:p.hidden}}}return out}
function defaults(){let o={};for(const [page,group] of Object.entries(presets)){o[page]={};for(const [id,r] of Object.entries(group))o[page][id]={r,hidden:false}}return o}
function valid(r){return Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[0]>=0&&r[1]>=0&&r[2]>0&&r[3]>0&&r[0]+r[2]<=1.001&&r[1]+r[3]<=1.001}
function apply(o){const d=defaults();for(const [page,group] of Object.entries(panels))for(const [id,p] of Object.entries(group)){let v=o?.[page]?.[id];if(!valid(v?.r))v=d[page][id];rect(p,v.r);p.hidden=v.hidden===true;p._restore=null}menu();repaint();persist()}
function add(page,id,title,nodes){let host=work[page],p=document.createElement('section');p.className='wmk-window';p.dataset.id=id;p.innerHTML=`<div class="wmk-head"><strong>${title}</strong><button title="Encaixar à esquerda">◧</button><button title="Encaixar à direita">◨</button><button title="Maximizar ou restaurar">□</button><button title="Fechar painel">×</button></div><div class="wmk-content"></div><div class="wmk-grip" title="Redimensionar"></div>`;for(const n of nodes)if(n)p.querySelector('.wmk-content').append(n);host.append(p);panels[page][id]=p;rect(p,presets[page][id]);let [l,r,m,c]=p.querySelectorAll('button'); // only header buttons come first
const raise=()=>p.style.zIndex=++z;p.addEventListener('pointerdown',raise);l.onclick=()=>{rect(p,[0,0,.35,1]);p._restore=null;repaint();persist()};r.onclick=()=>{rect(p,[.65,0,.35,1]);p._restore=null;repaint();persist()};m.onclick=()=>{if(p._restore){rect(p,p._restore);p._restore=null}else{p._restore=collect()[page][id].r;rect(p,[0,0,1,1]);raise()}repaint();persist()};c.onclick=()=>{p.hidden=true;menu();persist()};
function drag(e,resize){if(e.button!==0||e.target.closest('button'))return;e.preventDefault();raise();let start=collect()[page][id].r;let b=host.getBoundingClientRect(),x=e.clientX,y=e.clientY;let target=e.currentTarget;target.setPointerCapture(e.pointerId);const move=ev=>{let dx=(ev.clientX-x)/b.width,dy=(ev.clientY-y)/b.height;let a=start.slice();if(resize){a[2]=Math.max(Math.min(.12,1-a[0]),Math.min(1-a[0],a[2]+dx));a[3]=Math.max(Math.min(.10,1-a[1]),Math.min(1-a[1],a[3]+dy))}else{a[0]=Math.max(0,Math.min(1-a[2],a[0]+dx));a[1]=Math.max(0,Math.min(1-a[3],a[1]+dy))}rect(p,a);p._restore=null;repaint()};const end=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',end);target.removeEventListener('pointercancel',end);persist()};target.addEventListener('pointermove',move);target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end)}p.querySelector('.wmk-head').addEventListener('pointerdown',e=>drag(e,false));p.querySelector('.wmk-grip').addEventListener('pointerdown',e=>drag(e,true));
}
const q=s=>document.querySelector(s);const g=work.garage,b=work.battle;g.classList.add('wmk-workspace');b.classList.add('wmk-workspace');
let fleet=q('.fleet'),hangar=q('.hangar-main'),stats=q('.details-panel');add('garage','fleet','FROTA',[...fleet.children]);add('garage','viewport','INSPEÇÃO DO BLINDADO',[q('.hangar-stage')]);add('garage','summary','FICHA DO VEÍCULO',[q('.vehicle-summary')]);add('garage','stats','PARÂMETROS',[...stats.children].slice(0,5));add('garage','modules','MÓDULOS E MELHORIAS',[...stats.children]);fleet.remove();hangar.remove();stats.remove();
add('battle','vehicle','VEÍCULO',[q('.battle-top .battle-card')]);add('battle','modes','MODOS DE MIRA',[q('.mode-selector')]);add('battle','objective','MISSÃO',[q('.objective-card'),q('#leaveBattle')]);add('battle','hp','INTEGRIDADE',[q('.battle-bottom .hud-box')]);add('battle','reload','RECARGA',[q('.battle-bottom .hud-box')]);add('battle','help','CONTROLES',[q('.controls-help')]);q('.battle-top').remove();q('.battle-bottom').remove();
const mini=document.createElement("div");mini.innerHTML='<canvas id="wmkMinimap" width="260" height="160"></canvas><small>AZUL · aliados | VERMELHO · inimigos</small>';presets.battle.minimap=[.76,.54,.24,.25];add("battle","minimap","MINIMAPA",[mini]);
function menu(){let el=q('#wmkPanelMenu');el.replaceChildren();for(const [id,p] of Object.entries(panels[currentPage]||{})){let l=document.createElement('label'),i=document.createElement('input');i.type='checkbox';i.checked=!p.hidden;i.onchange=()=>{p.hidden=!i.checked;repaint();persist()};l.append(i,' '+p.querySelector('.wmk-head strong').textContent);el.append(l)}if(currentPage==='tree')el.textContent='Árvore tecnológica: área de trabalho integral.'}
function options(){let el=q('#wmkLayouts');el.replaceChildren();for(const name of ['Padrão',...Object.keys(layouts).filter(n=>n!=='Padrão')]){let o=document.createElement('option');o.value=name;o.textContent=name;el.append(o)}el.value=active}
q('#wmkDefault').onclick=()=>{active='Padrão';options();apply(defaults())};q('#wmkClean').onclick=()=>{for(const [id,p] of Object.entries(panels[currentPage]||{}))p.hidden=currentPage==='garage'?id!=='viewport':true;if(currentPage==='garage')rect(panels.garage.viewport,[0,0,1,1]);menu();repaint();persist()};q('#wmkSave').onclick=()=>{let n=prompt('Nome do layout personalizado:');if(!n||!n.trim()||n.trim()==='Padrão')return;active=n.trim().slice(0,60);layouts[active]=collect();options();persist()};q('#wmkLayouts').onchange=e=>{active=e.target.value;apply(active==='Padrão'?defaults():layouts[active])};q('#wmkExport').onclick=()=>{let a=document.createElement('a');let url=URL.createObjectURL(new Blob([JSON.stringify({version:1,layout:collect()},null,2)],{type:'application/json'}));a.href=url;a.download='wmk-tankwar-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};q('#wmkImport').onclick=()=>q('#wmkFile').click();q('#wmkFile').onchange=async e=>{try{let v=JSON.parse(await e.target.files[0].text());if(v.version!==1||!v.layout||!Object.values(v.layout).length)throw Error();for(const [page,group] of Object.entries(v.layout))for(const [id,x] of Object.entries(group))if(!panels[page]?.[id]||!valid(x.r))throw Error();apply(v.layout);notify('Layout importado.')}catch{notify('Arquivo de layout inválido.')}e.target.value=''};
const original=showPage;showPage=function(page){original(page);menu()};options();apply(saved.current||defaults());
new ResizeObserver(()=>{if(currentPage==='garage'&&!panels.garage.viewport.hidden)drawHangar()}).observe(panels.garage.viewport);
})();


(() => {
 const top=document.querySelector(".topbar"), nav=document.querySelector(".nav");
 const actions=document.createElement("div");actions.className="wmk-command";
 actions.innerHTML='<button id="wmkBattleTop">BATALHA</button><button id="wmkTrainTop">TREINAMENTO</button><button id="wmkDebugTop" title="Ferramentas de desenvolvimento">⚙ DEBUG</button>';
 nav.after(actions);
 const d=document.createElement("dialog");d.className="wmk-debug";d.innerHTML='<form method="dialog"><header><strong>WMK · DEBUG / SANDBOX</strong><button value="close" aria-label="Fechar">×</button></header></form><p>Ferramentas locais de desenvolvimento. Alterações econômicas são salvas no perfil atual. Treinamento não concede recompensas.</p><label>Créditos W$ <input id="dbgCredits" type="number" min="0" max="1000000000" value="100000"></label><label>Experiência XP <input id="dbgXp" type="number" min="0" max="1000000000" value="10000"></label><div class="dbg-actions"><button id="dbgAdd">Adicionar recursos</button><button id="dbgSet">Definir saldo</button><button id="dbgSelected">Desbloquear selecionado e predecessores</button><button id="dbgAll">Desbloquear os 20 veículos</button><button id="dbgModules">Liberar módulos do selecionado</button><button id="dbgRepair">Treino: reparar e recarregar</button><button id="dbgTargets">Treino: restaurar alvos</button><button id="dbgRestart">Reiniciar treinamento</button></div><output id="dbgStatus"></output>';
 document.body.append(d);
 const say=m=>{$("dbgStatus").textContent=m;notify(m)};
 const commit=m=>{saveState();renderAll();say(m)};
 const amount=id=>{const n=$(id).valueAsNumber;return Number.isSafeInteger(n)&&n>=0&&n<=1e9?n:null};
 function funds(set){let c=amount("dbgCredits"),x=amount("dbgXp");if(c===null||x===null)return say("Informe valores inteiros entre 0 e 1 bilhão.");state.credits=set?c:Math.min(1e9,state.credits+c);state.xp=set?x:Math.min(1e9,state.xp+x);commit("Recursos atualizados.")}
 function unlock(t){const visited=new Set();while(t&&!visited.has(t.id)){visited.add(t.id);state.owned[t.id]=true;state.researched[t.id]=true;t=getTank(t.prev)}}
 $("dbgAdd").onclick=()=>funds(false);$("dbgSet").onclick=()=>funds(true);
 $("dbgSelected").onclick=()=>{unlock(getTank(state.selectedTank));commit("Veículo e predecessores liberados.")};
 $("dbgAll").onclick=()=>{if(!confirm("Liberar todos os veículos neste perfil?"))return;TANKS.forEach(unlock);commit("Todos os blindados liberados.")};
 $("dbgModules").onclick=()=>{const t=getTank(state.selectedTank);if(!t)return;unlock(t);state.modulesOwned[t.id]=moduleConfig(t).flatMap(g=>g.options.map(o=>o.id));commit("Módulos liberados para "+t.name+".")};
 $("dbgRepair").onclick=()=>{if(!game?.training)return say("Entre no campo de treinamento.");game.player.hp=game.player.maxHp;game.reload=0;updateBattleHud();say("Reparado e recarregado.")};
 $("dbgTargets").onclick=()=>{if(!game?.training)return say("Entre no campo de treinamento.");game.enemies=makeTrainingTargets();game.kills=0;game.shots=[];game.artyShells=[];updateBattleHud();say("Alvos restaurados.")};
 function launch(train){if(game?.active&&!confirm("Encerrar a sessão atual e iniciar outra?"))return;startBattle(train)}
 $("dbgRestart").onclick=()=>{d.close();launch(true)};
 $("wmkBattleTop").onclick=()=>launch(false);$("wmkTrainTop").onclick=()=>launch(true);
 $("wmkDebugTop").onclick=()=>{pressedKeys={};d.showModal()};
 d.addEventListener("close",()=>{pressedKeys={}});
 const origUpdate=updateGame;updateGame=function(dt){if(d.open)return;origUpdate(dt)};
 const origFire=firePlayer;firePlayer=function(){if(!d.open)origFire()};
 const origRender=renderGarage;renderGarage=function(){origRender();const t=getTank(state.selectedTank);$("wmkBattleTop").disabled=!isOwned(t.id);$("wmkTrainTop").disabled=!isOwned(t.id)};
 renderGarage();
})();

  
function makeBot(p,i,team,stats,tier){const hp=Math.max(220,Math.round(stats.hp*.78));return {x:p.x,y:p.y,team,angle:team==="blue"?-Math.PI/2:Math.PI/2,turretAngle:0,hp,maxHp:hp,armor:Math.max(15,Math.round(stats.armor*.7)),damage:Math.max(25,Math.round(stats.damage*.65)),pen:stats.pen,class:["medium","light","heavy","td","medium"][i%5],alive:true,cooldown:1+i*.5}}
function clearLine(a,b){let n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/24);for(let i=1;i<n;i++)if(isBlocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,1))return false;return true}
function botDamage(u,s){if(s.pen>=u.armor){u.hp=Math.max(0,u.hp-Math.round(s.damage));addEffect(u.x,u.y,"#f1b46b","-"+Math.round(s.damage));if(!u.hp){u.alive=false;addEffect(u.x,u.y,"#f0ad68","DESTRUÍDO")}}}
function drawMinimap(){const c=$("wmkMinimap");if(!c||!game)return;const ctx=c.getContext("2d"),w=c.width,h=c.height,sc=Math.min(w/WORLD_W,h/WORLD_H),ox=(w-WORLD_W*sc)/2,oy=(h-WORLD_H*sc)/2;ctx.fillStyle="#101610";ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(ox,oy);ctx.scale(sc,sc);ctx.fillStyle="#59634d";ctx.fillRect(0,0,WORLD_W,WORLD_H);ctx.fillStyle="#343d30";for(const o of game.training?trainingObstacles:game.map?.obstacles||obstacles){if(o.kind==="building")ctx.fillRect(o.x,o.y,o.w,o.h);else{ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill()}}const dot=(u,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(u.x,u.y,Math.max(32,3/sc),0,7);ctx.fill()};for(const u of game.enemies)if(u.alive)dot(u,"#ff665b");for(const u of game.allies||[])if(u.alive)dot(u,"#58aaff");if(game.player.hp>0)dot(game.player,"#b9e9ff");const r=$("battleCanvas").getBoundingClientRect(),cam=cameraFor(r.width,r.height);ctx.strokeStyle="#e7e8c7";ctx.lineWidth=1/sc;ctx.strokeRect(cam.x-r.width/2/cam.scale,cam.y-r.height/2/cam.scale,r.width/cam.scale,r.height/cam.scale);ctx.restore()}
(()=>{
const bar=document.querySelector(".wmk-command"),b=document.createElement("button");b.textContent="3×3 / 5×5";bar.append(b);const edit=document.createElement("button");edit.textContent="EDITOR DE MAPAS";bar.append(edit);const sound=document.createElement("button");sound.textContent="SOM: ON";bar.append(sound);sound.onclick=()=>{WMKAudio.enabled=!WMKAudio.enabled;sound.textContent="SOM: "+(WMKAudio.enabled?"ON":"OFF");WMKAudio.resume()};
document.addEventListener("pointerdown",()=>WMKAudio.resume(),{passive:true});
const modal=document.createElement("dialog");modal.className="wmk-debug";modal.innerHTML='<form method="dialog"><header><strong>TREINO EM EQUIPE</strong><button value="close">×</button></header></form><p>Você integra a equipe azul. Bots aliados e inimigos. Sem recompensas.</p><label>Mapa <select id="wmkTeamMap"><option value="default">Vale WMK</option><option value="custom">Mapa do editor</option></select></label><div class="dbg-actions"><button id="wmk3">3 × 3</button><button id="wmk5">5 × 5</button></div>';document.body.append(modal);
b.onclick=()=>{pressedKeys={};modal.showModal()};const launch=n=>{const map=$("wmkTeamMap").value==="custom"?WMKMaps.load():WMKMaps.defaultMap;if(!map)return notify("Salve um mapa no editor primeiro.");if(game?.active&&!confirm("Encerrar sessão atual?"))return;modal.close();startBattle({teamSize:n,map})};$("wmk3").onclick=()=>launch(3);$("wmk5").onclick=()=>launch(5);
edit.onclick=()=>window.open("editor-mapas.html","_blank","noopener");
$("battleCanvas").addEventListener("wheel",e=>{if(!game||game.mode!=="arcade")return;e.preventDefault();game.zoom=Math.max(.45,Math.min(1.35,game.zoom*(e.deltaY>0?.9:1.1)))},{passive:false});
const tick=updateGame;updateGame=function(dt){if(modal.open)return;tick(dt)};const shot=firePlayer;firePlayer=function(){if(!modal.open)shot()};
})();
