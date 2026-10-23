import React, {useState} from 'react';
import {Pressable,View} from 'react-native';
import {theme as t} from '../design/theme';
export function Seek({value,max,onChange}:{value:number;max:number;onChange:(value:number)=>void}){
 const [width,setWidth]=useState(1);
 return <Pressable accessibilityRole="adjustable" accessibilityLabel="Playback position" accessibilityValue={{min:0,max:Math.floor(max),now:Math.floor(value)}}
  accessibilityActions={[{name:'increment'},{name:'decrement'}]} onAccessibilityAction={e=>onChange(value+(e.nativeEvent.actionName==='increment'?5:-5))}
  onLayout={e=>setWidth(e.nativeEvent.layout.width)} onPress={e=>onChange(e.nativeEvent.locationX/width*max)} style={{minHeight:t.layout.touch,justifyContent:'center'}}>
  <View style={{height:t.space[4],backgroundColor:t.color.border,borderRadius:t.radius.pill}}><View style={{height:t.space[4],width:`${max?Math.min(100,value/max*100):0}%`,backgroundColor:t.color.accent,borderRadius:t.radius.pill}}/></View>
 </Pressable>;
}
