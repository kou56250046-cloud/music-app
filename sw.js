/* Prism — Service Worker
   役割: アプリ本体（HTML/アイコン/フォント）をキャッシュし、
   機内モードでも起動できるようにする。
   音楽ファイルはここではなくIndexedDBに入っているので対象外。 */

const VERSION = "prism-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./fonts/space-grotesk-latin.woff2",
  "./vendor/peerjs.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      // 1つでも欠けると全体が失敗するaddAllは使わない。
      // アイコンの取得に失敗してもアプリ本体は起動できるようにする。
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* キャッシュを最優先で返し、更新は裏で取りに行く。
   「圏内だが極端に遅い」場所でも待たされずに起動できる。
   更新した内容は、次にアプリを開いたときに反映される。 */
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  if(new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(hit => {
      const fresh = fetch(req).then(res => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit || caches.match("./index.html"));

      // キャッシュがあれば即返す。裏の取得はSWが終了しないよう繋ぎ止めておく。
      if(hit){ e.waitUntil(fresh.catch(() => {})); return hit; }
      return fresh;
    })
  );
});
