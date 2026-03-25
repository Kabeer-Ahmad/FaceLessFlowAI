'use client';

import { useState } from 'react';
import { ArrowLeft, Sparkles, Wand2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ProjectSettings } from '@/types';
import { VOICE_OPTIONS } from '@/lib/constants';

export default function GraphicSplitTemplateFlow({ onBack }: { onBack: () => void }) {
    const router = useRouter();
    const [script, setScript] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Fixed settings for Graphic Split
    const [settings, setSettings] = useState<ProjectSettings>({
        aspectRatio: '16:9',
        templateMode: 'graphic_split',
        visualStyle: 'graphic_split_style',
        imageModel: 'runware',
        audioVoice: 'English_ManWithDeepVoice',
        disclaimerEnabled: true,
        longSentenceBreak: true,
        headingsEnabled: false,
        topTitle: {
            text: 'MY AWESOME VIDEO',
            color: '#ffffff',
            fontSize: '3xl',
            font: 'helvetica',
            isBold: true
        },
        captions: {
            enabled: true, position: 'mid-bottom', font: 'helvetica', fontSize: 'medium',
            animation: 'bounce', strokeWidth: 'thin', style: 'word_pop', color: '#ffcc00'
        },
        audioWave: { enabled: false, position: 'bottom', style: 'bars', color: '#ffcc00' },
        transitions: { mode: 'specific', type: 'crossfade' }
    });

    const handleStart = async () => {
        if (!script.trim()) return alert("Please enter wisdom to weave.");
        setLoading(true);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data, error } = await supabase
                .from('projects')
                .insert({
                    user_id: user.id,
                    script,
                    settings,
                    status: 'draft'
                })
                .select()
                .single();

            if (error) throw error;
            router.push(`/project/${data.id}`);

        } catch (e: any) {
            console.error(e);
            alert("Failed to create project: " + e.message);
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

            <div className="max-w-4xl mx-auto bg-stone-900/60 backdrop-blur-md border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/30">
                        <Sparkles size={28} />
                    </div>
                    <h2 className="text-4xl font-bold font-serif mb-3">
                        Graphic Split Template
                    </h2>
                    <p className="text-stone-400 text-sm max-w-lg mx-auto leading-relaxed">
                        Paste your script below. We'll automatically generate a split-screen video in 16:9 with a custom top title, AI generated graphics with removed background on the left, and dynamic captions on the right.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                            <Wand2 size={14} /> The Scripture
                        </label>
                        <textarea
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            disabled={loading}
                            className="w-full min-h-[350px] bg-stone-950 border border-white/10 rounded-2xl p-6 text-xl text-stone-200 placeholder:text-stone-700 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all font-serif leading-relaxed resize-y shadow-inner disabled:opacity-50"
                            placeholder="Paste your story, poem, or thought here..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-stone-500">Visual Engine</label>
                            <select
                                value={settings.imageModel}
                                onChange={(e) => setSettings({ ...settings, imageModel: e.target.value as any })}
                                className="w-full bg-stone-950 border border-white/10 rounded-lg p-4 text-sm focus:outline-none focus:border-green-500/50 transition-colors"
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
                                className="w-full bg-stone-950 border border-white/10 rounded-lg p-4 text-sm focus:outline-none focus:border-green-500/50 transition-colors"
                            >
                                {VOICE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                        <button
                            onClick={handleStart}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/40 transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="animate-pulse flex items-center gap-2">
                                    Initializing Grimiore...
                                </span>
                            ) : (
                                <><span>Begin Incantation</span> <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
