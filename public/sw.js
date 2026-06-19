const CACHE_NAME = "ahlong-v2";
const SYNC_CACHE = "ahlong-sync";
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
	event.waitUntil(clients.claim().then(() => caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== SYNC_CACHE).map((k) => caches.delete(k))))));
});

// Handle messages for cross-context sync (Safari → PWA on iOS 16)
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SYNC_HASH") {
		caches.open(SYNC_CACHE).then((cache) => {
			const response = new Response(event.data.hash);
			cache.put("/mydigital-ahlong/__pending_hash", response);
		});
	} else if (event.data && event.data.type === "GET_PENDING_HASH") {
		const port = event.ports[0];
		caches.open(SYNC_CACHE).then((cache) => {
			cache.match("/mydigital-ahlong/__pending_hash").then((response) => {
				if (response) {
					response.text().then((hash) => {
						port.postMessage({ type: "PENDING_HASH", hash });
						cache.delete("/mydigital-ahlong/__pending_hash");
					});
				} else {
					port.postMessage({ type: "PENDING_HASH", hash: null });
				}
			});
		});
	}
});
