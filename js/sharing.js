/* ==================== Поделиться задачей ==================== */

const modalShare = document.querySelector('#modalShare');
const closeShareModalButton = document.querySelector('#closeShareModal');
const shareTaskCard = document.querySelector('#shareTaskCard');
const shareCollaboratorsList = document.querySelector('#shareCollaborators');
const shareInviteRow = document.querySelector('.share-invite-row');
const shareEmailInput = document.querySelector('#shareEmailInput');
const shareSubmitButton = document.querySelector('#shareSubmitButton');
const shareError = document.querySelector('#shareError');

let currentShareTask = null;

function openShareModal(task) {
    currentShareTask = task;
    shareTaskCard.innerHTML = '';

    const card = createTaskRow(task);
    card.querySelector('.task-share')?.remove();
    card.querySelector('.task-delete')?.remove();
    shareTaskCard.append(card);

    shareEmailInput.value = '';
    shareError.textContent = '';

    const isOwner = task.userId === currentUserId;
    shareInviteRow.classList.toggle('hidden', !isOwner);

    modalShare.classList.remove('hidden');
    modalShare.classList.add('shown');
    closeShareModalButton.classList.remove('hidden');
    closeShareModalButton.classList.add('shown');

    renderShareCollaborators(task);
}

function closeShareModal() {
    modalShare.classList.add('hidden');
    modalShare.classList.remove('shown');
    closeShareModalButton.classList.add('hidden');
    closeShareModalButton.classList.remove('shown');
    currentShareTask = null;
}

closeShareModalButton.addEventListener('click', closeShareModal);

async function renderShareCollaborators(task) {
    shareCollaboratorsList.innerHTML = '<p class="share-loading">Загрузка...</p>';

    const { data: shares, error } = await supabaseClient
        .from('task_shares')
        .select('shared_with, shared_with_name, profiles!task_shares_profile_fkey(name, avatar_url)')
        .eq('task_id', task.id);

    if (error) {
        shareCollaboratorsList.innerHTML = '<p class="share-empty">Не удалось загрузить список</p>';
        return;
    }

    const { data: owner } = await supabaseClient
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('id', task.userId)
        .maybeSingle();

    const people = [];

    if (owner) {
        people.push({ id: owner.id, name: owner.name, avatar: owner.avatar_url, isOwner: true });
    }

    (shares || []).forEach(share => {
        people.push({
            id: share.shared_with,
            name: (share.profiles && share.profiles.name) || share.shared_with_name,
            avatar: share.profiles && share.profiles.avatar_url,
            isOwner: false
        });
    });

    shareCollaboratorsList.innerHTML = '';
    const viewerIsOwner = task.userId === currentUserId;

    people.forEach(person => {
        const isMe = person.id === currentUserId;

        const row = document.createElement('div');
        row.classList.add('collaborator-row');
        if (person.isOwner) row.classList.add('is-owner');

        const avatar = document.createElement('img');
        avatar.classList.add('collaborator-avatar');
        avatar.src = person.avatar || DEFAULT_AVATAR;
        avatar.alt = '';

        const info = document.createElement('p');
        info.classList.add('collaborator-name');
        info.textContent = isMe ? 'Вы' : (person.name || 'Пользователь');

        row.append(avatar, info);

        if (viewerIsOwner && !person.isOwner) {
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.classList.add('collaborator-remove');
            removeButton.innerHTML = '<i class="fa fa-xmark" aria-hidden="true"></i>';

            removeButton.addEventListener('click', async () => {
                const { error: removeError } = await supabaseClient
                    .from('task_shares')
                    .delete()
                    .eq('task_id', task.id)
                    .eq('shared_with', person.id);

                if (removeError) {
                    showAlert('Не удалось удалить участника');
                    return;
                }

                supabaseClient.functions.invoke('notify-share-removed', {
                    body: { task_id: task.id, removed_user_id: person.id }
                });

                await loadShareCounts();
                renderTasksForSelectedDate();
                renderShareCollaborators(task);
            });

            row.append(removeButton);
        }

        shareCollaboratorsList.append(row);
    });
}

shareSubmitButton.addEventListener('click', async () => {
    shareError.textContent = '';
    if (!currentShareTask) return;

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
            task_id: currentShareTask.id,
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

    await loadShareCounts();
    renderTasksForSelectedDate();
    renderShareCollaborators(currentShareTask);
});

/* ==================== Удаление расшаренной задачи ==================== */

const sharedTaskActions = document.querySelector('#sharedTaskActions');
const sharedTaskActionsTitle = document.querySelector('#sharedTaskActionsTitle');
const leaveTaskButton = document.querySelector('#leaveTaskButton');
const requestDeleteButton = document.querySelector('#requestDeleteButton');
const sharedTaskActionsCancel = document.querySelector('#sharedTaskActionsCancel');

let pendingSharedTask = null;

function openSharedTaskActions(task) {
    pendingSharedTask = task;
    sharedTaskActionsTitle.textContent = task.name;
    sharedTaskActions.classList.remove('hidden');
}

function closeSharedTaskActions() {
    sharedTaskActions.classList.add('hidden');
    pendingSharedTask = null;
}

sharedTaskActionsCancel.addEventListener('click', closeSharedTaskActions);

leaveTaskButton.addEventListener('click', async () => {
    const task = pendingSharedTask;
    closeSharedTaskActions();
    if (!task) return;

    const { error } = await supabaseClient
        .from('task_shares')
        .delete()
        .eq('task_id', task.id)
        .eq('shared_with', currentUserId);

    if (error) {
        showAlert('Не удалось покинуть задачу');
        return;
    }

    tasks = tasks.filter(item => item.id !== task.id);
    await loadShareCounts();
    renderTasksForSelectedDate();
    showAlert('Вы покинули задачу');
});

requestDeleteButton.addEventListener('click', async () => {
    const task = pendingSharedTask;
    closeSharedTaskActions();
    if (!task) return;

    const { error } = await supabaseClient.functions.invoke('request-task-delete', {
        body: { task_id: task.id }
    });

    if (error) {
        showAlert('Не удалось отправить запрос');
        return;
    }

    showAlert('Запрос отправлен владельцу');
});