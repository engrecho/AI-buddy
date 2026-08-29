import { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * PullToRefresh - 下拉刷新容器
 * 仅移动端触屏有效：手指在列表顶部下拉触发刷新。
 * PC 端不做鼠标拖拽触发（滚轮/刷新按钮即可），避免点击、框选文字时内容被顶下去导致滚动异常。
 */
const PullToRefresh = ({ onRefresh, children, className = '', threshold = 60 }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);
  const isPulling = useRef(false);
  const pullAccRef = useRef(0);

  const reset = useCallback(() => {
    setPullDistance(0);
    pullAccRef.current = 0;
    isPulling.current = false;
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullDistance(40); // 保持指示器可见
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  const handleTouchStart = (e) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current || refreshing) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 10) {
      // 阻尼效果
      pullAccRef.current = Math.min(dy * 0.4, 100);
      setPullDistance(pullAccRef.current);
    } else if (pullAccRef.current !== 0) {
      // 手指回弹/上滑时同步归零，避免指示器卡住
      pullAccRef.current = 0;
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullAccRef.current >= threshold) {
      handleRefresh();
    } else {
      reset();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* 下拉刷新指示器 */}
      <div
        className="absolute left-0 right-0 z-10 flex items-center justify-center transition-all duration-200 pointer-events-none"
        style={{
          height: `${pullDistance}px`,
          top: 0,
          opacity: pullDistance > 0 ? Math.min(pullDistance / 40, 1) : 0,
        }}
      >
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-md border border-gray-100 ${refreshing ? '' : ''}`}>
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
          transform: `translateY(${refreshing ? 40 : pullDistance}px)`,
          transition: isPulling.current || refreshing ? 'none' : 'transform 0.25s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
