import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function VisitShareDialog({ visit, onClose, api }) {
  const [status, setStatus] = useState(null);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setStatus(null); setLink(''); setError('');
    if (visit) api(`/api/health/visits/${visit.id}/share`).then(r => {
      if (cancelled) return;
      if (r.error) setError(r.error.message);
      else setStatus(r.data);
    }).catch(() => { if (!cancelled) setError('加载失败，请关闭后重试'); });
    return () => { cancelled = true; };
  }, [visit, api]);

  async function change(method) {
    setBusy(true);
    try {
      const r = await api(`/api/health/visits/${visit.id}/share`, { method });
      if (r.error) throw new Error(r.error.message);
      setStatus(r.data);
      setLink(r.data.token ? `${window.location.origin}/#/shared/visits/${r.data.token}` : '');
      toast.success(method === 'DELETE' ? '分享已关闭，原链接立即失效' : '分享链接已生成');
    } catch (err) { toast.error(err.message || '操作失败，请重试'); }
    finally { setBusy(false); }
  }
  return <Dialog open={!!visit} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>分享本次就诊</DialogTitle>
        <DialogDescription>分享 {String(visit?.visit_date || '').slice(0, 10)} 的就诊记录。持有链接的人无需登录即可只读查看病人姓名、本次就诊详情、费用、用药和附件。请仅发送给信任的人。</DialogDescription>
      </DialogHeader>
      <p className="text-sm text-gray-500">链接有效期为 7 天，展示最新记录；重新生成会使原链接失效。可随时关闭分享。</p>
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : !status ? <p className="text-sm">加载中…</p> : <>
        <p className="text-sm">{status.active ? `分享中，有效至 ${new Date(status.expires_at).toLocaleString('zh-CN')}` : '当前未开启分享'}</p>
        {status.active && !link && <p className="text-sm text-gray-500">已有链接仍有效。如需获取新链接，请重新生成。</p>}
        {link && <div className="space-y-2">
          <Input aria-label="就诊分享链接" readOnly value={link} onFocus={e => e.target.select()} />
          <Button variant="outline" onClick={async () => {
            try { await navigator.clipboard.writeText(link); toast.success('链接已复制'); }
            catch { toast.error('复制失败，请选中上方链接手动复制'); }
          }}>复制链接</Button>
          <a className="ml-3 text-sm text-blue-600 underline" href={link} target="_blank" rel="noreferrer">预览</a>
        </div>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => change('POST')}>{busy ? '处理中…' : status.active ? '重新生成链接' : '生成分享链接'}</Button>
          {status.active && <Button variant="destructive" disabled={busy} onClick={() => change('DELETE')}>关闭分享</Button>}
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
