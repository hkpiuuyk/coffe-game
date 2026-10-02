import { useRef, useState } from 'react';
import Cafe from './Cafe.jsx';
import { authenticate, loadProgress } from './local-account.js';
import './login.css';

export default function Login() {
  const [session, setSession] = useState(null);
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (register && password !== confirm) { setError('비밀번호 확인이 일치하지 않아요.'); return; }
    submitting.current = true;
    setBusy(true);
    try {
      const user = await authenticate(window.localStorage, name, password, register);
      const progress = loadProgress(window.localStorage, user.id);
      setSession({ user, progress });
      setPassword(''); setConfirm('');
    } catch (err) {
      setError(err.name === 'SecurityError' || err.name === 'QuotaExceededError' ? '브라우저 저장 공간을 사용할 수 없어요. 저장 권한과 공간을 확인해 주세요.' : err.message || '로그인하지 못했어요. 다시 시도해 주세요.');
    } finally { submitting.current = false; setBusy(false); }
  }
  if (session) return <Cafe key={session.user.id} user={session.user} savedState={session.progress} onLogout={() => { setSession(null); setRegister(false); setError(''); }} />;
  return <main className="login-page"><section className="login-art" aria-label="작은 커피, 좋은 하루"><div className="login-brand">LITTLE CUP <span>COFFEE SHOP</span></div><div className="login-awning"/><div className="login-illustration"><span className="steam">﹏　﹏　﹏</span><div className="welcome-cup">little<br/>cup<span>☕</span></div><div className="cup-saucer"/></div><h1>작은 커피,<br/>좋은 하루.</h1><p>당신의 손끝에서 시작되는<br/>따뜻한 카페 이야기.</p><small>BREW A LITTLE HAPPINESS</small></section><section className="login-panel"><div className="login-form-wrap"><small className="login-eyebrow">WELCOME, BARISTA</small><h2>{register ? '나만의 카페를 시작해요' : '사장님, 어서 오세요'}</h2><p>{register ? '새 계정을 만들고 첫 번째 손님을 맞아 보세요.' : '로그인하고 지난번 카페를 이어서 운영하세요.'}</p><div className="login-tabs"><button type="button" disabled={busy} aria-pressed={!register} className={!register?'active':''} onClick={()=>{setRegister(false);setError('');}}>로그인</button><button type="button" disabled={busy} aria-pressed={register} className={register?'active':''} onClick={()=>{setRegister(true);setError('');}}>회원가입</button></div><form onSubmit={submit}><label htmlFor="username">아이디</label><input id="username" autoComplete="username" placeholder="원하는 아이디를 자유롭게 입력하세요" value={name} onChange={e=>setName(e.target.value)} required disabled={busy}/><label htmlFor="password">비밀번호</label><input id="password" type="password" autoComplete={register?'new-password':'current-password'} placeholder="8자 이상 입력해 주세요" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required disabled={busy}/>{register && <><label htmlFor="confirm-password">비밀번호 확인</label><input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} maxLength={128} required disabled={busy}/></>}<div className="login-error" role="alert">{error}</div><button className="primary login-submit" disabled={busy}>{busy?'잠시만 기다려 주세요…':register?'회원가입하고 가게 열기 →':'로그인하고 가게 열기 →'}</button></form><div className="local-note"><b>이 브라우저에서 즐기는 데모 계정</b><p>계정과 진행 상황은 현재 브라우저에만 저장됩니다. 다른 기기와 동기화되지 않으며, 브라우저 데이터를 지우면 사라집니다. 다른 서비스에서 사용하는 비밀번호는 입력하지 마세요.</p></div></div></section></main>;
}
