const CACHE_NAME = "ahlong-v3";
const ASSETS = ["/mydigital-ahlong/", "/mydigital-ahlong/index.html"];

self.addEventListener("install", (event) => {
	self.skipWaiting();
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (event) => {
	event.respondWith(
		fetch(event.request)
			.then((response) => {
				const clone = response.clone();
				caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
				return response;
			})
			.catch(() => caches.match(event.request)),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(clients.claim().then(() => caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))));
});
