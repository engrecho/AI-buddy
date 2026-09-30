import { useState, useEffect } from "react";
import { CheckSquare, FileText, Zap, BookOpen, ArrowRight, Circle, Loader2, CheckCircle2, Wallet, Shield, AlertCircle, AlertTriangle, Heart, Lock, Settings, Bot, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PullToRefresh from "@/components/PullToRefresh";

const STATUS_ICON = {
  todo: <Circle className="h-3.5 w-3.5 text-gray-400" />,
  in_progress: <Loader2 className="h-3.5 w-3.5 text-blue-500" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
};
const STATUS_LABEL = { todo: "待办", in_progress: "进行中", done: "已完成" };

const GREEN = "#5a7a00";
const GREEN_DARK = "#2d4a00";
const DAY = 86400000;

// ── 功能宫格（覆盖产品当前全部模块） ──────────────────────────
const FEATURE_GRID = [
  { id: "tasks", label: "任务", icon: CheckSquare, statKey: "tasks" },
  { id: "memos", label: "备忘", icon: FileText, statKey: "memos" },
  { id: "reading", label: "阅读", icon: BookOpen, statKey: "reading" },
  { id: "quicknotes", label: "随记", icon: Zap, statKey: "notes" },
  { id: "health", label: "健康", icon: Heart, statKey: null },
  { id: "finance", label: "财务", icon: Wallet, statKey: null },
  { id: "vault", label: "保险箱", icon: Lock, statKey: null },
  { id: "settings", label: "设置", icon: Settings, statKey: null },
];

const fmtMoney = (n) =>
  `¥${(Number(n) || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMD = (iso) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

const startOfToday = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

// 相对今天的天数差：负数=已过期，正数=还剩 N 天
const daysFromToday = (iso) => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - startOfToday()) / DAY);
};

const relTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}天前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
};

const DashboardPage = ({ onNavigate, onOpenSettings }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tasks: 0, memos: 0, notes: 0, reading: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [insuranceSummary, setInsuranceSummary] = useState(null);
  const [skillInfo, setSkillInfo] = useState(null);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [t, m, n, r, rt, rn] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact" }).eq("status", "todo"),
        supabase.from("memos").select("id", { count: "exact" }),
        supabase.from("quick_notes").select("id", { count: "exact" }),
        supabase.from("reading_items").select("id", { count: "exact" }).eq("is_read", false),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("quick_notes").select("*").order("created_at", { ascending: false }).limit(3),
      ]);
      setStats({ tasks: t.count || 0, memos: m.count || 0, notes: n.count || 0, reading: r.count || 0 });
      setRecentTasks(rt.data || []);
      setRecentNotes(rn.data || []);
    } finally {
      setLoading(false);
    }
    // 并行加载财务/保险汇总、SKILL 版本（不阻塞主统计）
    try {
      const token = localStorage.getItem("ai_buddy_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [loanRes, insRes, skillRes] = await Promise.all([
        fetch("/api/loans/summary", { headers }).then((r) => r.json()).catch(() => null),
        fetch("/api/insurances/summary", { headers }).then((r) => r.json()).catch(() => null),
        fetch("/api/skill/info", { headers }).then((r) => r.json()).catch(() => null),
      ]);
      setFinanceSummary(loanRes?.data || null);
      setInsuranceSummary(insRes?.data || null);
      setSkillInfo(skillRes?.data || null);
    } catch {}
  };

  // —— 派生数据 ——
  const overdue = financeSummary?.overdue_payments || [];
  const overdueCount = financeSummary?.overdue_count || 0;
  const overdueTotal = financeSummary?.overdue_total || 0;
  const dueSoon = financeSummary?.upcoming_payments || [];
  const insSoon = insuranceSummary?.upcoming_expirations || [];
  const hasUrgent = overdueCount > 0 || insSoon.length > 0;

  const nextLoan = dueSoon[0] || (financeSummary?.month_payments || [])[0] || null;
  const nextIns = insSoon[0] || (insuranceSummary?.month_due || [])[0] || null;

  // —— 动态问候摘要 ——
  let heroPrimary;
  if (overdueCount > 0) {
    heroPrimary = `⚠️ 有 ${overdueCount} 笔贷款已逾期 ${fmtMoney(overdueTotal)}，请优先处理`;
  } else if (dueSoon.length > 0) {
    heroPrimary = `本月有 ${financeSummary?.month_count || 0} 笔贷款待还，近期请留意资金安排`;
  } else if (insSoon.length > 0) {
    heroPrimary = `${insSoon.length} 份保单即将到期，记得及时续保`;
  } else {
    heroPrimary = "今天没有逾期和临期事项，状态良好 🎉";
  }
  const nickname = user?.nickname || user?.username || "";

  const statFor = (statKey) => {
    if (!statKey || loading) return null;
    const v = stats[statKey];
    return typeof v === "number" ? v : null;
  };

  const Skeleton = ({ h = "h-4", w = "w-full", className = "" }) => (
    <div className={`${h} ${w} bg-gray-100 rounded animate-pulse ${className}`} />
  );

  const handleGridClick = (id) => {
    if (id === "settings") {
      onOpenSettings?.();
    } else {
      onNavigate(id);
    }
  };

  return (
    <PullToRefresh onRefresh={fetchStats} className="h-full">
      <div className="min-h-full bg-[#f5f5f5]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-4">

          {/* 1. 智能问候 Hero */}
          <div
            className="rounded-2xl px-5 py-5 md:py-6 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #bbea3b 0%, #d4f56a 60%, #e8fca0 100%)" }}
          >
            <p className="text-xs" style={{ color: "#4a6800" }}>
              {new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="text-xl font-bold mt-0.5" style={{ color: GREEN_DARK }}>
              {greeting()}{nickname ? `，${nickname}` : ""}
            </h2>
            <p className="text-sm font-medium mt-2 leading-relaxed" style={{ color: "#3a5500" }}>{heroPrimary}</p>
          </div>

          {/* 2. 紧急提醒（仅当有过期/临期） */}
          {hasUrgent && (
            <div className="space-y-3">
              {overdueCount > 0 && (
                <div className="bg-white rounded-xl border border-red-200 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-50">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    </span>
                    <span className="text-sm font-semibold text-red-600">贷款已逾期</span>
                    <span className="ml-auto text-xs text-red-400">{overdueCount} 笔 · 合计 {fmtMoney(overdueTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {overdue.slice(0, 2).map((p, i) => (
                      <button key={i} onClick={() => onNavigate("finance")}
                        className="w-full flex items-center gap-2 text-left">
                        <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{p.loan_name}</span>
                        <span className="text-sm font-semibold text-red-600">{fmtMoney(p.due_amount)}</span>
                        <span className="text-xs text-red-400 whitespace-nowrap">逾期 {Math.abs(daysFromToday(p.due_date))} 天</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {insSoon.length > 0 && (
                <div className="bg-white rounded-xl border border-orange-200 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-50">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                    </span>
                    <span className="text-sm font-semibold text-orange-600">保单即将到期</span>
                    <span className="ml-auto text-xs text-orange-400">{insSoon.length} 份</span>
                  </div>
                  <div className="space-y-2">
                    {insSoon.slice(0, 2).map((ins, i) => (
                      <button key={i} onClick={() => onNavigate("health")}
                        className="w-full flex items-center gap-2 text-left">
                        <span className="flex-1 min-w-0 truncate text-sm text-gray-700">{ins.name}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{fmtMD(ins.expiry_date)}</span>
                        <span className="text-xs text-orange-500 whitespace-nowrap">剩 {daysFromToday(ins.expiry_date)} 天</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. 功能宫格（全部模块入口 + 实时计数） */}
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="grid grid-cols-4 gap-1">
              {FEATURE_GRID.map(({ id, label, icon: Icon, statKey }) => {
                const count = statFor(statKey);
                return (
                  <button key={id} onClick={() => handleGridClick(id)}
                    className="relative flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-gray-50/70 active:scale-[0.96] transition-all">
                    <div className="relative">
                      <Icon className="w-5 h-5" style={{ color: GREEN }} />
                      {count !== null && count > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-600">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 今日资金 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button onClick={() => onNavigate("finance")}
              className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md active:scale-[0.99] transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4" style={{ color: GREEN }} />
                <span className="text-sm font-medium text-gray-800">本月待还</span>
                <span className="ml-auto text-lg font-bold" style={{ color: GREEN_DARK }}>
                  {loading ? "—" : fmtMoney(financeSummary?.month_total || 0)}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {loading ? "加载中…" : `${financeSummary?.month_count || 0} 笔贷款待还`}
              </div>
              {nextLoan && (
                <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: GREEN }}>
                  <AlertCircle className="w-3 h-3" />
                  下一笔 {fmtMD(nextLoan.due_date)} · {fmtMoney(nextLoan.due_amount)}
                </div>
              )}
            </button>

            <button onClick={() => onNavigate("health")}
              className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md active:scale-[0.99] transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4" style={{ color: GREEN }} />
                <span className="text-sm font-medium text-gray-800">本月待缴保费</span>
                <span className="ml-auto text-lg font-bold" style={{ color: GREEN_DARK }}>
                  {loading ? "—" : fmtMoney(insuranceSummary?.month_total || 0)}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {loading ? "加载中…" : `${insuranceSummary?.month_count || 0} 份保单待续保`}
              </div>
              {nextIns && (
                <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: GREEN }}>
                  <AlertCircle className="w-3 h-3" />
                  最近到期 {fmtMD(nextIns.expiry_date)}
                </div>
              )}
            </button>
          </div>

          {/* 5. 我的待办 + 最近随记 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 我的待办 */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-900">我的待办</span>
                <button onClick={() => onNavigate("tasks")}
                  className="flex items-center gap-0.5 text-xs hover:opacity-80 transition-opacity" style={{ color: GREEN }}>
                  全部 <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {loading ? (
                <div className="px-4 py-3 space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} h="h-8" />)}
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">暂无待办，享受当下 🎉</div>
              ) : (
                <div>
                  {recentTasks.map((task, i) => (
                    <div key={task.id}
                      className={`flex items-center gap-3 px-4 py-3 ${i < recentTasks.length - 1 ? "border-b border-gray-50" : ""}`}>
                      {STATUS_ICON[task.status] || STATUS_ICON.todo}
                      <span className="flex-1 text-sm text-gray-800 truncate">{task.title}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{relTime(task.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 最近随记 */}
            <div className="bg-white rounded-xl border border-gray-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-900">最近随记</span>
                <button onClick={() => onNavigate("quicknotes")}
                  className="flex items-center gap-0.5 text-xs hover:opacity-80 transition-opacity" style={{ color: GREEN }}>
                  全部 <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {loading ? (
                <div className="px-4 py-3 space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} h="h-12" />)}
                </div>
              ) : recentNotes.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">还没有随记</div>
              ) : (
                <div>
                  {recentNotes.map((note, i) => (
                    <div key={note.id}
                      className={`px-4 py-3 ${i < recentNotes.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <p className="text-sm text-gray-700 line-clamp-2">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{relTime(note.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 6. AI 助手 SKILL 卡（版本随产品同步，点击进入下载中心） */}
          <button onClick={() => onOpenSettings?.("skill")}
            className="w-full bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 text-left hover:shadow-md active:scale-[0.99] transition-all">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(187,234,59,0.35)" }}>
              <Bot className="w-5 h-5" style={{ color: GREEN_DARK }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-900">AI 助手 SKILL</span>
                {skillInfo?.version && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">v{skillInfo.version}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {skillInfo?.updated_at
                  ? `随产品同步更新 · 最近更新于 ${fmtMD(skillInfo.updated_at)} · 点击下载`
                  : "把任务、备忘、阅读交给你的 AI 搭档 · 点击获取"}
              </p>
            </div>
            <Download className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>

        </div>
      </div>
    </PullToRefresh>
  );
};

export default DashboardPage;
