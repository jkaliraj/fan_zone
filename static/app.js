/* ═══════════════════════════════════════════════════════════
   FanZone AI — Frontend Application
   Connects to FastAPI backend + CricAPI + Gemini AI
   ═══════════════════════════════════════════════════════════ */

const API = '/api';

// ── State ────────────────────────────────────────────────────
let currentUser = null;
let currentSection = 'live';

// ── Theme ────────────────────────────────────────────────────
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('fanzone_theme', next);
    document.getElementById('themeIcon').textContent = next === 'light' ? '☀️' : '🌙';
}

function loadTheme() {
    const saved = localStorage.getItem('fanzone_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = saved === 'light' ? '☀️' : '🌙';
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();

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

    // Fade out all visible sections first
    const allSections = ['heroSection', 'sectionLive', 'sectionMatches', 'sectionDiscuss', 'sectionFans', 'sectionAi'];
    allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('hidden')) {
            el.classList.add('section-exit');
        }
    });

    // After exit animation, swap sections
    setTimeout(() => {
        // Hide hero
        document.getElementById('heroSection').classList.toggle('hidden', section !== 'live');
        if (section === 'live') {
            document.getElementById('heroSection').classList.remove('section-exit');
            document.getElementById('heroSection').classList.add('section-enter');
        }

        // Hide/show sections
        ['Live', 'Matches', 'Discuss', 'Fans', 'Ai'].forEach(s => {
            const el = document.getElementById(`section${s}`);
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('section-exit', 'section-enter');
            }
        });

        const map = { live: 'Live', matches: 'Matches', discuss: 'Discuss', fans: 'Fans', ai: 'Ai' };
        const target = document.getElementById(`section${map[section]}`);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('section-enter');
            // Remove animation class after it plays
            setTimeout(() => target.classList.remove('section-enter'), 350);
        }

        // Load data
        if (section === 'live') loadLiveScores();
        if (section === 'matches') loadRecentMatches();
        if (section === 'discuss') loadDiscussPage();
        if (section === 'fans') loadFansPage();
    }, 150);
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
    const isCompleted = s.matchEnded || s.ms === 'result';
    const statusClass = isLive ? 'live' : (isCompleted ? 'completed' : 'upcoming');
    const matchId = s.id || '';

    // Extract team names
    const t1 = s.t1 || (s.teams && s.teams[0]) || 'Team 1';
    const t2 = s.t2 || (s.teams && s.teams[1]) || 'Team 2';
    const t1s = s.t1s || '';
    const t2s = s.t2s || '';
    const venue = s.venue || '';

    return `
        <div class="match-card" onclick="viewMatchDetail('${matchId}')">
            ${isLive ? '<div class="live-badge"><span class="pulse"></span>LIVE</div>' : ''}
            <div class="match-type">${s.matchType || 't20'} • ${s.series || ''}</div>
            <div class="match-teams">${escHtml(t1)} vs ${escHtml(t2)}</div>
            <div class="match-score">
                ${t1s ? `${escHtml(t1)}: <strong>${escHtml(t1s)}</strong>` : ''}
                ${t2s ? `<br>${escHtml(t2)}: <strong>${escHtml(t2s)}</strong>` : ''}
            </div>
            <span class="match-status ${statusClass}">${escHtml(s.status || (isLive ? 'Live' : isCompleted ? 'Completed' : 'Upcoming'))}</span>
            ${venue ? `<div class="match-venue">📍 ${escHtml(venue)}</div>` : ''}
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
    if (target) target.innerHTML = '<div class="loading-spinner">Gemini is analyzing this match...</div>';

    const data = await apiFetch(`/match/${matchId}/analysis`);

    if (data.analysis) {
        const html = `
            <div class="ai-analysis-card">
                <div class="ai-analysis-header">
                    <span class="ai-logo-sm">✨</span>
                    <span>Gemini AI Match Analysis</span>
                </div>
                <div class="ai-analysis-body">${formatAIResponse(data.analysis)}</div>
            </div>
        `;
        if (target) {
            target.innerHTML = html;
        } else {
            showToast(data.analysis.substring(0, 200), 'info');
        }
    } else {
        showToast(data.error || 'AI analysis unavailable', 'error');
    }
}

// ── Discussions ──────────────────────────────────────────────
const REACTION_EMOJIS = [
    { emoji: '🔥', code: '1f525' },
    { emoji: '💯', code: '1f4af' },
    { emoji: '😢', code: '1f622' },
    { emoji: '🎉', code: '1f389' },
    { emoji: '👏', code: '1f44f' },
];
const TEAM_ABBR = {
    'chennai super kings': 'CSK', 'mumbai indians': 'MI', 'royal challengers bengaluru': 'RCB',
    'royal challengers bangalore': 'RCB', 'kolkata knight riders': 'KKR', 'delhi capitals': 'DC',
    'punjab kings': 'PBKS', 'rajasthan royals': 'RR', 'sunrisers hyderabad': 'SRH',
    'lucknow super giants': 'LSG', 'gujarat titans': 'GT', 'india': 'IND', 'india women': 'IND-W',
    'australia': 'AUS', 'england': 'ENG', 'south africa': 'SA', 'new zealand': 'NZ',
    'pakistan': 'PAK', 'sri lanka': 'SL', 'bangladesh': 'BAN', 'west indies': 'WI',
    'south africa women': 'SA-W', 'australia women': 'AUS-W', 'england women': 'ENG-W',
};
function teamAbbr(name) {
    // Strip anything in brackets like [DC] and trim
    const clean = (name || '').replace(/\[.*?\]/g, '').trim();
    const key = clean.toLowerCase();
    return TEAM_ABBR[key] || clean.split(' ').filter(w => w).map(w => w[0]).join('').toUpperCase().slice(0, 3);
}
let discussMatches = []; // cached matches for the discuss page
let selectedDiscussMatchId = null;

async function loadDiscussPage() {
    const data = await apiFetch('/live-scores');
    const scores = data.scores || [];
    discussMatches = scores;

    const grid = document.getElementById('discussMatchGrid');

    if (scores.length === 0) {
        grid.innerHTML = '<div class="empty-state">No matches available right now. Check back during IPL or India match time!</div>';
        return;
    }

    grid.innerHTML = scores.map(s => {
        const isLive = s.ms === 'live' || (s.matchStarted && !s.matchEnded);
        const t1 = s.t1 || (s.teams && s.teams[0]) || 'Team 1';
        const t2 = s.t2 || (s.teams && s.teams[1]) || 'Team 2';
        const matchId = s.id || '';
        const isSelected = matchId === selectedDiscussMatchId;

        return `
            <div class="discuss-match-card ${isLive ? 'dm-live' : ''} ${isSelected ? 'dm-selected' : ''}" onclick="selectDiscussMatch('${matchId}')">
                ${isLive ? '<span class="dm-live-dot"></span>' : ''}
                <span class="dm-abbr">${escHtml(teamAbbr(t1))}</span>
                <span class="dm-vs">v</span>
                <span class="dm-abbr">${escHtml(teamAbbr(t2))}</span>
            </div>
        `;
    }).join('');

    // Restore selection if exists
    if (selectedDiscussMatchId) {
        loadDiscussions(selectedDiscussMatchId);
    }
}

function selectDiscussMatch(matchId) {
    // Toggle: clicking the same card again deselects it
    if (selectedDiscussMatchId === matchId) {
        clearMatchSelection();
        return;
    }

    selectedDiscussMatchId = matchId;
    document.getElementById('discMatchId').value = matchId;

    // Highlight selected card
    document.querySelectorAll('.discuss-match-card').forEach(c => c.classList.remove('dm-selected'));
    event.currentTarget?.classList.add('dm-selected');

    // Update form preview
    const match = discussMatches.find(m => (m.id || '') === matchId);
    if (match) {
        const t1 = match.t1 || (match.teams && match.teams[0]) || '';
        const t2 = match.t2 || (match.teams && match.teams[1]) || '';
        const series = match.series || match.name || '';
        const preview = document.getElementById('discMatchPreview');
        preview.innerHTML = `<span class="preview-match-name">${escHtml(t1)} vs ${escHtml(t2)}</span>${series ? ` <span class="preview-match-type">${escHtml(series)}</span>` : ''}`;
    }

    loadDiscussions(matchId);
}

function clearMatchSelection() {
    selectedDiscussMatchId = null;
    document.getElementById('discMatchId').value = '';
    document.querySelectorAll('.discuss-match-card').forEach(c => c.classList.remove('dm-selected'));
    document.getElementById('discussionsList').innerHTML = '<div class="empty-state">Click on a match above to see fan discussions</div>';
}

function toggleNewDiscussion() {
    const form = document.getElementById('newDiscussionForm');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
        if (selectedDiscussMatchId) {
            document.getElementById('discMatchId').value = selectedDiscussMatchId;
        } else {
            showToast('Select a match first', 'error');
            form.classList.add('hidden');
            return;
        }
        document.getElementById('discTitle').focus();
    }
}

function startMatchDiscussion(matchId, matchName) {
    switchSection('discuss');
    setTimeout(() => {
        selectDiscussMatch(matchId);
        document.getElementById('newDiscussionForm').classList.remove('hidden');
        document.getElementById('discTitle').value = '';
        document.getElementById('discContent').focus();
    }, 500);
}

async function createDiscussion() {
    const matchId = document.getElementById('discMatchId').value.trim();
    const title = document.getElementById('discTitle').value.trim();
    const content = document.getElementById('discContent').value.trim();
    const tags = document.getElementById('discTags').value.trim();

    if (!matchId) {
        showToast('Please select a match first', 'error');
        return;
    }
    if (!title || !content) {
        showToast('Please fill in title and content', 'error');
        return;
    }

    const userId = currentUser?.user_id || 'anonymous';
    const data = await apiFetch('/discussion/create', {
        method: 'POST',
        body: JSON.stringify({ match_id: matchId, user_id: userId, title, content, tags }),
    });

    if (data.discussion_id) {
        showToast('Discussion created!', 'success');
        document.getElementById('newDiscussionForm').classList.add('hidden');
        document.getElementById('discTitle').value = '';
        document.getElementById('discContent').value = '';
        document.getElementById('discTags').value = '';
        loadDiscussions(matchId);
    } else {
        showToast('Failed to create discussion', 'error');
    }
}

async function loadDiscussions(matchId) {
    if (!matchId) {
        matchId = selectedDiscussMatchId;
    }
    if (!matchId) return;

    const list = document.getElementById('discussionsList');
    list.innerHTML = '<div class="loading-spinner">Loading discussions...</div>';

    const data = await apiFetch(`/discussion/match/${matchId}`);
    const discs = data.discussions || [];

    if (discs.length === 0) {
        list.innerHTML = `<div class="empty-state">
            No discussions yet for this match. Be the first!
            <br><button class="btn btn-sm btn-primary" style="margin-top:0.5rem;" onclick="toggleNewDiscussion()">+ Start a Thread</button>
        </div>`;
        return;
    }

    list.innerHTML = `<div style="text-align:right;margin-bottom:0.5rem;"><button class="btn btn-sm btn-primary" onclick="toggleNewDiscussion()">+ New Thread</button></div>` + discs.map(d => renderDiscussion(d)).join('');
}

function renderDiscussion(d) {
    const reactions = d.reactions || {};
    const replies = d.replies || [];
    const tags = d.tags || [];
    const userReactions = d.user_reactions || {};
    const myReaction = userReactions[currentUser?.user_id || ''] || '';

    return `
        <div class="discussion-card" id="disc-${d.discussion_id}">
            <div class="disc-header">
                <span class="disc-title">${escHtml(d.title)}</span>
            </div>
            <div class="disc-meta">by ${escHtml(d.user_id)} • ${timeAgo(d.created_at)}</div>
            <div class="disc-content">${escHtml(d.content)}</div>
            ${tags.length ? `<div class="disc-tags">${tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
            <div class="disc-reactions" data-disc-id="${d.discussion_id}">
                ${REACTION_EMOJIS.map(({emoji, code}) => {
                    const count = Math.max(0, reactions[emoji] || 0);
                    const isActive = myReaction === emoji;
                    return `<button class="reaction-btn ${isActive ? 'reaction-active' : ''}" data-emoji="${emoji}" data-code="${code}" onclick="reactToDiscussion('${d.discussion_id}', '${emoji}', this)"><img src="https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.webp" class="noto-emoji" alt="${emoji}"> <span class="react-count">${count}</span></button>`;
                }).join('')}
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

async function reactToDiscussion(discId, emoji, btn) {
    const userId = currentUser?.user_id || 'anonymous';
    const container = btn.closest('.disc-reactions');
    const wasActive = btn.classList.contains('reaction-active');

    // Particle burst
    spawnEmojiParticles(btn, emoji);

    // Optimistic UI: update counts inline
    // Remove active from any previously selected button in this discussion
    const prevActive = container.querySelector('.reaction-active');
    if (prevActive && prevActive !== btn) {
        prevActive.classList.remove('reaction-active');
        const prevCount = prevActive.querySelector('.react-count');
        prevCount.textContent = Math.max(0, parseInt(prevCount.textContent) - 1);
    }

    const countEl = btn.querySelector('.react-count');
    if (wasActive) {
        // Toggle off
        btn.classList.remove('reaction-active');
        countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
    } else {
        // Toggle on
        btn.classList.add('reaction-active');
        countEl.textContent = parseInt(countEl.textContent) + 1;
    }

    // Send to server (fire and forget, already updated UI)
    apiFetch(`/discussion/${discId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji, user_id: userId }),
    });
}

function spawnEmojiParticles(anchor, emoji) {
    const rect = anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const count = 6;

    for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        el.textContent = emoji;
        el.style.cssText = `
            position:fixed;left:${cx}px;top:${cy}px;
            font-size:${14 + Math.random() * 10}px;
            pointer-events:none;z-index:9999;
            opacity:1;transition:none;
        `;
        document.body.appendChild(el);

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 60 + Math.random() * 80;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 40; // upward bias
        const gravity = 220;
        const duration = 700 + Math.random() * 300;
        const start = performance.now();

        function tick(now) {
            const t = (now - start) / 1000;
            if (t > duration / 1000) { el.remove(); return; }
            const x = cx + vx * t;
            const y = cy + vy * t + 0.5 * gravity * t * t;
            const progress = t / (duration / 1000);
            const scale = 1 - progress * 0.4;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.opacity = 1 - progress;
            el.style.transform = `scale(${scale}) rotate(${progress * 120}deg)`;
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }
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
function loadFansPage() {
    if (currentUser) {
        // Show profile, hide register form, show connections
        document.getElementById('fanRegisterCard').classList.add('hidden');
        const profileCard = document.getElementById('fanProfileCard');
        profileCard.classList.remove('hidden');
        document.getElementById('profileAvatar').textContent = currentUser.display_name?.[0]?.toUpperCase() || '?';
        document.getElementById('profileName').textContent = currentUser.display_name || currentUser.user_id;
        document.getElementById('profileTeam').textContent = currentUser.favorite_team || '';
        document.getElementById('profileLocation').textContent = currentUser.location ? `📍 ${currentUser.location}` : '';
        document.getElementById('profileBio').textContent = currentUser.bio || '';
        document.getElementById('connectionsCard').classList.remove('hidden');
        loadConnections();
    } else {
        document.getElementById('fanRegisterCard').classList.remove('hidden');
        document.getElementById('fanProfileCard').classList.add('hidden');
        document.getElementById('connectionsCard').classList.add('hidden');
    }
}

function switchAuthTab(tab) {
    document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
    document.getElementById('authLoginForm').classList.toggle('hidden', tab !== 'login');
    document.getElementById('authRegisterForm').classList.toggle('hidden', tab !== 'register');
}

async function loginFan() {
    const userId = document.getElementById('loginUserId').value.trim();
    if (!userId) {
        showToast('Please enter your username', 'error');
        return;
    }
    const data = await apiFetch(`/fan/${userId}`);
    if (data.error) {
        showToast('Username not found. Please register first.', 'error');
        switchAuthTab('register');
        document.getElementById('fanUserId').value = userId;
        return;
    }
    currentUser = data;
    localStorage.setItem('fanzone_user', JSON.stringify(data));
    updateNavProfile();
    loadFansPage();
    showToast(`Welcome back, ${data.display_name}! 🏏`, 'success');
}

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
        loadFansPage();
        showToast(`Welcome to FanZone, ${displayName}! 🏏`, 'success');
    } else {
        showToast('Registration failed', 'error');
    }
}

function logoutFan() {
    currentUser = null;
    localStorage.removeItem('fanzone_user');
    updateNavProfile();
    loadFansPage();
    showToast('Logged out successfully', 'info');
}

function updateNavProfile() {
    const container = document.getElementById('navProfile');
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const themeIcon = theme === 'light' ? '☀️' : '🌙';
    if (currentUser) {
        container.innerHTML = `
            <button class="theme-toggle" onclick="toggleTheme()" title="Switch theme">
                <span class="theme-icon" id="themeIcon">${themeIcon}</span>
            </button>
            <div class="user-badge" onclick="switchSection('fans')" style="cursor:pointer;">
                <span class="team-dot"></span>
                <span>${escHtml(currentUser.display_name)} • ${escHtml(currentUser.favorite_team)}</span>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="theme-toggle" onclick="toggleTheme()" title="Switch theme">
                <span class="theme-icon" id="themeIcon">${themeIcon}</span>
            </button>
            <button class="btn btn-sm btn-accent" onclick="switchSection('fans')">Join FanZone</button>
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

    if (currentUser.user_id === otherUserId) {
        showToast("You can't connect with yourself!", 'error');
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

    if (data.error) {
        showToast(data.error, 'error');
    } else if (data.connection_id) {
        showToast(`Connected with ${otherUserId}! 🤝`, 'success');
    }
}

async function loadConnections() {
    const userId = currentUser?.user_id;
    if (!userId) return;

    const list = document.getElementById('connectionsList');
    list.innerHTML = '<div class="loading-spinner">Loading connections...</div>';

    const data = await apiFetch(`/connection/${userId}`);
    const conns = data.connections || [];

    // Deduplicate by other user (backward compat for old duplicate data)
    const seen = new Set();
    const uniqueConns = conns.filter(c => {
        const otherUser = c.user_id_1 === userId ? c.user_id_2 : c.user_id_1;
        if (seen.has(otherUser)) return false;
        seen.add(otherUser);
        return true;
    });

    if (uniqueConns.length === 0) {
        list.innerHTML = '<div class="empty-state">No connections yet. Explore teams and connect with fans!</div>';
        return;
    }

    list.innerHTML = uniqueConns.map(c => {
        const otherUser = c.user_id_1 === userId ? c.user_id_2 : c.user_id_1;
        const initial = (otherUser || '?')[0].toUpperCase();
        const reason = c.reason || 'Cricket connection';
        const connId = c.connection_id || '';
        return `
            <div class="connection-card" id="conn-${escHtml(connId)}">
                <div class="conn-avatar">${escHtml(initial)}</div>
                <div class="conn-info">
                    <div class="conn-name">${escHtml(otherUser)}</div>
                    <div class="conn-reason">${escHtml(reason)}</div>
                </div>
                <button class="conn-unfollow" onclick="confirmUnfollow('${escHtml(connId)}', '${escHtml(otherUser)}')" title="Unfollow">✕</button>
            </div>
        `;
    }).join('');
}

function confirmUnfollow(connId, username) {
    if (!connId) return;
    const ok = confirm(`Unfollow ${username}? This will remove your connection.`);
    if (ok) unfollowConnection(connId);
}

async function unfollowConnection(connId) {
    if (!connId) return;
    const card = document.getElementById(`conn-${connId}`);
    if (card) {
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
    }
    await apiFetch(`/connection/${connId}`, { method: 'DELETE' });
    setTimeout(() => { if (card) card.remove(); }, 300);
    showToast('Connection removed', 'success');
}

// ── Gemini AI Chat ──────────────────────────────────────────
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
            <div class="msg-avatar">✨</div>
            <div class="msg-bubble" style="color: var(--text-muted);">Gemini is thinking...</div>
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
            <div class="msg-avatar">✨</div>
            <div class="msg-bubble">${formatAIResponse(data.response || 'Sorry, I couldn\'t process that. Please try again.')}</div>
        </div>
    `;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatAIResponse(text) {
    // Convert markdown-like formatting to HTML
    return escHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n\n/g, '</p><p>')
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
