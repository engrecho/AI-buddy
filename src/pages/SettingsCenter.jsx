import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, User as UserIcon, Lock, Key, Users, Tag, FolderOpen,
  Save, LogOut, Copy, Trash2, Plus, Eye, EyeOff, AlertTriangle,
  CheckCircle2, Loader2, Camera, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MembersPanel, TagsPanel, GroupsPanel } from '@/components/ConfigSection';

const SECTIONS = [
  { id: 'profile', label: '个人资料', icon: UserIcon },
  { id: 'password', label: '修改密码', icon: Lock },
  { id: 'api-key', label: 'API Key', icon: Key },
  { id: 'members', label: '人员', icon: Users },
  { id: 'tags', label: '标签', icon: Tag },
  { id: 'groups', label: '分组', icon: FolderOpen },
];

export function SettingsCenter({ onBack, defaultSection = null }) {
  const [section, setSection] = useState(defaultSection);
  const { user, login, logout } = useAuth();

  return (
    <div className='flex flex-col h-full bg-gray-50 min-h-0'>
      {/* 移动端顶部栏 */}
      <header
        className='md:hidden flex-shrink-0 bg-white flex items-center px-4 gap-3 border-b border-gray-100'
        style={{ height: 'calc(44px + env(safe-area-inset-top, 0px))', paddingTop: 'calc(env(safe-area-inset-top, 0px))' }}
      >
        <Button variant='ghost' size='sm' onClick={section ? () => setSection(null) : onBack} className='p-2 h-9 w-9 -ml-1'>
          <ArrowLeft className='h-5 w-5' />
        </Button>
        <span className='font-semibold text-gray-800'>{section ? SECTIONS.find(s => s.id === section)?.label : '设置'}</span>
      </header>

      <div className='flex flex-1 min-h-0 overflow-hidden'>
        {/* 桌面二级侧边栏 */}
        <aside className='hidden md:flex flex-col flex-shrink-0 bg-white border-r border-gray-100 w-[200px] py-3'>
          <div className='px-4 pb-3 mb-1 border-b border-gray-100'>
            <div className='text-xs text-gray-400 font-medium'>设置中心</div>
          </div>
          <nav className='flex-1 overflow-y-auto px-2 space-y-0.5'>
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? 'text-[#2d4a00] font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={active ? { backgroundColor: '#bbea3b' } : {}}
                >
                  <Icon className='h-4 w-4 flex-shrink-0' />
                  {label}
                </button>
              );
            })}
          </nav>
          <div className='px-2 pt-2 border-t border-gray-100'>
            <Button variant='ghost' size='sm' onClick={() => { logout(); }} className='w-full justify-start text-red-500 hover:bg-red-50'>
              <LogOut className='h-4 w-4 mr-2' /> 退出登录
            </Button>
          </div>
        </aside>

        {/* 桌面端内容区 */}
        <main className='hidden md:block flex-1 overflow-y-auto min-h-0 bg-gray-50'>
          <div className='max-w-2xl mx-auto px-4 py-6'>
            {renderContent()}
          </div>
        </main>

        {/* 移动端内容区 */}
        <main className='md:hidden flex-1 overflow-y-auto min-h-0'>
          <div className='px-4 py-4'>
            {!section ? (
              <MobileSettingsList user={user} onSelect={setSection} onLogout={logout} />
            ) : (
              <MobileSectionContent section={section} user={user} login={login} />
            )}
          </div>
        </main>
      </div>
    </div>
  );

  function renderContent() {
    if (!section) {
      return (
        <div className='space-y-4'>
          <div className='bg-white rounded-xl p-5 border border-gray-100'>
            <p className='text-gray-500 text-sm'>请从左侧菜单选择设置项</p>
          </div>
        </div>
      );
    }
    if (section === 'profile') return <ProfilePanel user={user} login={login} />;
    if (section === 'password') return <PasswordPanel />;
    if (section === 'api-key') return <ApiKeyPanel />;
    if (section === 'members') return <MembersPanel />;
    if (section === 'tags') return <TagsPanel />;
    if (section === 'groups') return <GroupsPanel />;
    return null;
  }
}

function MobileSettingsList({ user, onSelect, onLogout }) {
  return (
    <div className='space-y-4'>
      {/* 用户信息卡片 */}
      <div className='bg-white rounded-xl p-4 border border-gray-100'>
        <div className='flex items-center gap-4'>
          <div className='w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-2xl font-semibold overflow-hidden flex-shrink-0 shadow-sm'>
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt='avatar' className='w-full h-full object-cover' />
            ) : (
              (user?.nickname || user?.username || 'U')[0].toUpperCase()
            )}
          </div>
          <div className='flex-1 min-w-0'>
            <div className='font-semibold text-gray-900 text-lg truncate'>{user?.nickname || user?.username || '用户'}</div>
            <div className='text-sm text-gray-500 truncate'>{user?.username}</div>
          </div>
        </div>
      </div>

      {/* 设置项列表 */}
      <div className='bg-white rounded-xl border border-gray-100 overflow-hidden'>
        {SECTIONS.map(({ id, label, icon: Icon }, idx) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors ${
              idx > 0 ? 'border-t border-gray-50' : ''
            }`}
          >
            <div className='w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0'>
              <Icon className='h-4 w-4' style={{ color: '#5a7a00' }} />
            </div>
            <span className='flex-1 text-left text-base text-gray-800'>{label}</span>
            <ChevronRight className='h-4 w-4 text-gray-300 flex-shrink-0' />
          </button>
        ))}
      </div>

      {/* 退出登录 */}
      <button
        onClick={onLogout}
        className='w-full bg-white rounded-xl border border-red-100 py-3.5 text-red-500 font-medium text-base active:bg-red-50 transition-colors'
      >
        退出登录
      </button>
    </div>
  );
}

function MobileSectionContent({ section, user, login }) {
  if (section === 'profile') return <ProfilePanel user={user} login={login} />;
  if (section === 'password') return <PasswordPanel />;
  if (section === 'api-key') return <ApiKeyPanel />;
  if (section === 'members') return <MembersPanel />;
  if (section === 'tags') return <TagsPanel />;
  if (section === 'groups') return <GroupsPanel />;
  return null;
}

// ── 个人资料面板 ────────────────────────────────────────────────
function ProfilePanel({ user, login }) {
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('图片不能超过 2MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('仅支持 jpg/png/webp/gif'); return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch('/api/auth/avatar', { method: 'POST', credentials: 'include', body: fd });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setAvatarUrl(json.data.avatar_url);
      login(localStorage.getItem('ai_buddy_token'), { ...user, avatar_url: json.data.avatar_url });
      toast.success('头像上传成功');
    } catch (e) {
      toast.error('上传失败：' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatar_url: avatarUrl }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error.message); return; }
      login(localStorage.getItem('ai_buddy_token'), { ...user, ...json.data });
      toast.success('资料更新成功');
    } catch (e) {
      toast.error('更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-5 bg-white rounded-xl p-4 border border-gray-100'>
      <div className='flex flex-col items-center gap-3 py-4'>
        <label className='relative cursor-pointer'>
          <div className='w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-3xl font-semibold overflow-hidden shadow-sm'>
            {avatarUrl ? (
              <img src={avatarUrl} alt='avatar' className='w-full h-full object-cover' />
            ) : (
              (user?.nickname || user?.username || 'U')[0].toUpperCase()
            )}
          </div>
          <div className='absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm'>
            {uploading ? <Loader2 className='h-4 w-4 animate-spin text-gray-600' /> : <Camera className='h-4 w-4 text-gray-600' />}
          </div>
          <input type='file' accept='image/jpeg,image/png,image/webp,image/gif' className='hidden'
            onChange={(e) => handleUpload(e.target.files?.[0])} disabled={uploading} />
        </label>
        <p className='text-xs text-gray-400'>点击头像更换 · jpg/png/webp · 不超过 2MB</p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='nickname' className='text-sm text-gray-600'>昵称</Label>
        <Input id='nickname' value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder='输入你的昵称' className='h-12 text-base bg-gray-50' />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='username' className='text-sm text-gray-600'>用户名</Label>
        <Input id='username' value={user?.username || ''} disabled className='h-12 bg-gray-100 text-gray-500' />
        <p className='text-xs text-gray-400'>用户名注册后不可修改</p>
      </div>

      <Button onClick={handleSave} disabled={saving} className='w-full h-12 text-base border-0 mt-2' style={{ backgroundColor: '#bbea3b', color: '#2d4a00' }}>
        {saving ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <Save className='w-4 h-4 mr-2' />}
        {saving ? '保存中...' : '保存修改'}
      </Button>
    </div>
  );
}

// ── 修改密码面板 ──────────────────────────────────────────────────
function PasswordPanel() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) { toast.error('两次输入的新密码不一致'); return; }
    if (newPassword.length < 6) { toast.error('新密码至少 6 个字符'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error.message); return; }
      toast.success('密码修改成功');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) {
      toast.error('修改失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-4 bg-white rounded-xl p-4 border border-gray-100'>
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='old-password' className='text-sm text-gray-600'>原密码</Label>
          <Input id='old-password' type='password' value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder='请输入原密码' className='h-12 text-base bg-gray-50' />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='new-password' className='text-sm text-gray-600'>新密码</Label>
          <Input id='new-password' type='password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder='请输入新密码（至少6位）' className='h-12 text-base bg-gray-50' />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='confirm-password' className='text-sm text-gray-600'>确认新密码</Label>
          <Input id='confirm-password' type='password' value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder='请再次输入新密码' className='h-12 text-base bg-gray-50' />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={saving} className='w-full h-12 text-base border-0' style={{ backgroundColor: '#bbea3b', color: '#2d4a00' }}>
        {saving ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <Lock className='w-4 h-4 mr-2' />}
        {saving ? '修改中...' : '修改密码'}
      </Button>
    </div>
  );
}

// ── API Key 面板 ──────────────────────────────────────────────────
function ApiKeyPanel() {
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);
  const [revealingId, setRevealingId] = useState(null);

  useEffect(() => { loadApiKeys(); }, []);

  async function loadApiKeys() {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/auth/api-keys', { credentials: 'include' });
      const json = await res.json();
      if (!json.error) setApiKeys(json.data || []);
    } catch (e) { console.error('加载失败', e); }
    finally { setLoadingKeys(false); }
  }

  const handleCreate = async () => {
    if (!newKeyName.trim()) { toast.error('请输入 Key 名称'); return; }
    setCreatingKey(true);
    try {
      const res = await fetch('/api/auth/api-keys', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setNewlyCreated(json.data); setShowKey(true); setNewKeyName('');
      await loadApiKeys();
      toast.success('已创建 API Key，请立即保存明文');
    } catch (e) { toast.error('创建失败：' + e.message); }
    finally { setCreatingKey(false); }
  };

  const handleReveal = async (k) => {
    if (revealedKey?.id === k.id) { setRevealedKey(null); return; }
    setRevealingId(k.id);
    try {
      const res = await fetch(`/api/auth/api-keys/${k.id}/reveal`, { credentials: 'include' });
      const json = await res.json();
      if (json.error) toast.error(json.error.message || '反查失败');
      else setRevealedKey({ id: k.id, api_key: json.data.api_key });
    } catch (e) { toast.error('反查失败：' + e.message); }
    finally { setRevealingId(null); }
  };

  const handleRevoke = async (id, name) => {
    if (!confirm(`确定撤销「${name}」吗？使用此 Key 的工具将立即失效。`)) return;
    try {
      const res = await fetch(`/api/auth/api-keys/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      toast.success('已撤销');
      await loadApiKeys();
    } catch (e) { toast.error('撤销失败：' + e.message); }
  };

  const copyKey = (t) => navigator.clipboard.writeText(t).then(() => toast.success('已复制'), () => toast.error('复制失败'));

  return (
    <div className='space-y-4 bg-white rounded-xl p-4 border border-gray-100'>
      {newlyCreated && (
        <div className='p-3 border border-amber-300 bg-amber-50 rounded-lg space-y-2'>
          <div className='flex items-center gap-2 text-amber-900 text-sm font-medium'>
            <AlertTriangle className='h-4 w-4' /> 请立即保存 API Key
          </div>
          <div className='text-xs text-amber-800'>请立即复制保存。之后也可在列表中点「眼睛」图标再次查看明文。</div>
          <div className='flex items-center gap-1'>
            <code className='flex-1 px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-mono break-all'>
              {showKey ? newlyCreated.api_key : '•'.repeat(40)}
            </code>
            <Button size='sm' variant='ghost' onClick={() => setShowKey(!showKey)}>
              {showKey ? <EyeOff className='h-3 w-3' /> : <Eye className='h-3 w-3' />}
            </Button>
            <Button size='sm' variant='ghost' onClick={() => copyKey(newlyCreated.api_key)}><Copy className='h-3 w-3' /></Button>
          </div>
          <Button size='sm' variant='outline' onClick={() => { setNewlyCreated(null); setShowKey(false); }} className='w-full'>我已保存，关闭</Button>
        </div>
      )}

      <div className='flex gap-2'>
        <Input placeholder='Key 名称（如：Claude SKILL）' value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} className='h-12 text-base bg-gray-50' />
        <Button onClick={handleCreate} disabled={creatingKey} size='sm' className='border-0 h-12 px-4' style={{ backgroundColor: '#bbea3b', color: '#2d4a00' }}>
          <Plus className='h-4 w-4 mr-1' /> {creatingKey ? '创建中...' : '创建'}
        </Button>
      </div>

      {loadingKeys ? (
        <div className='text-xs text-gray-500 py-6 text-center'>加载中...</div>
      ) : apiKeys.length === 0 ? (
        <div className='text-xs text-gray-500 py-6 text-center'>还没有 API Key</div>
      ) : (
        <div className='space-y-2'>
          {apiKeys.map((k) => (
            <div key={k.id} className='px-3 py-3 border border-gray-100 rounded-lg bg-gray-50'>
              <div className='flex items-center gap-2'>
                <Key className='h-4 w-4 text-gray-400 shrink-0' />
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    <span className='font-medium text-gray-900 truncate'>{k.name}</span>
                    {!k.is_active && <Badge variant='destructive' className='text-[10px] py-0'>已撤销</Badge>}
                    {k.is_active && k.last_used_at && (
                      <Badge variant='outline' className='text-[10px] py-0 text-green-600 border-green-300'>
                        <CheckCircle2 className='h-2.5 w-2.5 mr-0.5' />活跃
                      </Badge>
                    )}
                    {k.is_legacy && k.is_active && (
                      <Badge variant='outline' className='text-[10px] py-0 text-gray-500 border-gray-300'>旧格式</Badge>
                    )}
                  </div>
                  <div className='text-[11px] text-gray-500 font-mono truncate mt-0.5'>{k.key_prefix}...</div>
                </div>
                {k.is_active && (
                  <div className='flex items-center gap-1 flex-shrink-0'>
                    <Button size='sm' variant='ghost' onClick={() => handleReveal(k)} disabled={!!revealingId || k.is_legacy}
                      className='h-8 w-8 p-0 text-gray-500 hover:bg-gray-100'>
                      {revealingId === k.id ? <Loader2 className='h-4 w-4 animate-spin' /> : (revealedKey?.id === k.id ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />)}
                    </Button>
                    <Button size='sm' variant='ghost' onClick={() => handleRevoke(k.id, k.name)} className='h-8 w-8 p-0 text-red-500 hover:bg-red-50'>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                )}
              </div>
              {revealedKey?.id === k.id && (
                <div className='flex items-center gap-2 mt-2.5'>
                  <code className='flex-1 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs font-mono break-all'>
                    {revealedKey.api_key}
                  </code>
                  <Button size='sm' variant='ghost' onClick={() => copyKey(revealedKey.api_key)} className='h-8 w-8 p-0 flex-shrink-0'>
                    <Copy className='h-4 w-4' />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className='text-[11px] text-gray-500 leading-relaxed p-3 bg-blue-50 border border-blue-200 rounded-lg'>
        <strong className='text-blue-900'>用法：</strong>创建后保存到工具配置文件（如 <code className='bg-white px-1 rounded'>~/.buddy-skill/config.json</code>），请求时在 Header 携带 <code className='bg-white px-1 rounded'>X-API-Key: 你的Key</code>。
      </div>
    </div>
  );
}

export default SettingsCenter;
