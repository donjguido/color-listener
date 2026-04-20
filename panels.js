(function () {
  const STORAGE_KEY = 'colorListener.panelState.v2';
  const LEGACY_KEY = 'colorListener.panelState.v1';
  const panel = document.getElementById('controlsPanel');
  const dockBottom = document.getElementById('panelDockBottom');
  const menuBtn = document.getElementById('panelMenuBtn');
  const menu = document.getElementById('panelMenu');
  if (!panel || !menuBtn || !menu || !dockBottom) return;

  const zones = { right: panel, bottom: dockBottom };
  const sections = Array.from(panel.querySelectorAll('.panel-section[data-panel-id]'));
  const titles = {};
  sections.forEach(s => {
    titles[s.dataset.panelId] = s.querySelector('h2').textContent.trim();
  });
  const defaultOrder = sections.map(s => s.dataset.panelId);

  function defaultState() {
    return {
      layouts: { right: defaultOrder.slice(), bottom: [] },
      hidden: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const known = new Set(defaultOrder);
        const right = (parsed.layouts?.right || []).filter(id => known.has(id));
        const bottom = (parsed.layouts?.bottom || []).filter(id => known.has(id));
        const placed = new Set([...right, ...bottom]);
        defaultOrder.forEach(id => { if (!placed.has(id)) right.push(id); });
        const hidden = (parsed.hidden || []).filter(id => known.has(id));
        return { layouts: { right, bottom }, hidden };
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const known = new Set(defaultOrder);
        const right = (parsed.order || []).filter(id => known.has(id));
        defaultOrder.forEach(id => { if (!right.includes(id)) right.push(id); });
        const hidden = (parsed.hidden || []).filter(id => known.has(id));
        return { layouts: { right, bottom: [] }, hidden };
      }
    } catch {}
    return defaultState();
  }

  let state = loadState();

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function zoneOf(id) {
    return state.layouts.bottom.includes(id) ? 'bottom' : 'right';
  }

  function addCloseButtons() {
    sections.forEach(section => {
      const h2 = section.querySelector('h2');
      if (!h2 || h2.querySelector('.panel-close')) return;
      const btn = document.createElement('button');
      btn.className = 'panel-close';
      btn.type = 'button';
      btn.setAttribute('aria-label', `Hide ${titles[section.dataset.panelId]} panel`);
      btn.innerHTML = '&times;';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        hidePanel(section.dataset.panelId);
      });
      h2.appendChild(btn);
      h2.classList.add('panel-heading');
      h2.addEventListener('mousedown', (e) => {
        if (e.target.closest('.panel-close')) return;
        section.setAttribute('draggable', 'true');
      });
      const clearDraggable = () => section.removeAttribute('draggable');
      h2.addEventListener('mouseup', clearDraggable);
      h2.addEventListener('mouseleave', clearDraggable);
      wireDrag(section);
    });
  }

  function render() {
    ['right', 'bottom'].forEach(zone => {
      state.layouts[zone].forEach(id => {
        const section = sections.find(s => s.dataset.panelId === id);
        if (!section) return;
        section.classList.toggle('in-bottom-dock', zone === 'bottom');
        zones[zone].appendChild(section);
      });
    });
    sections.forEach(section => {
      section.hidden = state.hidden.includes(section.dataset.panelId);
    });
    dockBottom.classList.toggle('is-empty', state.layouts.bottom.length === 0);
    renderMenu();
  }

  function renderMenu() {
    menu.innerHTML = '';
    const all = [...state.layouts.right, ...state.layouts.bottom]
      .slice()
      .sort((a, b) => titles[a].localeCompare(titles[b]));
    all.forEach(id => {
      const label = document.createElement('label');
      label.className = 'panel-menu-item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !state.hidden.includes(id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) showPanel(id); else hidePanel(id);
      });
      const span = document.createElement('span');
      span.textContent = titles[id];
      label.appendChild(checkbox);
      label.appendChild(span);
      menu.appendChild(label);
    });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'panel-menu-reset';
    reset.textContent = 'Reset layout';
    reset.addEventListener('click', () => {
      state = defaultState();
      saveState();
      render();
    });
    menu.appendChild(reset);
  }

  function hidePanel(id) {
    if (!state.hidden.includes(id)) state.hidden.push(id);
    saveState();
    render();
  }

  function showPanel(id) {
    state.hidden = state.hidden.filter(h => h !== id);
    saveState();
    render();
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !menu.hidden;
    menu.hidden = open;
    menuBtn.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
      menu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Drag-and-drop reordering (across zones)
  let dragId = null;

  function moveTo(zone, targetId, placeBefore) {
    // Remove from any current zone.
    state.layouts.right = state.layouts.right.filter(id => id !== dragId);
    state.layouts.bottom = state.layouts.bottom.filter(id => id !== dragId);
    const arr = state.layouts[zone];
    if (!targetId) {
      arr.push(dragId);
    } else {
      const idx = arr.indexOf(targetId);
      if (idx === -1) arr.push(dragId);
      else arr.splice(placeBefore ? idx : idx + 1, 0, dragId);
    }
    saveState();
    render();
  }

  function clearDragHints() {
    sections.forEach(s => s.classList.remove(
      'drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right'
    ));
    Object.values(zones).forEach(z => z.classList.remove('drag-over-zone'));
  }

  function wireDrag(section) {
    section.addEventListener('dragstart', (e) => {
      dragId = section.dataset.panelId;
      section.classList.add('dragging');
      document.body.classList.add('dragging-panel');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); } catch {}
    });
    section.addEventListener('dragend', () => {
      section.classList.remove('dragging');
      document.body.classList.remove('dragging-panel');
      clearDragHints();
      dragId = null;
    });
    section.addEventListener('dragover', (e) => {
      if (!dragId || dragId === section.dataset.panelId) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      const parentZone = section.parentElement?.dataset?.zone;
      const rect = section.getBoundingClientRect();
      clearDragHints();
      if (parentZone === 'bottom') {
        const before = (e.clientX - rect.left) < rect.width / 2;
        section.classList.toggle('drag-over-left', before);
        section.classList.toggle('drag-over-right', !before);
      } else {
        const before = (e.clientY - rect.top) < rect.height / 2;
        section.classList.toggle('drag-over-top', before);
        section.classList.toggle('drag-over-bottom', !before);
      }
    });
    section.addEventListener('dragleave', () => {
      section.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right');
    });
    section.addEventListener('drop', (e) => {
      if (!dragId || dragId === section.dataset.panelId) return;
      e.preventDefault();
      e.stopPropagation();
      const parentZone = section.parentElement?.dataset?.zone || 'right';
      const rect = section.getBoundingClientRect();
      const before = parentZone === 'bottom'
        ? (e.clientX - rect.left) < rect.width / 2
        : (e.clientY - rect.top) < rect.height / 2;
      moveTo(parentZone, section.dataset.panelId, before);
    });
  }

  // Allow dropping into empty space of a zone (appends to end).
  Object.entries(zones).forEach(([name, el]) => {
    el.addEventListener('dragover', (e) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('drag-over-zone');
    });
    el.addEventListener('dragleave', (e) => {
      if (e.target === el) el.classList.remove('drag-over-zone');
    });
    el.addEventListener('drop', (e) => {
      if (!dragId) return;
      e.preventDefault();
      el.classList.remove('drag-over-zone');
      moveTo(name, null, false);
    });
  });

  addCloseButtons();
  render();
})();
