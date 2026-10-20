import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorLayout from '../../components/CreatorLayout';
import { Clock, Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPostsByCreator } from '../../lib/db';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Scheduling: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const creatorPosts = await getPostsByCreator(user.id);
        setPosts(creatorPosts || []);
      } catch (err) {
        console.error('Error fetching creator posts for calendar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [user?.id]);

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Map posts to day numbers in the currently displayed month & year
  const postsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    posts.forEach(post => {
      const d = new Date(post.created_at || post.scheduled_for || Date.now());
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(post);
      }
    });
    return map;
  }, [posts, currentYear, currentMonth]);

  // Total grid cells (leading blanks + days in month)
  const totalSlots = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1 flex items-center gap-2">
            Content Calendar <Sparkles className="w-6 h-6 text-red-500" />
          </h1>
          <p className="text-zinc-400 text-sm">
            View your published timeline and scheduled drops for subscribers.
          </p>
        </div>
        <button
          onClick={() => navigate('/feed')}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" /> Create New Post
        </button>
      </div>

      <div className="bg-[#0D0E12] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
        {/* Navigation Bar */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            {MONTH_NAMES[currentMonth]} {currentYear}
            {loading && <Loader2 className="w-4 h-4 animate-spin text-red-500 ml-1" />}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 border border-zinc-800 rounded-xl bg-[#0D0E12] hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3.5 py-2 border border-zinc-800 rounded-xl bg-[#0D0E12] hover:bg-zinc-800 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 border border-zinc-800 rounded-xl bg-[#0D0E12] hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/80">
          {DAYS_OF_WEEK.map(day => (
            <div
              key={day}
              className="py-3 text-center text-xs font-black uppercase tracking-wider text-zinc-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 divide-y divide-x divide-zinc-800/80 bg-zinc-950/20">
          {Array.from({ length: totalSlots }).map((_, index) => {
            const dayNum = index - firstDayIndex + 1;
            const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
            const isToday =
              isCurrentMonth &&
              dayNum === today.getDate() &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear();

            const dayPosts = isCurrentMonth ? postsByDay[dayNum] || [] : [];

            return (
              <div
                key={index}
                className={`min-h-[110px] p-2 sm:p-2.5 flex flex-col transition-colors ${
                  !isCurrentMonth
                    ? 'bg-zinc-950/40 opacity-30 cursor-default'
                    : 'bg-[#0D0E12]/40 hover:bg-zinc-900/40 cursor-pointer'
                }`}
                onClick={() => {
                  if (isCurrentMonth) navigate('/feed');
                }}
              >
                {/* Date indicator */}
                <div
                  className={`text-xs font-black self-end mb-1.5 transition-all ${
                    isToday
                      ? 'bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-md'
                      : isCurrentMonth
                      ? 'text-zinc-400'
                      : 'text-zinc-700'
                  }`}
                >
                  {isCurrentMonth ? dayNum : ''}
                </div>

                {/* Real Posts Rendered On Day */}
                {isCurrentMonth && dayPosts.length > 0 && (
                  <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-hide">
                    {dayPosts.map((post: any, pIdx: number) => {
                      const isLocked = post.is_locked || post.visibility === 'ppv';
                      return (
                        <div
                          key={post.id || pIdx}
                          className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg truncate flex items-center gap-1.5 transition-colors"
                          title={post.caption || 'Post'}
                        >
                          {isLocked ? (
                            <Clock className="w-3 h-3 text-red-400 shrink-0" />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-red-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {post.caption ? post.caption.slice(0, 20) : (isLocked ? 'PPV Drop' : 'Post')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </CreatorLayout>
  );
};

export default Scheduling;
