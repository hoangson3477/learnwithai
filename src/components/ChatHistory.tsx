'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import supabase from '@/lib/db/supabase';
import { 
  MessageSquare, 
  Clock, 
  Trash2, 
  ChevronRight,
  Plus,
  Search
} from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  topic: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface ChatHistoryProps {
  onSelectChat: (chatId: string, messages: Array<{role: string; content: string}>) => void;
  onNewChat: () => void;
  currentChatId?: string;
}

export function ChatHistory({ onSelectChat, onNewChat, currentChatId }: ChatHistoryProps) {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchChatHistory = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_history')
        .select('id, title, topic, created_at, updated_at, messages')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedChats = (data || []).map(chat => ({
        id: chat.id,
        title: chat.title || 'Cuộc trò chuyện mới',
        topic: chat.topic || 'Chung',
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        message_count: Array.isArray(chat.messages) ? chat.messages.length : 0,
      }));

      setChats(formattedChats);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const handleSelectChat = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('messages')
        .eq('id', chatId)
        .single();

      if (error) throw error;

      const messages = Array.isArray(data?.messages) ? data.messages : [];
      onSelectChat(chatId, messages);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc muốn xóa cuộc trò chuyện này?')) return;

    try {
      setDeletingId(chatId);
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setChats(prev => prev.filter(c => c.id !== chatId));
      
      if (currentChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Không thể xóa cuộc trò chuyện');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hôm qua';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('vi-VN', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
    }
  };

  const filteredChats = searchQuery.trim()
    ? chats.filter(chat => 
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.topic.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>Cuộc trò chuyện mới</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện nào'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleSelectChat(chat.id)}
                className={`w-full p-3 rounded-xl text-left transition-all duration-200 group ${
                  currentChatId === chat.id
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    currentChatId === chat.id
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-slate-800 truncate text-sm">
                        {chat.title}
                      </h4>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(chat.updated_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                        {chat.topic}
                      </span>
                      {chat.message_count && chat.message_count > 0 && (
                        <span className="text-xs text-slate-400">
                          {chat.message_count} tin nhắn
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    disabled={deletingId === chat.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-4 h-4" />
          <span>Lưu trữ 50 cuộc trò chuyện gần nhất</span>
        </div>
      </div>
    </div>
  );
}

export default ChatHistory;
