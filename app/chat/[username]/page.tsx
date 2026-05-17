'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function ChatPage() {
    const { username } = useParams()
    const [messages, setMessages] = useState<any[]>([])
    const [input, setInput] = useState('')
    const [session, setSession] = useState<any>(null)
    const [visitorToken, setVisitorToken] = useState('')
    const [loading, setLoading] = useState(true)
    const bottomRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        async function init() {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, username')
                .eq('username', username)
                .single()

            if (!profile) { setLoading(false); return }

            const { data: { user } } = await supabase.auth.getUser()
            const owner = user?.id === profile.id

            if (owner) {
                router.push('/dashboard')
                return
            }

            // Visitor Token — eindeutig pro Browser
            let token = localStorage.getItem(`token_${username}`)
            if (!token) {
                token = crypto.randomUUID()
                localStorage.setItem(`token_${username}`, token)
            }
            setVisitorToken(token)

            // Existierende Session suchen
            let { data: existingSession } = await supabase
                .from('chat_sessions')
                .select('id')
                .eq('visitor_token', token)
                .single()

            let sessionId = existingSession?.id

            if (!sessionId) {
                const { data: newSession } = await supabase
                    .from('chat_sessions')
                    .insert({
                        owner_id: profile.id,
                        visitor_token: token
                    })
                    .select()
                    .single()

                sessionId = newSession?.id
            }

            if (!sessionId) { setLoading(false); return }

            setSession({ id: sessionId, ownerName: profile.username })

            const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at')

            setMessages(msgs || [])
            setLoading(false)

            const channel = supabase
                .channel(`chat:${sessionId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `session_id=eq.${sessionId}`,
                }, (payload) => {
                    setMessages(prev => [...prev, payload.new])
                })
                .subscribe()

            return () => { supabase.removeChannel(channel) }
        }
        init()
    }, [username])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function sendMessage() {
        if (!input.trim() || !session) return

        await supabase.from('messages').insert({
            session_id: session.id,
            content: input.trim(),
            is_owner: false,
        })

        setInput('')
    }

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <p className="text-zinc-400">Laden...</p>
        </div>
    )

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                        {session?.ownerName?.[0]?.toUpperCase()}
                    </span>
                </div>
                <div>
                    <p className="text-white text-sm font-semibold">{session?.ownerName}</p>
                    <p className="text-green-400 text-xs">● Online</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                    <p className="text-zinc-500 text-sm text-center mt-8">
                        Noch keine Nachrichten. Schreib etwas!
                    </p>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${!msg.is_owner ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${!msg.is_owner
                                ? 'bg-white text-black rounded-br-sm'
                                : 'bg-zinc-800 text-white rounded-bl-sm'
                            }`}>
                            <p>{msg.content}</p>
                            <p className="text-xs mt-1 text-zinc-400">
                                {new Date(msg.created_at).toLocaleTimeString('de-DE', {
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="bg-zinc-900 border-t border-zinc-800 p-3 flex items-center gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Nachricht..."
                    className="flex-1 bg-zinc-800 text-white rounded-full px-4 py-2 text-sm outline-none"
                />
                <button
                    onClick={sendMessage}
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-zinc-200 transition"
                >
                    <span className="text-black text-sm">↑</span>
                </button>
            </div>
        </div>
    )
}