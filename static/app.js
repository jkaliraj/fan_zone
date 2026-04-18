/* ═══════════════════════════════════════════════════════════
   FanZone AI — Frontend Application
   Connects to FastAPI backend + CricAPI + Gemini AI
   ═══════════════════════════════════════════════════════════ */

const API = '/api';

// ── State ────────────────────────────────────────────────────
let currentUser = null;
let currentSection = 'live';

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Check saved user
    const saved = localStorage.getItem('fanzone_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateNavProfile();
    }

    // Nav click handlers
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(link.dataset.section);
        });
    });

    document.getElementById('btnRegister')?.addEventListener('click', () => switchSection('fans'));
    document.getElementById('btnNewDiscussion')?.addEventListener('click', toggleNewDiscussion);

    // Load initial section
    switchSection('live');
});

// ── Navigation ───────────────────────────────────────────────
function switchSection(section) {
    currentSection = section;

    // Update nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-section="${section}"]`)?.classList.add('active');

    // Hide all sections
    document.getElementById('heroSection').classList.toggle('hidden', section !== 'live');
    ['Live', 'Matches', 'Discuss', 'Fans', 'Ai'].forEach(s => {
        const el = document.getElementById(`section${s}`);
        if (el) el.classList.add('hidden');
    });

    // Show target
    const map = { live: 'Live', matches: 'Matches', discuss: 'Discuss', fans: 'Fans', ai: 'Ai' };
    const target = document.getElementById(`section${map[section]}`);
    if (target) target.classList.remove('hidden');

    // Load data
    if (section === 'live') loadLiveScores();
    if (section === 'matches') loadRecentMatches();
}

// ── API Helper ───────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
    try {
        const resp = await fetch(`${API}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        return await resp.json();
    } catch (err) {
        console.error(`API Error: ${endpoint}`, err);
        return { error: err.message };
    }
}

// ── Live Scores ──────────────────────────────────────────────
async function loadLiveScores() {
    const grid = document.getElementById('liveScoresGrid');
    grid.innerHTML = '<div class="loading-spinner">Fetching live scores...</div>';

    const data = await apiFetch('/live-scores');
    const scores = data.scores || [];

    // Update hero stats
    const live = scores.filter(s => s.ms === 'live' || (s.matchStarted && !s.matchEnded));
    document.getElementById('statLive').textContent = live.length || scores.length;

    if (scores.length === 0) {
        grid.innerHTML = '<div class="empty-state">No live Indian cricket scores right now. Check back during IPL or India match time!</div>';
        return;
    }

    grid.innerHTML = scores.map(s => renderScoreCard(s)).join('');
}

function renderScoreCard(s) {
    const isLive = s.ms === 'live' || (s.matchStarted && !s.matchEnded);
    const statusClass = isLive ? 'live' : (s.matchEnded ? 'completed' : 'upcoming');
    const matchId = s.id || '';

    // Extract team scores from the 't1s' / 't2s' or score fields
    const t1 = s.t1 || s.team1 || 'Team 1';
    const t2 = s.t2 || s.team2 || 'Team 2';
    const t1s = s.t1s || '';
    const t2s = s.t2s || '';

    return `
        <div class="match-card" onclick="viewMatchDetail('${matchId}')">
            ${isLive ? '<div class="live-badge"><span class="pulse"></span>LIVE</div>' : ''}
            <div class="match-type">${s.matchType || 't20'} • ${s.series || ''}</div>
            <div class="match-teams">${escHtml(t1)} vs ${escHtml(t2)}</div>
            <div class="match-score">
                ${t1s ? `${escHtml(t1)}: <strong>${escHtml(t1s)}</strong>` : ''}
                ${t2s ? `<br>${escHtml(t2)}: <strong>${escHtml(t2s)}</strong>` : ''}
            </div>
            <span class="match-status ${statusClass}">${escHtml(s.status || (isLive ? 'Live' : 'Completed'))}</span>
            <div class="match-actions">
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); startMatchDiscussion('${matchId}', '${escAttr(t1)} vs ${escAttr(t2)}')">💬 Discuss</button>
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); getAIAnalysis('${matchId}')">🤖 AI Analysis</button>
            </div>
        </div>
    `;
}

// ── Recent / IPL Matches ─────────────────────────────────────
async function loadRecentMatches() {
    setActiveTab('recent');
    const grid = document.getElementById('matchesGrid');
    grid.innerHTML = '<div class="loading-spinner">Loading matches...</div>';

    const data = await apiFetch('/recent-matches?count=12');
    const matches = data.matches || [];

    if (matches.length === 0) {
        grid.innerHTML = '<div class="empty-state">No recent Indian cricket matches found</div>';
        return;
    }

    grid.innerHTML = matches.map(m => renderMatchCard(m)).join('');
}

async function loadIPLMatches() {
    setActiveTab('ipl');
    const grid = document.getElementById('matchesGrid');
    grid.innerHTML = '<div class="loading-spinner">Loading IPL data...</div>';

    const data = await apiFetch('/ipl');
    const matches = data.matches || [];

    if (matches.length === 0) {
        grid.innerHTML = '<div class="empty-state">IPL data not available yet</div>';
        return;
    }

    grid.innerHTML = matches.map(m => renderMatchCard(m)).join('');
}

function renderMatchCard(m) {
    const name = m.name || `${m.teams?.[0] || '?'} vs ${m.teams?.[1] || '?'}`;
    const isLive = m.matchStarted && !m.matchEnded;
    const statusClass = isLive ? 'live' : (m.matchEnded ? 'completed' : 'upcoming');
    const status = m.status || (isLive ? 'In Progress' : 'Upcoming');
    const matchId = m.id || '';

    return `
        <div class="match-card" onclick="viewMatchDetail('${matchId}')">
            ${isLive ? '<div class="live-badge"><span class="pulse"></span>LIVE</div>' : ''}
            <div class="match-type">${m.matchType || ''} • ${m.date || ''}</div>
            <div class="match-teams">${escHtml(name)}</div>
            <span class="match-status ${statusClass}">${escHtml(status)}</span>
            ${m.venue ? `<div class="match-venue">📍 ${escHtml(m.venue)}</div>` : ''}
            <div class="match-actions">
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); startMatchDiscussion('${matchId}', '${escAttr(name)}')">💬 Discuss</button>
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); getAIAnalysis('${matchId}')">🤖 AI Analysis</button>
            </div>
        </div>
    `;
}

// ── Match Detail Modal ───────────────────────────────────────
async function viewMatchDetail(matchId) {
    if (!matchId) return;
    const modal = document.getElementById('matchModal');
    const body = document.getElementById('matchModalBody');
    body.innerHTML = '<div class="loading-spinner">Loading match details...</div>';
    modal.classList.remove('hidden');

    const data = await apiFetch(`/match/${matchId}`);

    if (data.error) {
        body.innerHTML = `<div class="empty-state">${escHtml(data.error)}</div>`;
        return;
    }

    const teams = data.teams || [];
    const score = data.score || [];

    body.innerHTML = `
        <h2 style="margin-bottom: 0.5rem;">${escHtml(data.name || 'Match Details')}</h2>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
            ${escHtml(data.venue || '')} • ${escHtml(data.date || '')}
        </p>

        ${score.length > 0 ? `
            <div style="margin-bottom: 1rem;">
                ${score.map(s => `
                    <div style="display:flex; justify-content:space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
                        <span style="font-weight:600;">${escHtml(s.inning || '')}</span>
                        <span style="color: var(--accent); font-weight:700;">${escHtml(s.r?.toString() || '')}/${escHtml(s.w?.toString() || '')} (${escHtml(s.o?.toString() || '')} ov)</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div class="match-status ${data.matchEnded ? 'completed' : 'live'}" style="margin-bottom: 1rem;">
            ${escHtml(data.status || '')}
        </div>

        ${data.tossWinner ? `<p style="font-size: 0.85rem; color: var(--text-secondary);">Toss: ${escHtml(data.tossWinner)} chose to ${escHtml(data.tossChoice || '')}</p>` : ''}

        <div class="match-actions" style="margin-top: 1.5rem; border-top: none;">
            <button class="btn btn-primary btn-sm" onclick="startMatchDiscussion('${matchId}', '${escAttr(data.name || '')}'); closeModal();">💬 Start Discussion</button>
            <button class="btn btn-outline btn-sm" onclick="getAIAnalysis('${matchId}')">🤖 AI Analysis</button>
        </div>

        <div id="modalAnalysis" style="margin-top: 1rem;"></div>
    `;
}

function closeModal() {
    document.getElementById('matchModal').classList.add('hidden');
}

// ── AI Analysis ──────────────────────────────────────────────
async function getAIAnalysis(matchId) {
    const target = document.getElementById('modalAnalysis') || null;
    if (target) target.innerHTML = '<div class="loading-spinner">Gemini is analyzing...</div>';

    const data = await apiFetch(`/match/${matchId}/analysis`);

    if (data.analysis) {
        const html = `
            <div class="card" style="border-color: var(--accent); background: var(--accent-glow);">
                <div style="font-size: 0.75rem; color: var(--accent); font-weight: 600; margin-bottom: 0.5rem;">🤖 Gemini AI Analysis</div>
                <p style="font-size: 0.875rem; line-height: 1.6;">${escHtml(data.analysis)}</p>
            </div>
        `;
        if (target) {
            target.innerHTML = html;
        } else {
            showToast(data.analysis, 'info');
        }
    } else {
        showToast(data.error || 'AI analysis unavailable', 'error');
    }
}

// ── Discussions ──────────────────────────────────────────────
function toggleNewDiscussion() {
    document.getElementById('newDiscussionForm').classList.toggle('hidden');
}

function startMatchDiscussion(matchId, matchName) {
    switchSection('discuss');
    document.getElementById('discMatchId').value = matchId;
    document.getElementById('discTitle').value = `Thoughts on ${matchName}`;
    document.getElementById('newDiscussionForm').classList.remove('hidden');
    document.getElementById('discContent').focus();
}

async function createDiscussion() {
    const matchId = document.getElementById('discMatchId').value.trim();
    const title = document.getElementById('discTitle').value.trim();
    const content = document.getElementById('discContent').value.trim();
    const tags = document.getElementById('discTags').value.trim();

    if (!matchId || !title || !content) {
        showToast('Please fill in match ID, title, and content', 'error');
        return;
    }

    const userId = currentUser?.user_id || 'anonymous';
    const data = await apiFetch('/discussion/create', {
        method: 'POST',
        body: JSON.stringify({ match_id: matchId, user_id: userId, title, content, tags }),
    });

    if (data.discussion_id) {
        showToast('Discussion created!', 'success');
        toggleNewDiscussion();
        document.getElementById('discSearchMatch').value = matchId;
        loadDiscussions();
    } else {
        showToast('Failed to create discussion', 'error');
    }
}

async function loadDiscussions() {
    const matchId = document.getElementById('discSearchMatch').value.trim();
    if (!matchId) {
        showToast('Enter a match ID', 'error');
        return;
    }

    const list = document.getElementById('discussionsList');
    list.innerHTML = '<div class="loading-spinner">Loading discussions...</div>';

    const data = await apiFetch(`/discussion/match/${matchId}`);
    const discs = data.discussions || [];

    if (discs.length === 0) {
        list.innerHTML = '<div class="empty-state">No discussions yet for this match. Be the first to start one!</div>';
        return;
    }

    list.innerHTML = discs.map(d => renderDiscussion(d)).join('');
}

function renderDiscussion(d) {
    const reactions = d.reactions || {};
    const replies = d.replies || [];
    const tags = d.tags || [];

    return `
        <div class="discussion-card">
            <div class="disc-header">
                <span class="disc-title">${escHtml(d.title)}</span>
            </div>
            <div class="disc-meta">by ${escHtml(d.user_id)} • ${timeAgo(d.created_at)}</div>
            <div class="disc-content">${escHtml(d.content)}</div>
            ${tags.length ? `<div class="disc-tags">${tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
            <div class="disc-reactions">
                ${['🔥', '💯', '😢', '🎉', '👏'].map(e =>
                    `<button class="reaction-btn" onclick="reactToDiscussion('${d.discussion_id}', '${e}')">${e} <span>${reactions[e] || 0}</span></button>`
                ).join('')}
            </div>
            ${replies.length ? `
                <div class="disc-replies">
                    ${replies.map(r => `
                        <div class="reply-item">
                            <span class="reply-user">${escHtml(r.user_id)}</span>
                            <p class="reply-text">${escHtml(r.content)}</p>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                <input type="text" class="input" style="margin-bottom:0;" placeholder="Write a reply..." id="reply-${d.discussion_id}">
                <button class="btn btn-sm btn-primary" onclick="replyToDiscussion('${d.discussion_id}')">Reply</button>
            </div>
        </div>
    `;
}

async function reactToDiscussion(discId, emoji) {
    await apiFetch(`/discussion/${discId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
    });
    loadDiscussions();
}

async function replyToDiscussion(discId) {
    const input = document.getElementById(`reply-${discId}`);
    const content = input.value.trim();
    if (!content) return;

    const userId = currentUser?.user_id || 'anonymous';
    await apiFetch(`/discussion/${discId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, content }),
    });
    input.value = '';
    loadDiscussions();
}

// ── Fan Registration ─────────────────────────────────────────
async function registerFan() {
    const userId = document.getElementById('fanUserId').value.trim();
    const displayName = document.getElementById('fanDisplayName').value.trim();
    const team = document.getElementById('fanTeam').value;
    const location = document.getElementById('fanLocation').value.trim();
    const bio = document.getElementById('fanBio').value.trim();

    if (!userId || !displayName || !team) {
        showToast('Please enter username, display name, and select a team', 'error');
        return;
    }

    const data = await apiFetch('/fan/register', {
        method: 'POST',
        body: JSON.stringify({
            user_id: userId,
            display_name: displayName,
            favorite_team: team,
            location,
            bio,
        }),
    });

    if (data.user_id) {
        currentUser = data;
        localStorage.setItem('fanzone_user', JSON.stringify(data));
        updateNavProfile();
        showToast(`Welcome to FanZone, ${displayName}! 🏏`, 'success');
    } else {
        showToast('Registration failed', 'error');
    }
}

function updateNavProfile() {
    const container = document.getElementById('navProfile');
    if (currentUser) {
        container.innerHTML = `
            <div class="user-badge">
                <span class="team-dot"></span>
                <span>${escHtml(currentUser.display_name)} • ${escHtml(currentUser.favorite_team)}</span>
            </div>
        `;
    }
}

// ── Team Info ────────────────────────────────────────────────
async function loadTeamInfo(teamCode) {
    const panel = document.getElementById('teamInfoPanel');
    panel.innerHTML = '<div class="loading-spinner">Loading...</div>';

    const data = await apiFetch(`/team/${teamCode}`);

    if (data.error) {
        panel.innerHTML = `<div class="empty-state">${escHtml(data.error)}</div>`;
        return;
    }

    const facts = data.fun_facts || [];
    const players = data.key_players || [];

    panel.innerHTML = `
        <div class="team-info">
            <h4>${escHtml(data.name)}</h4>
            <div class="team-motto">"${escHtml(data.motto)}"</div>
            <div class="team-detail-grid">
                <dt>Captain</dt><dd>${escHtml(data.captain)}</dd>
                <dt>Titles</dt><dd>${data.titles}</dd>
                <dt>Home</dt><dd>${escHtml(data.home_ground)}</dd>
                <dt>Key Players</dt><dd>${players.slice(0, 3).map(p => escHtml(p)).join(', ')}</dd>
            </div>
            <p style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-secondary);">${escHtml(data.fan_base)}</p>
            ${facts.length ? `
                <ul class="fun-facts">
                    ${facts.map(f => `<li>⚡ ${escHtml(f)}</li>`).join('')}
                </ul>
            ` : ''}
            <button class="btn btn-sm btn-outline" style="margin-top: 0.75rem;" onclick="loadTeamFans('${teamCode}')">👥 Find ${teamCode} Fans</button>
        </div>
    `;
}

async function loadTeamFans(teamCode) {
    const data = await apiFetch(`/fans/team/${teamCode}`);
    const fans = data.fans || [];

    if (fans.length === 0) {
        showToast(`No ${teamCode} fans registered yet. Be the first!`, 'info');
        return;
    }

    const panel = document.getElementById('teamInfoPanel');
    panel.innerHTML += `
        <div style="margin-top: 1rem;">
            <h4 style="font-size: 0.9rem; margin-bottom: 0.5rem;">👥 ${teamCode} Fans (${fans.length})</h4>
            ${fans.map(f => `
                <div class="fan-card">
                    <div class="fan-avatar">${escHtml(f.display_name?.[0] || '?')}</div>
                    <div class="fan-info">
                        <div class="fan-name">${escHtml(f.display_name)}</div>
                        <div class="fan-team-badge">${escHtml(f.favorite_team)} • ${escHtml(f.location || 'Unknown')}</div>
                        ${f.bio ? `<div class="fan-bio">${escHtml(f.bio)}</div>` : ''}
                    </div>
                    <button class="btn btn-sm btn-outline" onclick="connectWithFan('${escAttr(f.user_id)}')">🤝 Connect</button>
                </div>
            `).join('')}
        </div>
    `;
}

// ── Connections ───────────────────────────────────────────────
async function connectWithFan(otherUserId) {
    if (!currentUser) {
        showToast('Register first to connect with fans!', 'error');
        switchSection('fans');
        return;
    }

    const data = await apiFetch('/connection/create', {
        method: 'POST',
        body: JSON.stringify({
            user_id_1: currentUser.user_id,
            user_id_2: otherUserId,
            match_id: 'fanzone_connect',
            reason: `Shared ${currentUser.favorite_team} loyalty!`,
        }),
    });

    if (data.connection_id) {
        showToast(`Connected with ${otherUserId}! 🤝`, 'success');
    }
}

async function loadConnections() {
    const userId = document.getElementById('connUserId').value.trim() || currentUser?.user_id;
    if (!userId) {
        showToast('Enter a username', 'error');
        return;
    }

    const list = document.getElementById('connectionsList');
    const data = await apiFetch(`/connection/${userId}`);
    const conns = data.connections || [];

    if (conns.length === 0) {
        list.innerHTML = '<div class="empty-state">No connections yet. Find fans and connect!</div>';
        return;
    }

    list.innerHTML = conns.map(c => `
        <div class="connection-card">
            <div class="fan-avatar">🤝</div>
            <div>
                <div class="fan-name">${escHtml(c.user_id_1)} ↔ ${escHtml(c.user_id_2)}</div>
                <div class="conn-reason">${escHtml(c.reason || 'Cricket connection')}</div>
            </div>
        </div>
    `).join('');
}

// ── AI Tab Switching ─────────────────────────────────────────
function switchAiTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.ai-tab[data-aitab="${tab}"]`)?.classList.add('active');

    // Toggle panels
    document.getElementById('aiPanelAgents').classList.toggle('hidden', tab !== 'agents');
    document.getElementById('aiPanelChat').classList.toggle('hidden', tab !== 'chat');
}

// ── AI Chat ──────────────────────────────────────────────────
async function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    const messagesDiv = document.getElementById('chatMessages');

    // Add user message
    messagesDiv.innerHTML += `
        <div class="chat-msg user">
            <div class="msg-avatar">${currentUser?.display_name?.[0] || 'U'}</div>
            <div class="msg-bubble">${escHtml(message)}</div>
        </div>
    `;
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Show typing indicator
    const typingId = `typing-${Date.now()}`;
    messagesDiv.innerHTML += `
        <div class="chat-msg bot" id="${typingId}">
            <div class="msg-avatar">🏏</div>
            <div class="msg-bubble" style="color: var(--text-muted);">Thinking...</div>
        </div>
    `;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Call AI
    const data = await apiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ message, user_id: currentUser?.user_id || 'anonymous' }),
    });

    // Remove typing, add response
    document.getElementById(typingId)?.remove();
    messagesDiv.innerHTML += `
        <div class="chat-msg bot">
            <div class="msg-avatar">🏏</div>
            <div class="msg-bubble">${formatAIResponse(data.response || 'Sorry, I couldn\'t process that.')}</div>
        </div>
    `;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ── ADK Agent Chat ──────────────────────────────────────────
async function sendAgentChat() {
    const input = document.getElementById('agentInput');
    const message = input.value.trim();
    if (!message) return;

    const messagesDiv = document.getElementById('agentMessages');

    // Add user message
    messagesDiv.innerHTML += `
        <div class="chat-msg user">
            <div class="msg-avatar">${currentUser?.display_name?.[0] || 'U'}</div>
            <div class="msg-bubble">${escHtml(message)}</div>
        </div>
    `;
    input.value = '';
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Show typing indicator
    const typingId = `agent-typing-${Date.now()}`;
    messagesDiv.innerHTML += `
        <div class="chat-msg bot" id="${typingId}">
            <div class="msg-avatar">🧠</div>
            <div class="msg-bubble" style="color: var(--text-muted);">Agents are working on your request...</div>
        </div>
    `;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Call ADK agent endpoint
    const data = await apiFetch('/agent-chat', {
        method: 'POST',
        body: JSON.stringify({ message, user_id: currentUser?.user_id || 'anonymous' }),
    });

    // Remove typing, add response
    document.getElementById(typingId)?.remove();
    messagesDiv.innerHTML += `
        <div class="chat-msg bot">
            <div class="msg-avatar">🧠</div>
            <div class="msg-bubble">${formatAIResponse(data.response || 'Agent could not process your request.')}</div>
        </div>
    `;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatAIResponse(text) {
    // Convert markdown-like formatting to HTML
    return escHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

// ── Tab Helpers ──────────────────────────────────────────────
function setActiveTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');
}

// ── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ── Utilities ────────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function escAttr(str) {
    return escHtml(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    } catch {
        return '';
    }
}
