'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function OwnerChat() {
    const { sessionId } = useParams()
    const [messages, setMessages] = useState<any[]>([])
    const [input, setInput] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        // Nachrichten laden
        supabase
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at')
            .then(({ data }) => setMessages(data || []))

        // Realtime
        const channel = supabase
            .channel(`owner:${sessionId}`)
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
    }, [sessionId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function sendMessage() {
        if (!input.trim()) return

        await supabase.from('messages').insert({
            session_id: sessionId,
            content: input.trim(),
            is_owner: true,
        })

        setInput('')
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
                <button onClick={() => router.push('/dashboard')} className="text-zinc-400 text-sm">
                    ← Zurück
                </button>
                <p className="text-white text-sm font-semibold ml-2">Anonym Chat</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_owner ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${msg.is_owner
                                ? 'bg-white text-black rounded-br-sm'
                                : 'bg-zinc-800 text-white rounded-bl-sm'
                            }`}>
                            <p>{msg.content}</p>
                            <p className={`text-xs mt-1 ${msg.is_owner ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString('de-DE', {
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-zinc-900 border-t border-zinc-800 p-3 flex items-center gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Antworten..."
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