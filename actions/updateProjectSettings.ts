'use server';

import { createClient } from '@/utils/supabase/server';
import { ProjectSettings } from '@/types';

export async function updateProjectSettings(projectId: string, settings: Partial<ProjectSettings>) {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // 2. Verify Ownership
    const { data: project } = await supabase
        .from('projects')
        .select('user_id, settings')
        .eq('id', projectId)
        .single();

    if (!project || project.user_id !== user.id) {
        return { success: false, error: 'Project not found or unauthorized' };
    }

    try {
        // 3. Merge with existing settings
        const updatedSettings = { ...project.settings, ...settings };

        // 4. Update project
        const { error: updateError } = await supabase
            .from('projects')
            .update({ settings: updatedSettings })
            .eq('id', projectId);

        if (updateError) throw updateError;

        return { success: true, settings: updatedSettings };
    } catch (e: any) {
        console.error('Update Settings Failed:', e);
        return { success: false, error: e.message };
    }
}
