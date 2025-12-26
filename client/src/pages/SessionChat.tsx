import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User, Bot, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function SessionChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!id) return;

    const fetchSession = async () => {
      try {
        // Get local session info (for workingDir)
        const sessionData = await api.getSession(id);
        setSession(sessionData);

        // Load messages from OpenCode
        if (sessionData && sessionData.working_dir) {
          const msgs = await api.opencode.getMessages(id, sessionData.working_dir);
          setMessages(msgs || []);
        }
      } catch (err) {
        console.error('Failed to fetch session:', err);
        // Maybe it was deleted in OpenCode but exists in DB?
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
    // Poll for new messages every 3s
    const interval = setInterval(() => {
      if (session && session.working_dir) {
        api.opencode.getMessages(id, session.working_dir)
          .then(msgs => setMessages(msgs || []))
          .catch(() => {});
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, session?.working_dir]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sending || !session) return;

    const text = input;
    setInput('');
    setSending(true);

    // Optimistic update
    const tempMsg = {
      info: { role: 'user', created: new Date().toISOString() },
      parts: [{ type: 'text', text }]
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await api.opencode.sendMessage(id!, session.working_dir, text);
      // Fetch update immediately
      const msgs = await api.opencode.getMessages(id!, session.working_dir);
      setMessages(msgs || []);
    } catch (err: any) {
      alert(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <div className="text-center text-gray-400 mt-20">Session not found</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-800 bg-gray-900">
        <button
          onClick={() => navigate('/sessions')}
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-white">{session.name}</h1>
          <p className="text-xs text-gray-500 font-mono">{session.working_dir}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => {
          const isUser = msg.info.role === 'user';
          return (
            <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${isUser ? 'bg-primary text-white' : 'bg-gray-800 text-primary'}
              `}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`
                max-w-[80%] rounded-lg p-4 text-sm whitespace-pre-wrap
                ${isUser ? 'bg-primary/10 border border-primary/20 text-white' : 'bg-gray-900 border border-gray-800 text-gray-300'}
              `}>
                {msg.parts.map((part: any, pIdx: number) => (
                  <div key={pIdx}>
                    {part.type === 'text' && part.text}
                    {/* Add support for tool calls/results here later */}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg text-white transition-colors"
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
