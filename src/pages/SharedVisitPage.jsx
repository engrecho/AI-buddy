import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const date = value => value ? String(value).slice(0, 10) : '—';
const safeImage = value => typeof value === 'string' && /^\/api\/health\/images\/[a-zA-Z0-9_.-]+$/.test(value) ? value : null;
function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return <div><dt className="text-xs text-gray-500 mb-1">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{String(value)}</dd></div>;
}

export default function SharedVisitPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    const robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex, nofollow, noarchive';
    const referrer = document.createElement('meta');
    referrer.name = 'referrer'; referrer.content = 'no-referrer';
    document.head.append(robots, referrer);
    fetch(`/api/shared/visits/${encodeURIComponent(token)}`, { signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(async r => {
        const result = await r.json();
        if (!r.ok || result.error) throw new Error(result.error?.message || '加载失败，请稍后重试');
        setData(result.data);
      }).catch(err => { if (err.name !== 'AbortError') setError(err.message || '加载失败，请稍后重试'); });
    return () => { controller.abort(); robots.remove(); referrer.remove(); };
  }, [token]);
  const v = data?.visit;
  return <main className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="max-w-3xl mx-auto space-y-5">
      <header><p className="text-sm text-emerald-700 mb-2">AI Buddy · 就诊分享 · 只读</p><h1 className="text-2xl font-semibold">{data ? `${data.patient_name}的就诊记录` : '就诊记录'}</h1></header>
      {error ? <div role="alert" className="rounded-xl border bg-white p-6 text-gray-600">{error}</div> : !data ? <p role="status">加载中…</p> : <>
        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-4">{date(v.visit_date)} · {v.hospital || '就诊详情'}</h2>
          <dl className="grid sm:grid-cols-2 gap-4">
            <Field label="科室" value={v.department} /><Field label="医生" value={v.doctor} />
            <Field label="下次就诊" value={v.next_visit_date ? `${date(v.next_visit_date)}${v.next_visit_date_end ? ` 至 ${date(v.next_visit_date_end)}` : ''}` : null} />
            <Field label="费用" value={v.cost != null ? `¥${Number(v.cost).toFixed(2)}` : null} />
            <Field label="报销情况" value={v.is_reimbursed ? `已报销${v.reimburse_amount != null ? ` ¥${Number(v.reimburse_amount).toFixed(2)}` : ''}` : '未报销'} />
          </dl>
          <dl className="space-y-4 mt-5 border-t pt-4">
            <Field label="就诊详情 / 主诉" value={v.chief_complaint} /><Field label="诊断" value={v.diagnosis} />
            <Field label="处方" value={v.prescription} /><Field label="检查" value={v.examination} />
          </dl>
        </section>
        <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-4">本次用药</h2>
          {!data.medications.length && <p className="text-sm text-gray-500">暂无关联用药</p>}
          <div className="space-y-4">{data.medications.map((m, i) => <article key={i} className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">{m.name}</h3>
            {safeImage(m.photo_url) && <a href={m.photo_url} target="_blank" rel="noreferrer"><img src={m.photo_url} alt={m.name} className="w-24 h-24 object-cover rounded mb-3" loading="lazy" referrerPolicy="no-referrer" /></a>}
            <dl className="grid sm:grid-cols-2 gap-3"><Field label="剂量" value={m.dosage} /><Field label="用法" value={m.usage_instruction} />
              <Field label="用药时间" value={m.start_date || m.end_date ? `${date(m.start_date)} 至 ${m.end_date ? date(m.end_date) : '至今'}` : null} />
              <Field label="备注" value={m.notes} /></dl>
          </article>)}</div>
        </section>
        {Array.isArray(v.attachment_urls) && v.attachment_urls.length > 0 && <section className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-4">就诊附件</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{v.attachment_urls.map((att, i) => {
            const url = safeImage(typeof att === 'string' ? att : att?.url);
            return url ? <figure key={i}><a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`就诊附件 ${i + 1}`} loading="lazy" referrerPolicy="no-referrer" className="w-full h-40 object-contain rounded border" /></a>{att.note && <figcaption className="text-sm text-gray-500 mt-2 break-words">{att.note}</figcaption>}</figure> : null;
          })}</div>
        </section>}
        <p className="text-xs text-gray-500">由记录所有者分享，有效至 {new Date(data.expires_at).toLocaleString('zh-CN')}。请尊重病人隐私，勿转发。</p>
      </>}
    </div>
  </main>;
}
