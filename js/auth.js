/* ==================== Элементы входа / регистрации ==================== */

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

function translateAuthError(message) {
    if (!message) return 'Что-то пошло не так, попробуйте ещё раз';
    if (message.includes('already registered')) return 'Эта почта уже зарегистрирована';
    if (message.includes('Invalid login credentials')) return 'Неверная почта или пароль';
    if (message.includes('Email not confirmed')) return 'Подтвердите почту — мы отправили письмо со ссылкой';
    if (message.includes('Password should be at least')) return 'Пароль слишком короткий';
    return message;
}

/* --- Переключение вкладок --- */

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

/* --- Регистрация --- */

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

/* --- Вход --- */

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

/* --- Показать / скрыть пароль --- */

document.querySelectorAll('.auth-eye').forEach(button => {
    button.addEventListener('click', () => {
        const input = document.querySelector(`#${button.dataset.target}`);
        const hidden = input.type === 'password';

        input.type = hidden ? 'text' : 'password';
        button.innerHTML = hidden
            ? '<i class="fa fa-eye-slash" aria-hidden="true"></i>'
            : '<i class="fa fa-eye" aria-hidden="true"></i>';
    });
});

/* --- Восстановление пароля --- */

const forgotPassword = document.querySelector('#forgotPassword');

if (forgotPassword) {
    forgotPassword.addEventListener('click', async () => {
        const email = loginEmailInput.value.trim();

        if (!isValidEmail(email)) {
            loginError.textContent = 'Введите почту, на неё придёт ссылка';
            loginEmailInput.focus();
            return;
        }

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });

        loginError.textContent = error ? 'Не удалось отправить письмо' : '';
        if (!error) showAlert('Письмо для сброса пароля отправлено');
    });
}

/* --- Новый пароль после перехода по ссылке --- */

const resetScreen = document.querySelector('#resetScreen');
const resetForm = document.querySelector('#resetForm');
const resetPasswordInput = document.querySelector('#resetPassword');
const resetError = document.querySelector('#resetError');

function showResetScreen() {
    authScreen.classList.add('hidden');
    appContainer.classList.add('hidden');
    if (resetScreen) resetScreen.classList.remove('hidden');
}

if (resetForm) {
    resetForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        resetError.textContent = '';

        const password = resetPasswordInput.value;

        if (!isValidPassword(password)) {
            resetError.textContent = 'Пароль должен быть не короче 6 символов';
            return;
        }

        const submitButton = resetForm.querySelector('.auth-submit');
        submitButton.disabled = true;

        const { error } = await supabaseClient.auth.updateUser({ password });

        submitButton.disabled = false;

        if (error) {
            resetError.textContent = 'Не удалось сохранить пароль';
            return;
        }

        resetScreen.classList.add('hidden');
        showAlert('Пароль изменён, входите');
    });
}

/* --- Профиль --- */

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

/* --- Загрузка аватара --- */

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
        .storage.from('avatars')
        .upload(path, file, { upsert: true });

    if (uploadError) {
        showAlert('Не удалось загрузить фото');
        return;
    }

    const { data: publicUrlData } = supabaseClient
        .storage.from('avatars')
        .getPublicUrl(path);

    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    await supabaseClient
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

    syncAvatarUI(avatarUrl);
    showAlert('Фото обновлено');
});

function syncAvatarUI(url) {
    const src = url || DEFAULT_AVATAR;
    profilePhoto.src = src;

    const preview = document.querySelector('#settingsAvatarPreview');
    const del = document.querySelector('#settingsAvatarDelete');
    if (preview) preview.src = src;
    if (del) del.classList.toggle('hidden', !url);
}