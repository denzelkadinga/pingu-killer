/* Pingu Killer offline worker.
   - The site itself: network first, so a new version shows up straight away; cached copy when offline.
   - Game covers (Steam / Wikipedia): cache first, so every cover you have seen once appears instantly afterwards. */
const CACHE='pingu-killer-v0.2.6';
const COVERS='pingu-killer-covers-v1';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const COVER_HOSTS=['cdn.cloudflare.steamstatic.com','shared.cloudflare.steamstatic.com','steamcdn-a.akamaihd.net','upload.wikimedia.org'];

self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&x!==COVERS).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});

async function trimCovers(max){const c=await caches.open(COVERS);const keys=await c.keys();for(let i=0;i<keys.length-max;i++)await c.delete(keys[i])}

self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(COVER_HOSTS.includes(u.hostname)&&(req.destination==='image'||/\.(jpe?g|png|webp)$/i.test(u.pathname))){
    e.respondWith(caches.open(COVERS).then(async c=>{
      const hit=await c.match(req,{ignoreVary:true});if(hit)return hit;
      const r=await fetch(req);
      if(r.ok||r.type==='opaque'){c.put(req,r.clone()).then(()=>trimCovers(800)).catch(()=>{})}
      return r;
    }));
    return;
  }
  if(u.origin!==location.origin)return;
  e.respondWith(fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));return r}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
});
