import { useEffect, useMemo, useState } from 'react';

const recipes = [
  { id: 'americano', name: '아메리카노', en: 'AMERICANO', price: 3200, icon: '☕', items: ['컵', '에스프레소', '물'], customer: '도윤', face: '🧑🏻', line: '쓴 커피 한 잔이면 오늘을 버틸 수 있을 것 같아요.' },
  { id: 'latte', name: '카페라떼', en: 'CAFE LATTE', price: 4100, icon: '🥛', items: ['컵', '에스프레소', '우유'], customer: '유나', face: '👩🏻', line: '부드러운 라떼로 부탁해요. 오늘은 조금 긴 하루네요.' },
  { id: 'icedTea', name: '아이스티', en: 'ICED TEA', price: 3500, icon: '🫖', items: ['컵', '얼음', '티'], customer: '민석', face: '🧑🏽', line: '시원한 아이스티 하나요! 얼음도 잊지 말아 주세요.' },
];

const ingredients = [
  { name: '컵', icon: '◒', tone: 'cream' },
  { name: '얼음', icon: '❄', tone: 'ice' },
  { name: '에스프레소', icon: '●', tone: 'coffee' },
  { name: '우유', icon: '◌', tone: 'milk' },
  { name: '물', icon: '≈', tone: 'water' },
  { name: '티', icon: '✦', tone: 'tea' },
];

const orderFor = () => recipes[Math.floor(Math.random() * recipes.length)];

export default function App() {
  const [order, setOrder] = useState(() => orderFor());
  const [tray, setTray] = useState([]);
  const [money, setMoney] = useState(12500);
  const [stars, setStars] = useState(4.8);
  const [streak, setStreak] = useState(0);
  const [time, setTime] = useState(30);
  const [message, setMessage] = useState('주문을 확인하고 재료를 담아보세요.');
  const [lastResult, setLastResult] = useState(null);
  const [stage, setStage] = useState('making');

  useEffect(() => {
    if (time <= 0) return;
    const tick = window.setInterval(() => setTime((current) => current - 1), 1000);
    return () => window.clearInterval(tick);
  }, [time, order]);

  useEffect(() => {
    if (time !== 0) return;
    setMessage('손님이 기다리다 떠났어요. 다음 주문을 받아요!');
    setLastResult('fail');
  }, [time]);

  const progress = useMemo(() => Math.max(0, (time / 30) * 100), [time]);

  function addIngredient(name) {
    if (time === 0 || stage !== 'making') return;
    if (tray.length >= 4) {
      setMessage('트레이가 가득 찼어요. 하나를 빼거나 서빙하세요.');
      return;
    }
    setTray((current) => [...current, name]);
    setMessage(`${name}을(를) 담았어요.`);
  }

  function serve() {
    if (time === 0) {
      nextOrder();
      return;
    }
    if (stage !== 'ready') {
      setMessage('재료를 모두 담은 뒤, 머신에서 음료를 완성해 주세요.');
      return;
    }
    const correct = tray.length === order.items.length && tray.every((item, index) => item === order.items[index]);
    if (correct) {
      const fastBonus = time > 17 ? 700 : time > 8 ? 300 : 0;
      const earned = order.price + fastBonus;
      setMoney((current) => current + earned);
      setStars((current) => Math.min(5, +(current + 0.1).toFixed(1)));
      setStreak((current) => current + 1);
      setMessage(`완벽해요! ₩${earned.toLocaleString()}을 벌었습니다.`);
      setLastResult('success');
      window.setTimeout(nextOrder, 900);
    } else {
      setStreak(0);
      setStars((current) => Math.max(1, +(current - 0.2).toFixed(1)));
      setMessage('주문과 달라요. 레시피를 다시 확인해 보세요!');
      setLastResult('fail');
    }
  }

  function nextOrder() {
    setOrder(orderFor());
    setTray([]);
    setTime(30);
    setLastResult(null);
    setStage('making');
    setMessage('새 손님이 들어왔어요. 주문을 준비하세요!');
  }

  return (
    <main className="app-shell">
      <nav>
        <div className="brand"><span className="brand-mark">B</span><span>Bean Rush</span></div>
        <div className="open-pill"><i /> OPEN · DAY 01</div>
        <button className="help" onClick={() => setMessage('레시피 순서대로 재료를 담고 서빙 버튼을 눌러보세요.')}>?</button>
      </nav>

      <header>
        <div><p className="eyebrow">TODAY'S SHIFT</p><h1>작지만 바쁜<br /><em>오전의 카페.</em></h1></div>
        <div className="stats">
          <Stat label="오늘 매출" value={`₩${money.toLocaleString()}`} />
          <Stat label="카페 별점" value={`★ ${stars}`} accent />
          <Stat label="연속 성공" value={`${streak}잔`} />
        </div>
      </header>

      <section className="game-grid">
        <aside className="order-card paper">
          <div className="ticket-holes"><span /><span /></div>
          <p className="ticket-label">ORDER #0{streak + 18}</p>
          <div className="customer-chat"><span>{order.face}</span><div><b>{order.customer}</b><p>“{order.line}”</p></div></div>
          <div className="drink-icon">{order.icon}</div>
          <h2>{order.name}</h2><p className="english">{order.en}</p>
          <div className="order-line" />
          <p className="recipe-label">RECIPE</p>
          <ol>{order.items.map((item) => <li key={item}>{item}</li>)}</ol>
          <p className="price">₩{order.price.toLocaleString()}</p>
          <div className="timer"><div className="timer-label"><span>손님 대기 시간</span><b>00:{String(time).padStart(2, '0')}</b></div><div className="timer-track"><span style={{ width: `${progress}%` }} /></div></div>
        </aside>

        <section className="bar-area">
          <div className="counter-title"><div><p className="eyebrow">MAKE YOUR DRINK</p><h2>바리스타 바</h2></div><div className={`status ${lastResult || ''}`}>{message}</div></div>
          <div className="ingredients">
            {ingredients.map((ingredient) => <button key={ingredient.name} className="ingredient" onClick={() => addIngredient(ingredient.name)}><span className={`ingredient-icon ${ingredient.tone}`}>{ingredient.icon}</span><span>{ingredient.name}</span></button>)}
          </div>
          <div className="tray-panel">
            <div className="tray-head"><span>나의 트레이</span><button onClick={() => { setTray([]); setMessage('트레이를 비웠어요.'); }}>비우기</button></div>
            <div className="tray-slots">
              {[0, 1, 2, 3].map((slot) => <div className={`slot ${tray[slot] ? 'filled' : ''}`} key={slot}>{tray[slot] ? <><b>{ingredients.find((i) => i.name === tray[slot])?.icon}</b><small>{tray[slot]}</small></> : <span>+</span>}</div>)}
            </div>
            <button className="brew" disabled={stage !== 'making' || tray.length === 0} onClick={() => { setStage('brewing'); setMessage('에스프레소 머신이 음료를 만들고 있어요...'); window.setTimeout(() => { setStage('ready'); setMessage('음료가 완성됐어요. 손님에게 서빙하세요!'); }, 1100); }}>{stage === 'brewing' ? '추출 중...' : stage === 'ready' ? '음료 완성!' : '☕ 머신에서 만들기'}</button>
            <button className="serve" onClick={serve}>{time === 0 ? '다음 주문 받기' : '완성 · 서빙하기'} <span>→</span></button>
          </div>
        </section>
      </section>
      <footer><span>DEMO VERSION · v0.1</span><span>정확하게, 그리고 빠르게. <b>GOOD MORNING!</b></span></footer>
    </main>
  );
}

function Stat({ label, value, accent }) { return <div className="stat"><span>{label}</span><strong className={accent ? 'accent' : ''}>{value}</strong></div>; }
