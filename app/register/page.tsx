'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Register() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleRegister() {
        if (!username || !password) return alert('Bitte alles ausfüllen!')
        if (username.length < 3) return alert('Username muss mindestens 3 Zeichen haben!')
        setLoading(true)

        // Prüfen ob Username schon vergeben
        const { data: existing } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username.toLowerCase())
            .single()

        if (existing) {
            alert('Dieser Username ist bereits vergeben!')
            setLoading(false)
            return
        }

        const email = `${username.toLowerCase()}_${Date.now()}@anonymchat.app`

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: undefined }
        })

        if (error) { alert(error.message); setLoading(false); return }

        await supabase.from('profiles').insert({
            id: data.user!.id,
            username: username.toLowerCase(),
        })

        router.push('/dashboard')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <h1 className="text-white text-2xl font-bold">AnonymChat</h1>
                    <p className="text-zinc-400 text-sm mt-1">Kein Telefon. Kein Tracking.</p>
                </div>
                <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">
                    <input
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/30"
                    />
                    <input
                        placeholder="Passwort"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white/30"
                    />
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full bg-white text-black rounded-lg py-3 text-sm font-semibold hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                        {loading ? 'Wird erstellt...' : 'Registrieren'}
                    </button>
                    <p className="text-zinc-500 text-xs text-center">
                        Schon ein Account?{' '}
                        <a href="/login" className="text-white underline">Einloggen</a>
                    </p>
                </div>
            </div>
        </div>
    )
}