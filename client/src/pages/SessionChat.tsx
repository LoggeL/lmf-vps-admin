import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User, Bot, Loader2, Terminal, ChevronDown, ChevronRight, Check, X, Code, Search, Eye, Edit3, Brain, AlertCircle, RefreshCw, StopCircle, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';

interface ToolState {
  status: 'pending' | 'completed' | 'error';
  input?: Record<string, any>;
  output?: string;
  title?: string;
  metadata?: Record<string, any>;
}

interface MessagePart {
  id: string;
  type: 'text' | 'tool' | 'step-start' | 'step-finish' | 'reasoning';
  text?: string;
  tool?: string;
  callID?: string;
  state?: ToolState;
  reason?: string;
}

interface MessageInfo {
  id: string;
  role: 'user' | 'assistant';
  time: { created: number; completed?: number };
  modelID?: string;
  providerID?: string;
  tokens?: { input: number; output: number };
  finish?: string;
}

interface Message {
  info: MessageInfo;
  parts: MessagePart[];
}

interface OpenCodeSession {
  id: string;
  title: string;
  directory: string;
  time: { created: number; updated: number };
}

export default function SessionChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<OpenCodeSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const prevMessageCountRef = useRef(0);
  const isAtBottomRef = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 300;
  };

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && isAtBottomRef.current) {
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const toggleTool = (toolId: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const fetchMessages = useCallback(async () => {
    if (!id || !session?.directory) return;
    try {
      const msgs = await api.opencode.getMessages(id, session.directory);
      
      // Smart merge: preserve optimistic messages until real ones arrive
      setMessages(prev => {
        const realMsgs = msgs || [];
        
        // Check if we have any temp/optimistic messages
        const tempMsgs = prev.filter(m => m.info.id.startsWith('temp-'));
        
        if (tempMsgs.length === 0) {
          return realMsgs;
        }
        
        // Check if the temp message content exists in real messages
        const tempText = tempMsgs[0]?.parts?.[0]?.text;
        const hasMatchingReal = realMsgs.some((m: Message) => 
          m.info.role === 'user' && 
          m.parts?.some((p: MessagePart) => p.type === 'text' && p.text === tempText)
        );
        
        if (hasMatchingReal) {
          // Real message arrived, use real messages
          return realMsgs;
        }
        
        // Keep temp messages appended until real ones show up
        return [...realMsgs, ...tempMsgs];
      });
      
      setError(null);
      
      // Check if the last assistant message is still processing
      const lastMsg = msgs?.[msgs.length - 1];
      if (lastMsg?.info?.role === 'assistant' && !lastMsg?.info?.finish) {
        setProcessing(true);
      } else if (sending) {
        // Still waiting for OpenCode to start processing
        setProcessing(true);
      } else {
        setProcessing(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      // Don't clear messages on fetch error, just show warning
    }
  }, [id, session?.directory, sending]);

  useEffect(() => {
    if (!id) return;

    const fetchSession = async () => {
      try {
        const sessionData = await api.getSession(id);
        if (!sessionData || !sessionData.id) {
          setError('Session not found');
          setLoading(false);
          return;
        }
        setSession(sessionData);

        if (sessionData?.directory) {
          const msgs = await api.opencode.getMessages(id, sessionData.directory);
          setMessages(msgs || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch session:', err);
        setError(err.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  // Polling effect - separate from initial load
  useEffect(() => {
    if (!session?.directory) return;

    // Poll more frequently while processing
    const interval = setInterval(fetchMessages, processing ? 1500 : 3000);
    return () => clearInterval(interval);
  }, [session?.directory, processing, fetchMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sending || !session) return;

    const text = input;
    setInput('');
    setSending(true);
    setProcessing(true);

    // Optimistic update - add user message immediately
    const tempMsg: Message = {
      info: {
        id: `temp-${Date.now()}`,
        role: 'user',
        time: { created: Date.now() }
      },
      parts: [{ id: `temp-part-${Date.now()}`, type: 'text', text }]
    };
    setMessages(prev => [...prev, tempMsg]);

    // Fire off the message - this runs in background
    // OpenCode API blocks until complete, so we fire-and-forget and poll for updates
    api.opencode.sendMessage(id!, session.directory, text)
      .then(() => {
        // Message completed, fetch final state
        fetchMessages();
      })
      .catch((err) => {
        console.error('Message send error:', err);
        setError(`Failed to send message: ${err.message}`);
      })
      .finally(() => {
        setSending(false);
        setProcessing(false);
      });

    // Start polling immediately for updates
    setTimeout(fetchMessages, 300);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  const handleDeleteSession = async () => {
    if (!confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      return;
    }
    try {
      await api.deleteSession(id!);
      navigate('/sessions');
    } catch (err: any) {
      setError(`Failed to delete session: ${err.message}`);
    }
  };

  const handleCancelRequest = () => {
    // Abort the current request by stopping processing state
    // The actual request will complete in background but we stop waiting
    setSending(false);
    setProcessing(false);
    setError('Request cancelled');
  };

  const getToolIcon = (name: string) => {
    switch (name?.toLowerCase()) {
      case 'bash': return <Terminal size={14} />;
      case 'read': return <Eye size={14} />;
      case 'write': case 'edit': return <Edit3 size={14} />;
      case 'glob': return <Search size={14} />;
      case 'grep': return <Search size={14} />;
      default: return <Code size={14} />;
    }
  };

  const renderToolPart = (part: MessagePart) => {
    const isExpanded = expandedTools.has(part.id);
    const state = part.state;
    const isCompleted = state?.status === 'completed';
    const isError = state?.status === 'error';

    return (
      <div key={part.id} className="my-2 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleTool(part.id)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700/50 transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-primary">{getToolIcon(part.tool || '')}</span>
          <span className="font-mono text-gray-300">{part.tool}</span>
          {state?.title && (
            <span className="text-gray-500 truncate flex-1 ml-2 text-xs">{state.title}</span>
          )}
          {isCompleted && <span className="ml-auto text-green-400"><Check size={14} /></span>}
          {isError && <span className="ml-auto text-red-400"><X size={14} /></span>}
          {state?.status === 'pending' && <span className="ml-auto text-yellow-400"><Loader2 size={14} className="animate-spin" /></span>}
        </button>
        
        {isExpanded && (
          <div className="px-3 py-2 border-t border-gray-700 text-xs space-y-2">
            {state?.input && (
              <>
                <div className="text-gray-400">Input:</div>
                <pre className="bg-gray-900 p-2 rounded overflow-x-auto text-gray-300 max-h-32 overflow-y-auto">
                  {JSON.stringify(state.input, null, 2)}
                </pre>
              </>
            )}
            {state?.output && (
              <>
                <div className="text-gray-400 mt-2">Output:</div>
                <pre className={`p-2 rounded overflow-x-auto max-h-60 overflow-y-auto ${
                  isError ? 'bg-red-900/30 text-red-300' : 'bg-gray-900 text-gray-300'
                }`}>
                  {state.output.length > 3000 ? state.output.slice(0, 3000) + '\n...[truncated]' : state.output}
                </pre>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderReasoningPart = (part: MessagePart) => {
    const isExpanded = expandedTools.has(part.id);
    
    return (
      <div key={part.id} className="my-2 bg-purple-900/20 rounded-lg border border-purple-700/50 overflow-hidden">
        <button
          onClick={() => toggleTool(part.id)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-purple-800/20 transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Brain size={14} className="text-purple-400" />
          <span className="text-purple-300">Reasoning</span>
        </button>
        
        {isExpanded && part.text && (
          <div className="px-3 py-2 border-t border-purple-700/50 text-sm text-purple-200 prose prose-invert prose-sm max-w-none
            prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 
            prose-li:my-0.5 prose-pre:my-2 prose-code:text-purple-300 
            prose-pre:bg-purple-900/30 prose-pre:border prose-pre:border-purple-700/50
            prose-a:text-purple-300 prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {part.text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen -m-6 lg:-m-8 bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="flex items-center justify-center h-screen -m-6 lg:-m-8 bg-gray-950">
        <div className="text-center max-w-md px-4">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Session</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/sessions')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              Back to Sessions
            </button>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen -m-6 lg:-m-8 bg-gray-950">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-bold text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-6">This session may have been deleted.</p>
          <button
            onClick={() => navigate('/sessions')}
            className="px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg text-white transition-colors"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh)] -m-6 lg:-m-8 bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-800 bg-gray-900">
        <button
          onClick={() => navigate('/sessions')}
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-white truncate">{session.title || 'Untitled Session'}</h1>
          <p className="text-xs text-gray-500 font-mono truncate">{session.directory}</p>
        </div>
        {processing && (
          <button
            onClick={handleCancelRequest}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white transition-colors"
            title="Cancel current request"
          >
            <StopCircle size={16} />
            <span className="hidden sm:inline">Cancel</span>
          </button>
        )}
        <button
          onClick={handleDeleteSession}
          className="p-2 hover:bg-red-900/50 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
          title="Delete session"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-700 px-4 py-2 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-red-300 text-sm flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {messages.length === 0 && !processing && (
          <div className="text-center text-gray-500 mt-20">
            <Bot size={48} className="mx-auto mb-4 opacity-50" />
            <p>Start a conversation with OpenCode</p>
            <p className="text-sm mt-2 text-gray-600">Type a message below to begin</p>
          </div>
        )}
        
        {messages.map((msg) => {
          const isUser = msg.info.role === 'user';
          
          const visibleParts = msg.parts.filter(p => 
            p.type === 'text' || p.type === 'tool' || p.type === 'reasoning'
          );
          
          if (visibleParts.length === 0) return null;

          return (
            <div key={msg.info.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${isUser ? 'bg-primary text-white' : 'bg-gray-800 text-primary'}
              `}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`
                max-w-[85%] rounded-lg p-4 text-sm
                ${isUser 
                  ? 'bg-primary/10 border border-primary/20 text-white' 
                  : 'bg-gray-900 border border-gray-800 text-gray-300'}
              `}>
                {visibleParts.map((part) => {
                  if (part.type === 'text' && part.text) {
                    // Render markdown for assistant messages, plain text for user
                    if (isUser) {
                      return (
                        <div key={part.id} className="whitespace-pre-wrap">
                          {part.text}
                        </div>
                      );
                    }
                    return (
                      <div key={part.id} className="prose prose-invert prose-sm max-w-none 
                        prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 
                        prose-li:my-0.5 prose-pre:my-2 prose-code:text-primary 
                        prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {part.text}
                        </ReactMarkdown>
                      </div>
                    );
                  }
                  if (part.type === 'tool') {
                    return renderToolPart(part);
                  }
                  if (part.type === 'reasoning') {
                    return renderReasoningPart(part);
                  }
                  return null;
                })}
                
                {!isUser && msg.info.modelID && (
                  <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500 flex items-center gap-2">
                    <span>{msg.info.providerID}/{msg.info.modelID}</span>
                    {msg.info.tokens && (
                      <span className="ml-auto">
                        {msg.info.tokens.input + msg.info.tokens.output} tokens
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Processing indicator */}
        {processing && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-800 text-primary">
              <Bot size={16} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={20} />
              <span className="text-gray-400 text-sm">OpenCode is thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={processing ? "Waiting for response..." : "Type a message..."}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary disabled:opacity-50"
            disabled={sending || processing}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || processing}
            className="p-2 bg-primary hover:bg-primary-dark disabled:bg-gray-700 rounded-lg text-white transition-colors"
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
        {processing && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            OpenCode is processing your request. This may take a moment...
          </p>
        )}
      </div>
    </div>
  );
}
