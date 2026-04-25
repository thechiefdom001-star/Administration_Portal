
        var STORAGE_KEYS = {
            authToken: 'kaas_token',
            apiUrl: 'kaas_api_base_url',
            superAdmin: 'kaas_super_admin_session'
        };

        var SUPER_ADMIN = {
            username: 'administrator',
            password: 'admin0001'
        };

        var authToken = localStorage.getItem(STORAGE_KEYS.authToken) || null;
        var currentUser = null;
        var currentPage = 'dashboard';
        var currentCases = [];
        var currentDocuments = [];
        var currentSettings = {};
        var editingCaseId = null;
        var editingDocumentId = null;

        document.addEventListener('DOMContentLoaded', function () {
            updateConnectionNotice();
            renderSuperAdminPanel();

            if (!hasConfiguredApiUrl()) {
                clearUserSession();
                showAuth();
                return;
            }

            if (!authToken) {
                showAuth();
                return;
            }

            apiRequest('validateToken', { token: authToken })
                .then(function (result) {
                    if (result && result.success && result.user) {
                        currentUser = result.user;
                        showApp();
                        return;
                    }
                    clearUserSession();
                    showAuth();
                })
                .catch(function (error) {
                    clearUserSession();
                    showAuth();
                    showToast(getErrorMessage('Connection error', error), 'error');
                });
        });

        function clearUserSession() {
            localStorage.removeItem(STORAGE_KEYS.authToken);
            authToken = null;
            currentUser = null;
            currentCases = [];
            currentDocuments = [];
            currentSettings = {};
            editingCaseId = null;
        }

        function hasConfiguredApiUrl() {
            return !!getConfiguredApiUrl();
        }

        function getConfiguredApiUrl() {
            return normalizeApiUrl(localStorage.getItem(STORAGE_KEYS.apiUrl) || '');
        }

        function normalizeApiUrl(value) {
            return String(value || '').replace(/\s+/g, '').replace(/\/+$/, '');
        }

        function setConfiguredApiUrl(value) {
            var normalized = normalizeApiUrl(value);
            if (normalized) {
                localStorage.setItem(STORAGE_KEYS.apiUrl, normalized);
            } else {
                localStorage.removeItem(STORAGE_KEYS.apiUrl);
            }
        }

        function isSuperAdminAuthenticated() {
            return sessionStorage.getItem(STORAGE_KEYS.superAdmin) === 'true';
        }

        function setSuperAdminAuthenticated(enabled) {
            if (enabled) {
                sessionStorage.setItem(STORAGE_KEYS.superAdmin, 'true');
            } else {
                sessionStorage.removeItem(STORAGE_KEYS.superAdmin);
            }
            renderSuperAdminPanel();
            updateConnectionNotice();
        }

        function showAuth() {
            document.getElementById('authPage').style.display = 'flex';
            document.getElementById('appPage').style.display = 'none';
            updateConnectionNotice();
        }

        function showApp() {
            document.getElementById('authPage').style.display = 'none';
            document.getElementById('appPage').style.display = 'block';
            document.getElementById('displayName').textContent = currentUser.fullName || currentUser.username;
            document.getElementById('displayRole').textContent = humanize(currentUser.role);
            renderNavigation();
            navigateTo('dashboard');
        }

        function showAuthTab(tab) {
            var tabMap = {
                login: { button: 'loginTabBtn', panel: 'loginPanel', title: 'Welcome Back', subtitle: 'Sign in to access the administration system' },
                signup: { button: 'signupTabBtn', panel: 'signupPanel', title: 'Create Account', subtitle: 'Register to access the system' },
                superAdmin: { button: 'superAdminTabBtn', panel: 'superAdminPanel', title: 'Super Admin Access', subtitle: 'Configure the deployed URL used to connect the database' }
            };

            Object.keys(tabMap).forEach(function (key) {
                document.getElementById(tabMap[key].button).classList.remove('active');
                document.getElementById(tabMap[key].panel).classList.remove('active');
            });

            document.getElementById(tabMap[tab].button).classList.add('active');
            document.getElementById(tabMap[tab].panel).classList.add('active');
            document.getElementById('authTitle').textContent = tabMap[tab].title;
            document.getElementById('authSubtitle').textContent = tabMap[tab].subtitle;

            if (tab === 'superAdmin') {
                renderSuperAdminPanel();
            }
        }

        function renderSuperAdminPanel() {
            var loginSection = document.getElementById('superAdminLoginSection');
            var configSection = document.getElementById('superAdminConfigSection');
            var statusEl = document.getElementById('superAdminStatus');
            var inputEl = document.getElementById('deploymentUrlEntry');
            if (!loginSection || !configSection || !statusEl || !inputEl) {
                return;
            }

            if (isSuperAdminAuthenticated()) {
                loginSection.classList.add('hidden');
                configSection.classList.remove('hidden');
                inputEl.value = getConfiguredApiUrl();
                statusEl.textContent = hasConfiguredApiUrl()
                    ? 'Current saved URL: ' + getConfiguredApiUrl()
                    : 'No deployed URL saved yet.';
            } else {
                loginSection.classList.remove('hidden');
                configSection.classList.add('hidden');
                statusEl.textContent = '';
                document.getElementById('superAdminForm').reset();
            }
        }

        function updateConnectionNotice() {
            var notice = document.getElementById('connectionNotice');
            if (!notice) {
                return;
            }

            var apiUrl = getConfiguredApiUrl();
            if (apiUrl) {
                notice.className = 'status-box connected';
                notice.innerHTML =
                    '<div class="status-title">Database Connection Ready</div>' +
                    '<div class="status-text">Connected through deployed URL: ' + escapeHtml(apiUrl) + '</div>';
            } else {
                notice.className = 'status-box disconnected';
                notice.innerHTML =
                    '<div class="status-title">Database Connection Missing</div>' +
                    '<div class="status-text">No deployed URL configured yet. Sign in as Super Admin to paste the deployment URL.</div>';
            }
        }

        function handleSuperAdminLogin(event) {
            event.preventDefault();

            var username = document.getElementById('superAdminUsername').value;
            var password = document.getElementById('superAdminPassword').value;

            if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
                setSuperAdminAuthenticated(true);
                showToast('Super Admin unlocked.', 'success');
                return false;
            }

            showToast('Invalid Super Admin credentials.', 'error');
            return false;
        }

        function logoutSuperAdmin() {
            setSuperAdminAuthenticated(false);
            showToast('Super Admin locked.', 'info');
            showAuthTab('login');
        }

        function testDeploymentUrlFromInput(inputId) {
            var input = document.getElementById(inputId);
            if (!input) {
                return;
            }

            var url = normalizeApiUrl(input.value);
            if (!url) {
                showToast('Paste the deployed URL first.', 'warning');
                return;
            }

            testDeploymentUrl(url, true)
                .then(function () {
                    showToast('Deployment URL is reachable.', 'success');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Connection test failed', error), 'error');
                });
        }

        function saveDeploymentUrlFromInput(inputId, stayOnAuth) {
            var input = document.getElementById(inputId);
            if (!input) {
                return;
            }

            var newUrl = normalizeApiUrl(input.value);
            if (!newUrl) {
                showToast('Paste the deployed URL first.', 'warning');
                return;
            }

            var previousUrl = getConfiguredApiUrl();

            testDeploymentUrl(newUrl, false)
                .then(function () {
                    return apiRequest('initializeSheets', { apiUrl: newUrl });
                })
                .then(function (result) {
                    if (!result || !result.success) {
                        throw new Error(result && result.message ? result.message : 'Failed to initialize sheets.');
                    }

                    setConfiguredApiUrl(newUrl);
                    updateConnectionNotice();
                    renderSuperAdminPanel();

                    if (previousUrl && previousUrl !== newUrl) {
                        clearUserSession();
                    }

                    if (!stayOnAuth && currentUser) {
                        showToast('Deployment URL updated. Please log in again.', 'success');
                        showAuth();
                        return;
                    }

                    showToast('Deployment URL saved successfully.', 'success');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Failed to save deployment URL', error), 'error');
                });
        }

        function testDeploymentUrl(url, returnResult) {
            return apiRequest('ping', { apiUrl: url }).then(function (result) {
                if (!result || !result.success) {
                    throw new Error(result && result.message ? result.message : 'The deployed URL did not respond.');
                }
                return returnResult ? result : true;
            });
        }

        function apiRequest(action, options) {
            options = options || {};

            var apiUrl = normalizeApiUrl(options.apiUrl || getConfiguredApiUrl());
            if (!apiUrl) {
                return Promise.reject(new Error('No deployed URL configured. Sign in as Super Admin first.'));
            }

            var params = { action: action };
            if (options.token) {
                params.token = options.token;
            }
            if (options.id) {
                params.id = options.id;
            }
            if (options.payload) {
                params.payload = JSON.stringify(options.payload);
            }

            return jsonpRequest(apiUrl, params);
        }

        function jsonpRequest(baseUrl, params) {
            return new Promise(function (resolve, reject) {
                var callbackName = 'kaasJsonp_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
                var script = document.createElement('script');
                var timedOut = false;

                params = params || {};
                params.callback = callbackName;
                params._ts = Date.now();

                var timeout = setTimeout(function () {
                    timedOut = true;
                    cleanup();
                    reject(new Error('Request timed out.'));
                }, 20000);

                window[callbackName] = function (response) {
                    if (timedOut) {
                        return;
                    }
                    cleanup();
                    resolve(response || {});
                };

                script.onerror = function () {
                    cleanup();
                    reject(new Error('Unable to reach the deployed URL.'));
                };

                script.src = buildUrl(baseUrl, params);
                document.body.appendChild(script);

                function cleanup() {
                    clearTimeout(timeout);
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    try {
                        delete window[callbackName];
                    } catch (error) {
                        window[callbackName] = undefined;
                    }
                }
            });
        }

        function buildUrl(baseUrl, params) {
            var url = normalizeApiUrl(baseUrl);
            var separator = url.indexOf('?') === -1 ? '?' : '&';
            var query = Object.keys(params).map(function (key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
            }).join('&');
            return url + separator + query;
        }

        function handleLogin(event) {
            event.preventDefault();

            if (!hasConfiguredApiUrl()) {
                showToast('Configure the deployed URL first through Super Admin.', 'warning');
                showAuthTab('superAdmin');
                return false;
            }

            var username = document.getElementById('loginUsername').value;
            var password = document.getElementById('loginPassword').value;

            apiRequest('login', {
                payload: {
                    username: username,
                    password: password
                }
            })
                .then(function (result) {
                    if (result && result.success) {
                        authToken = result.token;
                        currentUser = result.user;
                        localStorage.setItem(STORAGE_KEYS.authToken, authToken);
                        showToast('Welcome, ' + (currentUser.fullName || currentUser.username) + '!', 'success');
                        showApp();
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Login failed.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Login failed', error), 'error');
                });

            return false;
        }

        function handleSignup(event) {
            event.preventDefault();

            if (!hasConfiguredApiUrl()) {
                showToast('Configure the deployed URL first through Super Admin.', 'warning');
                showAuthTab('superAdmin');
                return false;
            }

            var fullName = document.getElementById('signupFullName').value;
            var username = document.getElementById('signupUsername').value;
            var phone = document.getElementById('signupPhone').value;
            var role = document.getElementById('signupRole').value;
            var password = document.getElementById('signupPassword').value;
            var confirmPassword = document.getElementById('signupConfirmPassword').value;

            if (password !== confirmPassword) {
                showToast('Passwords do not match.', 'error');
                return false;
            }

            if (password.length < 6) {
                showToast('Password must be at least 6 characters.', 'error');
                return false;
            }

            apiRequest('signup', {
                payload: {
                    username: username,
                    password: password,
                    fullName: fullName,
                    role: role,
                    phone: phone
                }
            })
                .then(function (result) {
                    if (result && result.success) {
                        showToast(result.message, 'success');
                        document.getElementById('signupForm').reset();
                        showAuthTab('login');
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Signup failed.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Signup failed', error), 'error');
                });

            return false;
        }

        function handleLogout() {
            if (!authToken) {
                clearUserSession();
                showAuth();
                return;
            }

            apiRequest('logout', { token: authToken })
                .catch(function () {
                    return { success: true };
                })
                .finally(function () {
                    clearUserSession();
                    showAuth();
                    showToast('Logged out successfully.', 'info');
                });
        }

        function renderNavigation() {
            var navMenu = document.getElementById('navMenu');
            var role = currentUser.role;
            var navItems = [
                { id: 'dashboard', icon: 'fa-home', label: 'Dashboard', roles: ['chief', 'desk_officer', 'resident'] },
                { id: 'cases', icon: 'fa-folder-open', label: 'Cases', roles: ['chief', 'desk_officer'] },
                { id: 'createCase', icon: 'fa-plus-circle', label: 'New Case', roles: ['chief', 'desk_officer', 'resident'] },
                { id: 'documents', icon: 'fa-file-alt', label: 'Documents', roles: ['chief', 'desk_officer'] },
                { id: 'reports', icon: 'fa-chart-bar', label: 'Reports', roles: ['chief', 'desk_officer'] },
                { id: 'settings', icon: 'fa-cog', label: 'Settings', roles: ['chief'] }
            ];

            var filtered = navItems.filter(function (item) {
                return item.roles.indexOf(role) !== -1;
            });

            navMenu.innerHTML = filtered.map(function (item) {
                var active = currentPage === item.id ? 'active' : '';
                return '<li><a href="#" data-page="' + item.id + '" onclick="navigateTo(\'' + item.id + '\');return false;" class="' + active + '"><i class="fas ' + item.icon + '"></i><span>' + item.label + '</span></a></li>';
            }).join('');
        }

        function navigateTo(page) {
            currentPage = page;
            if (page === 'createCase') {
                editingCaseId = null;
            }
            if (page === 'createDocument') {
                editingDocumentId = null;
            }

            document.getElementById('pageTitle').textContent = getPageTitle(page);
            renderNavigation();
            closeSidebarIfMobile();

            switch (page) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'cases':
                    loadCases();
                    break;
                case 'createCase':
                    renderCreateCase();
                    break;
                case 'documents':
                    loadDocuments();
                    break;
                case 'createDocument':
                    renderCreateDocument();
                    break;
                case 'reports':
                    loadReports();
                    break;
                case 'settings':
                    loadSettings();
                    break;
            }
        }

        function getPageTitle(page) {
            var titles = {
                dashboard: 'Dashboard',
                cases: 'Cases',
                createCase: editingCaseId ? 'Edit Case' : 'New Case',
                documents: 'Documents',
                createDocument: editingDocumentId ? 'Edit Document' : 'New Document',
                reports: 'Reports',
                settings: 'Settings'
            };
            return titles[page] || 'Dashboard';
        }

        function loadDashboard() {
            apiRequest('getDashboardStats', { token: authToken })
                .then(function (result) {
                    if (result && result.success) {
                        renderDashboard(result.stats || {}, result.recentCases || []);
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Failed to load dashboard.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Failed to load dashboard', error), 'error');
                });
        }

        function renderDashboard(stats, recentCases) {
            var contentArea = document.getElementById('contentArea');
            var canManageCases = currentUser && currentUser.role !== 'resident';

            var rowsHtml = recentCases.length ? recentCases.map(function (caseItem) {
                return '<tr>' +
                    '<td><strong>' + escapeHtml(caseItem.id) + '</strong></td>' +
                    '<td>' + escapeHtml(formatCaseType(caseItem.type)) + '</td>' +
                    '<td>' + escapeHtml(caseItem.resident.name) + '</td>' +
                    '<td><span class="badge ' + getPriorityClass(caseItem.priority) + '">' + escapeHtml(humanize(caseItem.priority)) + '</span></td>' +
                    '<td><span class="badge ' + getStatusClass(caseItem.status) + '">' + escapeHtml(humanize(caseItem.status)) + '</span></td>' +
                    '<td>' + escapeHtml(formatDate(caseItem.createdAt)) + '</td>' +
                    '</tr>';
            }).join('') : '<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i>No cases found.</td></tr>';

            var quickActions = '<div class="toolbar-actions">' +
                '<button class="btn btn-primary btn-sm" onclick="navigateTo(\'createCase\')"><i class="fas fa-plus"></i> ' + (canManageCases ? 'New Application' : 'Submit Request') + '</button>' +
                (canManageCases ? '<button class="btn btn-secondary btn-sm" onclick="navigateTo(\'cases\')"><i class="fas fa-list"></i> View All Cases</button>' : '') +
                '</div>';

            contentArea.innerHTML = '' +
                '<div class="stats-grid">' +
                '<div class="stat-card"><div style="position:absolute;top:0;left:0;right:0;height:4px;background:#1E3A5F;"></div><div style="display:flex;align-items:flex-start;gap:18px;"><div class="stat-icon primary"><i class="fas fa-folder-open"></i></div><div><h3 style="font-size:32px;font-weight:700;line-height:1;margin-bottom:6px;">' + (stats.total || 0) + '</h3><p style="font-size:14px;color:#6B7280;">Total Cases</p></div></div></div>' +
                '<div class="stat-card"><div style="position:absolute;top:0;left:0;right:0;height:4px;background:#FF6B35;"></div><div style="display:flex;align-items:flex-start;gap:18px;"><div class="stat-icon" style="background:rgba(255,107,53,0.1);color:#FF6B35;"><i class="fas fa-clock"></i></div><div><h3 style="font-size:32px;font-weight:700;line-height:1;margin-bottom:6px;">' + (stats.pending || 0) + '</h3><p style="font-size:14px;color:#6B7280;">Pending</p></div></div></div>' +
                '<div class="stat-card"><div style="position:absolute;top:0;left:0;right:0;height:4px;background:#00A651;"></div><div style="display:flex;align-items:flex-start;gap:18px;"><div class="stat-icon" style="background:rgba(0,166,81,0.1);color:#00A651;"><i class="fas fa-check-circle"></i></div><div><h3 style="font-size:32px;font-weight:700;line-height:1;margin-bottom:6px;">' + (stats.resolved || 0) + '</h3><p style="font-size:14px;color:#6B7280;">Resolved</p></div></div></div>' +
                '<div class="stat-card"><div style="position:absolute;top:0;left:0;right:0;height:4px;background:#D4AF37;"></div><div style="display:flex;align-items:flex-start;gap:18px;"><div class="stat-icon" style="background:rgba(212,175,55,0.1);color:#D4AF37;"><i class="fas fa-percentage"></i></div><div><h3 style="font-size:32px;font-weight:700;line-height:1;margin-bottom:6px;">' + (stats.resolutionRate || 0) + '%</h3><p style="font-size:14px;color:#6B7280;">Resolution Rate</p></div></div></div>' +
                '</div>' +
                '<div class="card"><div class="card-header"><h3 class="card-title">Quick Actions</h3></div>' + quickActions + '</div>' +
                '<div class="card">' +
                '<div class="card-header">' +
                '<h3 class="card-title">Recent Cases</h3>' +
                '<div class="toolbar-actions"><button class="btn btn-secondary btn-sm" onclick="printTable(\'dashboardCasesTable\', \'Recent Cases\')"><i class="fas fa-print"></i> Print Table</button></div>' +
                '</div>' +
                '<div class="table-wrapper">' +
                '<table id="dashboardCasesTable" class="data-table">' +
                '<thead><tr><th>Ticket ID</th><th>Type</th><th>Resident</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>' +
                '<tbody>' + rowsHtml + '</tbody>' +
                '</table>' +
                '</div>' +
                '</div>';
        }

        function loadCases() {
            apiRequest('getCases', { token: authToken })
                .then(function (result) {
                    if (result && result.success) {
                        currentCases = result.cases || [];
                        renderCases(currentCases);
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Failed to load cases.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Failed to load cases', error), 'error');
                });
        }

        function renderCases(cases) {
            var contentArea = document.getElementById('contentArea');
            var showActions = currentUser && currentUser.role !== 'resident';
            var colspan = showActions ? 7 : 6;

            var rowsHtml = cases.length ? cases.map(function (caseItem) {
                var actionCell = showActions ? '<td class="table-actions"><div class="inline-actions">' +
                    '<button class="btn btn-secondary btn-sm" onclick="editCase(\'' + escapeJs(caseItem.id) + '\')"><i class="fas fa-pen"></i> Edit</button>' +
                    '<button class="btn btn-danger btn-sm" onclick="deleteCaseRecord(\'' + escapeJs(caseItem.id) + '\')"><i class="fas fa-trash"></i> Delete</button>' +
                    '</div></td>' : '';

                return '<tr>' +
                    '<td><strong>' + escapeHtml(caseItem.id) + '</strong></td>' +
                    '<td>' + escapeHtml(formatCaseType(caseItem.type)) + '</td>' +
                    '<td>' + escapeHtml(caseItem.resident.name) + '</td>' +
                    '<td><span class="badge ' + getPriorityClass(caseItem.priority) + '">' + escapeHtml(humanize(caseItem.priority)) + '</span></td>' +
                    '<td><span class="badge ' + getStatusClass(caseItem.status) + '">' + escapeHtml(humanize(caseItem.status)) + '</span></td>' +
                    '<td>' + escapeHtml(formatDate(caseItem.createdAt)) + '</td>' +
                    actionCell +
                    '</tr>';
            }).join('') : '<tr><td colspan="' + colspan + '" class="empty-state"><i class="fas fa-inbox"></i>No cases found.</td></tr>';

            contentArea.innerHTML = '' +
                '<div class="section-toolbar">' +
                '<h3 style="font-size:18px;">All Cases</h3>' +
                '<div class="toolbar-actions">' +
                '<button class="btn btn-secondary btn-sm" onclick="printTable(\'casesTable\', \'Cases Register\')"><i class="fas fa-print"></i> Print Table</button>' +
                '<button class="btn btn-primary btn-sm" onclick="navigateTo(\'createCase\')"><i class="fas fa-plus"></i> New Case</button>' +
                '</div>' +
                '</div>' +
                '<div class="card" style="padding:0;">' +
                '<div class="table-wrapper">' +
                '<table id="casesTable" class="data-table">' +
                '<thead><tr><th>Ticket ID</th><th>Type</th><th>Resident</th><th>Priority</th><th>Status</th><th>Date</th>' + (showActions ? '<th class="table-actions">Actions</th>' : '') + '</tr></thead>' +
                '<tbody>' + rowsHtml + '</tbody>' +
                '</table>' +
                '</div>' +
                '</div>';
        }

        function renderCreateCase(caseItem) {
            var contentArea = document.getElementById('contentArea');
            var isEdit = !!caseItem;
            var showStatus = isEdit && currentUser && currentUser.role !== 'resident';

            caseItem = caseItem || {
                type: '',
                priority: '',
                status: 'new',
                resident: {
                    name: '',
                    idNumber: '',
                    phone: currentUser && currentUser.phone ? currentUser.phone : '',
                    location: ''
                },
                description: ''
            };

            contentArea.innerHTML = '' +
                '<div class="card">' +
                '<div class="card-header"><h3 class="card-title">' + (isEdit ? 'Edit Case' : 'Submit New Application') + '</h3></div>' +
                '<form onsubmit="return handleSaveCase(event)">' +
                '<div class="settings-grid" style="margin-bottom:24px;">' +
                '<div class="form-group"><label>Application Type</label><select id="caseType" class="form-control" required>' + buildOptions([
                    { value: '', label: '-- Select Type --' },
                    { value: 'permit', label: 'Permit Application' },
                    { value: 'recommendation', label: 'Letter of Recommendation' },
                    { value: 'complaint', label: 'Complaint' },
                    { value: 'security', label: 'Security Matter' },
                    { value: 'development', label: 'Development Project' },
                    { value: 'other', label: 'Other' }
                ], caseItem.type) + '</select></div>' +
                '<div class="form-group"><label>Priority Level</label><select id="casePriority" class="form-control" required>' + buildOptions([
                    { value: '', label: '-- Select Priority --' },
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                ], caseItem.priority) + '</select></div>' +
                '</div>' +
                (showStatus ? '<div class="form-group"><label>Status</label><select id="caseStatus" class="form-control">' + buildOptions([
                    { value: 'new', label: 'New' },
                    { value: 'in_progress', label: 'In Progress' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'rejected', label: 'Rejected' }
                ], caseItem.status || 'new') + '</select></div>' : '') +
                '<div class="settings-grid" style="margin-bottom:24px;">' +
                '<div class="form-group"><label>Full Name</label><input type="text" id="residentName" class="form-control" value="' + escapeHtml(caseItem.resident.name || '') + '" required></div>' +
                '<div class="form-group"><label>ID Number</label><input type="text" id="residentId" class="form-control" value="' + escapeHtml(caseItem.resident.idNumber || '') + '" required></div>' +
                '</div>' +
                '<div class="settings-grid" style="margin-bottom:24px;">' +
                '<div class="form-group"><label>Phone Number</label><input type="tel" id="residentPhone" class="form-control" value="' + escapeHtml(caseItem.resident.phone || '') + '" required></div>' +
                '<div class="form-group"><label>Location / Village</label><input type="text" id="residentLocation" class="form-control" value="' + escapeHtml(caseItem.resident.location || '') + '" required></div>' +
                '</div>' +
                '<div class="form-group"><label>Description</label><textarea id="caseDescription" class="form-control" style="min-height:120px;" required>' + escapeHtml(caseItem.description || '') + '</textarea></div>' +
                '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:24px;border-top:2px solid #F3F4F6;flex-wrap:wrap;">' +
                '<button type="button" class="btn btn-secondary" style="width:auto;" onclick="navigateTo(\'' + (currentUser && currentUser.role === 'resident' ? 'dashboard' : 'cases') + '\')">Cancel</button>' +
                '<button type="submit" class="btn btn-primary" style="width:auto;"><i class="fas fa-save"></i> ' + (isEdit ? 'Update Case' : 'Submit Application') + '</button>' +
                '</div>' +
                '</form>' +
                '</div>';
        }

        function handleSaveCase(event) {
            event.preventDefault();

            var payload = {
                id: editingCaseId,
                type: document.getElementById('caseType').value,
                priority: document.getElementById('casePriority').value,
                resident: {
                    name: document.getElementById('residentName').value,
                    idNumber: document.getElementById('residentId').value,
                    phone: document.getElementById('residentPhone').value,
                    location: document.getElementById('residentLocation').value
                },
                description: document.getElementById('caseDescription').value
            };

            var statusField = document.getElementById('caseStatus');
            if (statusField) {
                payload.status = statusField.value;
            }

            if (editingCaseId) {
                apiRequest('updateCase', { token: authToken, payload: payload })
                    .then(function (result) {
                        if (result && result.success) {
                            showToast(result.message, 'success');
                            editingCaseId = null;
                            navigateTo('cases');
                            return;
                        }
                        showToast(result && result.message ? result.message : 'Failed to update case.', 'error');
                    })
                    .catch(function (error) {
                        showToast(getErrorMessage('Failed to update case', error), 'error');
                    });
            } else {
                apiRequest('createCase', { token: authToken, payload: payload })
                    .then(function (result) {
                        if (result && result.success) {
                            showToast(result.message + ' Ticket: ' + result.caseId, 'success');
                            navigateTo(currentUser && currentUser.role === 'resident' ? 'dashboard' : 'cases');
                            return;
                        }
                        showToast(result && result.message ? result.message : 'Failed to create case.', 'error');
                    })
                    .catch(function (error) {
                        showToast(getErrorMessage('Failed to create case', error), 'error');
                    });
            }

            return false;
        }

        function editCase(caseId) {
            var caseItem = findCaseById(caseId);
            if (!caseItem) {
                showToast('Case not found.', 'error');
                return;
            }

            editingCaseId = caseId;
            currentPage = 'createCase';
            document.getElementById('pageTitle').textContent = 'Edit Case';
            renderNavigation();
            renderCreateCase(caseItem);
        }

        function deleteCaseRecord(caseId) {
            if (!confirm('Delete this case? This action cannot be undone.')) {
                return;
            }

            apiRequest('deleteCase', { token: authToken, id: caseId })
                .then(function (result) {
                    if (result && result.success) {
                        showToast(result.message, 'success');
                        loadCases();
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Failed to delete case.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Failed to delete case', error), 'error');
                });
        }

        function loadDocuments() {
            apiRequest('getDocuments', { token: authToken })
                .then(function (result) {
                    if (result && result.success) {
                        currentDocuments = result.documents || [];
                        renderDocuments(currentDocuments);
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Failed to load documents.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Failed to load documents', error), 'error');
                });
        }

        function renderDocuments(documents) {
            var contentArea = document.getElementById('contentArea');

            var rowsHtml = documents.length ? documents.map(function (documentItem) {
                return '<tr>' +
                    '<td><strong>' + escapeHtml(documentItem.id) + '</strong></td>' +
                    '<td>' + escapeHtml(documentItem.category === 'Identification' ? 'Personal Identification & Civic' : (documentItem.category === 'Succession' ? 'Succession & Land Matters' : 'Administrative & Misc.')) + '</td>' +
                    '<td>' + escapeHtml(documentItem.documentType) + '</td>' +
                    '<td>' + escapeHtml(documentItem.residentName) + '</td>' +
                    '<td>' + escapeHtml(documentItem.idNumber) + '</td>' +
                    '<td>' + escapeHtml(formatDate(documentItem.createdAt)) + '</td>' +
                    '<td class="table-actions"><div class="inline-actions">' +
                    '<button class="btn btn-secondary btn-sm" onclick="editDocument(\'' + escapeJs(documentItem.id) + '\')"><i class="fas fa-pen"></i> Edit</button>' +
                    '<button class="btn btn-danger btn-sm" onclick="deleteDocumentRecord(\'' + escapeJs(documentItem.id) + '\')"><i class="fas fa-trash"></i> Delete</button>' +
                    '</div></td>' +
                    '</tr>';
            }).join('') : '<tr><td colspan="7" class="empty-state"><i class="fas fa-folder-open"></i>No documents found.</td></tr>';

            contentArea.innerHTML = '' +
                '<div class="section-toolbar">' +
                '<h3 style="font-size:18px;">Documents</h3>' +
                '<div class="toolbar-actions">' +
                '<button class="btn btn-secondary btn-sm" onclick="printTable(\'documentsTable\', \'Documents Register\')"><i class="fas fa-print"></i> Print Table</button>' +
                '<button class="btn btn-primary btn-sm" onclick="handleAddDocument()"><i class="fas fa-upload"></i> Add Document</button>' +
                '</div>' +
                '</div>' +
                '<div class="card" style="padding:0;">' +
                '<div class="table-wrapper">' +
                '<table id="documentsTable" class="data-table">' +
                '<thead><tr><th>ID</th><th>Category</th><th>Type</th><th>Resident</th><th>ID Number</th><th>Date</th><th class="table-actions">Actions</th></tr></thead>' +
                '<tbody>' + rowsHtml + '</tbody>' +
                '</table>' +
                '</div>' +
                '</div>';
        }

        function handleAddDocument() {
            navigateTo('createDocument');
        }

        function renderCreateDocument(documentItem) {
            var contentArea = document.getElementById('contentArea');
            var isEdit = !!documentItem;

            documentItem = documentItem || {
                category: '',
                documentType: '',
                residentName: '',
                idNumber: '',
                details: ''
            };

            contentArea.innerHTML = '' +
                '<div class="card">' +
                '<div class="card-header"><h3 class="card-title">' + (isEdit ? 'Edit Document' : 'Record New Document') + '</h3></div>' +
                '<form onsubmit="return handleSaveDocument(event)">' +
                '<div class="settings-grid" style="margin-bottom:24px;">' +
                '<div class="form-group"><label>Category</label><select id="docCategory" class="form-control" onchange="updateDocumentTypes()" required>' + buildOptions([
                    { value: '', label: '-- Select Category --' },
                    { value: 'Identification', label: 'Personal Identification and Civic Documents' },
                    { value: 'Succession', label: 'Succession and Land Matters' },
                    { value: 'Administrative', label: 'Administrative and Miscellaneous Documents' }
                ], documentItem.category) + '</select></div>' +
                '<div class="form-group"><label>Document Type</label><select id="docType" class="form-control" data-selected="' + escapeHtml(documentItem.documentType) + '" required><option value="">-- Select Type --</option></select></div>' +
                '</div>' +
                '<div class="settings-grid" style="margin-bottom:24px;">' +
                '<div class="form-group"><label>Resident Name</label><input type="text" id="docResidentName" class="form-control" value="' + escapeHtml(documentItem.residentName || '') + '" required></div>' +
                '<div class="form-group"><label>ID Number</label><input type="text" id="docIdNumber" class="form-control" value="' + escapeHtml(documentItem.idNumber || '') + '" required></div>' +
                '</div>' +
                '<div class="form-group"><label>Additional Details / Notes</label><textarea id="docDetails" class="form-control" style="min-height:120px;">' + escapeHtml(documentItem.details || '') + '</textarea></div>' +
                '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;padding-top:24px;border-top:2px solid #F3F4F6;flex-wrap:wrap;">' +
                '<button type="button" class="btn btn-secondary" style="width:auto;" onclick="navigateTo(\'documents\')">Cancel</button>' +
                '<button type="submit" class="btn btn-primary" style="width:auto;"><i class="fas fa-save"></i> ' + (isEdit ? 'Update Document' : 'Save Document') + '</button>' +
                '</div>' +
                '</form>' +
                '</div>';
                
            if (documentItem.category) {
                updateDocumentTypes();
            }
        }

        function updateDocumentTypes() {
            var category = document.getElementById('docCategory').value;
            var docTypeSelect = document.getElementById('docType');
            var selectedType = docTypeSelect.getAttribute('data-selected') || '';
            
            docTypeSelect.innerHTML = '<option value="">-- Select Type --</option>';
            
            var types = [];
            if (category === 'Identification') {
                types = [
                    'ID Application Certification',
                    'Birth/Death Certificates Application',
                    'Recommendation/Introduction Letters',
                    'School Transfer Letters'
                ];
            } else if (category === 'Succession') {
                types = [
                    'Letters of Administration (Succession Letters)',
                    'Land Sale Witnessing Letters',
                    'Boundary Dispute Documents'
                ];
            } else if (category === 'Administrative') {
                types = [
                    'Chief\'s Recommendation Letter',
                    'Customary Marriage Certificates',
                    'P3 Forms (Police Request)',
                    'Liquor Licensing Recommendations'
                ];
            }
            
            types.forEach(function(type) {
                var opt = document.createElement('option');
                opt.value = type;
                opt.textContent = type;
                if (type === selectedType) {
                    opt.selected = true;
                }
                docTypeSelect.appendChild(opt);
            });
            // Clear the data-selected attribute after applying it
            docTypeSelect.removeAttribute('data-selected');
        }

        function handleSaveDocument(event) {
            event.preventDefault();

            var categorySelect = document.getElementById('docCategory');
            var payload = {
                id: editingDocumentId,
                category: categorySelect.value,
                documentType: document.getElementById('docType').value,
                residentName: document.getElementById('docResidentName').value,
                idNumber: document.getElementById('docIdNumber').value,
                details: document.getElementById('docDetails').value
            };

            if (editingDocumentId) {
                apiRequest('updateDocument', { token: authToken, payload: payload })
                    .then(function (result) {
                        if (result && result.success) {
                            showToast(result.message, 'success');
                            editingDocumentId = null;
                            navigateTo('documents');
                            return;
                        }
                        showToast(result && result.message ? result.message : 'Failed to update document.', 'error');
                    })
                    .catch(function (error) {
                        showToast(getErrorMessage('Failed to update document', error), 'error');
                    });
            } else {
                apiRequest('addDocument', { token: authToken, payload: payload })
                    .then(function (result) {
                        if (result && result.success) {
                            showToast(result.message, 'success');
                            navigateTo('documents');
                            return;
                        }
                        showToast(result && result.message ? result.message : 'Failed to add document.', 'error');
                    })
                    .catch(function (error) {
                        showToast(getErrorMessage('Failed to add document', error), 'error');
                    });
            }

            return false;
        }

        function editDocument(documentId) {
            var documentItem = findDocumentById(documentId);
            if (!documentItem) {
                showToast('Document not found.', 'error');
                return;
            }

            editingDocumentId = documentId;
            navigateTo('createDocument');
            renderCreateDocument(documentItem);
        }

        function deleteDocumentRecord(documentId) {
            if (!confirm('Delete this document record?')) {
                return;
            }

            apiRequest('deleteDocument', { token: authToken, id: documentId })
                .then(function (result) {
                    if (result && result.success) {
                        showToast(result.message, 'success');
                        loadDocuments();
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Failed to delete document.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Failed to delete document', error), 'error');
                });
        }

        function loadReports() {
            var contentArea = document.getElementById('contentArea');
            contentArea.innerHTML = '' +
                '<div class="card">' +
                '<div class="card-header"><h3 class="card-title">Reports & Analytics</h3></div>' +
                '<p style="color:#6B7280;margin-bottom:20px;">Use the print buttons in Dashboard, Cases and Documents to generate branded hard-copy reports. The backend is reached through the deployed URL saved by the Super Admin.</p>' +
                '<div class="toolbar-actions">' +
                '<button class="btn btn-secondary btn-sm" onclick="navigateTo(\'cases\')"><i class="fas fa-folder-open"></i> Open Cases</button>' +
                '<button class="btn btn-secondary btn-sm" onclick="navigateTo(\'documents\')"><i class="fas fa-file-alt"></i> Open Documents</button>' +
                (currentUser && currentUser.role === 'chief' ? '<button class="btn btn-primary btn-sm" onclick="navigateTo(\'settings\')"><i class="fas fa-cog"></i> Open Settings</button>' : '') +
                '</div>' +
                '</div>';
        }

        function loadSettings() {
            apiRequest('getSettings', { token: authToken })
                .then(function (result) {
                    if (result && result.success) {
                        currentSettings = result.settings || {};
                        renderSettings(currentSettings);
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Failed to load settings.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Failed to load settings', error), 'error');
                });
        }

        function renderSettings(settings) {
            var contentArea = document.getElementById('contentArea');
            settings = settings || {};

            var connectionSection = '';
            if (isSuperAdminAuthenticated()) {
                connectionSection = '' +
                    '<div class="card">' +
                    '<div class="card-header"><h3 class="card-title">Deployment URL Connection</h3></div>' +
                    '<div class="status-box connected" style="margin-bottom:20px;">' +
                    '<div class="status-title">Super Admin Control</div>' +
                    '<div class="status-text">This URL is stored locally in the browser and is used to connect this frontend to the Apps Script database deployment.</div>' +
                    '</div>' +
                    '<div class="form-group"><label>Deployed Web App URL</label><input type="text" id="deploymentUrlSetting" class="form-control" value="' + escapeHtml(getConfiguredApiUrl()) + '" placeholder="https://script.google.com/macros/s/.../exec"></div>' +
                    '<div class="button-row">' +
                    '<button type="button" class="btn btn-primary btn-sm" onclick="saveDeploymentUrlFromInput(\'deploymentUrlSetting\', false)"><i class="fas fa-save"></i> Save URL</button>' +
                    '<button type="button" class="btn btn-secondary btn-sm" onclick="testDeploymentUrlFromInput(\'deploymentUrlSetting\')"><i class="fas fa-link"></i> Test Connection</button>' +
                    '<button type="button" class="btn btn-danger btn-sm" onclick="logoutSuperAdmin()"><i class="fas fa-lock"></i> Lock Super Admin</button>' +
                    '</div>' +
                    '</div>';
            }

            contentArea.innerHTML = '' +
                '<div class="card">' +
                '<div class="card-header"><h3 class="card-title">Settings</h3></div>' +
                '<div style="margin-bottom:40px;">' +
                '<h4 style="font-size:16px;font-weight:700;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #F3F4F6;">Office Information</h4>' +
                '<div class="settings-grid">' +
                '<div class="form-group"><label>Office Name</label><input type="text" id="officeName" class="form-control" value="' + escapeHtml(settings.officeName || '') + '"></div>' +
                '<div class="form-group"><label>Location</label><input type="text" id="officeLocation" class="form-control" value="' + escapeHtml(settings.location || '') + '"></div>' +
                '</div>' +
                '<div class="form-group"><label>Office Address</label><textarea id="officeAddress" class="form-control" style="min-height:90px;">' + escapeHtml(settings.officeAddress || '') + '</textarea></div>' +
                '<div class="form-group"><label>Logo URL</label><input type="text" id="logoUrl" class="form-control" value="' + escapeHtml(settings.logoUrl || '') + '" placeholder="https://example.com/logo.png"></div>' +
                '<div class="form-group"><label>Print Footer Text</label><textarea id="footerText" class="form-control" style="min-height:90px;">' + escapeHtml(settings.footerText || '') + '</textarea></div>' +
                '</div>' +
                '<div style="margin-bottom:32px;">' +
                '<h4 style="font-size:16px;font-weight:700;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #F3F4F6;">Notifications</h4>' +
                '<label class="checkbox-row"><input type="checkbox" id="smsNotifications" ' + (settings.smsNotifications ? 'checked' : '') + '> SMS Notifications</label>' +
                '<label class="checkbox-row"><input type="checkbox" id="emailNotifications" ' + (settings.emailNotifications ? 'checked' : '') + '> Email Notifications</label>' +
                '</div>' +
                '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:32px;padding-top:24px;border-top:2px solid #F3F4F6;flex-wrap:wrap;">' +
                '<button class="btn btn-secondary" style="width:auto;" onclick="printSettingsPreview()"><i class="fas fa-print"></i> Print Preview</button>' +
                '<button class="btn btn-primary" style="width:auto;" onclick="handleSaveSettings()"><i class="fas fa-save"></i> Save Settings</button>' +
                '</div>' +
                '</div>' +
                connectionSection;
        }

        function handleSaveSettings() {
            var data = {
                officeName: document.getElementById('officeName').value,
                officeAddress: document.getElementById('officeAddress').value,
                location: document.getElementById('officeLocation').value,
                logoUrl: document.getElementById('logoUrl').value,
                footerText: document.getElementById('footerText').value,
                smsNotifications: document.getElementById('smsNotifications').checked,
                emailNotifications: document.getElementById('emailNotifications').checked
            };

            apiRequest('updateSettings', { token: authToken, payload: data })
                .then(function (result) {
                    if (result && result.success) {
                        currentSettings = result.settings || data;
                        showToast(result.message, 'success');
                        return;
                    }
                    showToast(result && result.message ? result.message : 'Failed to save settings.', 'error');
                })
                .catch(function (error) {
                    showToast(getErrorMessage('Failed to save settings', error), 'error');
                });
        }

        function printSettingsPreview() {
            currentSettings = {
                officeName: document.getElementById('officeName').value,
                officeAddress: document.getElementById('officeAddress').value,
                location: document.getElementById('officeLocation').value,
                logoUrl: document.getElementById('logoUrl').value,
                footerText: document.getElementById('footerText').value,
                smsNotifications: document.getElementById('smsNotifications').checked,
                emailNotifications: document.getElementById('emailNotifications').checked
            };

            var contentArea = document.getElementById('contentArea');
            var previewContainer = document.createElement('div');
            previewContainer.innerHTML = '' +
                '<table id="settingsPreviewTable" class="data-table">' +
                '<thead><tr><th>Setting</th><th>Value</th></tr></thead>' +
                '<tbody>' +
                '<tr><td>Office Name</td><td>' + escapeHtml(currentSettings.officeName || '') + '</td></tr>' +
                '<tr><td>Office Address</td><td>' + escapeHtml(currentSettings.officeAddress || '') + '</td></tr>' +
                '<tr><td>Location</td><td>' + escapeHtml(currentSettings.location || '') + '</td></tr>' +
                '<tr><td>Logo URL</td><td>' + escapeHtml(currentSettings.logoUrl || '') + '</td></tr>' +
                '<tr><td>Footer Text</td><td>' + escapeHtml(currentSettings.footerText || '') + '</td></tr>' +
                '</tbody>' +
                '</table>';

            contentArea.appendChild(previewContainer);
            var printWindow = window.open('', '_blank');
            if (!printWindow) {
                previewContainer.remove();
                showToast('Allow pop-ups to print the preview.', 'warning');
                return;
            }

            renderPrintWindow(printWindow, 'settingsPreviewTable', 'Settings Preview', currentSettings);
            setTimeout(function () {
                previewContainer.remove();
            }, 600);
        }

        function printTable(tableId, title) {
            var sourceTable = document.getElementById(tableId);
            if (!sourceTable) {
                showToast('Nothing to print.', 'warning');
                return;
            }

            var printWindow = window.open('', '_blank');
            if (!printWindow) {
                showToast('Allow pop-ups to print the table.', 'warning');
                return;
            }

            printWindow.document.write('<p style="font-family:Segoe UI, Arial, sans-serif;padding:24px;color:#1E3A5F;">Preparing print preview...</p>');
            printWindow.document.close();

            apiRequest('getSettings', { token: authToken })
                .then(function (result) {
                    if (!result || !result.success) {
                        printWindow.close();
                        showToast(result && result.message ? result.message : 'Failed to prepare print view.', 'error');
                        return;
                    }

                    currentSettings = result.settings || {};
                    renderPrintWindow(printWindow, tableId, title, currentSettings);
                })
                .catch(function (error) {
                    printWindow.close();
                    showToast(getErrorMessage('Failed to prepare print view', error), 'error');
                });
        }

        function renderPrintWindow(printWindow, tableId, title, settings) {
            var table = document.getElementById(tableId);
            if (!table) {
                printWindow.close();
                showToast('Nothing to print.', 'warning');
                return;
            }

            var clone = table.cloneNode(true);
            var actionCells = clone.querySelectorAll('.table-actions');
            for (var i = 0; i < actionCells.length; i++) {
                actionCells[i].remove();
            }

            var officeName = escapeHtml(settings.officeName || 'KAAS');
            var officeAddress = escapeHtml(settings.officeAddress || '');
            var location = escapeHtml(settings.location || '');
            var footerText = escapeHtml(settings.footerText || 'Official administrative record generated by KAAS.');
            var generatedAt = escapeHtml(new Date().toLocaleString());
            var logoHtml = settings.logoUrl
                ? '<img src="' + escapeHtml(settings.logoUrl) + '" alt="Office Logo" style="width:72px;height:72px;object-fit:contain;border-radius:8px;border:1px solid #E5E7EB;padding:6px;">'
                : '<div style="width:72px;height:72px;border-radius:12px;background:#1E3A5F;color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;">' + escapeHtml(getOfficeInitials(settings.officeName || 'KAAS')) + '</div>';

            var addressLine = [officeAddress, location].filter(Boolean).join(' | ');

            var pageHtml = [
                '<!DOCTYPE html>',
                '<html lang="en">',
                '<head>',
                '<meta charset="UTF-8">',
                '<title>' + escapeHtml(title) + '</title>',
                '<style>',
                'body{font-family:Segoe UI,Arial,sans-serif;color:#1A1A2E;margin:32px;}',
                '.print-header{display:flex;gap:16px;align-items:center;padding-bottom:18px;border-bottom:3px solid #1E3A5F;margin-bottom:20px;}',
                '.print-header h1{margin:0;font-size:24px;color:#1E3A5F;}',
                '.print-header p{margin:4px 0;color:#4B5563;font-size:13px;}',
                '.print-title{margin:0 0 18px;font-size:18px;color:#1E3A5F;}',
                'table{width:100%;border-collapse:collapse;margin-top:12px;}',
                'th,td{border:1px solid #D1D5DB;padding:10px 12px;text-align:left;font-size:12px;vertical-align:top;}',
                'th{background:#F3F4F6;text-transform:uppercase;color:#4B5563;}',
                'tbody tr:nth-child(even){background:#FAFBFC;}',
                '.print-footer{margin-top:24px;padding-top:12px;border-top:1px solid #D1D5DB;font-size:12px;color:#6B7280;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;}',
                '@media print{body{margin:18px;} .print-footer{position:fixed;left:18px;right:18px;bottom:8px;background:#FFFFFF;}}',
                '</style>',
                '</head>',
                '<body>',
                '<div class="print-header">',
                logoHtml,
                '<div>',
                '<h1>' + officeName + '</h1>',
                '<p>' + (addressLine || 'Administrative Office') + '</p>',
                '<p>' + generatedAt + '</p>',
                '</div>',
                '</div>',
                '<h2 class="print-title">' + escapeHtml(title) + '</h2>',
                clone.outerHTML,
                '<div class="print-footer">',
                '<span>' + footerText + '</span>',
                '<span>Generated: ' + generatedAt + '</span>',
                '</div></body></html>'
            ].join("");

            printWindow.document.open();
            printWindow.document.write(pageHtml);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(function () {
                printWindow.print();
            }, 400);
        }

        function buildOptions(options, selectedValue) {
            return options.map(function (option) {
                var selected = option.value === selectedValue ? ' selected' : '';
                return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
            }).join('');
        }

        function findCaseById(caseId) {
            for (var i = 0; i < currentCases.length; i++) {
                if (currentCases[i].id === caseId) {
                    return currentCases[i];
                }
            }
            return null;
        }

        function findDocumentById(documentId) {
            for (var i = 0; i < currentDocuments.length; i++) {
                if (currentDocuments[i].id === documentId) {
                    return currentDocuments[i];
                }
            }
            return null;
        }

        function formatCaseType(type) {
            var labels = {
                permit: 'Permit Application',
                recommendation: 'Letter of Recommendation',
                complaint: 'Complaint',
                security: 'Security Matter',
                development: 'Development Project',
                other: 'Other'
            };
            return labels[type] || humanize(type);
        }

        function formatDate(value) {
            if (!value) {
                return '-';
            }

            var date = new Date(value);
            if (isNaN(date.getTime())) {
                return value;
            }

            return date.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        function getStatusClass(status) {
            return 'badge-' + (status || 'new');
        }

        function getPriorityClass(priority) {
            return 'badge-' + (priority || 'medium');
        }

        function humanize(value) {
            if (!value) {
                return '';
            }
            return String(value)
                .replace(/_/g, ' ')
                .replace(/\b\w/g, function (match) {
                    return match.toUpperCase();
                });
        }

        function getOfficeInitials(name) {
            var words = String(name || 'KAAS').trim().split(/\s+/);
            var initials = words.slice(0, 2).map(function (word) {
                return word.charAt(0).toUpperCase();
            }).join('');
            return initials || 'KA';
        }

        function getErrorMessage(prefix, error) {
            return prefix + ': ' + ((error && error.message) ? error.message : 'Unexpected error.');
        }

        function escapeHtml(value) {
            return String(value === null || value === undefined ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeJs(value) {
            return String(value === null || value === undefined ? '' : value)
                .replace(/\\/g, "\\\\")
                .replace(/'/g, "\\'")
                .replace(/\r?\n/g, ' ');
        }

        function showToast(message, type) {
            type = type || 'info';

            var container = document.getElementById('toastContainer');
            var toast = document.createElement('div');
            toast.className = 'toast ' + type;

            var icons = {
                success: 'fa-check-circle',
                error: 'fa-exclamation-circle',
                warning: 'fa-exclamation-triangle',
                info: 'fa-info-circle'
            };

            toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + escapeHtml(message) + '</span>';
            container.appendChild(toast);

            setTimeout(function () {
                toast.style.animation = 'toastSlide 0.3s ease-out reverse';
                setTimeout(function () {
                    toast.remove();
                }, 300);
            }, 4000);
        }

        function closeSidebarIfMobile() {
            if (window.innerWidth < 1024) {
                document.getElementById('sidebar').classList.remove('open');
            }
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
        }

        window.addEventListener('resize', function () {
            if (window.innerWidth >= 1024) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    