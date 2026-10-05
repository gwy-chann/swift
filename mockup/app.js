/**
 * SWIFT - Motorcycle Parts & Repair Shop Management System
 * Interactive Application Engine & State Management
 */

// ==========================================================================
// 1. Data Store (Realistic Motorcycle Workshop Database)
// ==========================================================================
const SWIFT_DB = {
    inventory: [
        { sku: 'YAM-NMAX-BL01', name: 'OEM Front Brake Pads', category: 'Brakes', stock: 2, minThreshold: 5, location: 'Rack A-01 / Shelf 2', cost: 280, wholesale: 380, retail: 450, oem: true, model: 'Yamaha NMAX 155', brand: 'Yamaha Genuine Parts' },
        { sku: 'RCB-NMAX-BP02', name: 'RCB S-Series Ceramic Brake Pads', category: 'Brakes', stock: 14, minThreshold: 6, location: 'Rack A-01 / Shelf 3', cost: 350, wholesale: 480, retail: 580, oem: false, model: 'Yamaha NMAX 155', brand: 'Racing Boy' },
        { sku: 'HON-CLK-CVTB', name: 'OEM Drive Belt (Gates Bando)', category: 'Drivetrain', stock: 4, minThreshold: 8, location: 'Rack B-04 / Shelf 1', cost: 520, wholesale: 720, retail: 850, oem: true, model: 'Honda Click 125i/150i', brand: 'Honda OEM' },
        { sku: 'UMA-CLK-CVTR', name: 'Uma Racing Kevlar High-Tension Belt', category: 'Drivetrain', stock: 9, minThreshold: 4, location: 'Rack B-04 / Shelf 2', cost: 750, wholesale: 1050, retail: 1250, oem: false, model: 'Honda Click 125i/150i', brand: 'Uma Racing' },
        { sku: 'MOT-3100-10W40', name: 'Motul 3100 Gold 4T 10W40 (1L)', category: 'Fluids', stock: 28, minThreshold: 15, location: 'Aisle 1 / Shelf 1', cost: 260, wholesale: 330, retail: 390, oem: false, model: 'Universal', brand: 'Motul' },
        { sku: 'SHL-ADV-AX7', name: 'Shell Advance AX7 Synthetic 10W40 (1L)', category: 'Fluids', stock: 18, minThreshold: 12, location: 'Aisle 1 / Shelf 2', cost: 240, wholesale: 300, retail: 360, oem: false, model: 'Universal', brand: 'Shell' },
        { sku: 'NGK-CPR8EA9', name: 'NGK Nickel Spark Plug (CPR8EA-9)', category: 'Ignition', stock: 3, minThreshold: 10, location: 'Rack C-02 / Shelf 1', cost: 110, wholesale: 150, retail: 190, oem: true, model: 'Honda Click 125i/150i', brand: 'NGK' },
        { sku: 'DEN-IU24-IR', name: 'Denso Iridium Power Spark Plug (IU24)', category: 'Ignition', stock: 11, minThreshold: 5, location: 'Rack C-02 / Shelf 2', cost: 380, wholesale: 520, retail: 620, oem: false, model: 'Yamaha NMAX 155', brand: 'Denso' },
        { sku: 'SUZ-RAI-CLUTCH', name: 'Raider 150 Fi OEM Clutch Lining Set', category: 'Engine', stock: 5, minThreshold: 4, location: 'Rack D-01 / Shelf 3', cost: 680, wholesale: 890, retail: 1100, oem: true, model: 'Suzuki Raider 150 Fi', brand: 'Suzuki OEM' },
        { sku: 'KTR-RAI-CL6SP', name: 'Kawahara 6-Spring Competition Clutch Plate', category: 'Engine', stock: 7, minThreshold: 3, location: 'Rack D-01 / Shelf 4', cost: 950, wholesale: 1300, retail: 1550, oem: false, model: 'Suzuki Raider 150 Fi', brand: 'Kawahara Racing' },
        { sku: 'MIC-PILOT-ST', name: 'Michelin Pilot Street 2 (110/80-14)', category: 'Tires', stock: 6, minThreshold: 4, location: 'Tire Rack 2 / Floor', cost: 1450, wholesale: 1850, retail: 2150, oem: false, model: 'Honda ADV 160', brand: 'Michelin' },
        { sku: 'IRC-SCT-OEM', name: 'IRC SCT-005 OEM Rear Tire (130/70-13)', category: 'Tires', stock: 8, minThreshold: 4, location: 'Tire Rack 1 / Floor', cost: 1200, wholesale: 1550, retail: 1800, oem: true, model: 'Yamaha NMAX 155', brand: 'IRC Tire' }
    ],

    services: [
        { code: 'SRV-OIL-01', name: 'Standard Oil & Gear Oil Change', bay: 'Bay 1 / Quick Bay', rate: 100, duration: '15 mins' },
        { code: 'SRV-CVT-01', name: 'CVT Cleaning & Regreasing', bay: 'Bay 2 / Scooter Bay', rate: 350, duration: '45 mins' },
        { code: 'SRV-TIRE-01', name: 'Tubeless Tire Mounting & Bead Sealing', bay: 'Bay 1 / Quick Bay', rate: 150, duration: '20 mins' },
        { code: 'SRV-BRK-01', name: 'Brake Caliper Flush & Bleeding', bay: 'Bay 3 / Mechanical Bay', rate: 250, duration: '30 mins' },
        { code: 'SRV-TUNE-01', name: 'Full FI Throttle Body Cleaning & Reset', bay: 'Bay 3 / Mechanical Bay', rate: 650, duration: '60 mins' },
        { code: 'SRV-FORK-01', name: 'Front Shock Re-oil & Seal Replacement', bay: 'Bay 4 / Heavy Repair', rate: 800, duration: '90 mins' }
    ],

    motoModels: [
        'Yamaha NMAX 155',
        'Yamaha Aerox 155',
        'Honda Click 125i/150i',
        'Honda ADV 160',
        'Suzuki Raider 150 Fi'
    ],

    users: [
        { id: 1, name: 'Carlos Rodriguez', email: 'admin@swift.local', role: 'Admin', status: 'Active', permissions: 'Full Access (All Modules)' },
        { id: 2, name: 'Mike Morales', email: 'cashier@swift.local', role: 'Cashier', status: 'Active', permissions: 'Fast POS, Receipt, Stock Search' },
        { id: 3, name: 'Dante Reyes', email: 'mechanic1@swift.local', role: 'Mechanic', status: 'Active', permissions: 'Time Clock, Service Bay Queue' },
        { id: 4, name: 'Rico Santos', email: 'warehouse@swift.local', role: 'Inventory Clerk', status: 'Active', permissions: 'Inventory Adjustments, Stock In' }
    ],

    pricingRules: {
        retailMarkup: 35,
        wholesaleMarkup: 18,
        aftermarketMarkup: 40,
        hourlyLaborRate: 450
    },

    stockAdjustmentLogs: [
        { id: 'ADJ-8821', timestamp: '2026-09-28 14:22', sku: 'YAM-NMAX-BL01', type: 'Audit Adjustment', change: '-2 Units', reason: 'Physical inventory count reconciliation', user: 'Carlos Rodriguez' },
        { id: 'ADJ-8820', timestamp: '2026-09-28 11:05', sku: 'MOT-3100-10W40', type: 'Restock Inbound', change: '+24 Units', reason: 'PO-4091 Supplier Delivery Received', user: 'Rico Santos' },
        { id: 'ADJ-8819', timestamp: '2026-09-27 16:45', sku: 'NGK-CPR8EA9', type: 'Damaged Goods', change: '-1 Unit', reason: 'Cracked porcelain during shelving', user: 'Mike Morales' }
    ],

    auditLogs: [
        { id: 'AUD-5091', timestamp: '2026-09-28 16:30', user: 'Carlos Rodriguez', action: 'Modified Global Retail Markup rule from 30% to 35%', ip: '192.168.1.100 (Admin PC)' },
        { id: 'AUD-5090', timestamp: '2026-09-28 15:10', user: 'Mike Morales', action: 'Applied 20% Senior Citizen Discount on TX-1041', ip: '192.168.1.102 (Terminal 1)' },
        { id: 'AUD-5089', timestamp: '2026-09-28 14:22', user: 'Carlos Rodriguez', action: 'Executed Stock Adjustment ADJ-8821 on SKU YAM-NMAX-BL01', ip: '192.168.1.100 (Admin PC)' },
        { id: 'AUD-5088', timestamp: '2026-09-28 08:00', user: 'Mike Morales', action: 'Staff Shift Time-In (Shift #492)', ip: '192.168.1.102 (Terminal 1)' }
    ],

    punchLogs: [
        { date: '2026-09-28', staff: 'Mike Morales', timeIn: '08:00:15 AM', timeOut: '-- Active Shift --', duration: '04h 12m', status: 'On Shift' },
        { date: '2026-09-27', staff: 'Mike Morales', timeIn: '08:02:10 AM', timeOut: '05:01:45 PM', duration: '08h 59m', status: 'Completed' },
        { date: '2026-09-26', staff: 'Mike Morales', timeIn: '07:55:00 AM', timeOut: '05:00:20 PM', duration: '09h 05m', status: 'Completed' }
    ]
};

// Global POS Cart State
let currentCart = [
    { type: 'part', sku: 'MOT-3100-10W40', name: 'Motul 3100 Gold 4T 10W40 (1L)', price: 390, qty: 2 },
    { type: 'service', code: 'SRV-OIL-01', name: 'Labor: Standard Oil Change', price: 100, qty: 1 }
];
let currentPricingMode = 'retail'; // 'retail' or 'wholesale'
let currentDiscountRate = 0; // 0, 0.05, 0.20

// ==========================================================================
// 2. Navigation Controller (View Switching)
// ==========================================================================
function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .menu-item');
    if (!navItems.length) return;

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetView = item.getAttribute('data-view');
            if (!targetView) return;

            // Update active menu state
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Switch content sections
            const views = document.querySelectorAll('.view-section');
            views.forEach(v => v.classList.remove('active'));

            const activeSection = document.getElementById(targetView);
            if (activeSection) {
                activeSection.classList.add('active');
            }

            // Update Topbar Title
            const titleEl = document.getElementById('currentViewTitle');
            if (titleEl) {
                titleEl.textContent = item.textContent.trim();
            }

            // Trigger view-specific re-renders
            if (targetView === 'view-inventory') renderInventoryTable();
            if (targetView === 'view-reports') renderReportsView();
            if (targetView === 'view-users') renderUsersTable();
            if (targetView === 'view-settings') renderAuditTables();
            if (targetView === 'view-motomatcher') renderMotoMatcher('Yamaha NMAX 155');
        });
    });
}

// ==========================================================================
// 3. Admin Modules Rendering
// ==========================================================================

// 3.1 Inventory Table
function renderInventoryTable(filterKeyword = '', categoryFilter = 'ALL') {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    let items = SWIFT_DB.inventory;

    if (categoryFilter !== 'ALL') {
        items = items.filter(i => i.category === categoryFilter);
    }
    if (filterKeyword.trim()) {
        const kw = filterKeyword.toLowerCase();
        items = items.filter(i => i.name.toLowerCase().includes(kw) || i.sku.toLowerCase().includes(kw) || i.location.toLowerCase().includes(kw));
    }

    tbody.innerHTML = items.map(item => {
        const isLowStock = item.stock <= item.minThreshold;
        const stockBadge = isLowStock 
            ? `<span class="badge badge-danger">Low: ${item.stock} left (Min ${item.minThreshold})</span>`
            : `<span class="badge badge-success">${item.stock} in stock</span>`;

        return `
            <tr>
                <td class="text-mono fw-bold">${item.sku}</td>
                <td>
                    <div class="fw-bold">${item.name}</div>
                    <div class="text-muted text-sm">${item.brand} • ${item.model}</div>
                </td>
                <td><span class="badge badge-neutral">${item.category}</span></td>
                <td><span class="shelf-location-tag">${item.location}</span></td>
                <td>${stockBadge}</td>
                <td class="text-mono fw-bold">₱${item.retail.toFixed(2)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openStockAdjustModal('${item.sku}')">Adjust</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 3.2 POS Catalog & Cart
function renderPOSCatalog(category = 'ALL') {
    const container = document.getElementById('posCatalogGrid');
    if (!container) return;

    let parts = SWIFT_DB.inventory;
    if (category !== 'ALL' && category !== 'SERVICES') {
        parts = parts.filter(p => p.category === category);
    }

    if (category === 'SERVICES') {
        container.innerHTML = SWIFT_DB.services.map(srv => `
            <div class="pos-item-card" onclick="addServiceToCart('${srv.code}')">
                <div>
                    <div class="pos-item-sku">${srv.code} • ${srv.bay}</div>
                    <div class="pos-item-name">${srv.name}</div>
                    <div class="text-muted text-sm">Est: ${srv.duration}</div>
                </div>
                <div class="pos-item-meta">
                    <span class="badge badge-info">Labor Service</span>
                    <div class="pos-item-price">₱${srv.rate.toFixed(2)}</div>
                </div>
            </div>
        `).join('');
        return;
    }

    container.innerHTML = parts.map(item => {
        const price = currentPricingMode === 'wholesale' ? item.wholesale : item.retail;
        const stockBadge = item.stock <= item.minThreshold 
            ? `<span class="badge badge-danger">${item.stock} Left</span>` 
            : `<span class="badge badge-success">${item.stock} In Stock</span>`;

        return `
            <div class="pos-item-card" onclick="addPartToCart('${item.sku}')">
                <div>
                    <div class="pos-item-sku">${item.sku}</div>
                    <div class="pos-item-name">${item.name}</div>
                    <div class="text-muted" style="font-size: 0.725rem;">${item.location}</div>
                </div>
                <div class="pos-item-meta">
                    ${stockBadge}
                    <div class="pos-item-price">₱${price.toFixed(2)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function addPartToCart(sku) {
    const part = SWIFT_DB.inventory.find(i => i.sku === sku);
    if (!part) return;

    const existing = currentCart.find(i => i.sku === sku);
    if (existing) {
        existing.qty += 1;
    } else {
        const price = currentPricingMode === 'wholesale' ? part.wholesale : part.retail;
        currentCart.push({
            type: 'part',
            sku: part.sku,
            name: part.name,
            price: price,
            qty: 1
        });
    }
    renderPOSCart();
}

function addServiceToCart(code) {
    const srv = SWIFT_DB.services.find(s => s.code === code);
    if (!srv) return;

    const existing = currentCart.find(i => i.code === code);
    if (existing) {
        existing.qty += 1;
    } else {
        currentCart.push({
            type: 'service',
            code: srv.code,
            name: srv.name,
            price: srv.rate,
            qty: 1
        });
    }
    renderPOSCart();
}

function updateCartQty(index, delta) {
    if (!currentCart[index]) return;
    currentCart[index].qty += delta;
    if (currentCart[index].qty <= 0) {
        currentCart.splice(index, 1);
    }
    renderPOSCart();
}

function removeCartItem(index) {
    currentCart.splice(index, 1);
    renderPOSCart();
}

function setPricingMode(mode) {
    currentPricingMode = mode;
    document.querySelectorAll('.pricing-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-mode') === mode);
    });
    // Recalculate part prices in cart based on mode
    currentCart.forEach(item => {
        if (item.type === 'part') {
            const original = SWIFT_DB.inventory.find(i => i.sku === item.sku);
            if (original) {
                item.price = mode === 'wholesale' ? original.wholesale : original.retail;
            }
        }
    });
    renderPOSCart();
    renderPOSCatalog(getActiveCategory());
}

function setDiscountRate(rate, element) {
    currentDiscountRate = rate;
    document.querySelectorAll('.discount-chip').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    renderPOSCart();
}

function getActiveCategory() {
    const active = document.querySelector('.category-pill.active');
    return active ? active.getAttribute('data-cat') : 'ALL';
}

function renderPOSCart() {
    const container = document.getElementById('posCartItemsList');
    if (!container) return;

    if (currentCart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
                <div class="fw-bold" style="margin-bottom: 0.25rem;">Transaction Cart is Empty</div>
                <div class="text-sm">Scan items or select from catalog</div>
            </div>
        `;
    } else {
        container.innerHTML = currentCart.map((item, index) => {
            const subtotal = item.price * item.qty;
            const subtitle = item.type === 'part' ? item.sku : item.code;
            return `
                <div class="cart-item-row">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-desc">${subtitle} • ₱${item.price.toFixed(2)} each</div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="updateCartQty(${index}, -1)">-</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn" onclick="updateCartQty(${index}, 1)">+</button>
                    </div>
                    <div class="cart-item-subtotal">₱${subtotal.toFixed(2)}</div>
                    <button class="cart-remove-btn" onclick="removeCartItem(${index})" title="Remove item">✕</button>
                </div>
            `;
        }).join('');
    }

    // Calculations
    const subtotal = currentCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const discountAmount = subtotal * currentDiscountRate;
    const finalTotal = subtotal - discountAmount;

    const subtotalEl = document.getElementById('posSubtotal');
    const discountEl = document.getElementById('posDiscount');
    const totalEl = document.getElementById('posTotalDue');
    const checkoutBtn = document.getElementById('posCheckoutBtn');

    if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-₱${discountAmount.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₱${finalTotal.toFixed(2)}`;
    if (checkoutBtn) {
        checkoutBtn.textContent = `PAY ₱${finalTotal.toFixed(2)} (F12)`;
        checkoutBtn.disabled = currentCart.length === 0;
    }
}

// 3.3 MotoMatcher Matrix
function renderMotoMatcher(modelName) {
    const oemList = document.getElementById('motoMatcherOemList');
    const aftermarketList = document.getElementById('motoMatcherAftermarketList');
    if (!oemList || !aftermarketList) return;

    const matchingParts = SWIFT_DB.inventory.filter(i => i.model === modelName || i.model === 'Universal');

    const oemParts = matchingParts.filter(i => i.oem);
    const aftermarketParts = matchingParts.filter(i => !i.oem);

    const renderCard = (part) => `
        <div class="panel-card" style="margin-bottom: 0.75rem;">
            <div class="panel-card-body" style="padding: 0.85rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div class="text-mono text-sm fw-bold text-muted">${part.sku}</div>
                        <div class="fw-bold" style="font-size: 0.95rem;">${part.name}</div>
                        <div class="text-muted text-sm">${part.brand} • ${part.location}</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="fw-bold text-success" style="font-size: 1.1rem;">₱${part.retail.toFixed(2)}</div>
                        <span class="badge ${part.stock <= part.minThreshold ? 'badge-danger' : 'badge-success'}">${part.stock} in stock</span>
                    </div>
                </div>
                <div style="margin-top: 0.75rem; text-align: right;">
                    <button class="btn btn-primary btn-sm" onclick="addPartToCart('${part.sku}'); alert('Added ${part.name} to POS Cart!');">
                        + Add to Active POS Cart
                    </button>
                </div>
            </div>
        </div>
    `;

    oemList.innerHTML = oemParts.length ? oemParts.map(renderCard).join('') : '<div class="text-muted">No OEM matches found.</div>';
    aftermarketList.innerHTML = aftermarketParts.length ? aftermarketParts.map(renderCard).join('') : '<div class="text-muted">No Aftermarket matches found.</div>';
}

// 3.4 Reports View
function renderReportsView() {
    const totalSales = 45230.00;
    const cogs = 29400.00;
    const netProfit = totalSales - cogs;
    const margin = ((netProfit / totalSales) * 100).toFixed(1);

    const grossEl = document.getElementById('reportGrossRevenue');
    const cogsEl = document.getElementById('reportCogs');
    const netEl = document.getElementById('reportNetProfit');
    const marginEl = document.getElementById('reportMargin');

    if (grossEl) grossEl.textContent = `₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (cogsEl) cogsEl.textContent = `₱${cogs.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (netEl) netEl.textContent = `₱${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (marginEl) marginEl.textContent = `${margin}%`;
}

// 3.5 Users Table
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = SWIFT_DB.users.map(u => `
        <tr>
            <td class="fw-bold">${u.name}</td>
            <td class="text-muted">${u.email}</td>
            <td><span class="badge badge-info">${u.role}</span></td>
            <td><span class="badge badge-success">${u.status}</span></td>
            <td class="text-sm">${u.permissions}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="alert('Opening edit modal for ' + '${u.name}')">Edit</button>
            </td>
        </tr>
    `).join('');
}

// 3.6 Settings & Logs
function renderAuditTables() {
    const adjBody = document.getElementById('stockAdjLogsBody');
    const auditBody = document.getElementById('auditLogsBody');

    if (adjBody) {
        adjBody.innerHTML = SWIFT_DB.stockAdjustmentLogs.map(l => `
            <tr>
                <td class="text-mono text-sm">${l.timestamp}</td>
                <td class="text-mono fw-bold">${l.sku}</td>
                <td><span class="badge badge-warning">${l.type}</span></td>
                <td class="fw-bold ${l.change.startsWith('+') ? 'text-success' : 'text-danger'}">${l.change}</td>
                <td>${l.reason}</td>
                <td class="text-muted text-sm">${l.user}</td>
            </tr>
        `).join('');
    }

    if (auditBody) {
        auditBody.innerHTML = SWIFT_DB.auditLogs.map(a => `
            <tr>
                <td class="text-mono text-sm">${a.timestamp}</td>
                <td class="fw-bold">${a.user}</td>
                <td>${a.action}</td>
                <td class="text-mono text-sm text-muted">${a.ip}</td>
            </tr>
        `).join('');
    }

    if (auditBody) {
        auditBody.innerHTML = SWIFT_DB.auditLogs.map(a => `
            <tr>
                <td class="text-mono text-sm">${a.timestamp}</td>
                <td class="fw-bold">${a.user}</td>
                <td>${a.action}</td>
                <td class="text-mono text-sm text-muted">${a.ip}</td>
            </tr>
        `).join('');
    }
}

// ==========================================================================
// 4. Modals and Workflows
// ==========================================================================
function openAddProductModal() {
    const modal = document.getElementById('addProductModal');
    if (!modal) return;

    // Reset form
    const form = document.getElementById('addProductForm');
    if (form) form.reset();

    // Default sample values for fast workflow
    document.getElementById('newProdSku').value = `RCB-AER-${Math.floor(100 + Math.random() * 900)}`;
    document.getElementById('newProdStock').value = 10;
    document.getElementById('newProdMinThreshold').value = 5;
    document.getElementById('newProdCost').value = '';
    document.getElementById('newProdWholesale').value = '';
    document.getElementById('newProdRetail').value = '';

    modal.classList.add('active');
}

function autoCalculatePrices() {
    const costInput = document.getElementById('newProdCost');
    const wholesaleInput = document.getElementById('newProdWholesale');
    const retailInput = document.getElementById('newProdRetail');
    const typeSelect = document.getElementById('newProdType');

    const cost = parseFloat(costInput.value) || 0;
    if (cost <= 0) return;

    const wholesaleMarkup = SWIFT_DB.pricingRules.wholesaleMarkup || 18;
    const isAftermarket = typeSelect ? typeSelect.value === 'aftermarket' : false;
    const retailMarkup = isAftermarket 
        ? (SWIFT_DB.pricingRules.aftermarketMarkup || 40)
        : (SWIFT_DB.pricingRules.retailMarkup || 35);

    wholesaleInput.value = (cost * (1 + wholesaleMarkup / 100)).toFixed(2);
    retailInput.value = (cost * (1 + retailMarkup / 100)).toFixed(2);
}

function handleAddNewProduct() {
    const sku = document.getElementById('newProdSku').value.trim();
    const name = document.getElementById('newProdName').value.trim();
    const category = document.getElementById('newProdCategory').value;
    const brand = document.getElementById('newProdBrand').value.trim();
    const model = document.getElementById('newProdModel').value;
    const location = document.getElementById('newProdLocation').value.trim();
    const isOem = document.getElementById('newProdType').value === 'oem';
    const stock = parseInt(document.getElementById('newProdStock').value, 10) || 0;
    const minThreshold = parseInt(document.getElementById('newProdMinThreshold').value, 10) || 5;
    const cost = parseFloat(document.getElementById('newProdCost').value) || 0;
    const wholesale = parseFloat(document.getElementById('newProdWholesale').value) || (cost * 1.18);
    const retail = parseFloat(document.getElementById('newProdRetail').value) || (cost * 1.35);

    if (!sku || !name || !brand || !location || cost <= 0) {
        alert('Please fill in all required fields (SKU, Name, Brand, Location, Cost).');
        return;
    }

    // Check SKU collision
    if (SWIFT_DB.inventory.some(i => i.sku.toLowerCase() === sku.toLowerCase())) {
        alert(`SKU "${sku}" already exists in the inventory.`);
        return;
    }

    // Add to database
    const newProduct = {
        sku: sku.toUpperCase(),
        name: name,
        category: category,
        stock: stock,
        minThreshold: minThreshold,
        location: location,
        cost: cost,
        wholesale: wholesale,
        retail: retail,
        oem: isOem,
        model: model,
        brand: brand
    };

    SWIFT_DB.inventory.unshift(newProduct);

    // Record in Adjustment Logs
    SWIFT_DB.stockAdjustmentLogs.unshift({
        id: `ADJ-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        sku: newProduct.sku,
        type: 'Restock Inbound',
        change: `+${stock} Units`,
        reason: 'New product master registration',
        user: 'Carlos Rodriguez (Admin)'
    });

    // Record in Audit Logs
    SWIFT_DB.auditLogs.unshift({
        id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        user: 'Carlos Rodriguez',
        action: `Created new inventory product SKU: ${newProduct.sku} (${newProduct.name})`,
        ip: '192.168.1.100 (Admin PC)'
    });

    closeModal('addProductModal');
    renderInventoryTable();
    renderPOSCatalog('ALL');
    alert(`Product "${newProduct.name}" (${newProduct.sku}) registered successfully!`);
}

function openStockAdjustModal(sku) {
    const part = SWIFT_DB.inventory.find(i => i.sku === sku);
    if (!part) return;

    const modal = document.getElementById('stockAdjustModal');
    if (!modal) return;

    document.getElementById('modalAdjustSku').textContent = part.sku;
    document.getElementById('modalAdjustName').textContent = part.name;
    document.getElementById('modalAdjustCurrentStock').textContent = `${part.stock} units`;
    document.getElementById('adjustQtyInput').value = 1;

    modal.classList.add('active');
}

function submitStockAdjustment() {
    const sku = document.getElementById('modalAdjustSku').textContent;
    const type = document.getElementById('adjustTypeSelect').value;
    const qty = parseInt(document.getElementById('adjustQtyInput').value, 10) || 0;
    const reason = document.getElementById('adjustReasonInput').value || 'Manual Adjustment';

    const part = SWIFT_DB.inventory.find(i => i.sku === sku);
    if (part) {
        if (type === 'Restock') {
            part.stock += qty;
        } else {
            part.stock = Math.max(0, part.stock - qty);
        }

        // Log adjustment
        SWIFT_DB.stockAdjustmentLogs.unshift({
            id: `ADJ-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            sku: part.sku,
            type: type,
            change: `${type === 'Restock' ? '+' : '-'}${qty} Units`,
            reason: reason,
            user: 'Carlos Rodriguez (Admin)'
        });

        closeModal('stockAdjustModal');
        renderInventoryTable();
        alert(`Stock adjusted successfully for ${part.name}. New Stock: ${part.stock}`);
    }
}

function openReceiptModal() {
    if (currentCart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const modal = document.getElementById('receiptModal');
    if (!modal) return;

    const subtotal = currentCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const discountAmount = subtotal * currentDiscountRate;
    const total = subtotal - discountAmount;

    const receiptContent = document.getElementById('thermalReceiptContainer');
    if (receiptContent) {
        const txNumber = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
        receiptContent.innerHTML = `
            <div class="receipt-paper">
                <div class="receipt-header">
                    <div class="receipt-title">SWIFT MOTO SERVICE</div>
                    <div>104 Rizal Ave, Motor City</div>
                    <div>TIN: 409-281-992-000</div>
                    <div>Tel: (02) 8921-4450</div>
                </div>
                <div style="font-size: 11px;">
                    <div>Receipt #: <strong>${txNumber}</strong></div>
                    <div>Date: ${new Date().toLocaleString()}</div>
                    <div>Cashier: Mike Morales (POS-01)</div>
                </div>
                <div class="receipt-divider"></div>
                <table class="receipt-table">
                    <thead>
                        <tr>
                            <th>ITEM</th>
                            <th style="text-align: center;">QTY</th>
                            <th style="text-align: right;">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${currentCart.map(item => `
                            <tr>
                                <td>${item.name.substring(0, 20)}</td>
                                <td style="text-align: center;">${item.qty}</td>
                                <td style="text-align: right;">₱${(item.price * item.qty).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="receipt-totals">
                    <div style="display: flex; justify-content: space-between;">
                        <span>SUBTOTAL:</span>
                        <span>₱${subtotal.toFixed(2)}</span>
                    </div>
                    ${discountAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; color: #dc2626;">
                        <span>DISCOUNT:</span>
                        <span>-₱${discountAmount.toFixed(2)}</span>
                    </div>` : ''}
                    <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin-top: 4px;">
                        <span>TOTAL DUE:</span>
                        <span>₱${total.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                        <span>CASH TENDERED:</span>
                        <span>₱${(Math.ceil(total / 100) * 100).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>CHANGE:</span>
                        <span>₱${((Math.ceil(total / 100) * 100) - total).toFixed(2)}</span>
                    </div>
                </div>
                <div class="receipt-footer">
                    <div>Thank you for your business!</div>
                    <div>Parts warranty valid for 7 days with receipt.</div>
                    <div>*** CUSTOMER COPY ***</div>
                </div>
            </div>
        `;
    }

    modal.classList.add('active');
}

function completeCheckoutAndClear() {
    closeModal('receiptModal');
    currentCart = [];
    currentDiscountRate = 0;
    renderPOSCart();
    alert('Transaction completed and thermal receipt printed!');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// ==========================================================================
// 5. Staff Specific Operations (Punch Clock & Price Scanner)
// ==========================================================================
let shiftSeconds = 15150; // 04h 12m 30s
let shiftInterval = null;
let isShiftActive = true;

function initPunchClock() {
    const timeDisplay = document.getElementById('liveClockDisplay');
    const timerDisplay = document.getElementById('shiftTimerDisplay');

    // Real-time clock
    setInterval(() => {
        const now = new Date();
        if (timeDisplay) {
            timeDisplay.textContent = now.toLocaleTimeString('en-US', { hour12: true });
        }
    }, 1000);

    // Shift timer
    if (isShiftActive && !shiftInterval) {
        shiftInterval = setInterval(() => {
            shiftSeconds++;
            if (timerDisplay) {
                const h = String(Math.floor(shiftSeconds / 3600)).padStart(2, '0');
                const m = String(Math.floor((shiftSeconds % 3600) / 60)).padStart(2, '0');
                const s = String(shiftSeconds % 60).padStart(2, '0');
                timerDisplay.textContent = `${h}:${m}:${s}`;
            }
        }, 1000);
    }
}

function toggleTimePunch(action) {
    if (action === 'in') {
        if (isShiftActive) {
            alert('You are already clocked in for this shift!');
            return;
        }
        isShiftActive = true;
        shiftSeconds = 0;
        alert('Clock-In recorded successfully. Shift started!');
    } else if (action === 'out') {
        if (!isShiftActive) {
            alert('No active shift to clock out from.');
            return;
        }
        isShiftActive = false;
        clearInterval(shiftInterval);
        shiftInterval = null;
        alert('Clock-Out recorded. Shift ended and logged to attendance history.');
    }
}

function runPriceScanLookup(query) {
    const resultBox = document.getElementById('priceScanResultBox');
    if (!resultBox) return;

    if (!query.trim()) {
        resultBox.style.display = 'none';
        return;
    }

    const item = SWIFT_DB.inventory.find(i => 
        i.sku.toLowerCase() === query.toLowerCase() || 
        i.name.toLowerCase().includes(query.toLowerCase())
    );

    if (item) {
        const markup = (((item.retail - item.cost) / item.cost) * 100).toFixed(1);
        resultBox.style.display = 'grid';
        resultBox.innerHTML = `
            <div class="price-metric-box">
                <div class="price-metric-label">SKU / Item</div>
                <div class="fw-bold" style="font-size: 0.85rem; margin-top: 4px;">${item.sku}</div>
                <div class="text-muted text-sm">${item.name}</div>
            </div>
            <div class="price-metric-box">
                <div class="price-metric-label">Wholesale Price</div>
                <div class="price-metric-val text-warning">₱${item.wholesale.toFixed(2)}</div>
            </div>
            <div class="price-metric-box">
                <div class="price-metric-label">Retail Price</div>
                <div class="price-metric-val text-success">₱${item.retail.toFixed(2)}</div>
            </div>
            <div class="price-metric-box">
                <div class="price-metric-label">Cost & Margin</div>
                <div class="price-metric-val">₱${item.cost.toFixed(2)} <span class="text-sm text-muted">(${markup}%)</span></div>
                <div class="text-muted text-sm">${item.location}</div>
            </div>
        `;
    } else {
        resultBox.style.display = 'block';
        resultBox.innerHTML = `
            <div class="text-danger fw-bold" style="padding: 1rem; text-align: center;">
                No item found for barcode / code: "${query}"
            </div>
        `;
    }
}

// ==========================================================================
// 6. Global Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    renderPOSCart();
    renderPOSCatalog('ALL');
    renderInventoryTable();
    initPunchClock();

    // Category pills filter in POS
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            renderPOSCatalog(pill.getAttribute('data-cat'));
        });
    });

    // Model selection in MotoMatcher
    document.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.model-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const model = card.getAttribute('data-model');
            renderMotoMatcher(model);
        });
    });

    // POS Fast Barcode Search
    const posSearchInput = document.getElementById('posItemSearchInput');
    if (posSearchInput) {
        posSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = posSearchInput.value.trim().toLowerCase();
                const matched = SWIFT_DB.inventory.find(i => i.sku.toLowerCase() === query || i.name.toLowerCase().includes(query));
                if (matched) {
                    addPartToCart(matched.sku);
                    posSearchInput.value = '';
                } else {
                    alert('Item code or barcode not found.');
                }
            }
        });
    }

    // Keyboard Shortcuts (F12 Checkout)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12') {
            e.preventDefault();
            openReceiptModal();
        }
    });
});

// ==========================================================================
// 7. Secure Portal Switching Logic (Credential / PIN Enforcement)
// ==========================================================================
let targetSwitchPortal = 'staff';

function openSwitchPortalModal(target) {
    targetSwitchPortal = target;
    const modal = document.getElementById('switchPortalModal');
    if (!modal) return;

    const userInput = document.getElementById('switchUsernameInput');
    const pwdInput = document.getElementById('switchPasswordInput');
    const errEl = document.getElementById('switchAuthError');

    if (userInput) {
        userInput.value = target === 'admin' ? 'admin@swift.local' : 'cashier@swift.local';
    }
    if (pwdInput) {
        pwdInput.value = '';
    }
    if (errEl) {
        errEl.style.display = 'none';
    }

    modal.classList.add('active');
    setTimeout(() => { if (pwdInput) pwdInput.focus(); }, 100);
}

function validateAndSwitchPortal() {
    const pwdInput = document.getElementById('switchPasswordInput');
    const errEl = document.getElementById('switchAuthError');
    const val = pwdInput ? pwdInput.value.trim() : '';

    if (targetSwitchPortal === 'admin') {
        // Accept either demo password 'admin123', 'admin', or '1234'
        if (val === 'admin123' || val === 'admin' || val === '1234') {
            closeModal('switchPortalModal');
            window.location.href = 'admin.html';
        } else {
            if (errEl) errEl.style.display = 'block';
        }
    } else {
        // Staff PIN/Password
        if (val === '1234' || val === 'cashier' || val === 'staff') {
            closeModal('switchPortalModal');
            window.location.href = 'staff.html';
        } else {
            if (errEl) errEl.style.display = 'block';
        }
    }
}
