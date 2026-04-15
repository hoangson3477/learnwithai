'use client';

import { useState, useRef, useEffect } from 'react';
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';
import { useAuth } from '@/contexts/auth';
import { getAuthHeaders } from '@/lib/auth-headers';
import { RoadmapRecommendations } from '@/components/RoadmapRecommendations';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function ChatContent() {
  useAuth();
  const [topic, setTopic] = useState('Mathematics');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold">Trợ lý AI chat</h1>
        <div className="mt-4 flex gap-2">
          {['Toán học', 'Khoa học', 'Ngôn ngữ', 'Lịch sử'].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTopic(t);
                setMessages([]);
              }}
              className={`px-4 py-2 rounded ${
                topic === t
                  ? 'bg-white text-indigo-600'
                  : 'bg-indigo-500 hover:bg-indigo-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <RoadmapRecommendations compact />
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-4xl mb-4">📚</p>
              <p className="text-xl">Bắt đầu học! Hỏi tôi bất kì điều gì về {topic}</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="bg-white p-4 shadow-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Đặt một câu hỏi..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-600"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400"
          >
            {loading ? 'Đang gửi...' : 'Gửi'}
          </button>
        </div>
      </form>
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
