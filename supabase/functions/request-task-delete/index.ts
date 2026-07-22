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
    if (req.method === 'OPTIONS') {
        return reply('ok');
    }

    const authHeader = req.headers.get('Authorization') || '';

    const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return reply('unauthorized', 401);

    const { task_id } = await req.json();
    if (!task_id) return reply('no task_id', 400);

    const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Проверяем, что запрашивающий действительно имеет доступ к задаче
    const { data: share } = await admin
        .from('task_shares')
        .select('task_id')
        .eq('task_id', task_id)
        .eq('shared_with', user.id)
        .maybeSingle();

    if (!share) return reply('forbidden', 403);

    const { data: task } = await admin
        .from('tasks')
        .select('name, user_id')
        .eq('id', task_id)
        .single();

    if (!task) return reply('task not found', 404);

    const { data: requester } = await admin
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

    const { data: link } = await admin
        .from('telegram_links')
        .select('chat_id')
        .eq('user_id', task.user_id)
        .maybeSingle();

    if (!link) return reply('owner has no telegram');

    const text = `🚮 ${requester?.name || 'Пользователь'} предлагает вам удалить задачу «${task.name}»`;

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