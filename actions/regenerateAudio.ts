'use server';

import { createClient } from '@/utils/supabase/server';
import { generateMinimaxAudio } from '@/lib/ai';

export async function regenerateAudio(sceneId: string, text: string, voiceId: string, projectId: string, sceneIndex: number) {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // 2. Verify scene ownership
    const { data: scene } = await supabase
        .from('scenes')
        .select('*, projects!inner(user_id)')
        .eq('id', sceneId)
        .single();

    if (!scene || scene.projects.user_id !== user.id) {
        return { success: false, error: 'Scene not found or unauthorized' };
    }

    try {
        // 3. Generate new audio
        console.log(`Regenerating audio for scene ${sceneId}`);
        const { url: audioUrl, duration: audioDuration } = await generateMinimaxAudio(text, voiceId, projectId, sceneIndex);

        // 4. Update scene with new audio
        const { error: updateError } = await supabase
            .from('scenes')
            .update({
                audio_url: audioUrl,
                duration: audioDuration
            })
            .eq('id', sceneId);

        if (updateError) throw updateError;

        return { success: true, audioUrl, duration: audioDuration };
    } catch (e: any) {
        console.error('Regenerate Audio Failed:', e);
        return { success: false, error: e.message };
    }
}
