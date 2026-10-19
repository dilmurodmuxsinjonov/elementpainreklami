/**
 * Element Paint — Reklama va Kontent Boshqaruv Tizimi (App Logic)
 * 73 ta mahsulot monitoringi, video kontent rejalari va izohlar arxivi
 */

(function () {
  'use strict';

  // Local storage key
  const STORAGE_KEY = 'elementpaint_ad_data_v1';

  // State
  let catalog = {
    categories: [],
    products: []
  };

  let adStore = {
    products: {} // [id]: { status: 'red' | 'yellow' | 'blue', tasks: [...] }
  };

  let currentFilter = {
    status: 'all',     // 'all' | 'red' | 'yellow' | 'blue'
    brand: 'all',
    category: 'all',
    search: '',
    view: 'table'      // 'table' | 'cards'
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
    
    // Stats
    statTotal: document.getElementById('statTotal'),
    statRed: document.getElementById('statRed'),
    statYellow: document.getElementById('statYellow'),
    statBlue: document.getElementById('statBlue'),
    statVideos: document.getElementById('statVideos'),
    
    // Progress
    progBlue: document.getElementById('progBlue'),
    progYellow: document.getElementById('progYellow'),
    progRed: document.getElementById('progRed'),
    progressPercent: document.getElementById('progressPercent'),
    
    // Filter controls
    tabAll: document.getElementById('tabAll'),
    tabRed: document.getElementById('tabRed'),
    tabYellow: document.getElementById('tabYellow'),
    tabBlue: document.getElementById('tabBlue'),
    countAll: document.getElementById('countAll'),
    countRed: document.getElementById('countRed'),
    countYellow: document.getElementById('countYellow'),
    countBlue: document.getElementById('countBlue'),
    
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
    taskLinkInput: document.getElementById('taskLinkInput'),
    taskCommentInput: document.getElementById('taskCommentInput'),
    taskDeadlineInput: document.getElementById('taskDeadlineInput'),
    btnSaveTask: document.getElementById('btnSaveTask'),
    btnCancelTaskEdit: document.getElementById('btnCancelTaskEdit'),
    
    // Modal Tasks List
    modalTaskList: document.getElementById('modalTaskList'),
    modalTaskCount: document.getElementById('modalTaskCount'),
    modalEmptyTasks: document.getElementById('modalEmptyTasks'),
    
    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // Status mapping
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

  const TYPE_NAMES = {
    reels: 'Reels / Shorts',
    tiktok: 'TikTok',
    youtube: 'YouTube Video',
    banner: 'Banner / Post',
    telegram: 'Telegram Post',
    tv: 'TV / Media',
    script: 'Reklama ssenariysi'
  };

  // Initialize
  function init() {
    loadCatalogData();
    loadAdStore();
    setupFilters();
    setupEventListeners();
    setupModalLightDismiss();
    render();
  }

  // Load Catalog Data
  function loadCatalogData() {
    if (window.CATALOG_DATA && window.CATALOG_DATA.products) {
      catalog = window.CATALOG_DATA;
    } else {
      console.warn('window.CATALOG_DATA topilmadi, lokal fetch qilinadi...');
      fetch('data/catalog-snapshot.json')
        .then(res => res.json())
        .then(data => {
          catalog = data;
          setupFilters();
          render();
        })
        .catch(err => console.error('Katalogni yuklashda xato:', err));
    }
  }

  // Load Saved Ad Store from LocalStorage
  function loadAdStore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        adStore = JSON.parse(saved);
      }
    } catch (e) {
      console.error('LocalStorage o‘qishda xato:', e);
    }

    if (!adStore.products) {
      adStore.products = {};
    }

    // Default status is 'red' (Hali qilinmagan) for every product
    catalog.products.forEach(p => {
      if (!adStore.products[p.id]) {
        adStore.products[p.id] = {
          status: 'red',
          tasks: []
        };
      }
    });
  }

  // Save to LocalStorage
  function saveAdStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adStore));
    } catch (e) {
      console.error('LocalStorage saqlashda xato:', e);
      showToast('Xatolik: Ma’lumotlarni brauzerga saqlab bo‘lmadi!', 'warning');
    }
  }

  // Setup Category and Brand Dropdowns
  function setupFilters() {
    if (!catalog.categories || !catalog.products) return;

    // Brands
    const brands = Array.from(new Set(catalog.products.map(p => p.brand).filter(Boolean))).sort();
    el.brandSelect.innerHTML = '<option value="all">Barcha brendlar</option>' +
      brands.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');

    // Categories
    el.categorySelect.innerHTML = '<option value="all">Barcha kategoriyalar</option>' +
      catalog.categories.map(c => {
        const name = c.name?.uz || c.name || c.id;
        return `<option value="${escapeHtml(c.id)}">${escapeHtml(name)}</option>`;
      }).join('');
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Status tabs
    el.tabAll.addEventListener('click', () => setStatusFilter('all'));
    el.tabRed.addEventListener('click', () => setStatusFilter('red'));
    el.tabYellow.addEventListener('click', () => setStatusFilter('yellow'));
    el.tabBlue.addEventListener('click', () => setStatusFilter('blue'));

    // Search and select filters
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
      currentFilter.brand = 'all';
      currentFilter.category = 'all';
      currentFilter.search = '';
      el.searchInput.value = '';
      el.brandSelect.value = 'all';
      el.categorySelect.value = 'all';
      updateTabButtons();
      render();
    });

    // View toggles
    el.viewTableBtn.addEventListener('click', () => switchView('table'));
    el.viewCardsBtn.addEventListener('click', () => switchView('cards'));

    // Export / Import
    el.btnExportJson.addEventListener('click', exportJson);
    el.btnImportJson.addEventListener('click', () => el.fileImportInput.click());
    el.fileImportInput.addEventListener('change', importJson);
    el.btnExportCsv.addEventListener('click', exportCsv);
    el.btnPrintReport.addEventListener('click', () => window.print());

    // Modal Events
    el.modalCloseBtn.addEventListener('click', closeModal);

    // Modal Status Radio Buttons
    [el.statusRadioRed, el.statusRadioYellow, el.statusRadioBlue].forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (!activeProductId) return;
        const newStatus = e.target.value;
        setProductStatus(activeProductId, newStatus);
        updateModalStatusSelection(newStatus);
        render();
        showToast(`Mahsulot holati: "${STATUS_CONFIG[newStatus].label}" ga o'zgartirildi`, 'info');
      });
    });

    // Task Form submit
    el.taskForm.addEventListener('submit', handleTaskFormSubmit);
    el.btnCancelTaskEdit.addEventListener('click', cancelTaskEdit);
  }

  // Light-dismiss implementation following modern-web-guidance for <dialog closedby="any">
  function setupModalLightDismiss() {
    const dialog = el.productModal;
    if (!dialog) return;

    // Fallback for browsers without native closedBy support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        // When clicking backdrop, target is the dialog element itself
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
    [el.tabAll, el.tabRed, el.tabYellow, el.tabBlue].forEach(btn => btn.classList.remove('active'));
    if (currentFilter.status === 'all') el.tabAll.classList.add('active');
    else if (currentFilter.status === 'red') el.tabRed.classList.add('active');
    else if (currentFilter.status === 'yellow') el.tabYellow.classList.add('active');
    else if (currentFilter.status === 'blue') el.tabBlue.classList.add('active');
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

  // Get product ad data
  function getProductAdData(productId) {
    if (!adStore.products[productId]) {
      adStore.products[productId] = {
        status: 'red',
        tasks: []
      };
    }
    return adStore.products[productId];
  }

  // Set product status
  function setProductStatus(productId, status) {
    const data = getProductAdData(productId);
    data.status = status;
    saveAdStore();
  }

  // Filtered Products
  function getFilteredProducts() {
    return catalog.products.filter(product => {
      const adData = getProductAdData(product.id);
      const productStatus = adData.status || 'red';

      // Status filter
      if (currentFilter.status !== 'all' && productStatus !== currentFilter.status) {
        return false;
      }

      // Brand filter
      if (currentFilter.brand !== 'all' && product.brand !== currentFilter.brand) {
        return false;
      }

      // Category filter
      if (currentFilter.category !== 'all' && product.categoryId !== currentFilter.category) {
        return false;
      }

      // Search query
      if (currentFilter.search) {
        const titleUz = (product.title?.uz || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        const id = (product.id || '').toLowerCase();
        const desc = (product.description?.uz || '').toLowerCase();
        
        // Also search in comments/tasks
        const tasksMatch = (adData.tasks || []).some(t => 
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

  // Calculate Global Statistics
  function updateKPIs() {
    const total = catalog.products.length;
    let countRed = 0;
    let countYellow = 0;
    let countBlue = 0;
    let totalVideos = 0;

    catalog.products.forEach(p => {
      const data = getProductAdData(p.id);
      const s = data.status || 'red';
      if (s === 'blue') countBlue++;
      else if (s === 'yellow') countYellow++;
      else countRed++;

      if (Array.isArray(data.tasks)) {
        totalVideos += data.tasks.length;
      }
    });

    // Update numbers
    el.statTotal.textContent = total;
    el.statRed.innerHTML = `${countRed} <small>ta</small>`;
    el.statYellow.innerHTML = `${countYellow} <small>ta</small>`;
    el.statBlue.innerHTML = `${countBlue} <small>ta</small>`;
    el.statVideos.innerHTML = `${totalVideos} <small>ta</small>`;

    // Tab counts
    el.countAll.textContent = total;
    el.countRed.textContent = countRed;
    el.countYellow.textContent = countYellow;
    el.countBlue.textContent = countBlue;

    // Progress bar
    const pctBlue = total ? ((countBlue / total) * 100).toFixed(1) : 0;
    const pctYellow = total ? ((countYellow / total) * 100).toFixed(1) : 0;
    const pctRed = total ? ((countRed / total) * 100).toFixed(1) : 0;

    el.progBlue.style.width = `${pctBlue}%`;
    el.progYellow.style.width = `${pctYellow}%`;
    el.progRed.style.width = `${pctRed}%`;

    el.progressPercent.textContent = `${pctBlue}% tayyor (${countBlue} / ${total})`;
  }

  // Render Table & Cards
  function render() {
    updateKPIs();
    const filtered = getFilteredProducts();
    el.resultsCount.textContent = `${filtered.length} ta mahsulot ko'rsatilmoqda`;

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

  // Helper for Category Name
  function getCategoryName(categoryId) {
    const cat = catalog.categories.find(c => c.id === categoryId);
    return cat ? (cat.name?.uz || cat.name || categoryId) : categoryId;
  }

  // Helper for Image URL with fallback to online website
  function getImageUrl(relPath) {
    if (!relPath) return 'assets/logo_light.png';
    // Path might be local assets/catalog-2026/...
    return relPath;
  }

  // Render Table
  function renderTable(products) {
    el.tableBody.innerHTML = products.map((p, idx) => {
      const adData = getProductAdData(p.id);
      const status = adData.status || 'red';
      const cfg = STATUS_CONFIG[status];
      const tasks = adData.tasks || [];
      const latestTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;

      const titleUz = p.title?.uz || p.id;
      const categoryName = getCategoryName(p.categoryId);
      const packagesText = p.packages && p.packages.length ? `${p.packages.join(' / ')} ${p.packageUnit || 'kg'}` : '';

      const rowClass = `row-status-${status}`;

      return `
        <tr class="${rowClass}" data-product-id="${escapeHtml(p.id)}">
          <td style="font-weight: 700; color: #64748b;">${String(idx + 1).padStart(2, '0')}</td>
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
            <button 
              type="button" 
              class="videos-count-badge ${tasks.length > 0 ? 'has-videos' : ''}" 
              onclick="window.appOpenProduct('${escapeHtml(p.id)}')"
              title="Videolar va ishlarni ko'rish"
            >
              <span>🎬</span>
              <span><strong>${tasks.length}</strong> ta video / ish</span>
            </button>
          </td>
          <td class="latest-comment-cell">
            ${latestTask ? `
              <span class="latest-comment-text" title="${escapeHtml(latestTask.comment || latestTask.title)}">
                <strong>${escapeHtml(TYPE_NAMES[latestTask.type] || latestTask.type)}:</strong> ${escapeHtml(latestTask.title)}
              </span>
              <span class="latest-comment-date">${formatDate(latestTask.createdAt)} · ${STATUS_CONFIG[latestTask.status || 'red'].label}</span>
            ` : `<span style="color: #94a3b8; font-size: 0.8rem; font-style: italic;">Hali izoh yo'q</span>`}
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
                href="https://elementpaint.uz/?product=${encodeURIComponent(p.id)}" 
                target="_blank" 
                rel="noopener" 
                class="btn btn-outline btn-sm"
                title="Saytda ko'rish"
              >
                <span>↗</span>
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Render Cards
  function renderCards(products) {
    el.cardsGrid.innerHTML = products.map((p, idx) => {
      const adData = getProductAdData(p.id);
      const status = adData.status || 'red';
      const tasks = adData.tasks || [];
      const latestTask = tasks.length > 0 ? tasks[tasks.length - 1] : null;

      const titleUz = p.title?.uz || p.id;
      const categoryName = getCategoryName(p.categoryId);
      const packagesText = p.packages && p.packages.length ? `${p.packages.join(' / ')} ${p.packageUnit || 'kg'}` : '';

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
              <span style="font-size: 0.76rem; color: #64748b;">${escapeHtml(categoryName)}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="card-status-row">
              <span style="font-size: 0.8rem; font-weight: 600; color: #64748b;">Holati:</span>
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
              <strong>🎬 Rejalashtirilgan videolar (${tasks.length} ta):</strong>
              ${latestTask ? `
                <div style="margin-top: 4px;">
                  <span style="font-weight: 600; color: #1e293b;">${escapeHtml(latestTask.title)}</span>
                  <p style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">${escapeHtml(latestTask.comment || 'Izohsiz')}</p>
                </div>
              ` : `
                <span style="color: #94a3b8; font-style: italic;">Hozircha video qo'shilmagan</span>
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
              <span>🎬 Ishlar va Izohlar (${tasks.length})</span>
            </button>
            <a 
              href="https://elementpaint.uz/?product=${encodeURIComponent(p.id)}" 
              target="_blank" 
              rel="noopener" 
              class="btn btn-outline btn-sm"
              title="Rasmiy saytda ko'rish"
            >
              <span>↗</span>
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  // Open Modal for Product
  function openProductModal(productId) {
    const product = catalog.products.find(p => p.id === productId);
    if (!product) return;

    activeProductId = productId;
    const adData = getProductAdData(productId);
    const status = adData.status || 'red';

    // Populate header info
    el.modalProductImg.src = getImageUrl(product.image);
    el.modalProductImg.onerror = () => { el.modalProductImg.src = `https://elementpaint.uz/${product.image}`; };
    el.modalProductTitle.textContent = product.title?.uz || product.id;
    
    const categoryName = getCategoryName(product.categoryId);
    const pack = product.packages ? product.packages.join(' / ') + ' ' + (product.packageUnit || 'kg') : '';
    el.modalProductMeta.textContent = `${product.brand} · ${categoryName} ${pack ? '· Qadoq: ' + pack : ''}`;

    el.modalSiteLink.href = `https://elementpaint.uz/?product=${encodeURIComponent(product.id)}`;

    // Set Radio status
    updateModalStatusSelection(status);

    // Reset task form
    resetTaskForm();

    // Render tasks list
    renderModalTaskList(adData.tasks || []);

    // Show modal using native showModal() as required by modern-web-guidance
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

  // Render Tasks List inside Modal
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

      return `
        <div class="task-card-item status-${task.status || 'red'}" data-task-id="${escapeHtml(task.id)}">
          <div class="task-card-top">
            <div class="task-card-meta">
              <span class="status-badge ${cfg.badgeClass}">
                <span class="status-dot ${task.status || 'red'}"></span>
                <span>${cfg.label}</span>
              </span>
              <span class="task-badge-type">${escapeHtml(typeLabel)}</span>
              <span class="task-date">📅 ${formatDate(task.createdAt)}</span>
              ${task.deadline ? `<span class="task-date" style="color: #d97706;">⏰ Muddat: ${escapeHtml(task.deadline)}</span>` : ''}
            </div>
            
            <div class="task-item-btns">
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
                title="Ushbu ishni o'chirish"
              >
                🗑️ O'chirish
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

            <!-- Quick subtask status change -->
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.75rem; color: #64748b;">Holatni almashtirish:</span>
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

  // Handle Task Form Submit
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
    const link = el.taskLinkInput.value.trim();
    const comment = el.taskCommentInput.value.trim();
    const deadline = el.taskDeadlineInput.value;

    const adData = getProductAdData(activeProductId);
    if (!adData.tasks) adData.tasks = [];

    if (editingTaskId) {
      // Edit existing task
      const idx = adData.tasks.findIndex(t => t.id === editingTaskId);
      if (idx !== -1) {
        adData.tasks[idx] = {
          ...adData.tasks[idx],
          title,
          type,
          status,
          link,
          comment,
          deadline,
          updatedAt: new Date().toISOString()
        };
        showToast('Reklama ishi yangilandi!', 'success');
      }
    } else {
      // Create new task
      const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title,
        type,
        status,
        link,
        comment,
        deadline,
        createdAt: new Date().toISOString()
      };
      adData.tasks.unshift(newTask);

      // Auto update product status if it was red and we added a planned/done video
      if (adData.status === 'red' && status !== 'red') {
        adData.status = status;
        updateModalStatusSelection(status);
      } else if (status === 'blue' && adData.status !== 'blue') {
        // Option to recommend blue
        adData.status = 'blue';
        updateModalStatusSelection('blue');
      }

      showToast('Yangi video / ish muvaffaqiyatli saqlandi!', 'success');
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
    el.taskLinkInput.value = '';
    el.taskCommentInput.value = '';
    el.taskDeadlineInput.value = '';
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
    el.taskLinkInput.value = task.link || '';
    el.taskCommentInput.value = task.comment || '';
    el.taskDeadlineInput.value = task.deadline || '';

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

  function changeTaskStatus(taskId, newStatus) {
    if (!activeProductId) return;
    const adData = getProductAdData(activeProductId);
    const task = (adData.tasks || []).find(t => t.id === taskId);
    if (!task) return;

    task.status = newStatus;
    saveAdStore();
    showToast(`Video holati: "${STATUS_CONFIG[newStatus].label}" ga o'zgartirildi`, 'info');
    renderModalTaskList(adData.tasks);
    render();
  }

  // Quick Status change from Table or Card dropdown
  function changeQuickStatus(productId, newStatus) {
    setProductStatus(productId, newStatus);
    render();
    showToast(`Holat: "${STATUS_CONFIG[newStatus].label}" ga o'zgartirildi`, 'info');
  }

  // Export JSON (Backup)
  function exportJson() {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      adStore: adStore
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elementpaint_reklama_baza_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Barcha reklama ma’lumotlari JSON faylga yuklab olindi!', 'success');
  }

  // Import JSON (Restore)
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
          alert('Fayl formati noto‘g‘ri yoki mos kelmaydi!');
        }
      } catch (err) {
        alert('Faylni o‘qishda xatolik: ' + err.message);
      }
      el.fileImportInput.value = '';
    };
    reader.readAsText(file);
  }

  // Export CSV (Excel format with UTF-8 BOM)
  function exportCsv() {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += '№;Mahsulot Nomi;Brend;Kategoriya;Qadoq;Reklama Holati;Jami Videolar;Videolar Tafsiloti;Izohlar\n';

    catalog.products.forEach((p, idx) => {
      const adData = getProductAdData(p.id);
      const statusLabel = STATUS_CONFIG[adData.status || 'red'].label;
      const categoryName = getCategoryName(p.categoryId);
      const pack = p.packages ? p.packages.join(' / ') + ' ' + (p.packageUnit || 'kg') : '';
      const tasks = adData.tasks || [];
      
      const taskDetails = tasks.map(t => `[${TYPE_NAMES[t.type] || t.type}] ${t.title} (${STATUS_CONFIG[t.status || 'red'].label})`).join(' | ');
      const comments = tasks.map(t => t.comment).filter(Boolean).join(' | ');

      const row = [
        idx + 1,
        `"${(p.title?.uz || p.id).replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${categoryName.replace(/"/g, '""')}"`,
        `"${pack.replace(/"/g, '""')}"`,
        `"${statusLabel}"`,
        tasks.length,
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

    showToast('Excel/CSV hisoboti muvaffaqiyatli yuklandi!', 'success');
  }

  // Toast Notification
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

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Date format
  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  }

  // Expose global window hooks for inline handlers
  window.appOpenProduct = openProductModal;
  window.appChangeQuickStatus = changeQuickStatus;
  window.appEditTask = editTask;
  window.appDeleteTask = deleteTask;
  window.appChangeTaskStatus = changeTaskStatus;

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
