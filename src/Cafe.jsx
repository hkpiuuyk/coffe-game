import { useEffect, useReducer, useState } from 'react';
import { saveProgress } from './local-account.js';
import Customer from './Customer.jsx';
import './workbench.css';
import { ingredients, initialState, reducer, shopItems, availableIngredients, availableRecipes, levelOf, priceOf, brewRange, ingredientCost } from './cafe-game.js';

const won = n => `₩${n.toLocaleString()}`;
const names = ['지우', '도윤', '하린', '민석', '소윤'];
export default function Cafe({ user, savedState, onLogout }) {
  const [s, dispatch] = useReducer(reducer, savedState, value => value || initialState());
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    try { saveProgress(window.localStorage, user.id, s); setSaveError(false); }
    catch { setSaveError(true); }
  }, [s, user.id]);
  const [book, setBook] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [overCup, setOverCup] = useState(false);
  const canPour = s.stage === 'prep' && s.cup && s.parts.length < 5;
  function endDrag() { setDragging(null); setOverCup(false); }
  function dropIngredient(event) {
    event.preventDefault();
    const id = event.dataTransfer.getData('application/x-little-cup-ingredient');
    if (canPour && dragging === id) dispatch({ type: 'pour', id });
    endDrag();
  }
  const act = type => dispatch({ type });
  useEffect(() => { const timer = setInterval(() => dispatch({ type: 'tick' }), 100); return () => clearInterval(timer); }, []);
  const counter = ['counter', 'result'].includes(s.stage);
  const range = brewRange(s);
  return <main className="game">
    <div className="account-bar"><span className={saveError?'save-warning':''} role="status">{saveError?'진행 상황 저장 실패 · 브라우저 저장 공간을 확인해 주세요.':'자동 저장 중'}</span><span>{user.id} 사장님</span><button onClick={onLogout}>로그아웃</button></div>
    <header className="hud"><div className="wordmark">☕ 작은 커피, 좋은 하루<small>LITTLE CUP · COFFEE SHOP</small></div><div className="hud-stat">영업 {s.day}일차<small>{s.customer + 1} / 5번째 손님</small></div><div className="hud-stat money">{won(s.wallet)}<small>보유 금액</small></div><button onClick={() => setBook(true)}>📖 레시피</button></header>
    <div className="chapter"><span>{counter ? '01 / 카운터' : s.stage === 'prep' ? '02 / 작업대' : s.stage === 'summary' ? '오늘의 영업 종료' : s.stage === 'shop' ? '04 / 마감 후 상점' : '03 / 제조 & 서빙'}</span><span>{!['summary', 'shop'].includes(s.stage) && <>손님 인내심 <meter min="0" max="100" value={s.patience} /> {Math.ceil(s.patience)}%</>}</span></div>
    {counter ? <section className="shop scene">
      <div className="speech"><small>{names[s.customer]} · {s.stage === 'result' ? '손님의 한마디' : '오늘의 주문'}</small><p>{s.stage === 'result' ? s.result.text : s.clarified ? `${s.order.name}요. ${s.order.parts.map(id => ingredients.find(i => i.id === id).name).join(' + ')}로 만들어 주세요!` : s.order.line}</p><div className="dialog-actions">{s.stage === 'counter' ? <><button onClick={() => act('clarify')} disabled={s.clarified}>정확히 어떤 음료인가요?</button><button className="primary" onClick={() => act('accept')}>만들어 드릴게요 →</button></> : <><span>{s.result.success ? `음료 ${won(s.result.sales)} + 팁 ${won(s.result.tip)}` : `결제 ${won(s.result.sales)} · 환불 ${won(s.result.refund)}`}</span><button className="primary" onClick={() => act('next')}>{s.customer === 4 ? '영업 마감 →' : '다음 손님 →'}</button></>}</div></div>
      <Customer index={s.customer} name={names[s.customer]} />
      <div className="illustrated-counter" aria-hidden="true" />
    </section> : s.stage === 'summary' ? <section className="summary scene"><div className="receipt"><small>LITTLE CUP · DAILY REPORT</small><h1>오늘도 수고했어요!</h1><p>{s.day}일차 · 만족한 손님 {s.happy} / 5명</p>{[['음료 매출',s.sales],['받은 팁',s.tips],['재료비',-s.costs],['환불',-s.refunds],['임대료',-1500]].map(([label,value]) => <div className="receipt-row" key={label}><span>{label}</span><b>{won(value)}</b></div>)}<div className="receipt-row total"><span>오늘 순이익</span><b>{won(s.sales+s.tips-s.costs-s.refunds-1500)}</b></div><button className="primary" onClick={() => act('shop')}>강화 · 재료 상점으로 →</button></div></section> : s.stage === 'shop' ? <section className="upgrade-shop scene">
      <div className="store-heading"><div><small>AFTER HOURS · 내일을 위한 준비</small><h1>조금 더 좋은 카페로.</h1><p>새 재료는 한 번 구매하면 계속 사용할 수 있어요.<br/>음료를 만들 때마다 분량별 재료비는 별도로 차감돼요.</p></div><div className="store-balance">사용 가능한 돈<strong>{won(s.wallet)}</strong><small>오늘 상점에서 쓴 돈 {won(s.purchases)}</small></div></div>
      <div className="store-grid">{shopItems.map(item => { const level = levelOf(s, item); const maxed = level >= item.max; const price = priceOf(s, item); return <article className={`store-card ${maxed ? 'owned' : ''}`} key={item.id}><span className="store-icon">{item.icon}</span><small>{item.material ? '새 재료 · 메뉴 해금' : `시설 강화 · Lv.${level} / ${item.max}`}</small><h2>{item.name}</h2><p>{item.desc}</p>{!item.material && <div className="level-dots" aria-label={`${level}레벨`}>{Array.from({length:item.max},(_,i)=><i className={i<level?'filled':''} key={i}/>)}</div>}<button className={maxed?'':'primary'} disabled={maxed || s.wallet<price} onClick={()=>dispatch({type:'buy',id:item.id})}>{maxed ? item.material ? '✓ 구매 완료' : '✓ 최대 강화' : `${won(price)} · ${s.wallet<price?'금액 부족':item.material?'해금하기':'강화하기'}`}</button></article>; })}</div>
      <div className="store-footer"><p role="status">{s.shopMessage || '구매하지 않고 다음 날로 넘어가도 괜찮아요.'}</p><button className="primary" onClick={()=>act('day')}>다음 날 가게 열기 →</button></div>
    </section> : <section className="work scene">
      <aside className="ticket"><small>ORDER #{s.customer + 1}</small><h3>{names[s.customer]} 님</h3><p>“{s.order.line}”</p>{s.clarified && <strong>{s.order.name}</strong>}<hr/><p>가운데 재료를 끌어서<br/>컵 위에 놓아 주세요.</p><small>한 번 드롭하면 한 분량!<br/>버린 재료도 비용에 포함됩니다.</small></aside>
      <div className="work-center"><div className="station-heading"><small>{s.stage === 'prep' ? 'MAKE IT WITH LOVE' : 'THE PERFECT FINISH'}</small><h2>{s.stage === 'prep' ? '한 잔을 만드는 시간' : s.stage === 'brew' ? '초록 구간에서 멈춰 주세요!' : s.quality === 100 ? '잘 만들어진 한 잔!' : '조금 아쉬운 완성도…'}</h2></div>
      <div className={`machine ${s.stage === 'brew' ? 'running' : ''}`}><div className="machine-top"><span>BEAN / Lv.{s.upgrades.machine}</span><i/></div><div className="spout"/><div className="stream"/></div>
      <div className="cup-area">{s.cup ? <button className={`drink-cup ${canPour && dragging ? 'drop-available' : ''} ${canPour && overCup ? 'drop-hover' : ''}`} onClick={() => act('pour')} disabled={!canPour} onDragOver={event => { if (canPour && dragging) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setOverCup(true); } }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOverCup(false); }} onDrop={dropIngredient} aria-label="재료를 여기에 드롭하거나 클릭해 선택한 재료 넣기"><div className="liquids">{s.parts.map((id,i) => <div key={i} style={{background:ingredients.find(x=>x.id===id).color}}>{ingredients.find(x=>x.id===id).icon}</div>)}</div><span className="cup-logo">{canPour && overCup ? <>여기에<br/>놓기 ↓</> : <>little<br/>cup</>}</span></button> : <button className="empty-cup" onClick={() => act('cup')}>＋<br/><small>컵 놓기 · ₩100</small></button>}</div>
      <section className="center-ingredients" aria-label="가운데 재료 트레이"><div className="ingredient-instruction">{!s.cup ? '먼저 컵 놓기를 눌러 주세요' : s.parts.length >= 5 ? '컵이 가득 찼어요 · 제조를 시작하세요' : '재료를 끌어서 컵에 드롭하세요'}<small>드롭 1회 = 1분량 · 최대 5분량</small></div><div className="ingredient-tray">{availableIngredients(s).map(i => <button key={i.id} draggable={canPour} className={`ingredient-jar ${s.selected===i.id?'selected':''} ${dragging===i.id?'dragging':''}`} disabled={!canPour} onDragStart={event=>{event.dataTransfer.setData('application/x-little-cup-ingredient',i.id);event.dataTransfer.effectAllowed='copy';setDragging(i.id);setOverCup(false);}} onDragEnd={endDrag} onClick={()=>dispatch({type:'select',id:i.id})}><span className="jar-icon" style={{background:i.color}}>{i.icon}</span><strong>{i.name}</strong><small>{won(ingredientCost(s,i))} / 분량</small></button>)}</div><small className="alternative-controls">터치·키보드: 재료 선택 후 컵을 눌러도 넣을 수 있어요.</small></section>
      <div className="work-status" aria-live="polite">{s.parts.length ? s.parts.map(id => ingredients.find(i=>i.id===id).name).join(' + ') : '먼저 컵을 놓아 주세요.'}</div>
      {s.stage === 'brew' && <div className="brew-meter"><span style={{left:`${range[0]}%`,width:`${range[1]-range[0]}%`}}/><i style={{left:`${s.brew}%`}}/><small>추출 · 혼합</small></div>}
      <div className="work-actions">{s.stage === 'prep' ? <><button onClick={() => act('discard')} disabled={!s.cup}>비우고 다시 만들기</button><button className="primary" onClick={() => act('brew')} disabled={!s.parts.length}>제조 시작 →</button></> : s.stage === 'brew' ? <button className="primary" onClick={() => act('stop')}>지금 멈추기!</button> : <button className="primary" onClick={() => act('serve')}>카운터로 가져가 서빙 →</button>}</div></div>
    </section>}
    <footer><span>☀ 작은 커피, 좋은 하루</span><span>주문받기 → 재료 넣기 → 제조 → 서빙 → 하루 정산</span></footer>
    {book && <div className="modal-backdrop"><section className="recipe-book" role="dialog" aria-modal="true" aria-label="레시피 노트"><button className="close" onClick={()=>setBook(false)}>닫기 ×</button><small>BARISTA'S NOTEBOOK</small><h2>우리 가게 레시피</h2><p>재료 순서는 자유! 이름이 두 번 나오면 두 번 넣어 주세요.</p>{availableRecipes(s).map(r=><div className="book-row" key={r.name}><strong>{r.name}</strong><span>{r.parts.map(id=>ingredients.find(i=>i.id===id).name).join(' + ')}</span></div>)}<p>제조 게이지의 초록 구간({range[0]}~{range[1]}%)에서 멈추면 완벽한 품질!<br/>손님이 기다리는 동안에도 시간은 흐릅니다.</p></section></div>}
  </main>;
}
