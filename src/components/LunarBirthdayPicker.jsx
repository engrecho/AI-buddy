import { useEffect, useMemo, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon } from 'lucide-react';
import {
  lunarDateText, lunarMonthOptions, leapMonthOf, lunarMonthMaxDays,
  lunarToSolarDate, solarToLunar, dayCn,
} from '@/lib/lunar';

const selectCls =
  'flex h-10 w-full items-center rounded-md border border-input bg-background px-2 text-sm ' +
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'focus-visible:ring-offset-2';

// 阴历生日选择器：在「阳历 / 阴历」两种记法间切换。
// 阴历模式下先选年份(农历年)，再选「正月~腊月(含闰月)」和「初一~三十」，实时换算为对应阳历日期。
//
// Props:
//   value  阳历日期字符串 YYYY-MM-DD
//   lunar  是否按阴历过生日
//   onValueChange(solarStr)  阳历日期变化
//   onLunarChange(bool)      记法切换
//   renderSolarInput(fn)     可选：非阴历模式下的自定义阳历日期控件
export function LunarBirthdayPicker({ value, lunar, onValueChange, onLunarChange, renderSolarInput }) {
  // 内部阴历控件状态（年/月/闰/日），仅在 lunar 模式下使用
  const seed = useMemo(() => {
    const r = value && lunar ? solarToLunar(value) : null;
    return r ? { year: r.year, month: r.month, day: r.day, isLeap: r.isLeap } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [ly, setLy] = useState(seed?.year ?? new Date().getFullYear());
  const [lm, setLm] = useState(seed?.month ?? 1);
  const [li, setLi] = useState(seed?.isLeap ?? false);
  const [ld, setLd] = useState(seed?.day ?? 1);

  // 当外部 value/lunar 变化（例如选中家庭成员自动填充）时，若处于阴历模式则同步控件
  useEffect(() => {
    if (!lunar || !value) return;
    const r = solarToLunar(value);
    if (r) { setLy(r.year); setLm(r.month); setLi(r.isLeap); setLd(r.day); }
  }, [value, lunar]);

  const monthOpts = useMemo(() => lunarMonthOptions(leapMonthOf(Number(ly) || new Date().getFullYear())), [ly]);
  const maxDay = useMemo(() => lunarMonthMaxDays(Number(ly) || new Date().getFullYear(), lm, li), [ly, lm, li]);
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  // 农历选择变化 → 同步内部控件并换算成阳历日期（日超出当月则自动钳制到最大日）
  const commitLunar = (year, month, isLeap, day) => {
    const yy = Number(year) || new Date().getFullYear();
    const safeDay = Math.min(day, lunarMonthMaxDays(yy, month, isLeap));
    setLy(yy); setLm(month); setLi(isLeap); setLd(safeDay);
    const solar = lunarToSolarDate(yy, month, safeDay, isLeap);
    if (solar) onValueChange(solar);
  };

  // 记录法切换到阴历：优先沿用已有阳历，否则按当前默认农历选择立即换算阳历
  const handleLunarToggle = (v) => {
    onLunarChange(v);
    if (v && !value) commitLunar(ly, lm, li, ld);
  };

  const currentSolar = lunar && value ? value : '';

  return (
    <div className="space-y-2.5">
      {/* 记法切换 */}
      <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-sm text-gray-700">按农历过生日</div>
          <div className="text-xs text-gray-400">
            {lunar ? '按阴历(农历)记生日，并同时展示对应的阳历日期' : '按阳历(公历)记生日'}
          </div>
        </div>
        <Switch checked={!!lunar} onCheckedChange={handleLunarToggle} />
      </div>

      {lunar ? (
        <>
          {/* 农历年月日选择 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">农历年</label>
              <select
                className={selectCls}
                value={ly}
                onChange={(e) => { const y = Number(e.target.value); commitLunar(y, lm, li, ld); }}
              >
                {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => 1900 + i)
                  .reverse()
                  .map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">农历月</label>
              <select
                className={selectCls}
                value={`${li ? 'leap-' : ''}${lm}`}
                onChange={(e) => {
                  const val = e.target.value;
                  const leap = val.startsWith('leap-');
                  const m = Number(val.replace('leap-', ''));
                  commitLunar(ly, m, leap, ld);
                }}
              >
                {monthOpts.map((o) => (
                  <option key={`${o.isLeap ? 'leap-' : ''}${o.value}`} value={`${o.isLeap ? 'leap-' : ''}${o.value}`}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">农历日</label>
              <select
                className={selectCls}
                value={Math.min(ld, maxDay)}
                onChange={(e) => { const d = Number(e.target.value); commitLunar(ly, lm, li, d); }}
              >
                {days.map((d) => <option key={d} value={d}>{dayCn(d)}</option>)}
              </select>
            </div>
          </div>
          {/* 对应阳历实时展示（含农历回归文案） */}
          {currentSolar && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-md px-2.5 py-1.5">
              <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                对应阳历 <b className="font-mono">{currentSolar}</b>
                {' · 农历 '}
                {lunarDateText(currentSolar)}
              </span>
            </div>
          )}
        </>
      ) : (
        renderSolarInput
          ? renderSolarInput((d) => onValueChange(d))
          : (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">出生日期（阳历）</label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={value || ''}
                onChange={(e) => onValueChange(e.target.value)}
              />
            </div>
          )
      )}
    </div>
  );
}