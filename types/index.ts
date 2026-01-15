export type ProjectApi = {
    id: string;
    user_id: string;
    script: string;
    status: 'draft' | 'generating' | 'done';
    settings: ProjectSettings;
    created_at: string;
};

export type ProjectSettings = {
    aspectRatio: '16:9' | '9:16' | '1:1';
    visualStyle: 'zen' | 'normal' | 'stick' | 'health' | 'cartoon' | 'art';
    imageModel: 'fal' | 'gemini' | 'runware';  // Renamed from imageProvider for clarity or alias? user said "image generator". Let's stick to imageProvider to match Python script logic if possible, but valid types are key.
    audioVoice: string;
    disclaimerEnabled: boolean;
    captions: {
        enabled: boolean;
        position: 'bottom' | 'mid-bottom' | 'center' | 'top';
        font: 'helvetica' | 'serif' | 'brush';
        fontSize: 'small' | 'medium' | 'large' | 'xlarge';
        animation: 'none' | 'typewriter' | 'fade-in' | 'slide-up' | 'bounce';
        strokeWidth: 'thin' | 'medium' | 'thick' | 'bold';
    };
    transitions: {
        mode: 'random' | 'specific';
        type: 'fadein' | 'crossfade' | 'white_flash' | 'camera_flash' | 'none';
    };
};

export type SceneApi = {
    id: string;
    project_id: string;
    order_index: number;
    text: string;
    prompt: string | null;
    image_url: string | null;
    audio_url: string | null;
    duration: number | null;
    status: 'pending' | 'ready' | 'error';
    visual_style?: string | null;
};
