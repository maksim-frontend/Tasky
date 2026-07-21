import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tasks } = await supabase.rpc('tasks_due_for_notification');

    for (const task of tasks || []) {
        const { data: link } = await supabase
            .from('telegram_links')
            .select('chat_id')
            .eq('user_id', task.user_id)
            .single();

        if (!link) continue;

        const text = task.notify_before_minutes
            ? `⏰ Через ${task.notify_before_minutes} мин: ${task.name}`
            : `⏰ Пора: ${task.name}`;

        await fetch(
            `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: link.chat_id, 
                    text,
                    disable_notification: false 
                }),
            }
        );

        await supabase.from('task_notifications_sent').insert({ task_id: task.id });
    }

    return new Response('ok');
});