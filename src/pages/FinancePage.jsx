import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, ChevronLeft, Trash2, CheckCircle2, Clock, AlertCircle, TrendingDown, Calendar, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

// ── 常量 ────────────────────────────────────────────────────
const LOAN_TYPES = {
  mortgage: '房贷', car: '车贷', consumer: '消费贷',
  credit_card: '信用卡分期', other: '其他',
};

const REPAYMENT_METHODS = {
  equal_payment: '等额本息', equal_principal: '等额本金',
};

const LOAN_STATUS = {
  active: '还款中', paid_off: '已结清', closed: '已关闭',
};

const PAYMENT_STATUS = {
  pending: '待还', paid: '已还', overdue: '逾期', partial: '部分还款',
};

// ── 工具函数 ────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatMoney(n) {
  if (n == null) return '—';
  return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

// ── 贷款表单 ────────────────────────────────────────────────
function LoanFormDialog({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState({
    name: '', loan_type: 'other', institution: '', principal: '',
    annual_rate: '', term_months: '', repayment_method: 'equal_payment',
    start_date: new Date().toISOString().slice(0, 10), repayment_day: 1, notes: '',
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        loan_type: initial.loan_type || 'other',
        institution: initial.institution || '',
        principal: initial.principal != null ? String(initial.principal) : '',
        annual_rate: initial.annual_rate != null ? String(initial.annual_rate) : '',
        term_months: initial.term_months != null ? String(initial.term_months) : '',
        repayment_method: initial.repayment_method || 'equal_payment',
        start_date: initial.start_date ? new Date(initial.start_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        repayment_day: initial.repayment_day || 1,
        notes: initial.notes || '',
      });
    } else {
      setForm({
        name: '', loan_type: 'other', institution: '', principal: '',
        annual_rate: '', term_months: '', repayment_method: 'equal_payment',
        start_date: new Date().toISOString().slice(0, 10), repayment_day: 1, notes: '',
      });
    }
  }, [initial, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('请输入贷款名称'); return; }
    if (!form.principal || parseFloat(form.principal) <= 0) { toast.error('请输入有效的本金'); return; }
    if (!form.term_months || parseInt(form.term_months) <= 0) { toast.error('请输入有效的期数'); return; }
    if (!form.start_date) { toast.error('请选择放款日'); return; }
    onSubmit({
      ...form,
      principal: parseFloat(form.principal),
      annual_rate: parseFloat(form.annual_rate) || 0,
      term_months: parseInt(form.term_months),
      repayment_day: parseInt(form.repayment_day) || 1,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? '编辑贷款' : '新增贷款'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">贷款名称 *</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="如：房贷、车贷" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">类型</label>
              <Select value={form.loan_type} onValueChange={v => set('loan_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LOAN_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">贷款机构</label>
              <Input value={form.institution} onChange={e => set('institution', e.target.value)} placeholder="如：招商银行" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">本金 (元) *</label>
              <Input type="number" value={form.principal} onChange={e => set('principal', e.target.value)} placeholder="如：500000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">年利率 (%)</label>
              <Input type="number" step="0.01" value={form.annual_rate} onChange={e => set('annual_rate', e.target.value)} placeholder="如：4.25" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">期数 (月) *</label>
              <Input type="number" value={form.term_months} onChange={e => set('term_months', e.target.value)} placeholder="如：360" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">还款方式</label>
              <Select value={form.repayment_method} onValueChange={v => set('repayment_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REPAYMENT_METHODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">放款日 *</label>
              <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">每月还款日</label>
              <Input type="number" min="1" max="28" value={form.repayment_day} onChange={e => set('repayment_day', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">备注</label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} style={{ backgroundColor: '#5a7a00' }} className="text-white hover:opacity-90">
            {initial ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 保险常量 ────────────────────────────────────────────────
const INSURANCE_TYPE_OPTIONS = [
  { value: 'medical', label: '医疗险' },
  { value: 'critical_illness', label: '重疾险' },
  { value: 'life', label: '寿险' },
  { value: 'annuity', label: '年金/储蓄' },
  { value: 'property', label: '财产险' },
  { value: 'accident', label: '意外险' },
  { value: 'auto', label: '车险' },
  { value: 'other', label: '其他' },
];

const PAYMENT_FREQUENCY_OPTIONS = [
  { value: 'yearly', label: '按年' },
  { value: 'half_year', label: '按半年' },
  { value: 'quarterly', label: '按季' },
  { value: 'monthly', label: '按月' },
  { value: 'single', label: '趸交' },
  { value: 'other', label: '其他' },
];

const INSURANCE_STATUS = {
  active: '有效',
  pending: '待生效',
  lapsed: '已失效',
  cancelled: '已退保',
};

function paymentFrequencyLabel(v) {
  return PAYMENT_FREQUENCY_OPTIONS.find(o => o.value === v)?.label || v || '';
}

function InsuranceTypeBadge({ type }) {
  const opt = INSURANCE_TYPE_OPTIONS.find(o => o.value === type);
  const colorMap = {
    medical: '#e0f7e9', critical_illness: '#fde8e8', life: '#e8eefd',
    annuity: '#fdf3e7', property: '#eef1f5', accident: '#fdf0e7',
    auto: '#e6f4f7', other: '#f1f1f1',
  };
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[11px] font-medium"
      style={{ backgroundColor: colorMap[type] || '#eee', color: '#444' }}
    >
      {opt?.label || type || '—'}
    </span>
  );
}

function InsuranceStatusBadge({ status }) {
  const text = INSURANCE_STATUS[status] || status || '';
  const colorMap = { active: '#15803d', pending: '#b45309', lapsed: '#dc2626', cancelled: '#6b7280' };
  return <span className="text-xs font-medium" style={{ color: colorMap[status] || '#6b7280' }}>{text}</span>;
}

// ── 保险表单 ────────────────────────────────────────────────
function InsuranceFormDialog({ open, onClose, onSubmit, initial, members = [] }) {
  const EMPTY = {
    name: '', insurance_type: 'medical', company: '', policy_no: '',
    insured_person: '', profile_id: '', coverage_amount: '', annual_premium: '',
    effective_date: '', expiry_date: '', payment_frequency: 'yearly',
    auto_renew: false, beneficiary: '', beneficiary_ratio: '',
    coverage_terms: '', status: 'active', notes: '',
  };
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      if (initial) {
        const n = initial;
        setForm({
          name: n.name || '',
          insurance_type: n.insurance_type || 'medical',
          company: n.company || '',
          policy_no: n.policy_no || '',
          insured_person: n.insured_person || '',
          profile_id: n.profile_id != null ? String(n.profile_id) : '',
          coverage_amount: n.coverage_amount != null ? String(n.coverage_amount) : '',
          annual_premium: n.annual_premium != null ? String(n.annual_premium) : '',
          effective_date: n.effective_date ? new Date(n.effective_date).toISOString().slice(0, 10) : '',
          expiry_date: n.expiry_date ? new Date(n.expiry_date).toISOString().slice(0, 10) : '',
          payment_frequency: n.payment_frequency || 'yearly',
          auto_renew: !!n.auto_renew,
          beneficiary: n.beneficiary || '',
          beneficiary_ratio: n.beneficiary_ratio != null ? String(n.beneficiary_ratio) : '',
          coverage_terms: n.coverage_terms || '',
          status: n.status || 'active',
          notes: n.notes || '',
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('请填写保险名称'); return; }
    onSubmit(form);
  };

  // 选择被保人（家庭成员）：自动填充姓名 + profile_id
  const onPickMember = (memberId) => {
    if (!memberId) {
      set('profile_id', ''); set('insured_person', ''); return;
    }
    const m = members.find(x => String(x.id) === String(memberId));
    set('profile_id', String(memberId));
    set('insured_person', m ? m.patient_name : form.insured_person);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg mx-auto rounded-none sm:rounded-xl max-h-[100dvh] sm:max-h-[90dvh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base">{initial ? '编辑保险' : '添加保险'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">保险名称 *</label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="如：平安福重疾险" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">类型</label>
              <Select value={form.insurance_type} onValueChange={v => set('insurance_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INSURANCE_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">保险公司</label>
              <Input value={form.company} onChange={e => set('company', e.target.value)} placeholder="如：中国平安" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">保单号</label>
              <Input value={form.policy_no} onChange={e => set('policy_no', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">被保人</label>
              <Select value={form.profile_id} onValueChange={onPickMember}>
                <SelectTrigger><SelectValue placeholder="选家庭成员 / 手填下方" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.patient_name || '未命名'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input value={form.insured_person} onChange={e => set('insured_person', e.target.value)} placeholder="被保人姓名（可选，选家庭成员后自动填充）" className="mt-1" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">保额（元）</label>
              <Input type="number" step="0.01" value={form.coverage_amount} onChange={e => set('coverage_amount', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">年保费（元）</label>
              <Input type="number" step="0.01" value={form.annual_premium} onChange={e => set('annual_premium', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">生效日</label>
              <Input type="date" value={form.effective_date} onChange={e => set('effective_date', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">到期日</label>
              <Input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">缴费频率</label>
              <Select value={form.payment_frequency} onValueChange={v => set('payment_frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_FREQUENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">状态</label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INSURANCE_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.auto_renew} onCheckedChange={v => set('auto_renew', v)} />
            <Label className="text-sm text-gray-600">自动续保</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">身故受益人</label>
              <Input value={form.beneficiary} onChange={e => set('beneficiary', e.target.value)} placeholder="如：张三" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">受益比例</label>
              <Input value={form.beneficiary_ratio} onChange={e => set('beneficiary_ratio', e.target.value)} placeholder="如：100%" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">保障条款</label>
            <Textarea value={form.coverage_terms} onChange={e => set('coverage_terms', e.target.value)} rows={2} placeholder="保障范围、免责等" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">备注</label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={1} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} style={{ backgroundColor: '#5a7a00' }} className="text-white hover:opacity-90">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 主页面 ──────────────────────────────────────────────────
export default function FinancePage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanDetail, setLoanDetail] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/loans?order=created_at:desc');
      setLoans(data.data || []);
    } catch (err) {
      toast.error('加载贷款列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const loadLoanDetail = useCallback(async (id) => {
    try {
      const data = await api(`/api/loans/${id}/detail`);
      if (data.data) {
        setLoanDetail(data.data);
      } else {
        toast.error('加载详情失败');
      }
    } catch {
      toast.error('加载详情失败');
    }
  }, []);

  const handleSelectLoan = (loan) => {
    setSelectedLoan(loan);
    loadLoanDetail(loan.id);
  };

  const handleCreate = async (formData) => {
    try {
      const data = await api('/api/loans/create', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (data.data) {
        toast.success('贷款创建成功，还款计划已自动生成');
        setDialogOpen(false);
        loadLoans();
      } else {
        toast.error(data.error?.message || '创建失败');
      }
    } catch {
      toast.error('创建失败');
    }
  };

  const handleUpdate = async (formData) => {
    if (!editingLoan) return;
    try {
      const data = await api(`/api/loans?filter=eq:id:${editingLoan.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      if (data.data !== null) {
        toast.success('已保存');
        setDialogOpen(false);
        setEditingLoan(null);
        loadLoans();
      } else {
        toast.error(data.error?.message || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/api/loan_payments?filter=eq:loan_id:${deleteTarget.id}`, { method: 'DELETE' });
      await api(`/api/loans?filter=eq:id:${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('已删除');
      setDeleteTarget(null);
      loadLoans();
    } catch {
      toast.error('删除失败');
    }
  };

  const markPayment = async (payment, status) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api(`/api/loan-payments/${payment.id}/mark`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          paid_amount: status === 'paid' ? payment.due_amount : 0,
          paid_date: status === 'paid' ? today : null,
        }),
      });
      toast.success(status === 'paid' ? '已标记还款' : '已取消标记');
      if (selectedLoan) loadLoanDetail(selectedLoan.id);
    } catch {
      toast.error('操作失败');
    }
  };

  // ── 聚合 tab：贷款 / 保险 ─────────────────────────────────
  const [activeSection, setActiveSection] = useState('loan');
  const [members, setMembers] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceDialog, setInsuranceDialog] = useState({ open: false, initial: null });
  const [insuranceDeleteTarget, setInsuranceDeleteTarget] = useState(null);

  const loadMembers = useCallback(async () => {
    try {
      const d = await api('/api/health_profiles?filter=deleted_at.is.null&order=created_at:asc');
      setMembers(Array.isArray(d.data) ? d.data : []);
    } catch { /* 成员列表加载失败可忽略 */ }
  }, []);

  const loadInsurances = useCallback(async () => {
    setInsuranceLoading(true);
    try {
      const d = await api('/api/health_insurances?order=created_at:desc');
      setInsurances(Array.isArray(d.data) ? d.data : []);
    } catch { toast.error('加载保险列表失败'); }
    setInsuranceLoading(false);
  }, []);

  useEffect(() => {
    if (activeSection === 'insurance') {
      loadInsurances();
      if (!members.length) loadMembers();
    }
  }, [activeSection, members.length, loadInsurances, loadMembers]);

  const handleSaveInsurance = async (form) => {
    const isNew = !insuranceDialog.initial;
    const id = insuranceDialog.initial?.id;
    const body = { ...form };
    delete body.id;
    body.coverage_amount = form.coverage_amount ? parseFloat(form.coverage_amount) : null;
    body.annual_premium = form.annual_premium ? parseFloat(form.annual_premium) : null;
    body.auto_renew = form.auto_renew ? 1 : 0;
    if (!body.profile_id) body.profile_id = null;
    const path = isNew ? '/api/health_insurances' : `/api/health_insurances?filter=eq:id:${id}`;
    const method = isNew ? 'POST' : 'PATCH';
    const r = await api(path, { method, body: JSON.stringify(body) });
    if (r.error) { toast.error(r.error.message); return; }
    toast.success(isNew ? '保险已添加' : '已保存');
    setInsuranceDialog({ open: false, initial: null });
    loadInsurances();
  };

  const handleDeleteInsurance = async () => {
    if (!insuranceDeleteTarget) return;
    const r = await api(`/api/health_insurances?filter=eq:id:${insuranceDeleteTarget.id}`, { method: 'DELETE' });
    if (r.error) { toast.error(r.error.message); return; }
    toast.success('已删除');
    setInsuranceDeleteTarget(null);
    loadInsurances();
  };

  const goLoan = () => { setActiveSection('loan'); setSelectedLoan(null); setLoanDetail(null); };
  const goInsurance = () => { setActiveSection('insurance'); setSelectedLoan(null); setLoanDetail(null); };

  // 顶部双大标签（贷款 / 保险），样式与阅读中心一致
  const renderGoldenGate = (current) => {
    const tab = (key, label, Icon, active) => (
      <button
        key={key}
        onClick={() => (key === 'loan' ? goLoan() : goInsurance())}
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
    return (
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 pt-3 pb-3">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {tab('loan', '贷款', TrendingDown, current === 'loan')}
            {tab('insurance', '保险', Shield, current === 'insurance')}
          </div>
        </div>
      </div>
    );
  };

  // ── 贷款详情视图（含还款计划表） ─────────────────────────
  if (activeSection === 'loan' && selectedLoan && loanDetail) {
    const s = loanDetail.summary || {};
    return (
      <div className="h-full overflow-y-auto bg-[#f5f5f5]">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {/* 返回 + 标题 */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelectedLoan(null); setLoanDetail(null); }}>
              <ChevronLeft className="w-4 h-4" /> 返回
            </Button>
            <h2 className="text-lg font-bold text-gray-800 flex-1 truncate">{loanDetail.name}</h2>
            <Badge style={{ backgroundColor: '#bbea3b33', color: '#5a7a00' }}>
              {LOAN_STATUS[loanDetail.status] || loanDetail.status}
            </Badge>
          </div>

          {/* 基本信息 */}
          <div className="bg-white rounded-lg border border-gray-100 p-4 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-400">类型：</span>{LOAN_TYPES[loanDetail.loan_type] || '—'}</div>
              <div><span className="text-gray-400">机构：</span>{loanDetail.institution || '—'}</div>
              <div><span className="text-gray-400">本金：</span>{formatMoney(loanDetail.principal)}</div>
              <div><span className="text-gray-400">年利率：</span>{loanDetail.annual_rate}%</div>
              <div><span className="text-gray-400">期数：</span>{loanDetail.term_months} 月</div>
              <div><span className="text-gray-400">还款方式：</span>{REPAYMENT_METHODS[loanDetail.repayment_method] || '—'}</div>
              <div><span className="text-gray-400">放款日：</span>{formatDate(loanDetail.start_date)}</div>
              <div><span className="text-gray-400">还款日：</span>每月{loanDetail.repayment_day}号</div>
            </div>
            {loanDetail.notes && <div className="text-sm text-gray-500 pt-2 border-t border-gray-50">{loanDetail.notes}</div>}
          </div>

          {/* 汇总卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs text-gray-400">总期数</div>
              <div className="text-lg font-bold text-gray-800">{s.total_installments || 0}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs text-gray-400">已还期数</div>
              <div className="text-lg font-bold text-green-600">{s.paid_installments || 0}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs text-gray-400">已还总额</div>
              <div className="text-lg font-bold text-gray-800">{formatMoney(s.total_paid)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs text-gray-400">总利息</div>
              <div className="text-lg font-bold text-orange-500">{formatMoney(s.total_interest)}</div>
            </div>
          </div>

          {/* 还款计划表 */}
          <div className="bg-white rounded-lg border border-gray-100">
            <div className="px-4 py-3 border-b border-gray-50">
              <span className="text-sm font-medium text-gray-900">还款计划</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-50">
                    <th className="px-3 py-2 text-left font-medium">期次</th>
                    <th className="px-3 py-2 text-left font-medium">应还日</th>
                    <th className="px-3 py-2 text-right font-medium">应还金额</th>
                    <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">本金</th>
                    <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">利息</th>
                    <th className="px-3 py-2 text-center font-medium">状态</th>
                    <th className="px-3 py-2 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(loanDetail.payments || []).map((p) => {
                    const days = daysUntil(p.due_date);
                    const isUpcoming = p.status === 'pending' && days != null && days <= 3 && days >= 0;
                    const isOverdue = p.status === 'pending' && days != null && days < 0;
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 ${isUpcoming ? 'bg-orange-50' : ''} ${isOverdue ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 text-gray-600">{p.installment}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {formatDate(p.due_date)}
                          {isUpcoming && <span className="text-xs text-orange-500 ml-1">（{days}天后）</span>}
                          {isOverdue && <span className="text-xs text-red-500 ml-1">（逾期）</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-800">{formatMoney(p.due_amount)}</td>
                        <td className="px-3 py-2 text-right text-gray-500 hidden sm:table-cell">{formatMoney(p.principal_amount)}</td>
                        <td className="px-3 py-2 text-right text-gray-500 hidden sm:table-cell">{formatMoney(p.interest_amount)}</td>
                        <td className="px-3 py-2 text-center">
                          {p.status === 'paid' ? (
                            <Badge className="bg-green-100 text-green-700">已还</Badge>
                          ) : p.status === 'partial' ? (
                            <Badge className="bg-blue-100 text-blue-700">部分</Badge>
                          ) : isOverdue ? (
                            <Badge className="bg-red-100 text-red-700">逾期</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500">待还</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {p.status === 'paid' ? (
                            <button onClick={() => markPayment(p, 'pending')} className="text-xs text-gray-400 hover:text-gray-600">撤销</button>
                          ) : (
                            <button onClick={() => markPayment(p, 'paid')} className="text-xs font-medium" style={{ color: '#5a7a00' }}>标记还款</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 聚合视图：金刚区 + （贷款列表 | 保险列表） ───────────
  return (
    <div className="h-full flex flex-col bg-[#f5f5f5]">
      {renderGoldenGate(activeSection)}

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeSection === 'insurance' ? (
          <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
            {/* 标题栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" style={{ color: '#5a7a00' }} />
                <h2 className="text-lg font-bold text-gray-800">保险管理</h2>
              </div>
              <Button size="sm" onClick={() => setInsuranceDialog({ open: true, initial: null })} style={{ backgroundColor: '#5a7a00' }} className="text-white hover:opacity-90">
                <Plus className="w-4 h-4" /> 添加保险
              </Button>
            </div>

            {/* 保险列表 */}
            {insuranceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-lg animate-pulse" />)}
              </div>
            ) : insurances.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-100 py-16 text-center">
                <Shield className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">还没有保险记录</p>
                <p className="text-xs text-gray-300 mt-1">点击右上角「添加保险」记录家庭保单</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insurances.map(ins => {
                  const days = daysUntil(ins.expiry_date);
                  const nearExpiry = days !== null && days >= 0 && days <= 7;
                  const expired = days !== null && days < 0;
                  const member = members.find(m => String(m.id) === String(ins.profile_id));
                  return (
                    <div key={ins.id} className="bg-white rounded-lg border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-800 truncate">{ins.name}</span>
                            <InsuranceTypeBadge type={ins.insurance_type} />
                            <InsuranceStatusBadge status={ins.status} />
                            {ins.auto_renew ? <Badge className="text-xs bg-[#bbea3b]/30 text-[#5a7a00]">自动续保</Badge> : null}
                          </div>
                          {(ins.company || ins.policy_no || (member?.patient_name || ins.insured_person)) && (
                            <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-2 flex-wrap">
                              {ins.company && <span className="truncate">{ins.company}</span>}
                              {ins.policy_no && <span className="text-gray-400">保单号：{ins.policy_no}</span>}
                              {(member?.patient_name || ins.insured_person) && (
                                <span className="text-gray-400 flex items-center gap-0.5">
                                  <Users className="w-3 h-3" /> 被保人：{member?.patient_name || ins.insured_person}
                                </span>
                              )}
                            </div>
                          )}
                          {(ins.coverage_amount != null || ins.annual_premium != null || ins.payment_frequency) && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                              {ins.coverage_amount != null && <span>保额：{formatMoney(ins.coverage_amount)}</span>}
                              {ins.annual_premium != null && <span>年保费：{formatMoney(ins.annual_premium)}</span>}
                              {ins.payment_frequency && <span>{paymentFrequencyLabel(ins.payment_frequency)}</span>}
                            </div>
                          )}
                          {(ins.effective_date || ins.expiry_date) && (
                            <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                              {ins.effective_date && <span className="text-gray-400">生效：{formatDate(ins.effective_date)}</span>}
                              {ins.expiry_date && (
                                <span className={nearExpiry || expired ? 'text-red-500 font-medium' : 'text-gray-400'}>
                                  到期：{formatDate(ins.expiry_date)}
                                  {nearExpiry ? `（${days}天后）` : expired ? '（已过期）' : ''}
                                </span>
                              )}
                            </div>
                          )}
                          {(ins.beneficiary || ins.beneficiary_ratio) && (
                            <div className="text-xs text-gray-400 mt-1">
                              {ins.beneficiary && <span>受益人：{ins.beneficiary}</span>}
                              {ins.beneficiary && ins.beneficiary_ratio && ' · '}
                              {ins.beneficiary_ratio && <span>比例：{ins.beneficiary_ratio}</span>}
                            </div>
                          )}
                          {ins.coverage_terms && <div className="text-xs text-gray-400 mt-1 line-clamp-1">{ins.coverage_terms}</div>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => setInsuranceDialog({ open: true, initial: ins })}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                            <Wallet className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setInsuranceDeleteTarget(ins)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
            {/* 贷款列表标题栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" style={{ color: '#5a7a00' }} />
                <h2 className="text-lg font-bold text-gray-800">贷款管理</h2>
              </div>
              <Button size="sm" onClick={() => { setEditingLoan(null); setDialogOpen(true); }} style={{ backgroundColor: '#5a7a00' }} className="text-white hover:opacity-90">
                <Plus className="w-4 h-4" /> 新增贷款
              </Button>
            </div>

            {/* 贷款列表 */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-lg animate-pulse" />)}
              </div>
            ) : loans.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-100 py-16 text-center">
                <Wallet className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">还没有贷款记录</p>
                <p className="text-xs text-gray-300 mt-1">点击右上角「新增贷款」开始记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loans.map(loan => (
                  <div key={loan.id}
                    onClick={() => handleSelectLoan(loan)}
                    className="bg-white rounded-lg border border-gray-100 p-4 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800 truncate">{loan.name}</span>
                          <Badge style={{ backgroundColor: '#bbea3b33', color: '#5a7a00' }}>
                            {LOAN_TYPES[loan.loan_type] || loan.loan_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {LOAN_STATUS[loan.status] || loan.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400">{loan.institution || '—'}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setEditingLoan(loan); setDialogOpen(true); }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(loan); }}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-gray-400">本金</div>
                        <div className="font-medium text-gray-700">{formatMoney(loan.principal)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">年利率</div>
                        <div className="font-medium text-gray-700">{loan.annual_rate}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">期数</div>
                        <div className="font-medium text-gray-700">{loan.term_months} 月</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 保险弹窗 */}
      {activeSection === 'insurance' && (
        <>
          <InsuranceFormDialog
            open={insuranceDialog.open}
            onClose={() => setInsuranceDialog({ open: false, initial: null })}
            onSubmit={handleSaveInsurance}
            initial={insuranceDialog.initial}
            members={members}
          />
          <AlertDialog open={!!insuranceDeleteTarget} onOpenChange={(o) => !o && setInsuranceDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除这份保险？</AlertDialogTitle>
                <AlertDialogDescription>
                  将删除「{insuranceDeleteTarget?.name}」及其保单信息，此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteInsurance} className="bg-red-500 hover:bg-red-600 text-white">
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* 贷款弹窗 */}
      {activeSection === 'loan' && (
        <>
          <LoanFormDialog
            open={dialogOpen}
            onClose={() => { setDialogOpen(false); setEditingLoan(null); }}
            onSubmit={editingLoan ? handleUpdate : handleCreate}
            initial={editingLoan}
          />
          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除？</AlertDialogTitle>
              </AlertDialogHeader>
              <p className="text-sm text-gray-500 px-6">
                将删除「{deleteTarget?.name}」及其所有还款记录，此操作不可撤销。
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
