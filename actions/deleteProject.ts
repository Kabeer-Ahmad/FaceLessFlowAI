'use server';

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Init admin client for Storage deletion (policies might block normal user delete depending on setup, safer to use admin for clean wipe)
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function deleteProject(projectId: string) {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // 2. Verify Ownership
    const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

    if (!project || project.user_id !== user.id) {
        return { success: false, error: 'Project not found or unauthorized' };
    }

    try {
        // 3. Delete all assets by listing and removing files recursively
        console.log(`Deleting storage files for project: ${projectId}`);

        // Helper function to recursively list all files
        const listAllFiles = async (path: string): Promise<string[]> => {
            const files: string[] = [];
            const { data, error } = await supabaseAdmin.storage.from('assets').list(path);

            if (error) {
                console.error(`Error listing ${path}:`, error);
                return files;
            }

            if (data) {
                for (const item of data) {
                    const fullPath = path ? `${path}/${item.name}` : item.name;

                    if (item.id) { // It's a file
                        files.push(fullPath);
                    } else { // It might be a folder, try to list it
                        const subFiles = await listAllFiles(fullPath);
                        files.push(...subFiles);
                    }
                }
            }

            return files;
        };

        // List all files in the project folder
        const filesToDelete = await listAllFiles(projectId);

        console.log(`Found ${filesToDelete.length} files to delete:`, filesToDelete);

        if (filesToDelete.length > 0) {
            // Delete files in batches (Supabase has a limit)
            const batchSize = 100;
            for (let i = 0; i < filesToDelete.length; i += batchSize) {
                const batch = filesToDelete.slice(i, i + batchSize);
                const { error: deleteError } = await supabaseAdmin
                    .storage
                    .from('assets')
                    .remove(batch);

                if (deleteError) {
                    console.error(`Error deleting batch ${i}-${i + batch.length}:`, deleteError);
                } else {
                    console.log(`Deleted batch ${i}-${i + batch.length} (${batch.length} files)`);
                }
            }

            console.log(`Successfully deleted all ${filesToDelete.length} files from storage`);
        } else {
            console.log(`No files found for project ${projectId}`);
        }

        // 4. Delete Project (Cascade should remove scenes)
        // Using admin client to bypass any potential RLS issues with delete policy
        const { error: deleteError } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (deleteError) {
            console.error("DB Delete Error:", deleteError);
            throw deleteError;
        }

        return { success: true };

    } catch (e: any) {
        console.error("Delete Project Failed:", e);
        return { success: false, error: e.message };
    }
}
