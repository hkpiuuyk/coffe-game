import { useId } from 'react';
import sheet from './assets/customers.png';
import './customers.css';

// Display each character from the original transparent sheet without altering it.
const portraits = [
  { box: '0 60 380 827', outline: '0,0 338,0 338,735 380,887 0,887' },
  { box: '340 0 355 887', outline: '340,0 695,0 695,887 390,887 340,735' },
  { box: '700 75 325 812', outline: '700,0 1000,0 1000,290 1025,500 1025,887 700,887' },
  { box: '1000 0 430 887', outline: '1000,0 1430,0 1430,887 1030,887 1030,500 1000,290' },
  { box: '1435 65 339 822', outline: '1435,0 1774,0 1774,887 1435,887' },
];
export default function Customer({ index, name }) {
  const clipId = `customer-${useId().replace(/:/g, '')}`;
  const portrait = portraits[index % portraits.length];
  return <div className="illustrated-customer" key={index}>
    <svg viewBox={portrait.box} role="img" aria-label={`${name} 손님`}>
      <defs><clipPath id={clipId}><polygon points={portrait.outline}/></clipPath></defs>
      <image href={sheet} width="1774" height="887" clipPath={`url(#${clipId})`}/>
    </svg>
  </div>;
}
