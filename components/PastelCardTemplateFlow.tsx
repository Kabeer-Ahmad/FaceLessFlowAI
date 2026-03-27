'use client';

import { useState } from 'react';
import { ArrowLeft, Sparkles, ChevronRight, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ProjectSettings } from '@/types';
import { VOICE_OPTIONS } from '@/lib/constants';

export default function PastelCardTemplateFlow({ onBack }: { onBack: () => void }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [script, setScript] = useState('');
    const [settings, setSettings] = useState<ProjectSettings>({
        aspectRatio: '16:9',
        templateMode: 'pastel_card',
        visualStyle: 'pastel_card_style',
        imageModel: 'fal',
        audioVoice: 'English_ManWithDeepVoice', // valid Minimax voice ID
        disclaimerEnabled: false,
        longSentenceBreak: false,
        headingsEnabled: false,
        captions: {
            enabled: true,
            position: 'bottom',
            font: 'helvetica',
            fontSize: 'medium',
            animation: 'typewriter',
            strokeWidth: 'thin',
            style: 'classic',
            color: '#111111',
        },
        audioWave: { enabled: false, position: 'bottom', style: 'bars', color: '#000000' },
        transitions: { mode: 'specific', type: 'crossfade' },
        cameraMovements: ['zoom_in', 'zoom_out'],
    });

    const handleStart = async () => {
        if (!script.trim()) return alert('Please enter your script.');
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data, error } = await supabase
                .from('projects')
                .insert({ user_id: user.id, script, settings, status: 'draft' })
                .select()
                .single();

            if (error) throw error;
            router.push(`/project/${data.id}`);
        } catch (e: any) {
            console.error(e);
            alert('Failed to create project: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <button
                onClick={onBack}
                disabled={loading}
                className="flex items-center text-sm text-stone-500 hover:text-white mb-6 transition-colors disabled:opacity-50"
            >
                <ArrowLeft size={16} className="mr-2" /> Back to Templates
            </button>

            <div className="max-w-2xl mx-auto bg-stone-900/60 backdrop-blur-md border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #f8c8d8, #d4b8e8, #b8d4f0)' }}>
                        <Sparkles size={28} className="text-purple-800/70" />
                    </div>
                    <h2 className="text-3xl font-bold font-serif mb-3">Pastel Card</h2>
                    <p className="text-stone-400 text-sm max-w-md mx-auto leading-relaxed">
                        Soft pastel background with a centred graphic card and typewriter captions. Perfect for calm, elegant content.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Settings */}
                    <div className="bg-stone-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-left">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                            <Sparkles size={16} className="text-purple-400" />
                            <span className="text-sm font-semibold text-stone-300 uppercase tracking-widest">AI Config</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Visual Engine</label>
                                <select
                                    value={settings.imageModel}
                                    onChange={(e) => setSettings({ ...settings, imageModel: e.target.value as any })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                                >
                                    <option value="fal">Fal.ai (Flux Pro)</option>
                                    <option value="runware">Runware (Fast)</option>
                                    <option value="gemini">Google Gemini 2.5</option>
                                    <option value="imagen">Google Imagen 4.0 Fast</option>
                                    <option value="flux_dev">Replicate (FLUX Dev)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Voice Persona</label>
                                <select
                                    value={settings.audioVoice}
                                    onChange={(e) => setSettings({ ...settings, audioVoice: e.target.value })}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                                >
                                    {VOICE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Script */}
                    <div className="space-y-2 text-left">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                            <Wand2 size={14} /> The Script
                        </label>
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            disabled={loading}
                            className="w-full min-h-[320px] bg-stone-950 border border-white/10 rounded-2xl p-6 text-xl text-stone-200 placeholder:text-stone-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-serif leading-relaxed resize-y shadow-inner disabled:opacity-50"
                            placeholder="Paste your script here..."
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleStart}
                            disabled={loading || !script.trim()}
                            className="w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8, #67e8f9)' }}
                        >
                            {loading ? (
                                <span className="animate-pulse">Generating...</span>
                            ) : (
                                <><span>Generate Pastel Card Video</span><ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
