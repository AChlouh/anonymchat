'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleLogin() {
        if (!username || !password) return alert('Bitte alles ausfüllen!')
        setLoading(true)

        // Username → Email suchen
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username.toLowerCase())
            .single()

        if (!profile) {
            alert('Username nicht gefunden!')
            setLoading(false)
            return
        }

        // Auth User Email holen
        const { data: users } = await supabase.auth.admin.listUsers()
        const user = users?.users?.find(u => u.id === profile.id)

        if (!user) { alert('Fehler beim Login!'); setLoading(false); return }

        const { error } = await supabase.auth.signInWithPassword({
            email: user.email!,
            password
        })

        if (error) { alert('Falsches Passwort!'); setLoading(false); return }

        router.push('/dashboard')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <h1 className="text-white text-2xl font-bold">AnonymChat</h1>
                    <p className="text-zinc-400 text-sm mt-1">Willkommen zurück!</p>
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
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-white text-black rounded-lg py-3 text-sm font-semibold hover:bg-zinc-200 transition disabled:opacity-50"
                    >
                        {loading ? 'Einloggen...' : 'Einloggen'}
                    </button>
                    <p className="text-zinc-500 text-xs text-center">
                        Noch kein Account?{' '}
                        <a href="/register" className="text-white underline">Registrieren</a>
                    </p>
                </div>
            </div>
        </div>
    )
}