/**
 * Element Paint — Reklama va Kontent Boshqaruv Tizimi (App Logic v2.1)
 * 100% O‘zbek tilida (Boshqa tillar cheklangan va faqat o'zbekcha mahsulot nomlari va birliklari)
 * 73 ta mahsulot monitoringi, video hisoboti (tasdiqlangan/kutilayotgan),
 * avtomatik hozirgi vaqt belgilash
 */

(function () {
  'use strict';

  // Local storage key
  const STORAGE_KEY = 'elementpaint_ad_data_v2';
  const LEGACY_STORAGE_KEY = 'elementpaint_ad_data_v1';

  // State
  let catalog = {
    categories: [],
    products: []
  };

  let adStore = {
    products: {} // [id]: { status: 'red' | 'yellow' | 'blue', tasks: [...] }
  };

  let currentFilter = {
    status: 'all',        // 'all' | 'red' | 'yellow' | 'blue' | 'approved'
    videoPresence: 'all', // 'all' | 'has_videos' | 'has_approved' | 'has_pending' | 'no_videos'
    brand: 'all',
    category: 'all',
    search: '',
    view: 'table'         // 'table' | 'cards'
  };

  let activeProductId = null;
  let editingTaskId = null;

  // DOM Elements
  const el = {
    tableBody: document.getElementById('adTableBody'),
    cardsGrid: document.getElementById('cardsGrid'),
    tableViewContainer: document.getElementById('tableViewContainer'),
    cardsViewContainer: document.getElementById('cardsViewContainer'),
    emptyState: document.getElementById('emptyState'),
    resultsCount: document.getElementById('resultsCount'),
    
    // KPI Stats
    statTotal: document.getElementById('statTotal'),
    statCoveredProducts: document.getElementById('statCoveredProducts'),
    statCoveragePercent: document.getElementById('statCoveragePercent'),
    statTotalVideos: document.getElementById('statTotalVideos'),
    statAvgVideos: document.getElementById('statAvgVideos'),
    statApprovedVideos: document.getElementById('statApprovedVideos'),
    statPendingVideos: document.getElementById('statPendingVideos'),
    statRed: document.getElementById('statRed'),
    
    // Progress
    progGreen: document.getElementById('progGreen'),
    progBlue: document.getElementById('progBlue'),
    progYellow: document.getElementById('progYellow'),
    progRed: document.getElementById('progRed'),
    progressPercent: document.getElementById('progressPercent'),
    
    // Filter controls
    tabAll: document.getElementById('tabAll'),
    tabRed: document.getElementById('tabRed'),
    tabYellow: document.getElementById('tabYellow'),
    tabBlue: document.getElementById('tabBlue'),
    tabApproved: document.getElementById('tabApproved'),
    countAll: document.getElementById('countAll'),
    countRed: document.getElementById('countRed'),
    countYellow: document.getElementById('countYellow'),
    countBlue: document.getElementById('countBlue'),
    countApproved: document.getElementById('countApproved'),
    
    videoFilterSelect: document.getElementById('videoFilterSelect'),
    brandSelect: document.getElementById('brandSelect'),
    categorySelect: document.getElementById('categorySelect'),
    searchInput: document.getElementById('searchInput'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    viewTableBtn: document.getElementById('viewTableBtn'),
    viewCardsBtn: document.getElementById('viewCardsBtn'),
    
    // Actions
    btnExportJson: document.getElementById('btnExportJson'),
    btnImportJson: document.getElementById('btnImportJson'),
    fileImportInput: document.getElementById('fileImportInput'),
    btnExportCsv: document.getElementById('btnExportCsv'),
    btnPrintReport: document.getElementById('btnPrintReport'),
    
    // Modal
    productModal: document.getElementById('productModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalProductImg: document.getElementById('modalProductImg'),
    modalProductTitle: document.getElementById('modalProductTitle'),
    modalProductMeta: document.getElementById('modalProductMeta'),
    modalSiteLink: document.getElementById('modalSiteLink'),
    
    // Modal Status Radio
    statusRadioRed: document.getElementById('statusRadioRed'),
    statusRadioYellow: document.getElementById('statusRadioYellow'),
    statusRadioBlue: document.getElementById('statusRadioBlue'),
    labelRadioRed: document.getElementById('labelRadioRed'),
    labelRadioYellow: document.getElementById('labelRadioYellow'),
    labelRadioBlue: document.getElementById('labelRadioBlue'),
    
    // Modal Task Form
    taskForm: document.getElementById('taskForm'),
    taskFormTitle: document.getElementById('taskFormTitle'),
    taskIdInput: document.getElementById('taskIdInput'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskTypeSelect: document.getElementById('taskTypeSelect'),
    taskStatusSelect: document.getElementById('taskStatusSelect'),
    taskCreatedAtInput: document.getElementById('taskCreatedAtInput'),
    taskIsApprovedInput: document.getElementById('taskIsApprovedInput'),
    taskLinkInput: document.getElementById('taskLinkInput'),
    taskCommentInput: document.getElementById('taskCommentInput'),
    btnSaveTask: document.getElementById('btnSaveTask'),
    btnCancelTaskEdit: document.getElementById('btnCancelTaskEdit'),
    
    // Modal Tasks List
    modalTaskList: document.getElementById('modalTaskList'),
    modalTaskCount: document.getElementById('modalTaskCount'),
    modalEmptyTasks: document.getElementById('modalEmptyTasks'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // Status mapping — Sof o‘zbek tilida
  const STATUS_CONFIG = {
    red: {
      key: 'red',
      label: 'Hali qilinmagan',
      icon: '🔴',
      color: '#ef4444',
      badgeClass: 'red'
    },
    yellow: {
      key: 'yellow',
      label: 'Reja tuzilgan',
      icon: '🟡',
      color: '#d97706',
      badgeClass: 'yellow'
    },
    blue: {
      key: 'blue',
      label: 'Tayyorlangan',
      icon: '🔵',
      color: '#2563eb',
      badgeClass: 'blue'
    }
  };

  // Video va kontent formatlari — To‘liq o‘zbekcha nomlar bilan
  const TYPE_NAMES = {
    reels: 'Instagram Reels (Qisqa video)',
    tiktok: 'TikTok Video',
    shorts: 'YouTube Shorts (Qisqa video)',
    youtube: 'YouTube Video (Katta video)',
    banner: 'Foto / Banner reklama',
    telegram: 'Telegram Post / Xabar',
    tv: 'TV / OAV / Tashqi reklama',
    script: 'Reklama ssenariysi'
  };

  // O'lchov birliklarini o'zbekchaga o'girish
  function getPackageUnit(product) {
    const u = (product && product.packageUnit) ? String(product.packageUnit).toLowerCase() : 'kg';
    if (u === 'kg') return 'kg';
    if (u === 'l' || u === 'liter' || u === 'litre') return 'litr';
    if (u === 'g' || u === 'gram') return 'gramm';
    if (u === 'pcs' || u === 'dona' || u === 'ta') return 'dona';
    return u;
  }

  // Initialize
  function init() {
    loadCatalogData();
    loadAdStore();
    setupFilters();
    setupEventListeners();
    setupModalLightDismiss();
    render();
  }

  // Load Catalog Data (faqat o'zbekcha tarjima bilan)
  function loadCatalogData() {
    if (window.CATALOG_DATA && window.CATALOG_DATA.products) {
      catalog = window.CATALOG_DATA;
    } else {
      console.warn('Katalog maʼlumotlari yuklanmoqda...');
      fetch('data/catalog-snapshot.json')
        .then(res => res.json())
        .then(data => {
          catalog = data;
          setupFilters();
          render();
        })
        .catch(err => console.error('Katalogni yuklashda xatolik:', err));
    }
  }

  // Load Saved Ad Store from LocalStorage
  function loadAdStore() {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      }
      if (saved) {
        adStore = JSON.parse(saved);
      }
    } catch (e) {
      console.error('LocalStorage o‘qishda xatolik:', e);
    }

    if (!adStore.products) {
      adStore.products = {};
    }

    // Har bir mahsulot uchun boshlang'ich holat: 'red' (Hali qilinmagan)
    catalog.products.forEach(p => {
      if (!adStore.products[p.id]) {
        adStore.products[p.id] = {
          status: 'red',
          tasks: []
        };
      } else {
        (adStore.products[p.id].tasks || []).forEach(t => {
          if (t.isApproved === undefined) {
            t.isApproved = false;
          }
        });
      }
    });
  }

  // Save to LocalStorage
  function saveAdStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adStore));
    } catch (e) {
      console.error('LocalStorage saqlashda xatolik:', e);
      showToast('Xatolik: Ma’lumotlarni brauzerga saqlab bo‘lmadi!', 'warning');
    }
  }

  // Setup Category and Brand Dropdowns (100% O‘zbekcha)
  function setupFilters() {
    if (!catalog.categories || !catalog.products) return;

    // Brendlar
    const brands = Array.from(new Set(catalog.products.map(p => p.brand).filter(Boolean))).sort();
    el.brandSelect.innerHTML = '<option value="all">Barcha brendlar</option>' +
      brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');

    // Toifalar (kategoriyalar) — qat'iy o'zbekcha nomi olinadi
    el.categorySelect.innerHTML = '<option value="all">Barcha toifalar</option>' +
      catalog.categories.map(c => {
        const name = (c.name && typeof c.name === 'object') ? (c.name.uz || Object.values(c.name)[0]) : (c.name || c.id);
        return `<option value="${escapeHtml(c.id)}">${escapeHtml(name)}</option>`;
      }).join('');
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Holatlar bo'yicha saralash
    el.tabAll.addEventListener('click', () => setStatusFilter('all'));
    el.tabRed.addEventListener('click', () => setStatusFilter('red'));
    el.tabYellow.addEventListener('click', () => setStatusFilter('yellow'));
    el.tabBlue.addEventListener('click', () => setStatusFilter('blue'));
    el.tabApproved.addEventListener('click', () => setStatusFilter('approved'));

    // Videolar mavjudligi bo'yicha filter
    el.videoFilterSelect.addEventListener('change', (e) => {
      currentFilter.videoPresence = e.target.value;
      render();
    });

    // Jonli qidiruv
    el.searchInput.addEventListener('input', (e) => {
      currentFilter.search = e.target.value.toLowerCase().trim();
      render();
    });

    el.brandSelect.addEventListener('change', (e) => {
      currentFilter.brand = e.target.value;
      render();
    });

    el.categorySelect.addEventListener('change', (e) => {
      currentFilter.category = e.target.value;
      render();
    });

    el.clearFiltersBtn.addEventListener('click', () => {
      currentFilter.status = 'all';
      currentFilter.videoPresence = 'all';
      currentFilter.brand = 'all';
      currentFilter.category = 'all';
      currentFilter.search = '';
      el.searchInput.value = '';
      el.brandSelect.value = 'all';
      el.categorySelect.value = 'all';
      el.videoFilterSelect.value = 'all';
      updateTabButtons();
      render();
    });

    // Ko'rinish almashtirish
    el.viewTableBtn.addEventListener('click', () => switchView('table'));
    el.viewCardsBtn.addEventListener('click', () => switchView('cards'));

    // Eksport va Import
    el.btnExportJson.addEventListener('click', exportJson);
    el.btnImportJson.addEventListener('click', () => el.fileImportInput.click());
    el.fileImportInput.addEventListener('change', importJson);
    el.btnExportCsv.addEventListener('click', exportCsv);
    el.btnPrintReport.addEventListener('click', () => window.print());

    // Modal hodisalari
    el.modalCloseBtn.addEventListener('click', closeModal);

    // Modal Status Radio tugmalari
    [el.statusRadioRed, el.statusRadioYellow, el.statusRadioBlue].forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (!activeProductId) return;
        const newStatus = e.target.value;
        setProductStatus(activeProductId, newStatus);
        updateModalStatusSelection(newStatus);
        render();
        showToast(`Mahsulot holati: «${STATUS_CONFIG[newStatus].label}» ga o‘zgartirildi`, 'info');
      });
    });

    // Topshiriq formasini yuborish
    el.taskForm.addEventListener('submit', handleTaskFormSubmit);
    el.btnCancelTaskEdit.addEventListener('click', cancelTaskEdit);
  }

  // Modal dialog yopilishi
  function setupModalLightDismiss() {
    const dialog = el.productModal;
    if (!dialog) return;

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;

        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );

        if (!isDialogContent) {
          closeModal();
        }
      });
    }

    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  function setStatusFilter(status) {
    currentFilter.status = status;
    updateTabButtons();
    render();
  }

  function updateTabButtons() {
    [el.tabAll, el.tabRed, el.tabYellow, el.tabBlue, el.tabApproved].forEach(btn => btn.classList.remove('active'));
    if (currentFilter.status === 'all') el.tabAll.classList.add('active');
    else if (currentFilter.status === 'red') el.tabRed.classList.add('active');
    else if (currentFilter.status === 'yellow') el.tabYellow.classList.add('active');
    else if (currentFilter.status === 'blue') el.tabBlue.classList.add('active');
    else if (currentFilter.status === 'approved') el.tabApproved.classList.add('active');
  }

  function switchView(viewName) {
    currentFilter.view = viewName;
    if (viewName === 'table') {
      el.viewTableBtn.classList.add('active');
      el.viewCardsBtn.classList.remove('active');
      el.tableViewContainer.hidden = false;
      el.cardsViewContainer.hidden = true;
    } else {
      el.viewTableBtn.classList.remove('active');
      el.viewCardsBtn.classList.add('active');
      el.tableViewContainer.hidden = true;
      el.cardsViewContainer.hidden = false;
    }
  }

  // Mahsulot reklama ma'lumotlarini olish
  function getProductAdData(productId) {
    if (!adStore.products[productId]) {
      adStore.products[productId] = {
        status: 'red',
        tasks: []
      };
    }
    return adStore.products[productId];
  }

  // Mahsulot statusini belgilash
  function setProductStatus(productId, status) {
    const data = getProductAdData(productId);
    data.status = status;
    saveAdStore();
  }

  // Filtrlangan mahsulotlar ro'yxati
  function getFilteredProducts() {
    return catalog.products.filter(product => {
      const adData = getProductAdData(product.id);
      const productStatus = adData.status || 'red';
      const tasks = adData.tasks || [];
      const hasApprovedTask = tasks.some(t => t.isApproved);
      const hasPendingTask = tasks.some(t => !t.isApproved);

      // Status filtri
      if (currentFilter.status === 'approved') {
        if (!hasApprovedTask) return false;
      } else if (currentFilter.status !== 'all' && productStatus !== currentFilter.status) {
        return false;
      }

      // Video mavjudligi bo'yicha
      if (currentFilter.videoPresence === 'has_videos' && tasks.length === 0) return false;
      if (currentFilter.videoPresence === 'has_approved' && !hasApprovedTask) return false;
      if (currentFilter.videoPresence === 'has_pending' && !hasPendingTask) return false;
      if (currentFilter.videoPresence === 'no_videos' && tasks.length > 0) return false;

      // Brend filtri
      if (currentFilter.brand !== 'all' && product.brand !== currentFilter.brand) {
        return false;
      }

      // Kategoriya filtri
      if (currentFilter.category !== 'all' && product.categoryId !== currentFilter.category) {
        return false;
      }

      // Qidiruv so'zi
      if (currentFilter.search) {
        const titleUz = (product.title?.uz || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        const id = (product.id || '').toLowerCase();
        const desc = (product.description?.uz || '').toLowerCase();
        
        const tasksMatch = tasks.some(t => 
          (t.title || '').toLowerCase().includes(currentFilter.search) ||
          (t.comment || '').toLowerCase().includes(currentFilter.search)
        );

        if (!titleUz.includes(currentFilter.search) &&
            !brand.includes(currentFilter.search) &&
            !id.includes(currentFilter.search) &&
            !desc.includes(currentFilter.search) &&
            !tasksMatch) {
          return false;
        }
      }

      return true;
    });
  }

  // Asosiy hisobotlar va KPI ko'rsatkichlarini hisoblash
  function updateKPIs() {
    const total = catalog.products.length;
    let countRed = 0;
    let countYellow = 0;
    let countBlue = 0;
    let countWithApproved = 0;
    
    let coveredProducts = 0;
    let totalVideos = 0;
    let approvedVideos = 0;
    let pendingVideos = 0;

    catalog.products.forEach(p => {
      const data = getProductAdData(p.id);
      const s = data.status || 'red';
      if (s === 'blue') countBlue++;
      else if (s === 'yellow') countYellow++;
      else countRed++;

      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      if (tasks.length > 0) {
        coveredProducts++;
        totalVideos += tasks.length;
        tasks.forEach(t => {
          if (t.isApproved) approvedVideos++;
          else pendingVideos++;
        });

        if (tasks.some(t => t.isApproved)) {
          countWithApproved++;
        }
      }
    });

    // Ko'rsatkichlarni yangilash
    el.statTotal.textContent = total;
    el.statCoveredProducts.innerHTML = `${coveredProducts} <small>/ ${total}</small>`;
    const coveragePct = total ? ((coveredProducts / total) * 100).toFixed(0) : 0;
    el.statCoveragePercent.textContent = `${coveragePct}% mahsulot qamrab olingan`;

    el.statTotalVideos.innerHTML = `${totalVideos} <small>ta video</small>`;
    const avg = coveredProducts > 0 ? (totalVideos / coveredProducts).toFixed(1) : 0;
    el.statAvgVideos.textContent = coveredProducts > 0 ? `O‘rtacha: ${avg} ta video/mahsulot` : 'Hozircha videolar yo‘q';

    el.statApprovedVideos.innerHTML = `${approvedVideos} <small>ta</small>`;
    el.statPendingVideos.innerHTML = `${pendingVideos} <small>ta</small>`;
    el.statRed.innerHTML = `${countRed} <small>ta</small>`;

    // Tugmalar soni
    el.countAll.textContent = total;
    el.countRed.textContent = countRed;
    el.countYellow.textContent = countYellow;
    el.countBlue.textContent = countBlue;
    el.countApproved.textContent = countWithApproved;

    // Tayyorlik darajasi progressi
    const pctGreen = totalVideos ? ((approvedVideos / totalVideos) * 100).toFixed(1) : 0;
    const pctBlue = total ? ((countBlue / total) * 100).toFixed(1) : 0;
    const pctYellow = total ? ((countYellow / total) * 100).toFixed(1) : 0;
    const pctRed = total ? ((countRed / total) * 100).toFixed(1) : 0;

    el.progGreen.style.width = `${pctGreen}%`;
    el.progBlue.style.width = `${pctBlue}%`;
    el.progYellow.style.width = `${pctYellow}%`;
    el.progRed.style.width = `${pctRed}%`;

    el.progressPercent.textContent = `${approvedVideos} ta video mijoz tomonidan tasdiqlangan (${pctGreen}%)`;
  }

  // Jadval va kartalarni render qilish
  function render() {
    updateKPIs();
    const filtered = getFilteredProducts();
    el.resultsCount.textContent = `${filtered.length} ta mahsulot ko‘rsatilmoqda`;

    if (filtered.length === 0) {
      el.emptyState.hidden = false;
      el.tableBody.innerHTML = '';
      el.cardsGrid.innerHTML = '';
      return;
    }

    el.emptyState.hidden = true;

    if (currentFilter.view === 'table') {
      renderTable(filtered);
    } else {
      renderCards(filtered);
    }
  }

  // Toifa nomini olish (qat'iy o'zbekcha)
  function getCategoryName(categoryId) {
    const cat = catalog.categories.find(c => c.id === categoryId);
    if (!cat) return categoryId;
    if (cat.name && typeof cat.name === 'object') {
      return cat.name.uz || Object.values(cat.name)[0] || categoryId;
    }
    return cat.name || categoryId;
  }

  // Mahsulot rasm havolasi
  function getImageUrl(relPath) {
    if (!relPath) return 'assets/logo_light.png';
    return relPath;
  }

  // Sanani o'zbekcha ko'rinishda formatlash (masalan: "19.10.2026, 23:35")
  function formatDateTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year}, ${hours}:${minutes}`;
    } catch {
      return isoStr;
    }
  }

  // datetime-local input uchun format (YYYY-MM-DDTHH:MM)
  function toDatetimeLocal(isoStr) {
    const d = isoStr ? new Date(isoStr) : new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Jadval ko'rinishini render qilish
  function renderTable(products) {
    el.tableBody.innerHTML = products.map((p, idx) => {
      const adData = getProductAdData(p.id);
      const status = adData.status || 'red';
      const tasks = adData.tasks || [];
      const latestTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;

      const approvedCount = tasks.filter(t => t.isApproved).length;
      const pendingCount = tasks.length - approvedCount;

      const titleUz = (p.title && p.title.uz) ? p.title.uz : p.id;
      const categoryName = getCategoryName(p.categoryId);
      const unit = getPackageUnit(p);
      const packagesText = p.packages && p.packages.length ? `${p.packages.join(' / ')} ${unit}` : '';

      const rowClass = `row-status-${status}`;

      return `
        <tr class="${rowClass}" data-product-id="${escapeHtml(p.id)}">
          <td style="font-weight: 800; color: #475569;">${String(idx + 1).padStart(2, '0')}</td>
          <td>
            <div class="product-thumb-wrap" onclick="window.appOpenProduct('${escapeHtml(p.id)}')">
              <img 
                src="${escapeHtml(getImageUrl(p.image))}" 
                alt="${escapeHtml(titleUz)}" 
                class="product-thumb" 
                loading="lazy"
                onerror="this.src='https://elementpaint.uz/${escapeHtml(p.image)}'"
              />
            </div>
          </td>
          <td>
            <div class="product-cell">
              <div class="product-details">
                <span class="product-brand-tag">${escapeHtml(p.brand)} · ${escapeHtml(categoryName)}</span>
                <span class="product-title" style="cursor: pointer;" onclick="window.appOpenProduct('${escapeHtml(p.id)}')">${escapeHtml(titleUz)}</span>
                ${packagesText ? `<span class="product-packages">Qadoq: ${escapeHtml(packagesText)}</span>` : ''}
              </div>
            </div>
          </td>
          <td>
            <select 
              class="quick-status-select select-${status}" 
              onchange="window.appChangeQuickStatus('${escapeHtml(p.id)}', this.value)"
              aria-label="Reklama holatini tanlash"
            >
              <option value="red" ${status === 'red' ? 'selected' : ''}>🔴 Hali qilinmagan</option>
              <option value="yellow" ${status === 'yellow' ? 'selected' : ''}>🟡 Reja tuzilgan</option>
              <option value="blue" ${status === 'blue' ? 'selected' : ''}>🔵 Tayyorlangan</option>
            </select>
          </td>
          <td>
            <div class="video-cell-group">
              <button 
                type="button" 
                class="videos-count-badge ${tasks.length > 0 ? 'has-videos' : ''}" 
                onclick="window.appOpenProduct('${escapeHtml(p.id)}')"
                title="Videolar va ishlarni boshqarish"
              >
                <span>🎬</span>
                <span><strong>${tasks.length}</strong> ta video</span>
              </button>

              ${tasks.length > 0 ? `
                <div class="video-approval-summary">
                  ${approvedCount > 0 ? `<span class="badge-approved-mini">✅ ${approvedCount} ta tasdiq</span>` : ''}
                  ${pendingCount > 0 ? `<span class="badge-pending-mini">⏳ ${pendingCount} ta kutilmoqda</span>` : ''}
                </div>
              ` : `<span style="font-size: 0.74rem; color: #94a3b8; font-style: italic;">Video rejalashtirilmagan</span>`}
            </div>
          </td>
          <td class="latest-comment-cell">
            ${latestTask ? `
              <span class="latest-comment-text" title="${escapeHtml(latestTask.comment || latestTask.title)}">
                <strong>${escapeHtml(TYPE_NAMES[latestTask.type] || latestTask.type)}:</strong> ${escapeHtml(latestTask.title)}
              </span>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                <span class="latest-comment-date">🕒 ${formatDateTime(latestTask.createdAt)}</span>
                ${latestTask.isApproved ? 
                  `<span class="badge-approved-mini" style="font-size: 0.68rem;">✅ Tasdiqlangan</span>` : 
                  `<span class="badge-pending-mini" style="font-size: 0.68rem;">⏳ Kutilmoqda</span>`}
              </div>
            ` : `<span style="color: #94a3b8; font-size: 0.8rem; font-style: italic;">Hali izoh kiritilmagan</span>`}
          </td>
          <td>
            <div class="table-actions">
              <button 
                type="button" 
                class="btn btn-primary btn-sm" 
                onclick="window.appOpenProduct('${escapeHtml(p.id)}')"
              >
                <span>➕ Ishlar & Izoh</span>
              </button>
              <a 
                href="https://elementpaint.uz/?lang=uz&product=${encodeURIComponent(p.id)}" 
                target="_blank" 
                rel="noopener" 
                class="btn btn-outline btn-sm"
                title="Rasmiy saytda ko‘rish (o‘zbek tilida)"
              >
                <span>↗</span>
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Kartalar ko'rinishini render qilish
  function renderCards(products) {
    el.cardsGrid.innerHTML = products.map((p) => {
      const adData = getProductAdData(p.id);
      const status = adData.status || 'red';
      const tasks = adData.tasks || [];
      const latestTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;

      const approvedCount = tasks.filter(t => t.isApproved).length;
      const pendingCount = tasks.length - approvedCount;

      const titleUz = (p.title && p.title.uz) ? p.title.uz : p.id;
      const categoryName = getCategoryName(p.categoryId);
      const unit = getPackageUnit(p);
      const packagesText = p.packages && p.packages.length ? `${p.packages.join(' / ')} ${unit}` : '';

      return `
        <article class="product-card card-${status}" data-product-id="${escapeHtml(p.id)}">
          <div class="card-top">
            <div class="card-thumb-wrap" onclick="window.appOpenProduct('${escapeHtml(p.id)}')">
              <img 
                src="${escapeHtml(getImageUrl(p.image))}" 
                alt="${escapeHtml(titleUz)}" 
                class="card-thumb" 
                loading="lazy"
                onerror="this.src='https://elementpaint.uz/${escapeHtml(p.image)}'"
              />
            </div>
            <div class="card-title-group">
              <span class="product-brand-tag">${escapeHtml(p.brand)}</span>
              <h3 class="product-title" style="cursor: pointer;" onclick="window.appOpenProduct('${escapeHtml(p.id)}')">${escapeHtml(titleUz)}</h3>
              <span style="font-size: 0.76rem; color: #475569; font-weight: 500;">${escapeHtml(categoryName)} ${packagesText ? '· ' + escapeHtml(packagesText) : ''}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="card-status-row">
              <span style="font-size: 0.8rem; font-weight: 700; color: #475569;">Holati:</span>
              <select 
                class="quick-status-select select-${status}" 
                onchange="window.appChangeQuickStatus('${escapeHtml(p.id)}', this.value)"
              >
                <option value="red" ${status === 'red' ? 'selected' : ''}>🔴 Hali qilinmagan</option>
                <option value="yellow" ${status === 'yellow' ? 'selected' : ''}>🟡 Reja tuzilgan</option>
                <option value="blue" ${status === 'blue' ? 'selected' : ''}>🔵 Tayyorlangan</option>
              </select>
            </div>
            
            <div class="card-comments-box">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong>🎬 Videolar (${tasks.length} ta):</strong>
                ${tasks.length > 0 ? `
                  <div style="display: flex; gap: 4px;">
                    <span class="badge-approved-mini">✅ ${approvedCount}</span>
                    <span class="badge-pending-mini">⏳ ${pendingCount}</span>
                  </div>
                ` : ''}
              </div>
              ${latestTask ? `
                <div style="margin-top: 4px;">
                  <span style="font-weight: 700; color: #0f172a;">${escapeHtml(latestTask.title)}</span>
                  <p style="font-size: 0.8rem; color: #475569; margin-top: 2px;">${escapeHtml(latestTask.comment || 'Izohsiz')}</p>
                  <small style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">🕒 ${formatDateTime(latestTask.createdAt)}</small>
                </div>
              ` : `
                <span style="color: #94a3b8; font-style: italic;">Hozircha video qo‘shilmagan</span>
              `}
            </div>
          </div>
          <div class="card-footer">
            <button 
              type="button" 
              class="btn btn-primary btn-sm" 
              style="flex: 1;"
              onclick="window.appOpenProduct('${escapeHtml(p.id)}')"
            >
              <span>🎬 Ishlar va Videolar (${tasks.length})</span>
            </button>
            <a 
              href="https://elementpaint.uz/?lang=uz&product=${encodeURIComponent(p.id)}" 
              target="_blank" 
              rel="noopener" 
              class="btn btn-outline btn-sm"
              title="Rasmiy saytda ko‘rish (o‘zbek tilida)"
            >
              <span>↗</span>
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  // Mahsulot modalini ochish
  function openProductModal(productId) {
    const product = catalog.products.find(p => p.id === productId);
    if (!product) return;

    activeProductId = productId;
    const adData = getProductAdData(productId);
    const status = adData.status || 'red';

    // Mahsulot ma'lumotlarini o'zbekcha to'ldirish
    el.modalProductImg.src = getImageUrl(product.image);
    el.modalProductImg.onerror = () => { el.modalProductImg.src = `https://elementpaint.uz/${product.image}`; };
    el.modalProductTitle.textContent = (product.title && product.title.uz) ? product.title.uz : product.id;
    
    const categoryName = getCategoryName(product.categoryId);
    const unit = getPackageUnit(product);
    const pack = product.packages ? product.packages.join(' / ') + ' ' + unit : '';
    el.modalProductMeta.textContent = `${product.brand} · ${categoryName} ${pack ? '· Qadoq: ' + pack : ''}`;

    el.modalSiteLink.href = `https://elementpaint.uz/?lang=uz&product=${encodeURIComponent(product.id)}`;

    // Radio statusni belgilash
    updateModalStatusSelection(status);

    // Formani tozalash va hozirgi vaqtni avtomatik qo'yish
    resetTaskForm();

    // Videolar ro'yxatini chiqarish
    renderModalTaskList(adData.tasks || []);

    if (!el.productModal.open) {
      el.productModal.showModal();
    }
  }

  function updateModalStatusSelection(status) {
    [el.statusRadioRed, el.statusRadioYellow, el.statusRadioBlue].forEach(r => r.checked = false);
    [el.labelRadioRed, el.labelRadioYellow, el.labelRadioBlue].forEach(l => {
      l.classList.remove('selected-red', 'selected-yellow', 'selected-blue');
    });

    if (status === 'red') {
      el.statusRadioRed.checked = true;
      el.labelRadioRed.classList.add('selected-red');
    } else if (status === 'yellow') {
      el.statusRadioYellow.checked = true;
      el.labelRadioYellow.classList.add('selected-yellow');
    } else if (status === 'blue') {
      el.statusRadioBlue.checked = true;
      el.labelRadioBlue.classList.add('selected-blue');
    }
  }

  function closeModal() {
    if (el.productModal.open) {
      el.productModal.close();
    }
    activeProductId = null;
    editingTaskId = null;
  }

  // Modal ichidagi videolar ro'yxatini chiqarish
  function renderModalTaskList(tasks) {
    el.modalTaskCount.textContent = tasks.length;

    if (tasks.length === 0) {
      el.modalEmptyTasks.hidden = false;
      el.modalTaskList.innerHTML = '';
      return;
    }

    el.modalEmptyTasks.hidden = true;
    el.modalTaskList.innerHTML = tasks.map((task) => {
      const cfg = STATUS_CONFIG[task.status || 'red'];
      const typeLabel = TYPE_NAMES[task.type] || task.type || 'Video';
      const isApproved = !!task.isApproved;

      return `
        <div class="task-card-item status-${task.status || 'red'}" data-task-id="${escapeHtml(task.id)}">
          <div class="task-card-top">
            <div class="task-card-meta">
              <span class="status-badge ${cfg.badgeClass}">
                <span class="status-dot ${task.status || 'red'}"></span>
                <span>${cfg.label}</span>
              </span>
              <span class="task-badge-type">${escapeHtml(typeLabel)}</span>
              
              <!-- Mijoz tasdiqlash holati nishoni -->
              ${isApproved ? `
                <span class="task-badge-approved">
                  <span>✅</span>
                  <span>Mijoz tasdiqlagan (Ishlatilmoqda)</span>
                </span>
              ` : `
                <span class="task-badge-pending">
                  <span>⏳</span>
                  <span>Hali tasdiqlanmagan</span>
                </span>
              `}

              <!-- Aniq sana va vaqt -->
              <span class="task-date">🕒 ${formatDateTime(task.createdAt)}</span>
            </div>
            
            <div class="task-item-btns">
              <!-- Tezkor tasdiqlash tugmasi -->
              <button 
                type="button" 
                class="btn-toggle-approval ${isApproved ? 'is-approved' : 'not-approved'}"
                onclick="window.appToggleTaskApproval('${escapeHtml(task.id)}')"
                title="${isApproved ? 'Tasdiqni bekor qilish' : 'Mijoz tasdiqlagan deb belgilash'}"
              >
                ${isApproved ? '✅ Tasdiqlangan' : '⏳ Tasdiqlash'}
              </button>

              <button 
                type="button" 
                class="btn btn-outline btn-sm" 
                style="padding: 3px 8px; font-size: 0.74rem;"
                onclick="window.appEditTask('${escapeHtml(task.id)}')"
              >
                ✏️ Tahrirlash
              </button>
              <button 
                type="button" 
                class="btn-icon-danger" 
                onclick="window.appDeleteTask('${escapeHtml(task.id)}')"
                title="Ushbu ishni o‘chirish"
              >
                🗑️ O‘chirish
              </button>
            </div>
          </div>

          <h4 class="task-card-title">${escapeHtml(task.title)}</h4>
          
          ${task.comment ? `
            <div class="task-card-comment">${escapeHtml(task.comment)}</div>
          ` : ''}

          <div class="task-card-actions">
            <div>
              ${task.link ? `
                <a href="${escapeHtml(task.link)}" target="_blank" rel="noopener" class="task-link-btn">
                  <span>🔗 Video / Fayl havolasini ochish</span>
                  <span>↗</span>
                </a>
              ` : `<span style="font-size: 0.75rem; color: #94a3b8;">Havola kiritilmagan</span>`}
            </div>

            <!-- Holatni tez o'zgartirish -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.76rem; color: #475569; font-weight: 600;">Ish holati:</span>
              <select 
                class="quick-status-select select-${task.status || 'red'}" 
                style="padding: 2px 6px; font-size: 0.75rem;"
                onchange="window.appChangeTaskStatus('${escapeHtml(task.id)}', this.value)"
              >
                <option value="red" ${task.status === 'red' ? 'selected' : ''}>🔴 Hali qilinmagan</option>
                <option value="yellow" ${task.status === 'yellow' ? 'selected' : ''}>🟡 Reja tuzilgan</option>
                <option value="blue" ${task.status === 'blue' ? 'selected' : ''}>🔵 Tayyorlangan</option>
              </select>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Topshiriq formasini yuborish
  function handleTaskFormSubmit(e) {
    e.preventDefault();
    if (!activeProductId) return;

    const title = el.taskTitleInput.value.trim();
    if (!title) {
      alert('Iltimos, video yoki ish nomini kiriting!');
      el.taskTitleInput.focus();
      return;
    }

    const type = el.taskTypeSelect.value;
    const status = el.taskStatusSelect.value;
    const isApproved = el.taskIsApprovedInput.checked;
    const link = el.taskLinkInput.value.trim();
    const comment = el.taskCommentInput.value.trim();

    // Agar sana vaqt kiritilmagan bo'lsa, aynan o'sha payt (hozirgi vaqt) saqlanadi
    let createdAt = el.taskCreatedAtInput.value;
    if (!createdAt) {
      createdAt = new Date().toISOString();
    } else {
      createdAt = new Date(createdAt).toISOString();
    }

    const adData = getProductAdData(activeProductId);
    if (!adData.tasks) adData.tasks = [];

    if (editingTaskId) {
      // Mavjud topshiriqni tahrirlash
      const idx = adData.tasks.findIndex(t => t.id === editingTaskId);
      if (idx !== -1) {
        adData.tasks[idx] = {
          ...adData.tasks[idx],
          title,
          type,
          status,
          isApproved,
          link,
          comment,
          createdAt: createdAt,
          updatedAt: new Date().toISOString()
        };
        showToast('Reklama ishi muvaffaqiyatli yangilandi!', 'success');
      }
    } else {
      // Yangi topshiriq qo'shish
      const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title,
        type,
        status,
        isApproved,
        link,
        comment,
        createdAt: createdAt
      };
      adData.tasks.unshift(newTask);

      // Agar video tasdiqlangan bo'lsa yoki tayyorlangan bo'lsa, mahsulotni ko'k qilish
      if (isApproved || status === 'blue') {
        adData.status = 'blue';
        updateModalStatusSelection('blue');
      } else if (adData.status === 'red' && status !== 'red') {
        adData.status = status;
        updateModalStatusSelection(status);
      }

      showToast('Yangi video muvaffaqiyatli saqlandi!', 'success');
    }

    saveAdStore();
    resetTaskForm();
    renderModalTaskList(adData.tasks);
    render();
  }

  function resetTaskForm() {
    editingTaskId = null;
    el.taskIdInput.value = '';
    el.taskTitleInput.value = '';
    el.taskTypeSelect.value = 'reels';
    el.taskStatusSelect.value = 'red';
    el.taskIsApprovedInput.checked = false;
    el.taskLinkInput.value = '';
    el.taskCommentInput.value = '';
    
    // Sukut bo'yicha aynan hozirgi sana va vaqt qo'yiladi
    el.taskCreatedAtInput.value = toDatetimeLocal(new Date().toISOString());

    el.taskFormTitle.innerHTML = '<span>➕</span> Yangi Video / Reklama Ishi Qo‘shish';
    el.btnSaveTask.textContent = '➕ Ishni Saqlash';
    el.btnCancelTaskEdit.hidden = true;
  }

  function editTask(taskId) {
    if (!activeProductId) return;
    const adData = getProductAdData(activeProductId);
    const task = (adData.tasks || []).find(t => t.id === taskId);
    if (!task) return;

    editingTaskId = taskId;
    el.taskIdInput.value = task.id;
    el.taskTitleInput.value = task.title || '';
    el.taskTypeSelect.value = task.type || 'reels';
    el.taskStatusSelect.value = task.status || 'red';
    el.taskIsApprovedInput.checked = !!task.isApproved;
    el.taskLinkInput.value = task.link || '';
    el.taskCommentInput.value = task.comment || '';
    el.taskCreatedAtInput.value = toDatetimeLocal(task.createdAt);

    el.taskFormTitle.innerHTML = '<span>✏️</span> Reklama Ishini Tahrirlash';
    el.btnSaveTask.textContent = '💾 O‘zgarishlarni Saqlash';
    el.btnCancelTaskEdit.hidden = false;

    el.taskTitleInput.focus();
  }

  function cancelTaskEdit() {
    resetTaskForm();
  }

  function deleteTask(taskId) {
    if (!activeProductId) return;
    if (!confirm('Haqiqatan ham bu video/ishni o‘chirmoqchimisiz?')) return;

    const adData = getProductAdData(activeProductId);
    adData.tasks = (adData.tasks || []).filter(t => t.id !== taskId);
    saveAdStore();

    showToast('Ish o‘chirildi', 'info');
    renderModalTaskList(adData.tasks);
    render();
  }

  // Mijoz tasdiqlashini 1-bosishda o'zgartirish
  function toggleTaskApproval(taskId) {
    if (!activeProductId) return;
    const adData = getProductAdData(activeProductId);
    const task = (adData.tasks || []).find(t => t.id === taskId);
    if (!task) return;

    task.isApproved = !task.isApproved;
    if (task.isApproved) {
      task.status = 'blue';
      adData.status = 'blue';
      updateModalStatusSelection('blue');
    }

    saveAdStore();
    showToast(task.isApproved ? 'Video: Mijoz tasdiqlagan deb belgilandi! ✅' : 'Tasdiq holati olib tashlandi ⏳', 'success');
    renderModalTaskList(adData.tasks);
    render();
  }

  function changeTaskStatus(taskId, newStatus) {
    if (!activeProductId) return;
    const adData = getProductAdData(activeProductId);
    const task = (adData.tasks || []).find(t => t.id === taskId);
    if (!task) return;

    task.status = newStatus;
    saveAdStore();
    showToast(`Video holati: «${STATUS_CONFIG[newStatus].label}» ga o‘zgartirildi`, 'info');
    renderModalTaskList(adData.tasks);
    render();
  }

  // Tezkor holatni o'zgartirish
  function changeQuickStatus(productId, newStatus) {
    setProductStatus(productId, newStatus);
    render();
    showToast(`Holat: «${STATUS_CONFIG[newStatus].label}» ga o‘zgartirildi`, 'info');
  }

  // JSON Zaxira yuklab olish
  function exportJson() {
    const backupData = {
      version: 2,
      til: 'uz',
      eksportVaqti: new Date().toISOString(),
      adStore: adStore
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elementpaint_reklama_zaxira_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Barcha reklama maʼlumotlari zaxira faylga saqlandi!', 'success');
  }

  // JSON Zaxirani tiklash
  function importJson(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.adStore && imported.adStore.products) {
          adStore = imported.adStore;
          saveAdStore();
          render();
          showToast('Zaxira nusxa muvaffaqiyatli tiklandi!', 'success');
        } else if (imported.products) {
          adStore = imported;
          saveAdStore();
          render();
          showToast('Zaxira nusxa muvaffaqiyatli tiklandi!', 'success');
        } else {
          alert('Fayl formati mos kelmadi yoki xatolik mavjud!');
        }
      } catch (err) {
        alert('Faylni o‘qishda xatolik yuz berdi: ' + err.message);
      }
      el.fileImportInput.value = '';
    };
    reader.readAsText(file);
  }

  // Excel / CSV Hisobotini o'zbekcha sarlavhalar bilan eksport qilish
  function exportCsv() {
    let csv = '\uFEFF'; // Excel uchun UTF-8 BOM
    csv += '№;Mahsulot Nomi;Brend;Toifa (Kategoriya);Qadoq;Reklama Holati;Jami Videolar;Mijoz Tasdiqlagan Videolar;Tasdiqlanmagan Videolar;Videolar Tafsiloti;Izohlar\n';

    catalog.products.forEach((p, idx) => {
      const adData = getProductAdData(p.id);
      const statusLabel = STATUS_CONFIG[adData.status || 'red'].label;
      const categoryName = getCategoryName(p.categoryId);
      const unit = getPackageUnit(p);
      const pack = p.packages ? p.packages.join(' / ') + ' ' + unit : '';
      const tasks = adData.tasks || [];
      
      const approvedCount = tasks.filter(t => t.isApproved).length;
      const pendingCount = tasks.length - approvedCount;

      const taskDetails = tasks.map(t => {
        const appr = t.isApproved ? '✅ Tasdiqlangan' : '⏳ Kutilmoqda';
        return `[${TYPE_NAMES[t.type] || t.type}] ${t.title} (${STATUS_CONFIG[t.status || 'red'].label}, ${appr}, Vaqt: ${formatDateTime(t.createdAt)})`;
      }).join(' | ');

      const comments = tasks.map(t => t.comment).filter(Boolean).join(' | ');

      const row = [
        idx + 1,
        `"${((p.title && p.title.uz) ? p.title.uz : p.id).replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${categoryName.replace(/"/g, '""')}"`,
        `"${pack.replace(/"/g, '""')}"`,
        `"${statusLabel}"`,
        tasks.length,
        approvedCount,
        pendingCount,
        `"${taskDetails.replace(/"/g, '""')}"`,
        `"${comments.replace(/"/g, '""')}"`
      ];

      csv += row.join(';') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elementpaint_reklama_hisoboti_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Excel/CSV hisoboti muvaffaqiyatli yuklab olindi!', 'success');
  }

  // Bildirishnoma (Toast)
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // HTML belgilarni xavfsiz qilish
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Global funksiyalarni ulash
  window.appOpenProduct = openProductModal;
  window.appChangeQuickStatus = changeQuickStatus;
  window.appEditTask = editTask;
  window.appDeleteTask = deleteTask;
  window.appToggleTaskApproval = toggleTaskApproval;
  window.appChangeTaskStatus = changeTaskStatus;

  // Yuklanganda ishga tushirish
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
