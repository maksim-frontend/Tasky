/* ==================== Supabase ==================== */

const SUPABASE_URL = 'https://dpnlpwbxxgevqrxljppy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbmxwd2J4eGdldnFyeGxqcHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MjYyNTEsImV4cCI6MjEwMDAwMjI1MX0.8d2eCt7Fu5KhuSd8VgkIwjW7emyTHjfLoxwLaZ5-2X0';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==================== Глобальное состояние ==================== */

let currentUserId = null;
let currentUserName = '';
let tasks = [];
let shareCounts = {};
let selectedDate = null;

const DEFAULT_AVATAR = 'images/1.jpg';

const today = new Date();
today.setHours(0, 0, 0, 0);

selectedDate = new Date(today);

/* ==================== Утилиты дат ==================== */

function dateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
}

function monthTitle(date) {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function monthAbbr(date) {
    return date.toLocaleDateString('en-US', { month: 'short' });
}

function isSameDay(a, b) {
    return dateKey(a) === dateKey(b);
}

function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/* ==================== Валидация ==================== */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
    return EMAIL_REGEX.test(email);
}

function isValidPassword(password) {
    return password.length >= 6;
}

/* ==================== Уведомления (тосты) ==================== */

const alertsContainer = document.querySelector('#alerts');

function showAlert(message) {
    // Убираем предыдущий, чтобы на экране был максимум один
    alertsContainer.innerHTML = '';

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