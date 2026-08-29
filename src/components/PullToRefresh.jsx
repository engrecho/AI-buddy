import { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * PullToRefresh - 下拉刷新容器（仅移动端触屏，PC 端不响应）
 *
 * 防"页面大规模下拉 + 组件下拉刷新"冲突的三件套：
 * 1. overscroll-behavior-y: contain —— 列表在顶部继续下拉时滚动链不向页面/浏览器冒泡，
 *    禁掉手机浏览器原生下拉刷新与 iOS 橡皮筋（否则两者同时触发会打架）
 * 2. 原生 touchmove 监听（passive: false）+ 下拉时 preventDefault —— 手势完全由组件接管。
 *    React 合成事件的 touchmove 是 passive 的无法 preventDefault，必须用原生监听
 * 3. 仅当列表静止在顶部（touchstart 时 scrollTop<=0）且手指明确下滑超过 8px 才进入下拉状态，
 *    惯性滚动途中/上滑翻页时不会误触
 */
const PullToRefresh = ({ onRefresh, children, className = '', threshold = 60 }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [dragging, setDragging] = useState(false); // 是否处于拖拽中（控制过渡动画开关）
  const containerRef = useRef(null);
  // 手势状态放 ref：touchmove 高频触发，避免闭包读到过期 state
  const gesture = useRef({ startY: 0, pulling: false, acc: 0, refreshing: false });

  useEffect(() => { gesture.current.refreshing = refreshing; }, [refreshing]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullDistance(40); // 刷新期间保持指示器可见
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onStart = (e) => {
      // 仅当列表静止在顶部才允许进入下拉判定，否则视为普通滚动
      if (el.scrollTop <= 0 && !gesture.current.refreshing) {
        gesture.current.startY = e.touches[0].clientY;
        gesture.current.pulling = true;
        gesture.current.acc = 0;
      } else {
        gesture.current.pulling = false;
      }
    };

    const onMove = (e) => {
      const g = gesture.current;
      if (!g.pulling || g.refreshing) return;
      const dy = e.touches[0].clientY - g.startY;
      if (dy > 8) {
        // 手指明确下滑：接管手势，阻止浏览器原生下拉刷新/橡皮筋同时触发
        if (e.cancelable) e.preventDefault();
        if (!g.acc) setDragging(true);
        // 阻尼：位移打折且封顶，快速使劲下滑也不会把内容拽飞
        g.acc = Math.min((dy - 8) * 0.4, 90);
        setPullDistance(g.acc);
      } else if (g.acc !== 0) {
        // 手指回弹/转为上滑：立即归零，不干扰正常滚动
        g.acc = 0;
        setPullDistance(0);
      }
    };

    const onEnd = () => {
      const g = gesture.current;
      if (!g.pulling) return;
      g.pulling = false;
      if (g.acc >= threshold) {
        handleRefresh();
      } else {
        g.acc = 0;
        setPullDistance(0);
      }
      setDragging(false);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false }); // 必须 non-passive 才能 preventDefault
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [handleRefresh, threshold]);

  return (
    <div className={`relative ${className} min-h-0 overflow-hidden`}>
      {/* 下拉刷新指示器 */}
      <div
        className="absolute left-0 right-0 z-10 flex items-center justify-center transition-all duration-200 pointer-events-none"
        style={{
          height: `${refreshing ? 40 : pullDistance}px`,
          top: 0,
          opacity: pullDistance > 0 || refreshing ? Math.min(Math.max(pullDistance, 40) / 40, 1) : 0,
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-md border border-gray-100">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#5a7a00]' : 'text-gray-400'}`} />
          <span className="text-xs text-gray-500">
            {refreshing ? '刷新中…' : pullDistance >= threshold ? '松手刷新' : '下拉刷新'}
          </span>
        </div>
      </div>
      {/* 内容区 */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        style={{
          overscrollBehaviorY: 'contain', // 关键：切断滚动链，列表顶部继续下拉不触发浏览器原生手势
          WebkitOverflowScrolling: 'touch',
          transform: `translateY(${refreshing ? 40 : pullDistance}px)`,
          transition: dragging || refreshing ? 'none' : 'transform 0.25s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
