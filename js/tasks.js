/* ==================== Загрузка задач ==================== */

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
        done: row.done,
        notifyBefore: row.notify_before_minutes,
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

async function loadShareCounts() {
    const { data, error } = await supabaseClient
        .from('task_shares')
        .select('task_id');

    if (error) return;

    shareCounts = {};
    (data || []).forEach(row => {
        shareCounts[row.task_id] = (shareCounts[row.task_id] || 0) + 1;
    });
}

function tasksForDate(date) {
    const key = dateKey(date);
    return tasks
        .filter(task => task.date === key)
        .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
}

function isOverdue(task) {
    if (task.done) return false;
    if (!task.time) return false;

    const [Y, M, D] = task.date.split('-').map(Number);
    const [h, m] = task.time.split(':').map(Number);
    return new Date(Y, M, D, h, m).getTime() < Date.now();
}

/* ==================== Рендер списка ==================== */

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

    list.forEach(task => tasksContainer.append(createTaskRow(task)));
}

function createTaskRow(task) {
    const row = document.createElement('div');
    row.classList.add('task');
    if (task.done) row.classList.add('done');
    row.dataset.id = task.id;

    if (isOverdue(task)) row.classList.add('overdue');

    const isOwner = task.userId === currentUserId;

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

    if (!isOwner && task.ownerName) {
        const sharedLabel = document.createElement('p');
        sharedLabel.classList.add('task-shared-label');
        sharedLabel.innerHTML = `<i class="fa fa-share-nodes" aria-hidden="true"></i> От ${task.ownerName}`;
        info.append(sharedLabel);
    }

    info.addEventListener('click', () => openTaskDetail(task));

    const shareButton = document.createElement('button');
    shareButton.type = 'button';
    shareButton.classList.add('task-share');
    shareButton.innerHTML = '<i class="fa fa-user-plus" aria-hidden="true"></i>';
    shareButton.addEventListener('click', () => openShareModal(task));

    const shareCount = shareCounts[task.id] || 0;
    if (shareCount > 0) {
        const badge = document.createElement('span');
        badge.classList.add('task-share-badge');
        badge.textContent = shareCount + 1;
        shareButton.append(badge);
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.classList.add('task-delete');
    deleteButton.innerHTML = '<i class="fa fa-trash" aria-hidden="true"></i>';

    deleteButton.addEventListener('click', () => {
        if (isOwner) {
            deleteTaskCompletely(task);
            return;
        }
        openSharedTaskActions(task);
    });

    row.append(label, iconBadge, info, shareButton, deleteButton);
    return row;
}

async function deleteTaskCompletely(task) {
    tasks = tasks.filter(item => item.id !== task.id);
    renderTasksForSelectedDate();

    const { error } = await supabaseClient
        .from('tasks')
        .delete()
        .eq('id', task.id);

    if (error) showAlert('Не удалось удалить задачу');
}

/* ==================== Детальная карточка ==================== */

const taskDetail = document.querySelector('#taskDetail');
const taskDetailClose = document.querySelector('#taskDetailClose');
const taskDetailIcon = document.querySelector('#taskDetailIcon');
const taskDetailName = document.querySelector('#taskDetailName');
const taskDetailMeta = document.querySelector('#taskDetailMeta');
const taskDetailDesc = document.querySelector('#taskDetailDesc');

function detailChip(iconClass, text, isDanger) {
    const chip = document.createElement('span');
    chip.classList.add('task-detail-chip');
    if (isDanger) chip.classList.add('overdue');
    chip.innerHTML = `<i class="fa ${iconClass}" aria-hidden="true"></i> ${text}`;
    taskDetailMeta.append(chip);
}

function openTaskDetail(task) {
    if (!taskDetail) return;

    const icon = task.icon || ICONS[0];
    taskDetailIcon.style.backgroundColor = icon.bg;
    taskDetailIcon.innerHTML = `<i class="fa ${icon.icon}" aria-hidden="true"></i>`;

    taskDetailName.textContent = task.name;
    taskDetailMeta.innerHTML = '';

    const [Y, M, D] = task.date.split('-').map(Number);
    const dateLabel = new Date(Y, M, D).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    detailChip('fa-calendar', dateLabel);
    if (task.time) detailChip('fa-clock', task.time, isOverdue(task));
    if (task.done) detailChip('fa-check', 'Выполнено');
    if (task.userId !== currentUserId && task.ownerName) {
        detailChip('fa-share-nodes', `От ${task.ownerName}`);
    }

    taskDetailDesc.textContent = task.description || '';
    taskDetailDesc.classList.toggle('hidden', !task.description);

    taskDetail.classList.remove('hidden', 'closing');
    document.body.style.overflow = 'hidden';
}

function closeTaskDetail() {
    taskDetail.classList.add('closing');
    document.body.style.overflow = '';
    setTimeout(() => {
        taskDetail.classList.add('hidden');
        taskDetail.classList.remove('closing');
    }, 180);
}

if (taskDetailClose) {
    taskDetailClose.addEventListener('click', closeTaskDetail);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !taskDetail.classList.contains('hidden')) closeTaskDetail();
    });
}

/* ==================== Конфетти ==================== */

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

/* ==================== Модалка создания задачи ==================== */

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
const notifyHoursInput = document.querySelector('#notifyHours');
const notifyMinutesInput = document.querySelector('#notifyMinutes');

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
        if (index === selectedIconIndex) button.classList.add('selected');
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
    notifyHoursInput.value = '';
    notifyMinutesInput.value = '';

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
    pickerTitle.textContent = pickerViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
        if (isSameDay(date, pickerSelectedDate)) button.classList.add('selected');
        if (isSameDay(date, today)) button.classList.add('today');
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

    const notifyH = parseInt(notifyHoursInput.value) || 0;
    const notifyM = parseInt(notifyMinutesInput.value) || 0;
    const notifyTotal = notifyH * 60 + notifyM;

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
            done: false,
            notify_before_minutes: notifyTotal > 0 ? notifyTotal : null,
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
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
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

    requestAnimationFrame(() => {
        fitWholeDays();
        selectToday();
    });
}

seeAllButton.addEventListener('click', enterListMode);
exitListButton.addEventListener('click', exitListMode);

function changeSelectedDateBy(days) {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    next.setHours(0, 0, 0, 0);

    // Назад дальше сегодняшнего дня не пускаем
    if (next < today) {
        showAlert('Только вперед!');
        return;
    }

    selectedDate = next;
    updateListDateLabel();
    renderTasksForSelectedDate();
}

let touchStartX = 0;
let touchStartY = 0;

tasksListEl.addEventListener('touchstart', (e) => {
    if (!container.classList.contains('list-mode')) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

tasksListEl.addEventListener('touchend', (e) => {
    if (!container.classList.contains('list-mode')) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    changeSelectedDateBy(dx < 0 ? 1 : -1);
}, { passive: true });