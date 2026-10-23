"""Original synthesized test recordings. No third-party samples or melodies."""
import json, math, random, struct, wave
from pathlib import Path
root = Path(__file__).resolve().parents[1]
out = root / 'public' / 'audio'
out.mkdir(parents=True, exist_ok=True)
def uid(n): return f'10000000-0000-4000-8000-{n:012d}'
releases = [
 ('Desert Hours','Meridian Ensemble','clay','Ambient','tk'),
 ('Caspian Blue','Tide Assembly','sea','Electronic','en'),
 ('After the City','Evening Arcade','night','Electronic','ru'),
 ('Golden Courtyard','Apricot Radio','sand','Instrumental','tk'),
 ('A Slower Sunday','Velvet Atlas','berry','Jazz','en'),
 ('Green Horizon','Field Notes','forest','Ambient','en'),
]
names = ['First Light','Open Road','Blue Current','Distant Shore','Night Windows','Late Connection','Warm Stone','Apricot Sky','Sunday Steps','Soft Corners','New Leaves','Small Hours']
catalog = {'artists':[], 'albums':[], 'tracks':[], 'playlists':[]}
for a,(title,artist,palette,genre,lang) in enumerate(releases):
 aid, albumid = uid(100+a),uid(200+a)
 catalog['artists'].append(dict(id=aid,name=artist,palette=palette,bio=f'An imaginary studio project exploring {genre.lower()} textures. Original Saz demo recordings.'))
 ids=[]
 for j in range(2):
  k=a*2+j; tid=uid(300+k); ids.append(tid)
  catalog['tracks'].append(dict(id=tid,title=names[k],artistId=aid,artist=artist,albumId=albumid,album=title,palette=palette,durationMs=24000,genre=genre,language=lang,explicit=False,available=True))
  rng=random.Random(k); rate=16000; seconds=24; base=110*2**((k%5)/12); notes=[0,7,12,16,19,24,14,7]
  with wave.open(str(out/f'{tid}.wav'),'wb') as f:
   f.setparams((1,2,rate,0,'NONE','not compressed')); frames=bytearray()
   for i in range(rate*seconds):
    t=i/rate; beat=t%0.375; n=int(t/0.375); freq=base*2**(notes[(n+k)%len(notes)]/12)
    pluck=math.sin(2*math.pi*freq*t)*math.exp(-beat*9)*0.19
    pad=sum(math.sin(2*math.pi*base*2**(o/12)*t) for o in [0,7,12])*0.045
    bass=math.sin(2*math.pi*base/2*t)*math.exp(-(t%1.5)*2)*0.12
    tick=(rng.random()*2-1)*math.exp(-beat*100)*0.07
    fade=min(1,t/1.2,(seconds-t)/1.5)
    frames.extend(struct.pack('<h',int(max(-1,min(1,(pluck+pad+bass+tick)*fade))*32767)))
   f.writeframes(frames)
 catalog['albums'].append(dict(id=albumid,title=title,artist=artist,artistId=aid,palette=palette,year=2026,trackIds=ids))
for k,(title,desc,palette,indices) in enumerate([
 ('The long way home','Room to breathe. Instrumentals for the journey.','clay',[0,3,6,10,1]),
 ('After dark','Soft electronics, city lights, and a little space.','night',[4,5,2,8,11]),
 ('Slow mornings','Start gently. Leave the rush outside.','forest',[10,8,6,9,0]),
]):
 catalog['playlists'].append(dict(id=uid(400+k),title=title,description=desc,palette=palette,owner=False,revision='0',items=[dict(id=uid(500+k*20+j),trackId=uid(300+i)) for j,i in enumerate(indices)]))
(root/'src/data/catalog.json').write_text(json.dumps(catalog,indent=2,ensure_ascii=False),encoding='utf-8')
print('Generated 12 original 24-second WAV recordings and fictional metadata.')
