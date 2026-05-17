'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
    const [profile, setProfile] = useState<any>(null)
    const [sessions, setSessions] = useState<any[]>([])
    const [copied, setCopied] = useState(false)
    const router = useRouter()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            setProfile(data)

            // Alle Chat-Sessions laden
            const { data: chatSessions } = await supabase
                .from('chat_sessions')
                .select(`
          id,
          created_at,
          messages (
            content,
            created_at,
            is_owner
          )
        `)
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })

            setSessions(chatSessions || [])

            // Realtime — neue Sessions live anzeigen
            const channel = supabase
                .channel(`dashboard:${user.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                }, () => {
                    // Sessions neu laden wenn neue Nachricht kommt
                    supabase
                        .from('chat_sessions')
                        .select(`id, created_at, messages (content, created_at, is_owner)`)
                        .eq('owner_id', user.id)
                        .order('created_at', { ascending: false })
                        .then(({ data }) => setSessions(data || []))
                })
                .subscribe()

            return () => { supabase.removeChannel(channel) }
        }
        load()
    }, [])

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    function copyLink() {
        const link = `${window.location.origin}/chat/${profile.username}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function openChat(sessionId: string) {
        router.push(`/dashboard/chat/${sessionId}`)
    }
    
    async function deleteChat(sessionId: string, e: React.MouseEvent) {
        e.stopPropagation()
        if (!confirm('Chat wirklich löschen?')) return

        await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', sessionId)

        setSessions(prev => prev.filter(s => s.id !== sessionId))
    }

    if (!profile) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <p className="text-zinc-400">Laden...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-sm mx-auto space-y-6 pt-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-white text-xl font-bold">Hallo, {profile.username} 👋</h1>
                        <p className="text-zinc-400 text-sm">Dein Chat-Link ist bereit</p>
                    </div>
                    <button onClick={handleLogout} className="text-zinc-500 text-xs underline">
                        Logout
                    </button>
                </div>

                {/* Chat Link Box */}
                <div className="bg-zinc-900 rounded-2xl p-5 space-y-3">
                    <p className="text-zinc-400 text-xs">Dein persönlicher Link</p>
                    <p className="text-white text-sm font-mono break-all">
                        {window.location.origin}/chat/{profile.username}
                    </p>
                    <button
                        onClick={copyLink}
                        className="w-full bg-white text-black rounded-lg py-3 text-sm font-semibold hover:bg-zinc-200 transition"
                    >
                        {copied ? '✓ Kopiert!' : 'Link kopieren'}
                    </button>
                </div>

                {/* Eingehende Chats */}
                <div className="space-y-2">
                    <p className="text-zinc-400 text-sm font-semibold">
                        Eingehende Chats ({sessions.length})
                    </p>
                    {sessions.length === 0 && (
                        <div className="bg-zinc-900 rounded-2xl p-5">
                            <p className="text-zinc-500 text-sm text-center">
                                Noch keine Chats. Teile deinen Link!
                            </p>
                        </div>
                    )}
                    {sessions.map((session, i) => {
                        const msgs = session.messages || []
                        const lastMsg = msgs[msgs.length - 1]
                        const unread = msgs.filter((m: any) => !m.is_owner).length

                        return (
                            <div
                                key={session.id}
                                className="w-full bg-zinc-900 rounded-2xl p-4 flex items-center gap-3 hover:bg-zinc-800 transition text-left cursor-pointer"
                            >
                                <div onClick={() => openChat(session.id)} className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-sm font-bold">#{i + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-semibold">Anonym #{i + 1}</p>
                                        <p className="text-zinc-400 text-xs truncate">
                                            {lastMsg ? lastMsg.content : 'Noch keine Nachricht'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {unread > 0 && (
                                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                            <span className="text-black text-xs font-bold">{unread}</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => deleteChat(session.id, e)}
                                        className="w-7 h-7 bg-zinc-700 rounded-full flex items-center justify-center hover:bg-red-500 transition"
                                    >
                                        <span className="text-white text-xs">✕</span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}