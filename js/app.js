/* ==================== Инициализация приложения ==================== */

let appInitialized = false;

async function initApp(session) {
    if (appInitialized) return;
    appInitialized = true;
    currentUserId = session.user.id;

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data: prof } = await supabaseClient
        .from('profiles')
        .select('timezone')
        .eq('id', currentUserId)
        .maybeSingle();

    if (prof && !prof.timezone) {
        await supabaseClient
            .from('profiles')
            .update({ timezone: browserTz })
            .eq('id', currentUserId);
    }

    updateTelegramButtonState();

    authScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');

    requestAnimationFrame(() => {
        fitWholeDays();
        updateMonthLabel();
    });

    const profile = await ensureProfile(session.user);

    if (profile) {
        currentUserName = profile.name || '';
        greetingName.textContent = profile.name ? `Hello, ${profile.name}` : 'Hello';
        syncAvatarUI(profile.avatar_url);
    }

    tasks = await loadTasksFromDB();
    await loadShareCounts();
    renderTasksForSelectedDate();

    subscribeRealtime();
}

function showAuthScreen() {
    appInitialized = false;
    currentUserId = null;
    unsubscribeRealtime();
    authScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');
    emailSentScreen.classList.add('hidden');
    authBox.classList.remove('hidden');
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
        showResetScreen();
        return;
    }
    if (session) {
        initApp(session);
    } else {
        showAuthScreen();
    }
});

/* ==================== Realtime ==================== */

let realtimeChannel = null;
let realtimeRefreshTimer = null;

function scheduleRealtimeRefresh() {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(async () => {
        tasks = await loadTasksFromDB();
        await loadShareCounts();
        renderTasksForSelectedDate();
    }, 300);
}

function subscribeRealtime() {
    if (realtimeChannel) return;

    realtimeChannel = supabaseClient
        .channel('tasks-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, scheduleRealtimeRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_shares' }, scheduleRealtimeRefresh)
        .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                unsubscribeRealtime();
                setTimeout(subscribeRealtime, 3000);
            }
        });
}

function unsubscribeRealtime() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    clearTimeout(realtimeRefreshTimer);
}

/* ==================== Автообновление ==================== */

let lastRenderedDay = toISODate(new Date());

setInterval(() => {
    const nowDay = toISODate(new Date());
    if (nowDay !== lastRenderedDay) {
        lastRenderedDay = nowDay;
        today.setTime(Date.now());
        selectToday();
        return;
    }
    renderTasksForSelectedDate();
}, 60000);

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const nowDay = toISODate(new Date());
    if (nowDay !== lastRenderedDay) {
        lastRenderedDay = nowDay;
        today.setTime(Date.now());
        selectToday();
    }
    scheduleRealtimeRefresh();
});

window.addEventListener('online', () => {
    unsubscribeRealtime();
    subscribeRealtime();
    scheduleRealtimeRefresh();
});

/* ==================== Первичный рендер ==================== */

renderTasksForSelectedDate();