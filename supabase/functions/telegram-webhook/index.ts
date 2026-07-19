import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
    const update = await req.json();
    console.log('Update received:', JSON.stringify(update));

    const msg = update.message;
    if (!msg?.text?.startsWith('/start')) {
        console.log('Not a /start message, skipping');
        return new Response('ok');
    }

    const code = msg.text.split(' ')[1];
    console.log('Parsed code:', code, 'chat_id:', msg.chat.id);

    if (!code) {
        const r = await sendMessage(msg.chat.id, 'Открой приложение и нажми "Подключить телеграм" — там будет ссылка со специальным кодом.');
        console.log('sendMessage response:', r);
        return new Response('ok');
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: link } = await supabase
        .from('telegram_link_codes')
        .select('user_id')
        .eq('code', code)
        .single();

    if (!link) {
        await sendMessage(msg.chat.id, 'Код не найден или устарел. Открой приложение и получи новый.');
        return new Response('ok');
    }

    await supabase.from('telegram_links').upsert({
        user_id: link.user_id,
        chat_id: msg.chat.id,
    });
    await supabase.from('telegram_link_codes').delete().eq('code', code);
    await sendMessage(msg.chat.id, '✅ Готово! Теперь буду присылать напоминания.');

    return new Response('ok');
});

async function sendMessage(chatId: number, text: string) {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    console.log('Sending message, token exists:', !!token, 'to chat:', chatId);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
    });
    const responseText = await res.text();
    console.log('Telegram API response:', res.status, responseText);
    return responseText;
}