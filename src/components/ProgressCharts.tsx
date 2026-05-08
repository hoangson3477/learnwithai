'use client';

import { useState, useEffect } from 'react';
import supabase from '@/lib/db/supabase';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  BookOpen,
  Award,
  Activity
} from 'lucide-react';

interface ChartData {
  date: string;
  studyMinutes: number;
  quizzesCompleted: number;
  lessonsCompleted: number;
  xpGained: number;
}

interface TopicData {
  name: string;
  value: number;
  color: string;
}

interface WeeklyData {
  day: string;
  minutes: number;
  activities: number;
}

export function ProgressCharts() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topicData, setTopicData] = useState<TopicData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  useEffect(() => {
    fetchProgressData();
  }, [user?.id, timeRange]);

  const fetchProgressData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get learning events for the time range
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }

      const { data: events } = await supabase
        .from('learning_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (events) {
        // Process data for charts
        const processedData = processChartData(events);
        setChartData(processedData);

        // Process topic distribution
        const topics = processTopicData(events);
        setTopicData(topics);

        // Process weekly data
        if (timeRange === 'week') {
          const weekly = processWeeklyData(events);
          setWeeklyData(weekly);
        }
      }

    } catch (error) {
      logger.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (events: any[]): ChartData[] => {
    const grouped = events.reduce((acc: Record<string, ChartData>, event: any) => {
      const date = new Date(event.created_at).toLocaleDateString('vi-VN');
      if (!acc[date]) {
        acc[date] = {
          date,
          studyMinutes: 0,
          quizzesCompleted: 0,
          lessonsCompleted: 0,
          xpGained: 0,
        };
      }

      switch (event.event_type) {
        case 'lesson_completion':
          acc[date].lessonsCompleted += 1;
          acc[date].xpGained += 15;
          break;
        case 'quiz_completion':
          acc[date].quizzesCompleted += 1;
          acc[date].xpGained += 20;
          break;
        case 'study_session':
          acc[date].studyMinutes += event.metadata?.duration || 30;
          acc[date].xpGained += 5;
          break;
      }

      return acc;
    }, {} as Record<string, ChartData>);

    return Object.values(grouped);
  };

  const processTopicData = (events: any[]): TopicData[] => {
    const topicCounts = events.reduce((acc: Record<string, number>, event: any) => {
      const topic = event.metadata?.topic || 'Khác';
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(topicCounts)
      .map(([name, value]) => ({
        name,
        value,
        color: COLORS[Object.keys(topicCounts).indexOf(name) % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const processWeeklyData = (events: any[]): WeeklyData[] => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date().getDay();
    
    return days.map((day, index) => {
      const dayEvents = events.filter((event: any) => {
        const eventDay = new Date(event.created_at).getDay();
        return eventDay === index;
      });

      return {
        day,
        minutes: dayEvents.reduce((sum: number, e: any) => sum + (e.metadata?.duration || 30), 0),
        activities: dayEvents.length,
      };
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
          <div className="h-64 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Activity className="w-6 h-6 text-indigo-600" />
          <span>Phân tích tiến độ</span>
        </h2>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {range === 'week' ? '7 ngày' : range === 'month' ? '30 ngày' : '1 năm'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Progress Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <span>Hoạt động học tập</span>
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="studyMinutes" fill="#6366f1" name="Phút học" radius={[8, 8, 0, 0]} />
            <Bar dataKey="quizzesCompleted" fill="#10b981" name="Quiz hoàn thành" radius={[8, 8, 0, 0]} />
            <Bar dataKey="lessonsCompleted" fill="#8b5cf6" name="Bài học hoàn thành" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Topic Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            <span>Phân bổ chủ đề</span>
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={topicData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {topicData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Activity */}
        {timeRange === 'week' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Hoạt động tuần này</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Phút học"
                />
                <Line 
                  type="monotone" 
                  dataKey="activities" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  name="Hoạt động"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {chartData.reduce((sum, d) => sum + d.studyMinutes, 0)}
              </p>
              <p className="text-slate-600 text-sm">Phút học</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {chartData.reduce((sum, d) => sum + d.lessonsCompleted, 0)}
              </p>
              <p className="text-slate-600 text-sm">Bài học hoàn thành</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {chartData.reduce((sum, d) => sum + d.quizzesCompleted, 0)}
              </p>
              <p className="text-slate-600 text-sm">Quiz hoàn thành</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Award className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {chartData.reduce((sum, d) => sum + d.xpGained, 0)}
              </p>
              <p className="text-slate-600 text-sm">XP kiếm được</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressCharts;
