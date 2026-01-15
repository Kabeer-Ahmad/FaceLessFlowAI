'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                alert("Check your email for confirmation link!")
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                router.push('/')
                router.refresh()
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-950 p-4 font-sans relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-orange-600/20 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px]" />
            </div>

            <div className="bg-stone-900/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 z-10">
                <div className="text-center mb-10 space-y-2">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-lg mx-auto mb-4">
                        <Sparkles size={24} />
                    </div>
                    <h1 className="text-3xl font-bold font-serif text-white">FacelessFlow AI</h1>
                    <p className="text-stone-400 font-light">Enter the realm of automated storytelling</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-5">
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 placeholder:text-stone-700 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                            placeholder="visionary@example.com"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 placeholder:text-stone-700 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 size={16} />}
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-stone-500">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="hover:text-orange-500 transition-colors">
                        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    )
}
