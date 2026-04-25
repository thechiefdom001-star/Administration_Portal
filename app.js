// KAAS - Kenya Area Administration System Application

// ============================================
// DATA STORE & CONFIGURATION
// ============================================

const APP_CONFIG = {
    appName: 'KAAS',
    version: '1.0.0',
    storageKey: 'kaas_data',
    ticketPrefix: 'KAAS'
};

const CASE_TYPES = [
    { value: 'permit', label: 'Permit Application' },
    { value: 'recommendation', label: 'Letter of Recommendation' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'security', label: 'Security Matter' },
    { value: 'development', label: 'Development Project' },
    { value: 'other', label: 'Other' }
];

const PRIORITY_LEVELS = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
];

const CASE_STATUSES = [
    { value: 'new', label: 'New', colorClass: 'badge-new' },
    { value: 'in_progress', label: 'In Progress', colorClass: 'badge-progress' },
    { value: 'pending', label: 'Pending', colorClass: 'badge-pending' },
    { value: 'resolved', label: 'Resolved', colorClass: 'badge-resolved' },
    { value: 'rejected', label: 'Rejected', colorClass: 'badge-rejected' }
];

// ============================================
// STATE MANAGEMENT
// ============================================

let state = {
    currentUser: null,
    cases: [],
    documents: [],
    notifications: [],
    settings: {
        smsNotifications: true,
        emailNotifications: true,
        officeName: "Chief's Office",
        location: "Subcounty"
    }
};

// ============================================
// INITIALIZATION
// ============================================

function init() {
    loadState();
    setupEventListeners();
    checkAuth();
}

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem(APP_CONFIG.storageKey);
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
    } else {
        // Initialize with demo data
        initializeDemoData();
    }
}

// Save state to localStorage
function saveState() {
    const dataToSave = {
        cases: state.cases,
        documents: state.documents,
        notifications: state.notifications,
        settings: state.settings
    };
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(dataToSave));
}

// Initialize demo data
function initializeDemoData() {
    state.cases = [
        {
            id: generateTicketId(),
            type: 'permit',
            priority: 'high',
            status: 'new',
            resident: { name: 'John Kariuki', idNumber: '12345678', phone: '0712345678', location: 'Village A' },
            description: 'Application for business permit for small retail shop',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [
                { status: 'new', note: 'Application received', date: new Date().toISOString(), updatedBy: 'System' }
            ]
        },
        {
            id: generateTicketId(),
            type: 'recommendation',
            priority: 'medium',
            status: 'in_progress',
            resident: { name: 'Mary Wanjiku', idNumber: '87654321', phone: '0723456789', location: 'Village B' },
            description: 'Letter of recommendation for scholarship application',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [
                { status: 'new', note: 'Application received', date: new Date(Date.now() - 86400000).toISOString(), updatedBy: 'System' },
                { status: 'in_progress', note: 'Under review by desk officer', date: new Date().toISOString(), updatedBy: 'Desk Officer' }
            ]
        },
        {
            id: generateTicketId(),
            type: 'complaint',
            priority: 'urgent',
            status: 'pending',
            resident: { name: 'James Ochieng', idNumber: '11223344', phone: '0734567890', location: 'Village C' },
            description: 'Complaint about water supply being cut off for 3 days',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [
                { status: 'new', note: 'Complaint received', date: new Date(Date.now() - 172800000).toISOString(), updatedBy: 'System' },
                { status: 'pending', note: 'Awaiting response from water department', date: new Date().toISOString(), updatedBy: 'Chief' }
            ]
        },
        {
            id: generateTicketId(),
            type: 'security',
            priority: 'high',
            status: 'resolved',
            resident: { name: 'Sarah Nekesa', idNumber: '55667788', phone: '0745678901', location: 'Village A' },
            description: 'Report of suspicious activity near the market',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            updatedAt: new Date().toISOString(),
            timeline: [
                { status: 'new', note: 'Report received', date: new Date(Date.now() - 259200000).toISOString(), updatedBy: 'System' },
                { status: 'in_progress', note: 'Security team dispatched', date: new Date(Date.now() - 172800000).toISOString(), updatedBy: 'Chief' },
                { status: 'resolved', note: 'Matter investigated and resolved', date: new Date().toISOString(), updatedBy: 'Chief' }
            ]
        }
    ];

    state.documents = [
        { id: 'DOC001', name: 'office_guidelines.pdf', type: 'pdf', size: '245 KB', uploadedAt: new Date(Date.now() - 604800000).toISOString(), category: 'guidelines' },
        { id: 'DOC002', name: 'permit_application_form.pdf', type: 'pdf', size: '128 KB', uploadedAt: new Date(Date.now() - 432000000).toISOString(), category: 'forms' },
        { id: 'DOC003', name: 'quarterly_report_2024.pdf', type: 'pdf', size: '1.2 MB', uploadedAt: new Date(Date.now() - 259200000).toISOString(), category: 'reports' }
    ];

    saveState();
}

// Generate unique ticket ID
function generateTicketId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${APP_CONFIG.ticketPrefix}-${timestamp}${random}`;
}

// ============================================
// AUTHENTICATION
// ============================================

const DEMO_USERS = {
    chief: { username: 'chief', password: 'chief123', role: 'chief', name: 'Chief Joseph' },
    desk_officer: { username: 'officer', password: 'officer123', role: 'desk_officer', name: 'Officer Grace' },
    resident: { username: 'resident', password: 'resident123', role: 'resident', name: 'Resident User' }
};

function login(username, password, role) {
    const user = DEMO_USERS[role];
    if (user && user.username === username && user.password === password) {
        state.currentUser = { ...user };
        sessionStorage.setItem('kaas_session', JSON.stringify(user));
        return { success: true, user };
    }
    return { success: false, message: 'Invalid credentials' };
}

function logout() {
    state.currentUser = null;
    sessionStorage.removeItem('kaas_session');
    showPage('loginPage');
}

function checkAuth() {
    const session = sessionStorage.getItem('kaas_session');
    if (session) {
        state.currentUser = JSON.parse(session);
        showPage('app');
        renderNavigation();
        renderDashboard();
    } else {
        showPage('loginPage');
    }
}

function isAuthenticated() {
    return state.currentUser !== null;
}

function hasRole(roles) {
    if (!state.currentUser) return false;
    return roles.includes(state.currentUser.role);
}

// ============================================
// PAGE ROUTING
// ============================================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'app') {
        document.getElementById('app').classList.add('active');
    } else {
        document.getElementById('app').classList.remove('active');
    }
}

function navigateTo(page) {
    const pageTitles = {
        dashboard: 'Dashboard',
        cases: 'Case Management',
        documents: 'Document Repository',
        residents: 'Resident Portal',
        reports: 'Reports & Analytics',
        settings: 'Settings',
        createCase: 'New Application',
        viewCase: 'Case Details',
        trackCase: 'Track Application'
    };
    
    document.getElementById('pageTitle').textContent = pageTitles[page] || 'Dashboard';
    
    switch (page) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'cases':
            renderCases();
            break;
        case 'createCase':
            renderCreateCase();
            break;
        case 'viewCase':
            renderCaseDetails();
            break;
        case 'documents':
            renderDocuments();
            break;
        case 'residents':
            renderResidentPortal();
            break;
        case 'trackCase':
            renderTrackCase();
            break;
        case 'reports':
            renderReports();
            break;
        case 'settings':
            renderSettings();
            break;
    }
}

// ============================================
// NAVIGATION RENDERING
// ============================================

function renderNavigation() {
    const navMenu = document.getElementById('navMenu');
    const mobileNav = document.getElementById('mobileNav');
    
    const role = state.currentUser?.role;
    
    const navItems = [
        { id: 'dashboard', icon: 'fa-home', label: 'Dashboard', roles: ['chief', 'desk_officer'] },
        { id: 'cases', icon: 'fa-folder-open', label: 'Cases', roles: ['chief', 'desk_officer'] },
        { id: 'createCase', icon: 'fa-plus-circle', label: 'New Case', roles: ['chief', 'desk_officer'] },
        { id: 'documents', icon: 'fa-file-alt', label: 'Documents', roles: ['chief', 'desk_officer'] },
        { id: 'residents', icon: 'fa-users', label: 'Resident Portal', roles: ['chief', 'desk_officer'] },
        { id: 'trackCase', icon: 'fa-search', label: 'Track Case', roles: ['resident'] },
        { id: 'reports', icon: 'fa-chart-bar', label: 'Reports', roles: ['chief', 'desk_officer'] },
        { id: 'settings', icon: 'fa-cog', label: 'Settings', roles: ['chief', 'desk_officer'] }
    ];
    
    const filteredItems = navItems.filter(item => item.roles.includes(role));
    
    navMenu.innerHTML = filteredItems.map(item => `
        <li>
            <a href="#" data-page="${item.id}" class="nav-link">
                <i class="fas ${item.icon}"></i>
                <span>${item.label}</span>
            </a>
        </li>
    `).join('');
    
    mobileNav.innerHTML = `
        <ul>
            ${filteredItems.slice(0, 5).map(item => `
                <li>
                    <a href="#" data-page="${item.id}" class="nav-link">
                        <i class="fas ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                </li>
            `).join('')}
        </ul>
    `;
    
    // Update user display
    document.getElementById('displayName').textContent = state.currentUser?.name || 'User';
    document.getElementById('displayRole').textContent = state.currentUser?.role?.replace('_', ' ') || 'Role';
    
    // Update notification badge
    const pendingCount = state.cases.filter(c => c.status === 'new' || c.status === 'pending').length;
    document.getElementById('notifBadge').textContent = pendingCount;
}

// ============================================
// DASHBOARD RENDERING
// ============================================

function renderDashboard() {
    const contentArea = document.getElementById('contentArea');
    const role = state.currentUser?.role;
    
    const totalCases = state.cases.length;
    const newCases = state.cases.filter(c => c.status === 'new').length;
    const pendingCases = state.cases.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
    const resolvedCases = state.cases.filter(c => c.status === 'resolved').length;
    const resolutionRate = totalCases > 0 ? Math.round((resolvedCases / totalCases) * 100) : 0;
    
    const recentCases = state.cases.slice(-5).reverse();
    
    contentArea.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary">
                    <i class="fas fa-folder-open"></i>
                </div>
                <div class="stat-content">
                    <h3>${totalCases}</h3>
                    <p>Total Cases</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <h3>${pendingCases}</h3>
                    <p>Pending</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <h3>${resolvedCases}</h3>
                    <p>Resolved</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon gold">
                    <i class="fas fa-percentage"></i>
                </div>
                <div class="stat-content">
                    <h3>${resolutionRate}%</h3>
                    <p>Resolution Rate</p>
                </div>
            </div>
        </div>
        
        ${role !== 'resident' ? `
        <div class="quick-actions">
            <button class="btn btn-primary" onclick="navigateTo('createCase')">
                <i class="fas fa-plus"></i> New Application
            </button>
            <button class="btn btn-secondary" onclick="navigateTo('cases')">
                <i class="fas fa-list"></i> View All Cases
            </button>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Recent Cases</h3>
                <button class="btn btn-sm btn-secondary" onclick="navigateTo('cases')">View All</button>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Ticket ID</th>
                            <th>Type</th>
                            <th>Resident</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentCases.length > 0 ? recentCases.map(c => `
                            <tr>
                                <td data-label="Ticket ID"><strong>${c.id}</strong></td>
                                <td data-label="Type">${getCaseTypeLabel(c.type)}</td>
                                <td data-label="Resident">${c.resident.name}</td>
                                <td data-label="Status"><span class="badge ${getStatusClass(c.status)}">${getStatusLabel(c.status)}</span></td>
                                <td data-label="Date">${formatDate(c.createdAt)}</td>
                                <td data-label="Action">
                                    <button class="btn btn-sm btn-secondary" onclick="viewCaseDetails('${c.id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" class="empty-state">
                                    <i class="fas fa-inbox"></i>
                                    <p>No cases found</p>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
        ` : `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Your Applications</h3>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Ticket ID</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentCases.length > 0 ? recentCases.map(c => `
                            <tr>
                                <td data-label="Ticket ID"><strong>${c.id}</strong></td>
                                <td data-label="Type">${getCaseTypeLabel(c.type)}</td>
                                <td data-label="Status"><span class="badge ${getStatusClass(c.status)}">${getStatusLabel(c.status)}</span></td>
                                <td data-label="Date">${formatDate(c.createdAt)}</td>
                                <td data-label="Action">
                                    <button class="btn btn-sm btn-secondary" onclick="viewCaseDetails('${c.id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" class="empty-state">
                                    <i class="fas fa-inbox"></i>
                                    <p>No applications found</p>
                                    <button class="btn btn-primary" onclick="navigateTo('createCase')">
                                        <i class="fas fa-plus"></i> Submit Application
                                    </button>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
        `}
    `;
}

// ============================================
// CASES RENDERING
// ============================================

function renderCases() {
    const contentArea = document.getElementById('contentArea');
    const searchTerm = document.getElementById('searchInput')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    const filterType = document.getElementById('filterType')?.value || '';
    
    let filteredCases = [...state.cases];
    
    if (searchTerm) {
        filteredCases = filteredCases.filter(c => 
            c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.resident.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    if (filterStatus) {
        filteredCases = filteredCases.filter(c => c.status === filterStatus);
    }
    
    if (filterType) {
        filteredCases = filteredCases.filter(c => c.type === filterType);
    }
    
    filteredCases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    contentArea.innerHTML = `
        <div class="search-bar">
            <div class="search-input">
                <i class="fas fa-search"></i>
                <input type="text" id="searchInput" class="form-control" placeholder="Search by ticket ID or name..." value="${searchTerm}">
            </div>
            <div class="filter-group">
                <select id="filterStatus" class="form-control" onchange="renderCases()">
                    <option value="">All Status</option>
                    ${CASE_STATUSES.map(s => `<option value="${s.value}" ${filterStatus === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <select id="filterType" class="form-control" onchange="renderCases()">
                    <option value="">All Types</option>
                    ${CASE_TYPES.map(t => `<option value="${t.value}" ${filterType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
                </select>
            </div>
            <button class="btn btn-primary" onclick="navigateTo('createCase')">
                <i class="fas fa-plus"></i> New Case
            </button>
        </div>
        
        <div class="card">
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Ticket ID</th>
                            <th>Type</th>
                            <th>Resident</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredCases.length > 0 ? filteredCases.map(c => `
                            <tr>
                                <td data-label="Ticket ID"><strong>${c.id}</strong></td>
                                <td data-label="Type">${getCaseTypeLabel(c.type)}</td>
                                <td data-label="Resident">${c.resident.name}</td>
                                <td data-label="Priority"><span class="badge badge-${c.priority}">${c.priority.toUpperCase()}</span></td>
                                <td data-label="Status"><span class="badge ${getStatusClass(c.status)}">${getStatusLabel(c.status)}</span></td>
                                <td data-label="Date">${formatDate(c.createdAt)}</td>
                                <td data-label="Action">
                                    <div class="table-actions">
                                        <button class="btn btn-sm btn-secondary" onclick="viewCaseDetails('${c.id}')" title="View">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteCase('${c.id}')" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="7" class="empty-state">
                                    <i class="fas fa-inbox"></i>
                                    <h3>No Cases Found</h3>
                                    <p>No cases match your search criteria</p>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// CREATE CASE RENDERING
// ============================================

function renderCreateCase() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Submit New Application</h3>
            </div>
            <form id="createCaseForm">
                <div class="form-row">
                    <div class="form-group">
                        <label class="required">Application Type</label>
                        <select id="caseType" class="form-control" required>
                            <option value="">-- Select Type --</option>
                            ${CASE_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="required">Priority Level</label>
                        <select id="casePriority" class="form-control" required>
                            <option value="">-- Select Priority --</option>
                            ${PRIORITY_LEVELS.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="required">Full Name</label>
                        <input type="text" id="residentName" class="form-control" placeholder="Enter full name" required>
                    </div>
                    <div class="form-group">
                        <label class="required">ID Number</label>
                        <input type="text" id="residentId" class="form-control" placeholder="Enter ID number" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="required">Phone Number</label>
                        <input type="tel" id="residentPhone" class="form-control" placeholder="07XXXXXXXX" required>
                    </div>
                    <div class="form-group">
                        <label class="required">Location/Village</label>
                        <input type="text" id="residentLocation" class="form-control" placeholder="Enter location" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="required">Description</label>
                    <textarea id="caseDescription" class="form-control form-textarea" placeholder="Describe your request or complaint..." required></textarea>
                </div>
                
                <div class="form-group">
                    <label>Attach Documents (Optional)</label>
                    <div class="form-file" onclick="document.getElementById('fileInput').click()">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <p>Click to upload or drag and drop</p>
                        <small>PDF, JPG, PNG (Max 10MB)</small>
                    </div>
                    <input type="file" id="fileInput" style="display: none;" multiple accept=".pdf,.jpg,.jpeg,.png">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="navigateTo('cases')">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Submit Application
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('createCaseForm').addEventListener('submit', handleCreateCase);
}

async function handleCreateCase(e) {
    e.preventDefault();
    
    const newCase = {
        id: generateTicketId(),
        type: document.getElementById('caseType').value,
        priority: document.getElementById('casePriority').value,
        status: 'new',
        resident: {
            name: document.getElementById('residentName').value,
            idNumber: document.getElementById('residentId').value,
            phone: document.getElementById('residentPhone').value,
            location: document.getElementById('residentLocation').value
        },
        description: document.getElementById('caseDescription').value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [
            { status: 'new', note: 'Application received', date: new Date().toISOString(), updatedBy: state.currentUser?.name || 'Resident' }
        ]
    };
    
    state.cases.push(newCase);
    saveState();
    
    showToast('Application submitted successfully! Your ticket number is: ' + newCase.id, 'success');
    
    setTimeout(() => {
        navigateTo('cases');
    }, 2000);
}

// ============================================
// CASE DETAILS
// ============================================

let currentCaseId = null;

function viewCaseDetails(caseId) {
    currentCaseId = caseId;
    navigateTo('viewCase');
}

function renderCaseDetails() {
    const contentArea = document.getElementById('contentArea');
    const caseItem = state.cases.find(c => c.id === currentCaseId);
    
    if (!caseItem) {
        contentArea.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Case Not Found</h3>
                <p>The requested case could not be found.</p>
                <button class="btn btn-primary" onclick="navigateTo('cases')">Back to Cases</button>
            </div>
        `;
        return;
    }
    
    const isChief = hasRole(['chief']);
    
    contentArea.innerHTML = `
        <div class="case-detail-header">
            <div>
                <h2>${caseItem.id}</h2>
                <span class="badge ${getStatusClass(caseItem.status)}">${getStatusLabel(caseItem.status)}</span>
                <span class="badge badge-${caseItem.priority}">${caseItem.priority.toUpperCase()}</span>
            </div>
            <div class="quick-actions">
                <button class="btn btn-secondary" onclick="navigateTo('cases')">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                ${isChief ? `
                <button class="btn btn-success" onclick="updateCaseStatus('${caseItem.id}', 'resolved')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-danger" onclick="updateCaseStatus('${caseItem.id}', 'rejected')">
                    <i class="fas fa-times"></i> Reject
                </button>
                ` : ''}
            </div>
        </div>
        
        <div class="case-info">
            <div class="card">
                <h4 class="card-title">Resident Information</h4>
                <div class="info-group">
                    <div class="info-label">Full Name</div>
                    <div class="info-value">${caseItem.resident.name}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">ID Number</div>
                    <div class="info-value">${caseItem.resident.idNumber}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Phone Number</div>
                    <div class="info-value">${caseItem.resident.phone}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Location</div>
                    <div class="info-value">${caseItem.resident.location}</div>
                </div>
            </div>
            
            <div class="card">
                <h4 class="card-title">Application Details</h4>
                <div class="info-group">
                    <div class="info-label">Application Type</div>
                    <div class="info-value">${getCaseTypeLabel(caseItem.type)}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Priority</div>
                    <div class="info-value">${caseItem.priority.toUpperCase()}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Submitted On</div>
                    <div class="info-value">${formatDate(caseItem.createdAt)}</div>
                </div>
                <div class="info-group">
                    <div class="info-label">Last Updated</div>
                    <div class="info-value">${formatDate(caseItem.updatedAt)}</div>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 24px;">
            <h4 class="card-title">Description</h4>
            <p>${caseItem.description}</p>
        </div>
        
        <div class="card" style="margin-top: 24px;">
            <h4 class="card-title">Timeline</h4>
            <div class="timeline">
                ${caseItem.timeline.map(t => `
                    <div class="timeline-item">
                        <div class="timeline-dot">
                            <i class="fas ${getStatusIcon(t.status)}"></i>
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-title">${getStatusLabel(t.status)}</div>
                            <div class="timeline-meta">${t.note} • ${formatDate(t.date)} • By ${t.updatedBy}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${isChief ? `
        <div class="card" style="margin-top: 24px;">
            <h4 class="card-title">Add Note / Update Status</h4>
            <div class="form-group">
                <label>Add a note</label>
                <textarea id="caseNote" class="form-control form-textarea" placeholder="Enter note..."></textarea>
            </div>
            <div class="form-group">
                <label>Update Status</label>
                <select id="newStatus" class="form-control">
                    ${CASE_STATUSES.map(s => `<option value="${s.value}">${s.label}</option>`).join('')}
                </select>
            </div>
            <button class="btn btn-primary" onclick="addCaseNote('${caseItem.id}')">
                <i class="fas fa-save"></i> Save
            </button>
        </div>
        ` : ''}
    `;
}

function addCaseNote(caseId) {
    const caseIndex = state.cases.findIndex(c => c.id === caseId);
    if (caseIndex === -1) return;
    
    const note = document.getElementById('caseNote').value;
    const newStatus = document.getElementById('newStatus').value;
    
    if (note) {
        state.cases[caseIndex].timeline.push({
            status: newStatus || state.cases[caseIndex].status,
            note: note,
            date: new Date().toISOString(),
            updatedBy: state.currentUser?.name || 'System'
        });
    }
    
    if (newStatus) {
        state.cases[caseIndex].status = newStatus;
    }
    
    state.cases[caseIndex].updatedAt = new Date().toISOString();
    saveState();
    
    showToast('Case updated successfully!', 'success');
    renderCaseDetails();
}

function updateCaseStatus(caseId, status) {
    const caseIndex = state.cases.findIndex(c => c.id === caseId);
    if (caseIndex === -1) return;
    
    const statusLabels = {
        'resolved': 'Approved',
        'rejected': 'Rejected'
    };
    
    state.cases[caseIndex].status = status;
    state.cases[caseIndex].timeline.push({
        status: status,
        note: `Application ${statusLabels[status]}`,
        date: new Date().toISOString(),
        updatedBy: state.currentUser?.name || 'Chief'
    });
    state.cases[caseIndex].updatedAt = new Date().toISOString();
    
    saveState();
    
    showToast(`Application ${statusLabels[status]}!`, status === 'resolved' ? 'success' : 'error');
    renderCaseDetails();
}

function deleteCase(caseId) {
    if (confirm('Are you sure you want to delete this case?')) {
        state.cases = state.cases.filter(c => c.id !== caseId);
        saveState();
        showToast('Case deleted successfully!', 'success');
        renderCases();
    }
}

// ============================================
// DOCUMENTS RENDERING
// ============================================

function renderDocuments() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="search-bar">
            <div class="search-input">
                <i class="fas fa-search"></i>
                <input type="text" id="docSearch" class="form-control" placeholder="Search documents..." onkeyup="renderDocuments()">
            </div>
            <button class="btn btn-primary" onclick="uploadDocument()">
                <i class="fas fa-upload"></i> Upload Document
            </button>
        </div>
        
        <div class="document-grid">
            ${state.documents.map(doc => `
                <div class="document-card">
                    <div class="document-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="document-name">${doc.name}</div>
                    <div class="document-meta">${doc.size} • ${formatDate(doc.uploadedAt)}</div>
                </div>
            `).join('')}
        </div>
        
        ${state.documents.length === 0 ? `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <h3>No Documents</h3>
                <p>Upload documents to get started</p>
            </div>
        ` : ''}
    `;
}

function uploadDocument() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const newDoc = {
                id: 'DOC' + Date.now(),
                name: file.name,
                type: file.type.includes('pdf') ? 'pdf' : 'image',
                size: formatFileSize(file.size),
                uploadedAt: new Date().toISOString(),
                category: 'general'
            };
            state.documents.push(newDoc);
            saveState();
            showToast('Document uploaded successfully!', 'success');
            renderDocuments();
        }
    };
    input.click();
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================
// RESIDENT PORTAL
// ============================================

function renderResidentPortal() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Resident Portal</h3>
            </div>
            <p>Welcome to the Resident Portal. Residents can submit applications and track their status here.</p>
            
            <div class="tabs">
                <button class="tab active" onclick="switchTab('resident-submit')">Submit Application</button>
                <button class="tab" onclick="switchTab('resident-track')">Track Application</button>
            </div>
            
            <div id="resident-submit" class="tab-content">
                <button class="btn btn-primary" onclick="navigateTo('createCase')">
                    <i class="fas fa-plus"></i> New Application
                </button>
            </div>
            
            <div id="resident-track" class="tab-content" style="display: none;">
                <div class="form-group">
                    <label>Enter Ticket Number</label>
                    <input type="text" id="trackTicket" class="form-control" placeholder="e.g., KAAS-XXXXX">
                </div>
                <button class="btn btn-primary" onclick="trackApplication()">
                    <i class="fas fa-search"></i> Track
                </button>
            </div>
        </div>
    `;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    event.target.classList.add('active');
    document.getElementById(tabId).style.display = 'block';
}

function renderTrackCase() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Track Your Application</h3>
            </div>
            <div class="form-group">
                <label class="required">Ticket Number</label>
                <input type="text" id="trackTicketInput" class="form-control" placeholder="Enter your ticket number">
            </div>
            <button class="btn btn-primary" onclick="trackApplication()">
                <i class="fas fa-search"></i> Track Application
            </button>
        </div>
    `;
}

function trackApplication() {
    const ticketId = document.getElementById('trackTicket')?.value || document.getElementById('trackTicketInput')?.value;
    
    if (!ticketId) {
        showToast('Please enter a ticket number', 'warning');
        return;
    }
    
    const caseItem = state.cases.find(c => c.id.toLowerCase() === ticketId.toLowerCase());
    
    if (caseItem) {
        currentCaseId = caseItem.id;
        renderCaseDetails();
    } else {
        showToast('Application not found', 'error');
    }
}

// ============================================
// REPORTS
// ============================================

function renderReports() {
    const contentArea = document.getElementById('contentArea');
    
    const casesByType = {};
    CASE_TYPES.forEach(t => casesByType[t.value] = 0);
    state.cases.forEach(c => casesByType[c.type]++);
    
    const casesByStatus = {};
    CASE_STATUSES.forEach(s => casesByStatus[s.value] = 0);
    state.cases.forEach(c => casesByStatus[c.status]++);
    
    contentArea.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon primary">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="stat-content">
                    <h3>${state.cases.length}</h3>
                    <p>Total Applications</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success">
                    <i class="fas fa-check"></i>
                </div>
                <div class="stat-content">
                    <h3>${casesByStatus['resolved']}</h3>
                    <p>Approved</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon danger">
                    <i class="fas fa-times"></i>
                </div>
                <div class="stat-content">
                    <h3>${casesByStatus['rejected']}</h3>
                    <p>Rejected</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                    <h3>${casesByStatus['pending'] + casesByStatus['in_progress']}</h3>
                    <p>Pending</p>
                </div>
            </div>
        </div>
        
        <div class="charts-grid">
            <div class="chart-container">
                <h4 class="chart-title">Applications by Type</h4>
                <div class="chart-bars">
                    ${Object.entries(casesByType).filter(([k, v]) => v > 0).map(([type, count]) => `
                        <div class="chart-bar">
                            <div class="bar-label">${getCaseTypeLabel(type)}</div>
                            <div class="bar-container">
                                <div class="bar" style="width: ${(count / state.cases.length) * 100}%"></div>
                            </div>
                            <div class="bar-value">${count}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="chart-container">
                <h4 class="chart-title">Applications by Status</h4>
                <div class="chart-bars">
                    ${Object.entries(casesByStatus).filter(([k, v]) => v > 0).map(([status, count]) => `
                        <div class="chart-bar">
                            <div class="bar-label">${getStatusLabel(status)}</div>
                            <div class="bar-container">
                                <div class="bar ${getStatusClass(status)}" style="width: ${(count / state.cases.length) * 100}%"></div>
                            </div>
                            <div class="bar-value">${count}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Export Reports</h3>
            </div>
            <div class="quick-actions">
                <button class="btn btn-secondary" onclick="exportReport('csv')">
                    <i class="fas fa-file-csv"></i> Export CSV
                </button>
                <button class="btn btn-secondary" onclick="exportReport('pdf')">
                    <i class="fas fa-file-pdf"></i> Export PDF
                </button>
            </div>
        </div>
    `;
}

function exportReport(format) {
    const data = state.cases.map(c => ({
        'Ticket ID': c.id,
        'Type': getCaseTypeLabel(c.type),
        'Resident': c.resident.name,
        'ID Number': c.resident.idNumber,
        'Phone': c.resident.phone,
        'Location': c.resident.location,
        'Priority': c.priority,
        'Status': getStatusLabel(c.status),
        'Created': c.createdAt,
        'Updated': c.updatedAt
    }));
    
    if (format === 'csv') {
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).join(',')).join('\n');
        const csv = headers + '\n' + rows;
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kaas_report.csv';
        a.click();
    }
    
    showToast(`Report exported as ${format.toUpperCase()}`, 'success');
}

// ============================================
// SETTINGS
// ============================================

function renderSettings() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Settings</h3>
            </div>
            
            <div class="settings-section">
                <h4 class="settings-title">Office Information</h4>
                <div class="form-group">
                    <label>Office Name</label>
                    <input type="text" id="officeName" class="form-control" value="${state.settings.officeName}">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="officeLocation" class="form-control" value="${state.settings.location}">
                </div>
            </div>
            
            <div class="settings-section">
                <h4 class="settings-title">Notifications</h4>
                <div class="settings-group">
                    <div>
                        <strong>SMS Notifications</strong>
                        <p>Send SMS updates to residents</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="smsToggle" ${state.settings.smsNotifications ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-group">
                    <div>
                        <strong>Email Notifications</strong>
                        <p>Send email updates to residents</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="emailToggle" ${state.settings.emailNotifications ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="form-actions">
                <button class="btn btn-primary" onclick="saveSettings()">
                    <i class="fas fa-save"></i> Save Settings
                </button>
            </div>
        </div>
        
        <div class="card" style="margin-top: 24px;">
            <div class="card-header">
                <h3 class="card-title">Data Management</h3>
            </div>
            <div class="quick-actions">
                <button class="btn btn-secondary" onclick="backupData()">
                    <i class="fas fa-download"></i> Backup Data
                </button>
                <button class="btn btn-secondary" onclick="clearData()">
                    <i class="fas fa-trash"></i> Clear All Data
                </button>
            </div>
        </div>
    `;
}

function saveSettings() {
    state.settings.officeName = document.getElementById('officeName').value;
    state.settings.location = document.getElementById('officeLocation').value;
    state.settings.smsNotifications = document.getElementById('smsToggle').checked;
    state.settings.emailNotifications = document.getElementById('emailToggle').checked;
    
    saveState();
    showToast('Settings saved successfully!', 'success');
}

function backupData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kaas_backup_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    showToast('Data backed up successfully!', 'success');
}

function clearData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.removeItem(APP_CONFIG.storageKey);
        state.cases = [];
        state.documents = [];
        state.notifications = [];
        showToast('All data cleared!', 'success');
        renderDashboard();
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getCaseTypeLabel(type) {
    const found = CASE_TYPES.find(t => t.value === type);
    return found ? found.label : type;
}

function getStatusLabel(status) {
    const found = CASE_STATUSES.find(s => s.value === status);
    return found ? found.label : status;
}

function getStatusClass(status) {
    const found = CASE_STATUSES.find(s => s.value === status);
    return found ? found.colorClass : 'badge-new';
}

function getStatusIcon(status) {
    const icons = {
        'new': 'fa-envelope',
        'in_progress': 'fa-spinner',
        'pending': 'fa-clock',
        'resolved': 'fa-check',
        'rejected': 'fa-times'
    };
    return icons[status] || 'fa-circle';
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        
        const result = login(username, password, role);
        
        if (result.success) {
            showPage('app');
            renderNavigation();
            renderDashboard();
            showToast('Welcome, ' + result.user.name + '!', 'success');
        } else {
            showToast('Invalid credentials', 'error');
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        logout();
    });
    
    // Navigation links (delegated)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (link) {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        }
    });
    
    // Mobile sidebar toggle
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Modal close
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('modalCancel')?.addEventListener('click', closeModal);
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// ============================================
// RESPONSIVE HELPERS
// ============================================

function setupResponsive() {
    const overlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mobileNav = document.getElementById('mobileNav');
    
    // Overlay click to close sidebar
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
    
    // Menu toggle to open/close sidebar on mobile
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
        });
    }
    
    // Sidebar toggle (close button inside sidebar)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        });
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        }
    });
    
    // Update mobile navigation visibility
    function updateMobileNav() {
        if (mobileNav && state.currentUser) {
            const role = state.currentUser.role;
            if (role === 'resident') {
                mobileNav.style.display = 'block';
            } else {
                mobileNav.style.display = 'none';
            }
        }
    }
    
    // Call once to set initial state
    updateMobileNav();
}

// Update table rendering with data-label attributes for mobile
function createTableRow(cells) {
    // cells is an array of {label, value, html} objects
    const tr = document.createElement('tr');
    cells.forEach(cell => {
        const td = document.createElement('td');
        td.setAttribute('data-label', cell.label);
        if (cell.html) {
            td.innerHTML = cell.html;
        } else {
            td.textContent = cell.value;
        }
        tr.appendChild(td);
    });
    return tr;
}

// ============================================
// INITIALIZATION (UPDATED)
// ============================================

function init() {
    loadState();
    setupEventListeners();
    setupResponsive();
    checkAuth();
}

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', init);