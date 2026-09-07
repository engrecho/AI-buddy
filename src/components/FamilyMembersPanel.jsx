import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, HeartPulse, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

// ── API 工具 ────────────────────────────────────────────────
function getAuthHeaders(json = false) {
  const headers = {};
  try {
    const token = localStorage.getItem('ai_buddy_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { ...getAuthHeaders(options.body && typeof options.body === 'string'), ...options.headers },
  });
  return res.json();
}

const RELATIONSHIP_OPTIONS = ['本人', '妻子', '丈夫', '女儿', '儿子', '母亲', '父亲', '其他'];

const RELATION_COLORS = {
  '本人': '#bbea3b33', '妻子': '#fde8e8', '丈夫': '#e0f0ff',
  '女儿': '#fdeef5', '儿子': '#e8eefd', '母亲': '#fdf3e7',
  '父亲': '#eef1f5', '其他': '#f1f1f1',
};
const RELATION_TEXT_COLORS = {
  '本人': '#5a7a00', '妻子': '#b91c1c', '丈夫': '#1d4ed8',
  '女儿': '#db2777', '儿子': '#4f46e5', '母亲': '#b45309',
  '父亲': '#6b7280', '其他': '#6b7280',
};

function maskIdCard(v) {
  if (!v) return '';
  if (v.length < 8) return v;
  return v.slice(0, 3) + '***********' + v.slice(-4);
}

const EMPTY = {
  patient_name: '', relationship: '', gender: '', birth_date: '', id_card: '', birth_lunar: false,
};

export function FamilyMembersPanel() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api('/api/health_profiles?filter=deleted_at.is.null&order=created_at:asc');
      setMembers(Array.isArray(d.data) ? d.data : []);
    } catch {
      toast.error('加载家庭成员失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (m) => {
    setEditing(m);
    setForm({
      patient_name: m.patient_name || '',
      relationship: m.relationship || '',
      gender: m.gender || '',
      birth_date: m.birth_date ? String(m.birth_date).slice(0, 10) : '',
      id_card: m.id_card || '',
      birth_lunar: !!m.birth_lunar,
    });
    setDialogOpen(true);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.patient_name.trim()) { toast.error('请输入姓名'); return; }
    setSaving(true);
    try {
      const body = {
        patient_name: form.patient_name.trim(),
        relationship: form.relationship || null,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
        id_card: form.id_card?.trim() || null,
        birth_lunar: form.birth_lunar ? 1 : 0,
        status: 'active',
      };
      if (editing) {
        const r = await api(`/api/health_profiles?filter=eq:id:${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        if (r.error) { toast.error(r.error.message); return; }
        toast.success('已保存');
      } else {
        const r = await api('/api/health_profiles', { method: 'POST', body: JSON.stringify(body) });
        if (r.error) { toast.error(r.error.message); return; }
        toast.success('家庭成员已添加');
      }
      setDialogOpen(false);
      fetchMembers();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await api(`/api/health_profiles?filter=eq:id:${deleteTarget.id}`, { method: 'DELETE' });
      if (r.error) { toast.error(r.error.message); return; }
      toast.success('已删除');
      setDeleteTarget(null);
      fetchMembers();
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* 说明 + 添加入口 */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          管理家庭共同成员档案。添加后可在「财务 → 保险」作为被保人直接选择。
        </p>
        <Button size="sm" className="border-0 flex-shrink-0" style={{ backgroundColor: '#5a7a00' }} onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> 新增
        </Button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-xl border rounded-xl border-gray-100 py-12 text-center">
          <HeartPulse className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">还没有家庭成员</p>
          <p className="text-xs text-gray-300 mt-1">点击「新增」添加第一位家人</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-3 py-3 hover:shadow-sm group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium text-white" style={{ backgroundColor: '#5a7a00' }}>
                  {(m.patient_name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{m.patient_name}</span>
                    {m.relationship && (
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium"
                        style={{ backgroundColor: RELATION_COLORS[m.relationship] || '#eee', color: RELATION_TEXT_COLORS[m.relationship] || '#444' }}>
                        {m.relationship}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{m.gender === 'female' ? '女' : m.gender === 'male' ? '男' : '—'}</span>
                    {m.birth_date && <span>{m.birth_date}{m.birth_lunar ? '（农历）' : ''}</span>}
                    {m.id_card && <span className="font-mono">{maskIdCard(m.id_card)}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" aria-label="编辑成员">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" aria-label="删除成员">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增 / 编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="w-full max-w-md mx-auto rounded-none sm:rounded-xl max-h-[100dvh] sm:max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? '编辑家庭成员' : '新增家庭成员'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">姓名 *</label>
              <Input value={form.patient_name} onChange={e => set('patient_name', e.target.value)} placeholder="如：王旭" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">与本人关系</label>
                <Select value={form.relationship} onValueChange={v => set('relationship', v)}>
                  <SelectTrigger><SelectValue placeholder="选择关系" /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">性别</label>
                <Select value={form.gender} onValueChange={v => set('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="选择性别" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">女</SelectItem>
                    <SelectItem value="male">男</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">出生日期</label>
                <Input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">身份证号</label>
                <Input value={form.id_card} onChange={e => set('id_card', e.target.value)} placeholder="选填" maxLength={18} />
              </div>
            </div>
            {/* 阴历生日 */}
            <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm text-gray-700">按阴历（农历）过生日</div>
                <div className="text-xs text-gray-400">开启后上面填写的出生日期按农历计算</div>
              </div>
              <Switch checked={!!form.birth_lunar} onCheckedChange={v => set('birth_lunar', v)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={saving} style={{ backgroundColor: '#5a7a00' }} className="text-white hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {editing ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 border border-gray-200 shadow-lg">
            <h3 className="font-semibold text-gray-900">确认删除该成员？</h3>
            <p className="text-sm text-gray-500 mt-1.5">
              将删除「{deleteTarget.patient_name}」的家庭成员档案，关联数据可能受影响，此操作不可撤销。
            </p>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
              <Button onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white">删除</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}