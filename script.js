/* ==================== Supabase ==================== */

const SUPABASE_URL = 'https://dpnlpwbxxgevqrxljppy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbmxwd2J4eGdldnFyeGxqcHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MjYyNTEsImV4cCI6MjEwMDAwMjI1MX0.8d2eCt7Fu5KhuSd8VgkIwjW7emyTHjfLoxwLaZ5-2X0';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* ==================== Экран входа / регистрации ==================== */

const authScreen = document.querySelector('#authScreen');
const authBox = document.querySelector('.auth-box');
const emailSentScreen = document.querySelector('#emailSentScreen');

const tabLogin = document.querySelector('#tabLogin');
const tabRegister = document.querySelector('#tabRegister');
const loginForm = document.querySelector('#loginForm');
const registerForm = document.querySelector('#registerForm');

const loginEmailInput = document.querySelector('#loginEmail');
const loginPasswordInput = document.querySelector('#loginPassword');
const loginError = document.querySelector('#loginError');

const registerNameInput = document.querySelector('#registerName');
const registerEmailInput = document.querySelector('#registerEmail');
const registerPasswordInput = document.querySelector('#registerPassword');
const registerConfirmInput = document.querySelector('#registerConfirm');
const registerError = document.querySelector('#registerError');

const emailSentClose = document.querySelector('#emailSentClose');

const appContainer = document.querySelector('#container');
const greetingName = document.querySelector('#greetingName');
const profilePhoto = document.querySelector('#profilePhoto');
const avatarUploadWrapper = document.querySelector('#avatarUpload');
const avatarInput = document.querySelector('#avatarInput');
const logoutButton = document.querySelector('#logoutButton');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
    return EMAIL_REGEX.test(email);
}

function isValidPassword(password) {
    return password.length >= 6;
}

function translateAuthError(message) {
    if (!message) return 'Что-то пошло не так, попробуйте ещё раз';
    if (message.includes('already registered')) return 'Эта почта уже зарегистрирована';
    if (message.includes('Invalid login credentials')) return 'Неверная почта или пароль';
    if (message.includes('Email not confirmed')) return 'Подтвердите почту — мы отправили письмо со ссылкой';
    if (message.includes('Password should be at least')) return 'Пароль слишком короткий';
    return message;
}

tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
});

tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    registerError.textContent = '';

    const name = registerNameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = registerConfirmInput.value;

    if (!name) {
        registerError.textContent = 'Введите имя';
        return;
    }

    if (!isValidEmail(email)) {
        registerError.textContent = 'Введите корректную почту';
        return;
    }

    if (!isValidPassword(password)) {
        registerError.textContent = 'Пароль должен быть не короче 6 символов';
        return;
    }

    if (password !== confirmPassword) {
        registerError.textContent = 'Пароли не совпадают';
        return;
    }

    const submitButton = registerForm.querySelector('.auth-submit');
    submitButton.disabled = true;

    const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { name } }
    });

    submitButton.disabled = false;

    if (error) {
        registerError.textContent = translateAuthError(error.message);
        return;
    }

    registerForm.reset();
    authBox.classList.add('hidden');
    emailSentScreen.classList.remove('hidden');
});

emailSentClose.addEventListener('click', () => {
    emailSentScreen.classList.add('hidden');
    authBox.classList.remove('hidden');
    tabLogin.click();
});

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';

    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    if (!isValidEmail(email)) {
        loginError.textContent = 'Введите корректную почту';
        return;
    }

    if (!password) {
        loginError.textContent = 'Введите пароль';
        return;
    }

    const submitButton = loginForm.querySelector('.auth-submit');
    submitButton.disabled = true;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    submitButton.disabled = false;

    if (error) {
        loginError.textContent = translateAuthError(error.message);
    }
});

logoutButton.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

async function ensureProfile(user) {
    const { data: existing } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (existing) {
        if (!existing.email && user.email) {
            const { data: updated } = await supabaseClient
                .from('profiles')
                .update({ email: user.email })
                .eq('id', user.id)
                .select()
                .single();

            return updated || existing;
        }

        return existing;
    }

    const name = (user.user_metadata && user.user_metadata.name) || '';

    const { data: created } = await supabaseClient
        .from('profiles')
        .insert({ id: user.id, name, email: user.email })
        .select()
        .single();

    return created;
}

avatarUploadWrapper.addEventListener('click', () => {
    avatarInput.click();
});

avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files[0];
    if (!file) return;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabaseClient
        .storage
        .from('avatars')
        .upload(path, file, { upsert: true });

    if (uploadError) {
        showAlert('Не удалось загрузить фото');
        return;
    }

    const { data: publicUrlData } = supabaseClient
        .storage
        .from('avatars')
        .getPublicUrl(path);

    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    await supabaseClient
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

    profilePhoto.src = avatarUrl;
    showAlert('Фото обновлено');
});

let appInitialized = false;
let currentUserId = null;
let currentUserName = '';

async function initApp(session) {
    if (appInitialized) return;
    appInitialized = true;
    currentUserId = session.user.id;

    authScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');

    // .container был скрыт (display:none) на момент первого построения
    // ленты дней — clientWidth тогда был 0, и scroll-container "схлопнулся".
    // Пересчитываем ширину теперь, когда контейнер реально видим.
    requestAnimationFrame(() => {
        fitWholeDays();
        updateMonthLabel();
    });

    const profile = await ensureProfile(session.user);

    if (profile) {
        currentUserName = profile.name || '';
        greetingName.textContent = profile.name ? `Hello, ${profile.name}` : 'Hello';
        if (profile.avatar_url) {
            profilePhoto.src = profile.avatar_url;
        }
    }

    tasks = await loadTasksFromDB();
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
    if (session) {
        initApp(session);
    } else {
        showAuthScreen();
    }
});


/* ==================== Основной календарь (лента) ==================== */

const calendar = document.querySelector('#calendar');
const scrollContainer = document.querySelector('#scrollContainer');
const todayButton = document.querySelector('#todayButton');
const monthLabel = document.querySelector('#monthLabel');
const container = document.querySelector('#container');

const today = new Date();
today.setHours(0, 0, 0, 0);

let lastDate = new Date(today);
let currentMonthKey = '';
let selectedDate = new Date(today);

function dateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
}

function monthTitle(date) {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
}

function monthAbbr(date) {
    return date.toLocaleDateString('en-US', {
        month: 'short'
    });
}

function isSameDay(firstDate, secondDate) {
    return dateKey(firstDate) === dateKey(secondDate);
}

function updateTodayButton(date) {
    const isToday = isSameDay(date, today);

    todayButton.classList.toggle('hidden', isToday);
    todayButton.classList.toggle('active', !isToday);
}

function clearActiveDay() {
    document.querySelectorAll('.days.active').forEach(day => {
        day.classList.remove('active');
    });

    document.querySelectorAll('.weekday.active').forEach(weekday => {
        weekday.classList.remove('active');
    });
}

function createDay(date) {
    const cell = document.createElement('div');
    cell.classList.add('cells');
    cell.dataset.date = dateKey(date);
    cell.dataset.month = monthKey(date);

    const weekday = document.createElement('p');
    weekday.classList.add('weekday');
    weekday.textContent = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

    const day = document.createElement('p');
    day.classList.add('days');
    day.textContent = date.getDate();

    if (isSameDay(date, today)) {
        day.classList.add('active');
        weekday.classList.add('active');
    }

    cell.append(weekday, day);

    cell.addEventListener('click', () => {
        clearActiveDay();

        day.classList.add('active');
        weekday.classList.add('active');

        updateTodayButton(date);

        selectedDate = new Date(date);
        renderTasksForSelectedDate();
    });

    return cell;
}

function createMonthDivider(date) {
    const divider = document.createElement('div');
    divider.classList.add('month-divider');
    divider.setAttribute('aria-hidden', 'true');

    const abbr = document.createElement('p');
    abbr.classList.add('month-abbr');
    abbr.textContent = monthAbbr(date);

    const line = document.createElement('div');
    line.classList.add('divider-line');

    divider.append(abbr, line);

    return divider;
}

function addDays(startDate, count) {
    for (let i = 0; i < count; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        if (date.getDate() === 1 && calendar.children.length > 0) {
            calendar.append(createMonthDivider(date));
        }

        calendar.append(createDay(date));
        lastDate = date;
    }

    updateMonthLabel();
}

function ensureDateLoaded(date) {
    while (date > lastDate) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);
        addDays(nextDate, 30);
    }
}

function updateMonthLabel() {
    const viewLeft = scrollContainer.scrollLeft;
    const viewRight = viewLeft + scrollContainer.clientWidth;
    const origin = calendar.offsetLeft;

    const visibleByMonth = new Map();

    calendar.querySelectorAll('.cells').forEach(cell => {
        const left = cell.offsetLeft - origin;
        const right = left + cell.offsetWidth;

        const visible = Math.min(right, viewRight) - Math.max(left, viewLeft);

        if (visible <= 0) return;

        const key = cell.dataset.month;
        visibleByMonth.set(key, (visibleByMonth.get(key) || 0) + visible);
    });

    let bestKey = null;
    let bestValue = 0;

    visibleByMonth.forEach((value, key) => {
        if (value > bestValue) {
            bestValue = value;
            bestKey = key;
        }
    });

    if (!bestKey || bestKey === currentMonthKey) return;

    const [year, month] = bestKey.split('-').map(Number);
    const title = monthTitle(new Date(year, month, 1));

    const isFirstRender = currentMonthKey === '';
    currentMonthKey = bestKey;

    if (isFirstRender) {
        monthLabel.textContent = title;
        return;
    }

    monthLabel.classList.add('is-changing');

    setTimeout(() => {
        monthLabel.textContent = title;
        monthLabel.classList.remove('is-changing');
    }, 150);
}

function syncMainCalendarToSelectedDate(date) {
    ensureDateLoaded(date);

    clearActiveDay();

    const el = calendar.querySelector(`[data-date="${dateKey(date)}"]`);

    if (el) {
        el.querySelector('.days').classList.add('active');
        el.querySelector('.weekday').classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    updateTodayButton(date);
    updateMonthLabel();
}

function selectToday() {
    clearActiveDay();

    const todayElement = calendar.querySelector(
        `[data-date="${dateKey(today)}"]`
    );

    if (todayElement) {
        todayElement.querySelector('.days').classList.add('active');
        todayElement.querySelector('.weekday').classList.add('active');
    }

    updateTodayButton(today);

    selectedDate = new Date(today);
    renderTasksForSelectedDate();

    scrollContainer.scrollTo({
        left: 0,
        behavior: 'smooth'
    });
}

function fitWholeDays() {
    const firstCell = calendar.querySelector('.cells');
    if (!firstCell) return;

    const cellWidth = firstCell.offsetWidth;
    const gap = parseFloat(getComputedStyle(calendar).columnGap) || 0;
    const step = cellWidth + gap;

    const wrapper = document.querySelector('.calendar-wrapper');
    const available = wrapper.clientWidth;

    const cellsCount = Math.max(1, Math.floor((available + gap) / step));
    const width = cellsCount * step - gap;

    scrollContainer.style.width = `${width}px`;
}

addDays(today, 30);
fitWholeDays();

let scrollTicking = false;

scrollContainer.addEventListener('scroll', () => {
    if (!scrollTicking) {
        scrollTicking = true;

        requestAnimationFrame(() => {
            updateMonthLabel();
            scrollTicking = false;
        });
    }

    const distanceToEnd =
        scrollContainer.scrollWidth -
        scrollContainer.scrollLeft -
        scrollContainer.clientWidth;

    if (distanceToEnd < 300) {
        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);

        addDays(nextDate, 30);
    }
});

window.addEventListener('resize', () => {
    updateMonthLabel();
    fitWholeDays();
});

todayButton.addEventListener('click', selectToday);

updateTodayButton(today);
updateMonthLabel();


/* ==================== Хранилище задач (Supabase) ==================== */

function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function mapRowToTask(row) {
    return {
        id: row.id,
        userId: row.user_id,
        ownerName: row.owner_name || '',
        name: row.name,
        description: row.description || '',
        date: dateKey(new Date(`${row.date}T00:00:00`)),
        time: row.time ? row.time.slice(0, 5) : '',
        icon: row.icon || ICONS[0],
        done: row.done
    };
}

async function loadTasksFromDB() {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .order('date', { ascending: true });

    if (error) {
        showAlert('Не удалось загрузить задачи');
        return [];
    }

    return data.map(mapRowToTask);
}

let tasks = [];

function tasksForDate(date) {
    const key = dateKey(date);

    return tasks
        .filter(task => task.date === key)
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
}


/* ==================== Рендер списка задач ==================== */

const tasksContainer = document.querySelector('#tasksContainer');

function renderTasksForSelectedDate() {
    const list = tasksForDate(selectedDate);
    tasksContainer.innerHTML = '';

    if (list.length === 0) {
        const empty = document.createElement('div');
        empty.classList.add('tasks-empty');
        empty.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="162.158" height="150" viewBox="0 0 812.158 800" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" artist="Katerina Limpitsouni" source="https://undraw.co/"><g transform="translate(-685.027 -293.25)"><path d="M549.973,747.783c13.013-11,20.917-28.366,18.844-45.275s-14.912-32.455-31.565-36.046-35.638,6.349-40.7,22.617c-2.784-31.364-5.992-64.043-22.667-90.752-15.1-24.185-41.251-41.49-69.593-44.586s-58.184,8.6-75.86,30.967-22,54.892-9.624,80.576c9.12,18.92,25.922,33,43.526,44.455a280.917,280.917,0,0,0,192.129,42.032" transform="translate(412.538 338.163)" fill="#f2f2f2"/><path d="M345.621,560.459a529.9,529.9,0,0,1,73.846,73.329,531.44,531.44,0,0,1,83.175,138.993c1.5,3.67-4.462,5.268-5.943,1.638a525.985,525.985,0,0,0-48.06-90.932A527.982,527.982,0,0,0,341.263,564.817C338.186,562.311,342.569,557.974,345.621,560.459Z" transform="translate(369.433 311.392)" fill="#fff"/><path d="M490.389,720.258c-11.172-9.44-17.957-24.352-16.178-38.869s12.8-27.863,27.1-30.946,30.6,5.451,34.938,19.417c2.39-26.927,5.144-54.981,19.459-77.912,12.963-20.763,35.414-35.62,59.746-38.277s49.951,7.38,65.126,26.586,18.891,47.126,8.262,69.175c-7.829,16.243-22.254,28.331-37.367,38.165a241.168,241.168,0,0,1-164.944,36.084" transform="translate(452.479 366.654)" fill="#f2f2f2"/><path d="M645.281,560.269A397.939,397.939,0,0,0,528.356,718.375c-1.115,2.733,3.323,3.923,4.425,1.22A393.511,393.511,0,0,1,648.526,563.514C650.817,561.649,647.553,558.419,645.281,560.269Z" transform="translate(463.717 367.993)" fill="#fff"/><circle cx="50.253" cy="50.253" r="50.253" transform="translate(942.778 552.622)" fill="#f2f2f2"/><path d="M471.255,287.388H817.486V306.33H515.454A135.227,135.227,0,0,0,380.227,441.558V656.769H342.341a6.314,6.314,0,0,1-6.314-6.314V422.615A135.227,135.227,0,0,1,471.255,287.388Z" transform="translate(366.832 142.256)" fill="#f2f2f2"/><path d="M460.527,802.49V514.75h84.3V802.49a7.3,7.3,0,0,1-7.295,7.295H467.822A7.3,7.3,0,0,1,460.527,802.49Z" transform="translate(444.156 283.465)" fill="#3f3d56"/><path d="M325.027,654.718V420.741A140.65,140.65,0,0,1,465.518,280.25H822.7V662.823H333.132a8.115,8.115,0,0,1-8.105-8.105ZM819.455,283.492H465.518A137.4,137.4,0,0,0,328.269,420.741V654.718a4.868,4.868,0,0,0,4.863,4.863H819.455Z" transform="translate(360 137.823)" fill="#3f3d56"/><path d="M574.65,538.812a29.212,29.212,0,0,1-29.179-29.179V300.514a4.868,4.868,0,0,0-4.863-4.863H427.132a8.115,8.115,0,0,1-8.105-8.105v-76.19a8.115,8.115,0,0,1,8.105-8.105H595.724a8.115,8.115,0,0,1,8.105,8.105V509.633A29.212,29.212,0,0,1,574.65,538.812Z" transform="translate(418.381 90)" fill="#6c63ff"/><path d="M675.428,278.25h0a92.208,92.208,0,0,1,92.4,92.014V636.623H949.39a27.5,27.5,0,0,1,27.558,27.443H583.027v-293.8A92.208,92.208,0,0,1,675.428,278.25Z" transform="translate(520.237 136.581)" fill="#3f3d56"/><circle cx="11.348" cy="11.348" r="11.348" transform="translate(981.684 588.285)" fill="#fff"/></g></svg>
        <p>No tasks for this day</p>
    `;
        tasksContainer.append(empty);
        return;
    }

    list.forEach(task => {
        tasksContainer.append(createTaskRow(task));
    });
}

function createTaskRow(task) {
    const row = document.createElement('div');
    row.classList.add('task');
    if (task.done) row.classList.add('done');
    row.dataset.id = task.id;

    const label = document.createElement('label');
    label.classList.add('task-check');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;

    const checkmark = document.createElement('span');
    checkmark.classList.add('checkmark');

    label.append(checkbox, checkmark);

    checkbox.addEventListener('change', async () => {
        task.done = checkbox.checked;
        row.classList.toggle('done', task.done);

        const { error } = await supabaseClient
            .from('tasks')
            .update({ done: task.done })
            .eq('id', task.id);

        if (error) showAlert('Не удалось сохранить отметку');
    });

    const iconBadge = document.createElement('div');
    iconBadge.classList.add('task-icon');
    const icon = task.icon || ICONS[0];
    iconBadge.style.backgroundColor = icon.bg;
    iconBadge.innerHTML = `<i class="fa ${icon.icon}" aria-hidden="true"></i>`;

    const info = document.createElement('div');
    info.classList.add('task-info');

    const name = document.createElement('p');
    name.classList.add('task-name');
    name.textContent = task.name;
    info.append(name);

    if (task.time) {
        const time = document.createElement('p');
        time.classList.add('task-time');
        time.textContent = task.time;
        info.append(time);
    }

    if (task.description) {
        const desc = document.createElement('p');
        desc.classList.add('task-desc');
        desc.textContent = task.description;
        info.append(desc);
    }

    if (task.userId !== currentUserId && task.ownerName) {
        const sharedLabel = document.createElement('p');
        sharedLabel.classList.add('task-shared-label');
        sharedLabel.innerHTML = `<i class="fa fa-share-nodes" aria-hidden="true"></i> От ${task.ownerName}`;
        info.append(sharedLabel);
    }

    const shareButton = document.createElement('button');
    shareButton.type = 'button';
    shareButton.classList.add('task-share');
    shareButton.innerHTML = '<i class="fa fa-user-plus" aria-hidden="true"></i>';
    shareButton.addEventListener('click', () => openShareModal(task));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add('task-delete');
    deleteButton.innerHTML = '<i class="fa fa-trash" aria-hidden="true"></i>';

    deleteButton.addEventListener('click', async () => {
        tasks = tasks.filter(item => item.id !== task.id);
        renderTasksForSelectedDate();

        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', task.id);

        if (error) showAlert('Не удалось удалить задачу');
    });

    row.append(label, iconBadge, info, shareButton, deleteButton);

    return row;
}

// =========================================================

const CONFETTI_COLORS = ['#603213', '#c0604a', '#27b98c', '#e8b565', '#4a86c9'];

function celebrateTaskAdded() {
    const overlay = document.createElement('div');
    overlay.classList.add('celebrate-overlay');

    const badge = document.createElement('div');
    badge.classList.add('celebrate-badge');
    badge.innerHTML = '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 25l9 9 19-19" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    overlay.append(badge);

    for (let i = 0; i < 14; i++) {
        const dot = document.createElement('span');
        dot.classList.add('confetti-dot');
        const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
        const distance = 70 + Math.random() * 50;
        dot.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        dot.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        dot.style.setProperty('--rot', `${Math.random() * 360}deg`);
        dot.style.backgroundColor = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        dot.style.animationDelay = `${0.15 + Math.random() * 0.1}s`;
        overlay.append(dot);
    }

    document.body.append(overlay);
    setTimeout(() => overlay.remove(), 1100);
}

/* ==================== Уведомления ==================== */

const alertsContainer = document.querySelector('#alerts');

function showAlert(message) {
    const alert = document.createElement('div');
    alert.classList.add('alert');
    alert.textContent = message;
    alertsContainer.append(alert);

    requestAnimationFrame(() => alert.classList.add('shown'));

    setTimeout(() => {
        alert.classList.remove('shown');
        setTimeout(() => alert.remove(), 200);
    }, 2200);
}


/* ==================== Иконки задач ==================== */

const ICONS = [
    { icon: 'fa-glass-water', bg: '#4c57a9' },
    { icon: 'fa-dumbbell', bg: '#cc1400' },
    { icon: 'fa-person-walking', bg: '#ffad33' },
    { icon: 'fa-book-open', bg: '#967cc7' },
    { icon: 'fa-mug-hot', bg: '#6698cc' },
    { icon: 'fa-moon', bg: '#c28cae' },
    { icon: 'fa-sun', bg: '#6baa75' },
    { icon: 'fa-apple-whole', bg: '#ffec89' },
    { icon: 'fa fa-plus', bg: '#07aac0' },
    { icon: 'fa-heart-pulse', bg: '#6398a9' },
    { icon: 'fa-tooth', bg: '#97c7b3' },
    { icon: 'fa-shower', bg: '#f9b95c' },
    { icon: 'fa-pen', bg: '#d7897f' },
    { icon: 'fa-music', bg: '#fe9a34' },
    { icon: 'fa-briefcase', bg: '#2ab0a3' },
    { icon: 'fa fa-car', bg: '#ffe458' },
    { icon: 'fa-bed', bg: '#ff544c' }
];


/* ==================== Модальное окно создания задачи ==================== */

const modalCloseTasks = document.querySelector('.modal-close-tasks');
const modalTasks = document.querySelector('.modal-task');
const addTaskButton = document.querySelector('#addTaskButton');

const taskNameInput = document.querySelector('#taskName');
const taskTextInput = document.querySelector('#textTasks');
const taskTimeInput = document.querySelector('#taskTime');
const saveTaskButton = document.querySelector('#saveTaskButton');

const pickerTitle = document.querySelector('#pickerTitle');
const pickerGrid = document.querySelector('#pickerGrid');
const pickerPrev = document.querySelector('#pickerPrev');
const pickerNext = document.querySelector('#pickerNext');
const iconGrid = document.querySelector('#iconGrid');

let pickerViewDate = new Date(today);
let pickerSelectedDate = new Date(today);
let selectedIconIndex = 0;

function renderIconPicker() {
    iconGrid.innerHTML = '';

    ICONS.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('icon-option');
        button.style.backgroundColor = item.bg;
        button.innerHTML = `<i class="fa ${item.icon}" aria-hidden="true"></i>`;

        if (index === selectedIconIndex) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => {
            selectedIconIndex = index;
            renderIconPicker();
        });

        iconGrid.append(button);
    });
}

function openModal() {
    pickerSelectedDate = new Date(selectedDate);
    pickerViewDate = new Date(pickerSelectedDate.getFullYear(), pickerSelectedDate.getMonth(), 1);
    selectedIconIndex = 0;

    taskNameInput.value = '';
    taskTextInput.value = '';
    taskTimeInput.value = '';

    renderPicker();
    renderIconPicker();

    modalTasks.classList.remove('hidden');
    modalTasks.classList.add('shown');
    modalCloseTasks.classList.remove('hidden');
    modalCloseTasks.classList.add('shown');
}

function closeModal() {
    modalTasks.classList.add('hidden');
    modalTasks.classList.remove('shown');
    modalCloseTasks.classList.add('hidden');
    modalCloseTasks.classList.remove('shown');
}

modalCloseTasks.addEventListener('click', closeModal);
addTaskButton.addEventListener('click', openModal);

function renderPicker() {
    pickerTitle.textContent = pickerViewDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    pickerGrid.innerHTML = '';

    const year = pickerViewDate.getFullYear();
    const month = pickerViewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();

    for (let i = 0; i < leadingBlanks; i++) {
        pickerGrid.append(document.createElement('span'));
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);

        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('picker-day');
        button.textContent = d;

        if (isSameDay(date, pickerSelectedDate)) {
            button.classList.add('selected');
        }

        if (isSameDay(date, today)) {
            button.classList.add('today');
        }

        button.addEventListener('click', () => {
            pickerSelectedDate = date;
            renderPicker();
        });

        pickerGrid.append(button);
    }
}

pickerPrev.addEventListener('click', () => {
    const next = new Date(pickerViewDate);
    next.setMonth(next.getMonth() - 1);
    pickerViewDate = next;
    renderPicker();
});

pickerNext.addEventListener('click', () => {
    const next = new Date(pickerViewDate);
    next.setMonth(next.getMonth() + 1);
    pickerViewDate = next;
    renderPicker();
});

saveTaskButton.addEventListener('click', async () => {
    const name = taskNameInput.value.trim();

    if (!name) {
        taskNameInput.focus();
        return;
    }

    saveTaskButton.disabled = true;

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
        .from('tasks')
        .insert({
            user_id: user.id,
            owner_name: currentUserName,
            name,
            description: taskTextInput.value.trim(),
            date: toISODate(pickerSelectedDate),
            time: taskTimeInput.value || null,
            icon: ICONS[selectedIconIndex],
            done: false
        })
        .select()
        .single();

    saveTaskButton.disabled = false;

    if (error) {
        showAlert('Не удалось сохранить задачу');
        return;
    }

    tasks.push(mapRowToTask(data));

    closeModal();
    celebrateTaskAdded();
    showAlert('Задача добавлена');

    if (isSameDay(pickerSelectedDate, selectedDate)) {
        renderTasksForSelectedDate();
    }
});


/* ==================== Режим "See all" ==================== */

const seeAllButton = document.querySelector('#seeAllButton');
const exitListButton = document.querySelector('#exitListButton');
const listDateLabel = document.querySelector('#listDateLabel');
const tasksListEl = document.querySelector('#tasksList');

function updateListDateLabel() {
    listDateLabel.textContent = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function enterListMode() {
    container.classList.add('list-mode');
    seeAllButton.classList.add('hidden');
    exitListButton.classList.remove('hidden');
    listDateLabel.classList.remove('hidden');
    updateListDateLabel();
}

function exitListMode() {
    container.classList.remove('list-mode');
    seeAllButton.classList.remove('hidden');
    exitListButton.classList.add('hidden');
    listDateLabel.classList.add('hidden');
    syncMainCalendarToSelectedDate(selectedDate);
}

seeAllButton.addEventListener('click', enterListMode);
exitListButton.addEventListener('click', exitListMode);

function changeSelectedDateBy(days) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    selectedDate = next;

    updateListDateLabel();
    renderTasksForSelectedDate();
}

let touchStartX = 0;
let touchStartY = 0;

tasksListEl.addEventListener('touchstart', (event) => {
    if (!container.classList.contains('list-mode')) return;

    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}, { passive: true });

tasksListEl.addEventListener('touchend', (event) => {
    if (!container.classList.contains('list-mode')) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    if (deltaX < 0) {
        changeSelectedDateBy(1);
    } else {
        changeSelectedDateBy(-1);
    }
}, { passive: true });


/* ==================== Поделиться задачей ==================== */

const modalShare = document.querySelector('#modalShare');
const closeShareModalButton = document.querySelector('#closeShareModal');
const shareTaskName = document.querySelector('#shareTaskName');
const shareCollaboratorsList = document.querySelector('#shareCollaborators');
const shareEmailInput = document.querySelector('#shareEmailInput');
const shareSubmitButton = document.querySelector('#shareSubmitButton');
const shareError = document.querySelector('#shareError');

let currentShareTaskId = null;

function openShareModal(task) {
    currentShareTaskId = task.id;
    shareTaskName.textContent = task.name;
    shareEmailInput.value = '';
    shareError.textContent = '';

    modalShare.classList.remove('hidden');
    modalShare.classList.add('shown');
    closeShareModalButton.classList.remove('hidden');
    closeShareModalButton.classList.add('shown');

    renderShareCollaborators(task.id);
}

function closeShareModal() {
    modalShare.classList.add('hidden');
    modalShare.classList.remove('shown');
    closeShareModalButton.classList.add('hidden');
    closeShareModalButton.classList.remove('shown');
    currentShareTaskId = null;
}

closeShareModalButton.addEventListener('click', closeShareModal);

async function renderShareCollaborators(taskId) {
    shareCollaboratorsList.innerHTML = '<p class="share-loading">Загрузка...</p>';

    const { data: shares, error } = await supabaseClient
        .from('task_shares')
        .select('shared_with, shared_with_name')
        .eq('task_id', taskId);

    if (error) {
        shareCollaboratorsList.innerHTML = '<p class="share-empty">Не удалось загрузить список</p>';
        return;
    }

    if (!shares || shares.length === 0) {
        shareCollaboratorsList.innerHTML = '<p class="share-empty">Пока ни с кем не расшарено</p>';
        return;
    }

    shareCollaboratorsList.innerHTML = '';

    shares.forEach(share => {
        const row = document.createElement('div');
        row.classList.add('collaborator-row');

        const info = document.createElement('p');
        info.classList.add('collaborator-name');
        info.textContent = share.shared_with_name || 'Пользователь';

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.classList.add('collaborator-remove');
        removeButton.innerHTML = '<i class="fa fa-xmark" aria-hidden="true"></i>';

        removeButton.addEventListener('click', async () => {
            await supabaseClient
                .from('task_shares')
                .delete()
                .eq('task_id', taskId)
                .eq('shared_with', share.shared_with);

            renderShareCollaborators(taskId);
        });

        row.append(info, removeButton);
        shareCollaboratorsList.append(row);
    });
}

shareSubmitButton.addEventListener('click', async () => {
    shareError.textContent = '';

    const email = shareEmailInput.value.trim();

    if (!isValidEmail(email)) {
        shareError.textContent = 'Введите корректную почту';
        return;
    }

    shareSubmitButton.disabled = true;

    const { data: found, error: lookupError } = await supabaseClient
        .rpc('find_user_by_email', { search_email: email });

    shareSubmitButton.disabled = false;

    const targetUser = found && found[0];

    if (lookupError || !targetUser) {
        shareError.textContent = 'Пользователь с такой почтой не найден';
        return;
    }

    if (targetUser.id === currentUserId) {
        shareError.textContent = 'Нельзя поделиться задачей с самим собой';
        return;
    }

    const { error: insertError } = await supabaseClient
        .from('task_shares')
        .insert({
            task_id: currentShareTaskId,
            shared_with: targetUser.id,
            shared_with_name: targetUser.name
        });

    if (insertError) {
        shareError.textContent = insertError.code === '23505'
            ? 'Уже расшарено с этим пользователем'
            : 'Не удалось поделиться задачей';
        return;
    }

    shareEmailInput.value = '';
    showAlert('Задача расшарена');
    renderShareCollaborators(currentShareTaskId);
});


/* ==================== Обновление в реальном времени ==================== */

let realtimeChannel = null;
let realtimeRefreshTimer = null;

function scheduleRealtimeRefresh() {
    clearTimeout(realtimeRefreshTimer);

    realtimeRefreshTimer = setTimeout(async () => {
        tasks = await loadTasksFromDB();
        renderTasksForSelectedDate();
    }, 300);
}

function subscribeRealtime() {
    if (realtimeChannel) return;

    realtimeChannel = supabaseClient
        .channel('tasks-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, scheduleRealtimeRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_shares' }, scheduleRealtimeRefresh)
        .subscribe();
}

function unsubscribeRealtime() {
    if (realtimeChannel) {
        supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
    clearTimeout(realtimeRefreshTimer);
}


/* ==================== Первичный рендер ==================== */

renderTasksForSelectedDate();
