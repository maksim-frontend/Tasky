import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(body: string, status = 200) {
    return new Response(body, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return reply('ok');

    const authHeader = req.headers.get('Authorization') || '';

    const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return reply('unauthorized', 401);

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const uid = user.id;

    // 1. Доступы: и выданные другим на мои задачи, и полученные мной
    const { data: myTasks } = await admin
        .from('tasks')
        .select('id')
        .eq('user_id', uid);

    const myTaskIds = (myTasks || []).map(t => t.id);

    if (myTaskIds.length > 0) {
        await admin.from('task_shares').delete().in('task_id', myTaskIds);
    }

    await admin.from('task_shares').delete().eq('shared_with', uid);

    // 2. Задачи
    await admin.from('tasks').delete().eq('user_id', uid);

    // 3. Telegram
    await admin.from('telegram_links').delete().eq('user_id', uid);
    await admin.from('telegram_link_codes').delete().eq('user_id', uid);

    // 4. Файлы аватара
    const { data: files } = await admin.storage.from('avatars').list(uid);

    if (files && files.length > 0) {
        await admin.storage
            .from('avatars')
            .remove(files.map(f => `${uid}/${f.name}`));
    }

    // 5. Профиль
    await admin.from('profiles').delete().eq('id', uid);

    // 6. Сам пользователь
    const { error } = await admin.auth.admin.deleteUser(uid);

    if (error) return reply(`failed: ${error.message}`, 500);

    return reply('ok');
});