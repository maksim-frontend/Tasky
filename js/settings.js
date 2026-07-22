/* ==================== Настройки ==================== */

const settingsModal = document.querySelector('#settingsModal');
const settingsBack = document.querySelector('#settingsBack');
const timezoneSelect = document.querySelector('#timezoneSelect');

const settingsNameInput = document.querySelector('#settingsNameInput');
const settingsSaveName = document.querySelector('#settingsSaveName');
const settingsTelegramStatus = document.querySelector('#settingsTelegramStatus');
const settingsTelegramUnlink = document.querySelector('#settingsTelegramUnlink');

/* --- Заполнение списка часовых поясов --- */

function fillTimezoneSelect() {
    // Все зоны IANA (поддерживается в современных браузерах)
    const zones = typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('timeZone')
        : [];

    if (zones.length === 0) return;   // старый браузер — оставляем список из HTML

    const now = new Date();

    const withOffset = zones.map(zone => {
        let offset = '';

        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: zone,
                timeZoneName: 'shortOffset'
            }).formatToParts(now);

            offset = (parts.find(p => p.type === 'timeZoneName') || {}).value || '';
        } catch (e) {
            offset = '';
        }

        // "GMT+3" → минуты, для сортировки
        const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
        const sign = match && match[1] === '-' ? -1 : 1;
        const hours = match ? Number(match[2]) : 0;
        const minutes = match && match[3] ? Number(match[3]) : 0;

        return {
            zone,
            offset: offset || 'GMT+0',
            sortKey: sign * (hours * 60 + minutes)
        };
    });

    withOffset.sort((a, b) => a.sortKey - b.sortKey || a.zone.localeCompare(b.zone));

    timezoneSelect.innerHTML = '';

    withOffset.forEach(item => {
        const option = document.createElement('option');
        option.value = item.zone;
        option.textContent = `${item.zone.replace(/_/g, ' ')} (${item.offset})`;
        timezoneSelect.append(option);
    });
}

fillTimezoneSelect();

async function openSettings() {
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('name, timezone, avatar_url')
        .eq('id', currentUserId)
        .maybeSingle();

    settingsNameInput.value = (profile && profile.name) || '';
    timezoneSelect.value = (profile && profile.timezone) || 'Europe/Moscow';
    syncAvatarUI(profile && profile.avatar_url);

    const { data: tg } = await supabaseClient
        .from('telegram_links')
        .select('chat_id')
        .eq('user_id', currentUserId)
        .maybeSingle();

    if (tg) {
        settingsTelegramStatus.textContent = 'Подключён';
        settingsTelegramStatus.classList.add('linked');
        settingsTelegramUnlink.classList.remove('hidden');
    } else {
        settingsTelegramStatus.textContent = 'Не подключён';
        settingsTelegramStatus.classList.remove('linked');
        settingsTelegramUnlink.classList.add('hidden');
    }

    settingsModal.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

settingsBack.addEventListener('click', closeSettings);

/* --- Имя --- */

settingsSaveName.addEventListener('click', async () => {
    const newName = settingsNameInput.value.trim();
    if (!newName) {
        showAlert('Введите имя');
        return;
    }

    settingsSaveName.disabled = true;

    const { error } = await supabaseClient
        .from('profiles')
        .update({ name: newName })
        .eq('id', currentUserId);

    if (error) {
        settingsSaveName.disabled = false;
        showAlert('Не удалось сохранить имя');
        return;
    }

    currentUserName = newName;
    greetingName.textContent = `Hello, ${newName}`;

    await supabaseClient.from('tasks').update({ owner_name: newName }).eq('user_id', currentUserId);
    await supabaseClient.from('task_shares').update({ shared_with_name: newName }).eq('shared_with', currentUserId);

    settingsSaveName.disabled = false;
    showAlert('Имя обновлено');
});

/* --- Отвязка Telegram --- */

settingsTelegramUnlink.addEventListener('click', async () => {
    const confirmed = confirm('Отвязать Telegram? Уведомления перестанут приходить.');
    if (!confirmed) return;

    const { error } = await supabaseClient
        .from('telegram_links')
        .delete()
        .eq('user_id', currentUserId);

    if (error) {
        showAlert('Не удалось отвязать');
        return;
    }

    settingsTelegramStatus.textContent = 'Не подключён';
    settingsTelegramStatus.classList.remove('linked');
    settingsTelegramUnlink.classList.add('hidden');
    updateTelegramButtonState();
    showAlert('Telegram отвязан');
});

/* --- Часовой пояс --- */

timezoneSelect.addEventListener('change', async () => {
    const tz = timezoneSelect.value;
    const { error } = await supabaseClient
        .from('profiles')
        .update({ timezone: tz })
        .eq('id', currentUserId);

    if (error) {
        showAlert('Не удалось сохранить пояс');
        return;
    }

    showAlert('Часовой пояс сохранён');
});

/* --- Аватар --- */

const settingsAvatarChange = document.querySelector('#settingsAvatarChange');
const settingsAvatarDelete = document.querySelector('#settingsAvatarDelete');

settingsAvatarChange.addEventListener('click', () => {
    avatarInput.click();
});

settingsAvatarDelete.addEventListener('click', async () => {
    settingsAvatarDelete.disabled = true;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
        settingsAvatarDelete.disabled = false;
        return;
    }

    await supabaseClient.storage.from('avatars').remove([
        `${user.id}/avatar.jpg`,
        `${user.id}/avatar.jpeg`,
        `${user.id}/avatar.png`,
        `${user.id}/avatar.webp`,
    ]);

    const { error } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

    settingsAvatarDelete.disabled = false;

    if (error) {
        showAlert('Не удалось удалить фото');
        return;
    }

    syncAvatarUI(null);
    showAlert('Фото удалено');
});

/* --- Выход --- */

const settingsLogoutButton = document.querySelector('#settingsLogoutButton');
const confirmLogout = document.querySelector('#confirmLogout');
const confirmLogoutCancel = document.querySelector('#confirmLogoutCancel');
const confirmLogoutOk = document.querySelector('#confirmLogoutOk');

greetingName.addEventListener('click', () => openSettings());

if (settingsLogoutButton && confirmLogout) {
    settingsLogoutButton.addEventListener('click', () => {
        confirmLogout.classList.remove('hidden');
    });

    confirmLogoutCancel.addEventListener('click', () => {
        confirmLogout.classList.add('hidden');
    });

    confirmLogoutOk.addEventListener('click', async () => {
        confirmLogout.classList.add('hidden');
        settingsModal.classList.add('hidden');
        await supabaseClient.auth.signOut();
    });
}

/* --- Удаление аккаунта --- */

const deleteAccountButton = document.querySelector('#deleteAccountButton');
const confirmDeleteAccount = document.querySelector('#confirmDeleteAccount');
const confirmDeleteCancel = document.querySelector('#confirmDeleteCancel');
const confirmDeleteOk = document.querySelector('#confirmDeleteOk');

deleteAccountButton.addEventListener('click', () => {
    confirmDeleteAccount.classList.remove('hidden');
});

confirmDeleteCancel.addEventListener('click', () => {
    confirmDeleteAccount.classList.add('hidden');
});

confirmDeleteOk.addEventListener('click', async () => {
    confirmDeleteOk.disabled = true;

    const { error } = await supabaseClient.functions.invoke('delete-account');

    confirmDeleteOk.disabled = false;

    if (error) {
        confirmDeleteAccount.classList.add('hidden');
        showAlert('Не удалось удалить аккаунт');
        return;
    }

    confirmDeleteAccount.classList.add('hidden');
    settingsModal.classList.add('hidden');

    await supabaseClient.auth.signOut();
    showAlert('Аккаунт удалён');
});