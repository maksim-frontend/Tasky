/* ==================== Календарь (лента) ==================== */

const calendar = document.querySelector('#calendar');
const scrollContainer = document.querySelector('#scrollContainer');
const todayButton = document.querySelector('#todayButton');
const monthLabel = document.querySelector('#monthLabel');
const container = document.querySelector('#container');

let lastDate = new Date(today);
let currentMonthKey = '';

function updateTodayButton(date) {
    const isToday = isSameDay(date, today);
    todayButton.classList.toggle('hidden', isToday);
    todayButton.classList.toggle('active', !isToday);
}

function clearActiveDay() {
    document.querySelectorAll('.days.active').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.weekday.active').forEach(w => w.classList.remove('active'));
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

    const todayElement = calendar.querySelector(`[data-date="${dateKey(today)}"]`);
    if (todayElement) {
        todayElement.querySelector('.days').classList.add('active');
        todayElement.querySelector('.weekday').classList.add('active');
    }

    updateTodayButton(today);
    selectedDate = new Date(today);
    renderTasksForSelectedDate();
    scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
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
        scrollContainer.scrollWidth - scrollContainer.scrollLeft - scrollContainer.clientWidth;

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