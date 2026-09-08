// ── 公历 → 农历 转换工具 ─────────────────────────────────────
// 数据表覆盖 1900 ~ 2100 年。birth_date 统一存公历日期，
// 当用户开启「按阴历过生日」时，额外展示农历中文（如「腊月初十」）。

// 农历年数据表：每一行描述该年各月天数与闰月信息。
// 0x4bd8 的高 4 位（0x10000 之外）表示各月大小；低 4 位表示闰月月份（0 = 无闰月）。
const lunarInfo = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, // 2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, // 2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, // 2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, // 2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, // 2090-2099
  0x0d520,                                                                               // 2100
];

function lYearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (lunarInfo[y - 1900] & i) ? 1 : 0;
  return sum + leapDays(y);
}
function leapMonth(y) { return lunarInfo[y - 1900] & 0xf; }
function leapDays(y) {
  if (leapMonth(y)) return (lunarInfo[y - 1900] & 0x10000) ? 30 : 29;
  return 0;
}
function monthDays(y, m) { return (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29; }

// 公历日期字符串 → 农历对象 { year, month, day, isLeap }
export function solarToLunar(dateStr) {
  const objDate = new Date(dateStr && dateStr.length >= 10 ? dateStr.slice(0, 10) + 'T00:00:00' : `${dateStr}T00:00:00`);
  if (isNaN(objDate.getTime())) return null;
  const baseDate = new Date(1900, 0, 31); // 1900-01-31 = 农历正月初一
  let offset = Math.round((objDate - baseDate) / 86400000);

  let i, temp = 0;
  for (i = 1900; i < 2101 && offset > 0; i++) { temp = lYearDays(i); offset -= temp; }
  if (offset < 0) { offset += temp; i--; }
  const year = i;
  if (year < 1900 || year > 2100) return null;

  const leap = leapMonth(year);
  let isLeap = false;
  for (i = 1; i < 13 && offset > 0; i++) {
    if (leap > 0 && i === leap + 1 && isLeap === false) {
      --i; isLeap = true; temp = leapDays(year);
    } else {
      temp = monthDays(year, i);
    }
    if (isLeap === true && i === leap + 1) isLeap = false;
    offset -= temp;
  }
  if (offset === 0 && leap > 0 && i === leap + 1) {
    if (isLeap) isLeap = false; else { isLeap = true; --i; }
  }
  if (offset < 0) { offset += temp; --i; }
  return { year, month: i, day: offset + 1, isLeap };
}

const MONTH_CN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const NUM_CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function monthCn(n) { return (MONTH_CN[n - 1] || '') + '月'; }
export function dayCn(d) {
  if (!d || d < 1 || d > 30) return '';
  if (d < 10) return '初' + NUM_CN[d];
  if (d === 10) return '初十';
  if (d < 20) return '十' + NUM_CN[d - 10];
  if (d === 20) return '二十';
  if (d < 30) return '廿' + NUM_CN[d - 20];
  return '三十';
}

// 公历日期字符串 → 农历中文（如「腊月初十」「闰四月廿三」）。无效返回空字符串。
export function lunarDateText(dateStr) {
  const r = solarToLunar(dateStr);
  if (!r) return '';
  return (r.isLeap ? '闰' : '') + monthCn(r.month) + dayCn(r.day);
}

// 农历年月日在「农历 1900 年正月初一(1900-01-31)」之后的天数（不含当天）。
// 返回 null 表示该农历日期非法（闰月与当年不符 / 日超出当月大小）。
function lunarToOffset(y, m, d, isLeap) {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  const leap = leapMonth(y);
  if (isLeap && leap !== m) return null; // 只有当年有闰 m 月时才能选闰 m 月
  if ((isLeap && d > leapDays(y)) || (!isLeap && d > monthDays(y, m))) return null;

  let offset = 0;
  for (let i = 1900; i < y; i++) offset += lYearDays(i);

  // 逐月累加：闰月紧随正 m 月之后，因此编号比 m 大的月份要在「过了 m 月和 m 月」之后。
  let passed = false;
  for (let i = 1; i < m; i++) {
    if (leap > 0 && i === leap && !passed) { offset += leapDays(y); passed = true; }
    offset += monthDays(y, i);
  }
  // 目标恰为闰月：需先足正 m 月的天数，闰月天数单独计入
  if (isLeap) offset += monthDays(y, m);
  offset += d - 1;
  return offset;
}

// 农历 → 阳历。参数：农历年 / 农历月(1-12) / 农历日(1-30) / 是否闰月。
// 返回 { year, month, day }（阳历），非法返回 null。
export function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap = false) {
  const offset = lunarToOffset(lunarYear, lunarMonth, lunarDay, isLeap);
  if (offset === null) return null;
  const base = new Date(1900, 0, 31); // 1900-01-31 对应农历正月初一
  const dt = new Date(base.getTime() + offset * 86400000);
  return { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() };
}

// 农历 → 阳历日期字符串（YYYY-MM-DD）。非法返回空字符串。
export function lunarToSolarDate(lunarYear, lunarMonth, lunarDay, isLeap = false) {
  const r = lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap);
  if (!r) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${r.year}-${pad(r.month)}-${pad(r.day)}`;
}

// 农历中文（如「腊月二十」「闰四月」），无日的版本，供选择器分组标题复用。
export function lunarMonthText(month, isLeap = false) {
  return (isLeap ? '闰' : '') + monthCn(month);
}

// 农历日中文名列表（初一 ~ 三十）
export const LUNAR_DAYS = Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: dayCn(i + 1) }));

// 农历选择器月份列表：正月 ~ 腊月
export function lunarMonthOptions(leapMonthNo) {
  const opts = [];
  for (let m = 1; m <= 12; m++) {
    opts.push({ value: m, label: monthCn(m), isLeap: false });
    if (leapMonthNo === m) opts.push({ value: m, label: '闰' + monthCn(m), isLeap: true });
  }
  return opts;
}

// 某农历年的闰月月份（0 = 无闰月）
export function leapMonthOf(year) {
  return leapMonth(year);
}

// 某农历年指定月(或闰月)的最大天数（30 或 29）
export function lunarMonthMaxDays(year, month, isLeap = false) {
  return isLeap ? leapDays(year) : monthDays(year, month);
}