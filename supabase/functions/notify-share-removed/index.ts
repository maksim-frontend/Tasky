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

    const { task_id, removed_user_id } = await req.json();
    if (!task_id || !removed_user_id) return reply('bad request', 400);

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Уведомлять может только владелец задачи
    const { data: task } = await admin
        .from('tasks')
        .select('name, user_id')
        .eq('id', task_id)
        .single();

    if (!task || task.user_id !== user.id) return reply('forbidden', 403);

    const { data: owner } = await admin
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

    const { data: link } = await admin
        .from('telegram_links')
        .select('chat_id')
        .eq('user_id', removed_user_id)
        .maybeSingle();

    if (!link) return reply('user has no telegram');

    const text = `❌ ${owner?.name || 'Владелец'} удалил вас из задачи «${task.name}»`;

    await fetch(
        `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: link.chat_id, text }),
        }
    );

    return reply('ok');
});