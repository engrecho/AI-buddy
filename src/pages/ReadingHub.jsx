import { useState } from 'react';
import { BookOpen, Rss } from 'lucide-react';
import ReadingPage from './ReadingPage';
import RssPage from './RssPage';

// 阅读聚合页：顶部「我的收藏 / 订阅列表」双大标签切换
export default function ReadingHub({ initialReadingId, onInitialReadingConsumed } = {}) {
  const [view, setView] = useState('reading'); // 'reading' | 'rss'

  const tabs = [
    { id: 'reading', label: '我的收藏', icon: BookOpen },
    { id: 'rss', label: '订阅列表', icon: Rss },
  ];

  return (
    <div className="h-full flex flex-col bg-[#f5f5f5] min-h-0">
      {/* 顶部双大标签 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 pt-3 pb-3">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  aria-selected={active}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold transition-all active:scale-[0.98]"
                  style={
                    active
                      ? { backgroundColor: '#5a7a00', color: '#ffffff', borderColor: '#5a7a00', boxShadow: '0 0 0 2px #bbea3b inset' }
                      : { backgroundColor: '#ffffff', color: '#6b7280', borderColor: '#e5e7eb' }
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 内容区：切换渲染收藏 / 订阅 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'reading' ? (
          <ReadingPage initialReadingId={initialReadingId} onInitialReadingConsumed={onInitialReadingConsumed} />
        ) : (
          <RssPage />
        )}
      </div>
    </div>
  );
}