/* Prism — Service Worker
   役割: アプリ本体（HTML/アイコン/フォント）をキャッシュし、
   機内モードでも起動できるようにする。
   音楽ファイルはここではなくIndexedDBに入っているので対象外。 */

const VERSION = "prism-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
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

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);

  // 外部フォントは「あればキャッシュ、なければ取りに行って保存」
  if(url.origin !== self.location.origin){
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => new Response("", {status: 504})))
    );
    return;
  }

  // 自サイトは「まずネットワーク、失敗したらキャッシュ」
  // → 更新をすぐ反映しつつ、オフラインでも動く
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
  );
});
