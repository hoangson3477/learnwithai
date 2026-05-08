'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import { getAuthHeaders } from '@/lib/auth-headers';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';
import { ChatHistory } from '@/components/ChatHistory';
import { TypingIndicator } from '@/components/TypingIndicator';
import { BookOpen, Send, Loader2, MessageCircle, Menu, X } from 'lucide-react';
import supabase from '@/lib/db/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function ChatContent() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('Mathematics');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSelectChat = useCallback((chatId: string, chatMessages: Array<{role: string; content: string}>) => {
    setCurrentChatId(chatId);
    const formatted = chatMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));
    setMessages(formatted);
    // On mobile, hide sidebar after selecting
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentChatId(undefined);
    setMessages([]);
    setInput('');
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ 
          message: input, 
          topic,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage: Message = {
          role: 'assistant',
          content: data.error || 'Có lỗi xảy ra. Vui lòng thử lại sau.',
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        // If this is first message, create chat history entry
        if (messages.length === 0 && user?.id) {
          const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
          supabase.from('chat_history').insert({
            user_id: user.id,
            topic,
            title,
            messages: [...messages, userMessage, assistantMessage],
          }).select('id').single().then(({ data, error }) => {
            if (data?.id) setCurrentChatId(data.id);
            if (error) console.error('Error saving chat:', error);
          });
        } else if (currentChatId) {
          // Update existing chat
          supabase.from('chat_history').update({
            messages: [...messages, userMessage, assistantMessage],
            updated_at: new Date().toISOString(),
          }).eq('id', currentChatId);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Có lỗi kết nối. Vui lòng thử lại.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <ChatHistory 
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          currentChatId={currentChatId}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Trợ lý AI chat</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['Toán học', 'Khoa học', 'Ngôn ngữ', 'Lịch sử'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTopic(t);
                  handleNewChat();
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  topic === t
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="max-w-4xl mx-auto">
            <RoadmapRecommendations compact />
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center py-12">
                <div className="text-center text-slate-500">
                  <div className="p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl w-fit mx-auto mb-4">
                    <BookOpen className="w-16 h-16 text-indigo-500" />
                  </div>
                  <p className="text-xl font-medium text-slate-700">Bắt đầu học!</p>
                  <p className="text-slate-500 mt-1">Hỏi tôi bất kì điều gì về {topic}</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-5 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                      : 'bg-white text-slate-800 shadow-sm border border-slate-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Đặt một câu hỏi..."
              className="flex-1 px-5 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span>Gửi</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedPageWrapper>
      <ChatContent />
    </ProtectedPageWrapper>
  );
}
