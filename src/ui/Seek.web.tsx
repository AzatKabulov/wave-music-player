import React from 'react';
import {theme as t} from '../design/theme';
export function Seek({value,max,onChange}:{value:number;max:number;onChange:(value:number)=>void}){
 return <input aria-label="Playback position" type="range" min={0} max={Math.max(1,max)} step={0.1} value={Math.min(value,max)} onChange={e=>onChange(Number(e.target.value))}
  style={{width:'100%',minHeight:t.layout.touch,accentColor:t.color.accent,margin:0,cursor:'pointer'}}/>;
}
