/* ==================== Telegram ==================== */

const TELEGRAM_BOT_USERNAME = 'Tasky_alert_bot';

const telegramConnectButton = document.querySelector('#telegramConnectButton');
const telegramButtonText = document.querySelector('#telegramButtonText');

async function updateTelegramButtonState() {
    if (!currentUserId) return;

    const { data } = await supabaseClient
        .from('telegram_links')
        .select('chat_id')
        .eq('user_id', currentUserId)
        .maybeSingle();

    if (data) {
        telegramButtonText.innerHTML = 'Telegram <i class="fa fa-check" aria-hidden="true"></i>';
        telegramConnectButton.classList.add('linked');
    } else {
        telegramButtonText.textContent = 'Подключить Telegram';
        telegramConnectButton.classList.remove('linked');
    }
}

telegramConnectButton.addEventListener('click', async () => {
    if (telegramConnectButton.classList.contains('linked')) return;

    const code = Math.random().toString(36).slice(2, 10);
    const { error } = await supabaseClient
        .from('telegram_link_codes')
        .insert({ code, user_id: currentUserId });

    if (error) {
        showAlert('Не удалось создать код');
        return;
    }

    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`, '_blank');
});