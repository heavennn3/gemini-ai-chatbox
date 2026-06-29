import React, { useState, useRef, useEffect } from "react";
import {
    Send, Sparkles, X, Loader2, Plus, Trash2, Edit2, Check, Copy, Menu, MessageSquare, RefreshCw, User, ChevronRight
} from "lucide-react";

// Code block sub-component with copy button
interface CodeBlockProps {
    language: string;
    code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3.5 rounded-lg overflow-hidden border border-slate-800 shadow-md font-sans">
            <div className="flex justify-between items-center px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-mono select-none">
                <span>{language || "code"}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                    {copied ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Copied!
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <Copy className="h-3 w-3" /> Copy
                        </span>
                    )}
                </button>
            </div>
            <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed custom-scrollbar">
                <code>{code.trim()}</code>
            </pre>
        </div>
    );
};

interface Message {
    text: string;
    isUser: boolean;
    timestamp: string;
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: string;
}

const AIAssistant = () => {
    // Session state
    const [sessions, setSessions] = useState<ChatSession[]>(() => {
        try {
            const saved = localStorage.getItem("gemini_chat_sessions");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) { }
        const initialId = "session_" + Date.now();
        return [{
            id: initialId,
            title: "New Conversation",
            messages: [],
            createdAt: new Date().toISOString()
        }];
    });

    const [activeSessionId, setActiveSessionId] = useState<string>(() => {
        try {
            const saved = localStorage.getItem("gemini_active_session_id");
            if (saved) return saved;
        } catch (e) { }
        return sessions[0]?.id || "";
    });

    // Inputs and basic UI state
    const [input, setInput] = useState<string>("");
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

    // Inline renaming inputs
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitleInput, setEditTitleInput] = useState<string>("");

    // Toast
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync with local storage
    useEffect(() => {
        localStorage.setItem("gemini_chat_sessions", JSON.stringify(sessions));
    }, [sessions]);

    useEffect(() => {
        localStorage.setItem("gemini_active_session_id", activeSessionId);
    }, [activeSessionId]);

    // Keep at least one active chat session
    useEffect(() => {
        if (sessions.length === 0) {
            const newId = "session_" + Date.now();
            setSessions([{
                id: newId,
                title: "New Conversation",
                messages: [],
                createdAt: new Date().toISOString()
            }]);
            setActiveSessionId(newId);
        }
    }, [sessions]);

    // Handle scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [sessions, activeSessionId, isTyping]);

    // Auto resize input area
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
    }, [input]);

    const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
    const messages = activeSession ? activeSession.messages : [];

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    // Chat operations
    const createNewSession = () => {
        const newId = "session_" + Date.now();
        const newSession: ChatSession = {
            id: newId,
            title: "New Conversation",
            messages: [],
            createdAt: new Date().toISOString()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newId);
        showToast("New chat started");
        setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const deleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const filtered = sessions.filter(s => s.id !== id);
        setSessions(filtered);
        if (activeSessionId === id && filtered.length > 0) {
            setActiveSessionId(filtered[0].id);
        }
        showToast("Chat thread deleted");
    };

    const startRenaming = (id: string, title: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSessionId(id);
        setEditTitleInput(title);
    };

    const saveRename = (id: string) => {
        if (editTitleInput.trim() !== "") {
            setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitleInput.trim() } : s));
        }
        setEditingSessionId(null);
    };

    const clearAllSessions = () => {
        if (window.confirm("Delete all conversation history?")) {
            setSessions([]);
            showToast("History deleted");
        }
    };

    const clearCurrentChat = () => {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s));
        showToast("Conversation cleared");
    };

    // Send user message
    const handleSendMessage = async (customText?: string) => {
        const textToSend = customText || input;
        if (textToSend.trim() === "") return;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                let updatedTitle = s.title;
                if (s.messages.length === 0) {
                    const text = textToSend.trim();
                    updatedTitle = text.length > 22 ? text.substring(0, 20) + "..." : text;
                }
                return {
                    ...s,
                    title: updatedTitle,
                    messages: [...s.messages, { text: textToSend, isUser: true, timestamp }]
                };
            }
            return s;
        }));

        setInput("");
        setIsTyping(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: textToSend,
                }),
            });

            const data = await res.json();
            const aiTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                    return {
                        ...s,
                        messages: [...s.messages, { text: data.reply, isUser: false, timestamp: aiTimestamp }]
                    };
                }
                return s;
            }));
        } catch (err) {
            const errTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                    return {
                        ...s,
                        messages: [...s.messages, {
                            text: "Error: Unable to get response from Gemini API.",
                            isUser: false,
                            timestamp: errTimestamp
                        }]
                    };
                }
                return s;
            }));
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const copyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast("Copied to clipboard");
    };

    // Markdown content parsing
    const parseMarkdown = (text: string) => {
        if (!text) return "";
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            const matchIndex = match.index;
            if (matchIndex > lastIndex) {
                parts.push(renderInlineMarkdown(text.substring(lastIndex, matchIndex), parts.length));
            }
            parts.push(
                <CodeBlock key={parts.length} language={match[1] || "code"} code={match[2]} />
            );
            lastIndex = codeBlockRegex.lastIndex;
        }

        if (lastIndex < text.length) {
            parts.push(renderInlineMarkdown(text.substring(lastIndex), parts.length));
        }

        return parts;
    };

    const renderInlineMarkdown = (text: string, keyPrefix: number) => {
        const lines = text.split("\n");
        return (
            <div key={keyPrefix} className="space-y-1.5 leading-relaxed break-words text-sm md:text-[15px]">
                {lines.map((line, idx) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                        return (
                            <ul key={idx} className="list-disc pl-5 my-1 text-slate-300">
                                <li className="py-0.5">{renderTextDecorations(trimmed.substring(2))}</li>
                            </ul>
                        );
                    }
                    const numListMatch = trimmed.match(/^(\d+)\.\s(.*)/);
                    if (numListMatch) {
                        return (
                            <ol key={idx} className="list-decimal pl-5 my-1 text-slate-300" start={parseInt(numListMatch[1])}>
                                <li className="py-0.5">{renderTextDecorations(numListMatch[2])}</li>
                            </ol>
                        );
                    }

                    if (trimmed === "") {
                        return <div key={idx} className="h-1.5" />;
                    }

                    return <p key={idx} className="text-slate-300">{renderTextDecorations(line)}</p>;
                })}
            </div>
        );
    };

    const renderTextDecorations = (line: string) => {
        const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
        return parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("`") && part.endsWith("`")) {
                return <code key={i} className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-350 font-mono text-[13px] border border-white/5">{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    const suggestions = [
        "Explain React Server Components vs Client Components.",
        "Write a clean TypeScript debounce utility function.",
        "Draft a friendly email asking for feedback on a project.",
        "Suggest five healthy, office-friendly snacks for energy."
    ];

    return (
        <div className="w-full h-screen bg-[#0b0f19] flex overflow-hidden font-sans relative text-slate-100 select-none">
            {/* COLLAPSIBLE SIDEBAR */}
            <div
                className={`w-72 flex-shrink-0 border-r border-slate-800 bg-[#0f172a] flex flex-col h-full z-30 transition-transform duration-200
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:w-0 lg:border-r-0 lg:overflow-hidden lg:opacity-0"}
                    fixed lg:relative inset-y-0 left-0`}
            >
                {/* Sidebar Header */}
                <div className="p-4 flex items-center justify-between border-b border-slate-850">
                    <div className="flex items-center space-x-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                        <span className="text-white font-semibold text-sm tracking-wide">
                            AI ChatBox
                        </span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="p-3">
                    <button
                        onClick={createNewSession}
                        className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-650 text-white font-medium text-xs md:text-sm transition-all duration-150 shadow-sm"
                    >
                        <Plus className="h-4 w-4 text-indigo-400" />
                        <span>New Chat</span>
                    </button>
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 custom-scrollbar">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                        Recent Chats
                    </div>
                    {sessions.map((s) => {
                        const isActive = s.id === activeSessionId;
                        const isEditing = editingSessionId === s.id;

                        return (
                            <div
                                key={s.id}
                                onClick={() => {
                                    if (!isEditing) {
                                        setActiveSessionId(s.id);
                                        if (window.innerWidth < 1024) {
                                            setSidebarOpen(false);
                                        }
                                    }
                                }}
                                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer border
                                    ${isActive
                                        ? "bg-slate-800/60 text-white border-slate-700/40 font-medium"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20 border-transparent"
                                    }`}
                            >
                                <div className="flex items-center space-x-2 overflow-hidden flex-1 select-none">
                                    <MessageSquare className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-455"}`} />
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editTitleInput}
                                            onChange={(e) => setEditTitleInput(e.target.value)}
                                            onBlur={() => saveRename(s.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") saveRename(s.id);
                                                if (e.key === "Escape") setEditingSessionId(null);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="bg-slate-900 text-white text-xs border border-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="truncate text-xs md:text-[13px]">{s.title}</span>
                                    )}
                                </div>

                                {!isEditing && (
                                    <div className="flex space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
                                        <button
                                            type="button"
                                            onClick={(e) => startRenaming(s.id, s.title, e)}
                                            className="text-slate-500 hover:text-white p-0.5 rounded hover:bg-slate-700/50"
                                            title="Rename chat"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => deleteSession(s.id, e)}
                                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded hover:bg-slate-700/50"
                                            title="Delete chat"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-slate-800/80 bg-slate-950/20 flex flex-col space-y-2">
                    <button
                        onClick={clearAllSessions}
                        className="w-full flex items-center space-x-2 py-1 px-2.5 rounded text-xs text-slate-500 hover:text-rose-400 transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Clear chat history</span>
                    </button>
                </div>
            </div>

            {/* MAIN CHAT WINDOW */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden select-text">
                {/* Header bar */}
                <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800 bg-[#0c1220] z-20">
                    <div className="flex items-center space-x-2.5">
                        {!sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800/60 rounded mr-1 transition-colors"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        )}
                        <h2 className="text-white font-medium text-sm md:text-[15px] truncate max-w-[180px] md:max-w-md">
                            {activeSession ? activeSession.title : "Gemini ChatBox"}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-3.5">
                        {/* Status bar */}
                        <div className="flex items-center space-x-1.5 py-1 px-2.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            <Sparkles className="h-3 w-3 text-indigo-400" />
                            <span className="hidden sm:inline">Gemini API Active</span>
                        </div>

                        <button
                            onClick={clearCurrentChat}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title="Clear conversation"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-32">
                    {messages.length === 0 ? (
                        /* Simple welcome layout */
                        <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60%] text-center px-4 py-8">
                            <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-2xl shadow-md mb-5">
                                <Sparkles className="h-8 w-8 text-indigo-400" />
                            </div>

                            <h3 className="text-white text-xl font-bold mb-1.5">
                                Welcome to AI ChatBox
                            </h3>
                            <p className="text-slate-400 text-xs md:text-sm max-w-sm mb-8 leading-relaxed">
                                What can i help you today ?
                            </p>

                            {/* Suggestions */}
                            <div className="grid grid-cols-1 gap-2.5 w-full text-left max-w-md">
                                {suggestions.map((sug, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSendMessage(sug)}
                                        className="p-3 text-xs md:text-sm rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white text-left transition-all duration-150 group flex items-center justify-between animate-fade-in"
                                    >
                                        <span className="font-medium truncate pr-2">{sug}</span>
                                        <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Conversations Feed */
                        <div className="max-w-2xl mx-auto space-y-5">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex space-x-3 ${msg.isUser ? "justify-end" : "justify-start"} animate-fade-in group`}
                                >
                                    {/* AI Avatar */}
                                    {!msg.isUser && (
                                        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                    )}

                                    {/* Bubble */}
                                    <div className="flex flex-col space-y-1 max-w-[85%] relative">
                                        <div
                                            className={`p-3.5 rounded-2xl shadow-sm leading-relaxed ${msg.isUser
                                                ? "bg-indigo-600/20 border border-indigo-500/35 text-indigo-50 rounded-tr-none"
                                                : "bg-slate-900/60 border border-slate-800/80 text-slate-100 rounded-tl-none"
                                                }`}
                                        >
                                            {msg.isUser ? (
                                                <p className="text-sm md:text-[15px] whitespace-pre-wrap font-medium">{msg.text}</p>
                                            ) : (
                                                <div className="markdown-body font-sans">
                                                    {parseMarkdown(msg.text)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions & Meta */}
                                        <div className="flex items-center space-x-3 text-[10px] text-slate-500 px-1 select-none justify-between">
                                            <span>{msg.timestamp}</span>

                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                                <button
                                                    onClick={() => copyMessage(msg.text)}
                                                    className="hover:text-white p-0.5 rounded transition-colors animate-fade-in"
                                                    title="Copy text"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Avatar */}
                                    {msg.isUser && (
                                        <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 border border-slate-700 flex-shrink-0 shadow-sm">
                                            <User className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Typing Indicator */}
                            {isTyping && (
                                <div className="flex space-x-3 justify-start animate-fade-in">
                                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col space-y-1">
                                        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/85 rounded-tl-none shadow-sm flex items-center space-x-1 px-3.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* BOTTOM FLOATING INPUT CONTROLS */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/90 to-transparent p-4 md:p-6 z-10">
                    <div className="max-w-2xl mx-auto relative">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            className={`flex border rounded-2xl shadow-lg transition-all duration-200 overflow-hidden bg-slate-900/70 items-end px-3 py-2
                                ${isFocused
                                    ? "border-indigo-500/50 ring-1 ring-indigo-500/10 bg-slate-900"
                                    : "border-slate-800"
                                }`}
                        >
                            {/* Textarea Input */}
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                rows={1}
                                className="flex-1 max-h-[180px] min-h-[36px] py-1.5 px-2 bg-transparent text-white placeholder:text-slate-500 focus:outline-none resize-none text-[14px] md:text-[15px] font-sans custom-scrollbar"
                            />

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={input.trim() === ""}
                                className={`p-2 rounded-xl ml-1.5 transition-all flex items-center justify-center flex-shrink-0
                                    ${input.trim() === ""
                                        ? "text-slate-600 bg-transparent cursor-not-allowed"
                                        : "text-white bg-indigo-600 hover:bg-indigo-500 hover:scale-105 shadow-md active:scale-95"
                                    }`}
                                title="Send Message"
                            >
                                {isTyping ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* TOAST ALERTS */}
            {toastMessage && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 shadow-2xl py-2 px-3.5 rounded-xl flex items-center space-x-1.5 animate-slide-up select-none">
                    <Check className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-white text-xs font-medium">{toastMessage}</span>
                </div>
            )}

            {/* STYLE TAG - isolated keyframes & custom scrollbar */}
            <style>
                {`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes slide-up {
                    from { opacity: 0; transform: translate(-50%, 10px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
                
                .animate-slide-up {
                    animation: slide-up 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                /* Custom scrollbars */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.25);
                }
                
                .markdown-body ul {
                    list-style-type: disc !important;
                }
                .markdown-body ol {
                    list-style-type: decimal !important;
                }
                `}
            </style>
        </div>
    );
};

export default AIAssistant;
