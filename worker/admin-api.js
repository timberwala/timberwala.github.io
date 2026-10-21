// Cloudflare Worker: username/password auth + R2 stock management API.
// Deploy in Cloudflare dashboard (no local runtime needed).
//
// Required bindings and variables:
//   R2 binding: BUCKET
//   Secret: ADMIN_USERNAME
//   Secret: ADMIN_PASSWORD
//   Secret: TOKEN_SECRET            (long random string)
//   Var:    PUBLIC_BASE_URL         (example: https://pub-xxxx.r2.dev, no trailing slash)
//   Var:    ALLOWED_ORIGINS         (comma-separated origins, e.g. http://localhost:63342,https://centurywoodtimbers.com)
//   Var:    TOKEN_TTL_MINUTES       (optional, default 60)
//   Var:    MAX_UPLOAD_MB           (optional, default 90)

const PRODUCT_TYPES = ["acacia", "rosewood", "dandeli-teak"];
const MIME_EXT = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"video/mp4": "mp4",
	"video/webm": "webm"
};

const enc = new TextEncoder();

function toInt(v, fallback) {
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
}

function allowedOrigins(env) {
	return String(env.ALLOWED_ORIGINS || "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

function corsHeaders(request, env) {
	const origin = request.headers.get("Origin");
	const allowed = allowedOrigins(env);
	const headers = { "Vary": "Origin" };
	if (origin && allowed.includes(origin)) {
		headers["Access-Control-Allow-Origin"] = origin;
		headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
		headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
		headers["Access-Control-Max-Age"] = "600";
	}
	return headers;
}

function json(request, env, body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: Object.assign({
			"content-type": "application/json",
			"cache-control": "no-store"
		}, corsHeaders(request, env))
	});
}

function base64UrlEncodeBytes(bytes) {
	let s = "";
	new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); });
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeText(text) {
	return base64UrlEncodeBytes(enc.encode(text));
}

function base64UrlDecode(text) {
	let s = text.replace(/-/g, "+").replace(/_/g, "/");
	while (s.length % 4) { s += "="; }
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
	return out;
}

async function hmacSign(secret, text) {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}

async function hmacVerify(secret, text, sigBytes) {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"]
	);
	return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(text));
}

async function issueToken(env) {
	const now = Math.floor(Date.now() / 1000);
	const ttlSeconds = toInt(env.TOKEN_TTL_MINUTES, 60) * 60;
	const payload = { iat: now, exp: now + ttlSeconds };
	const payload64 = base64UrlEncodeText(JSON.stringify(payload));
	const sig = await hmacSign(env.TOKEN_SECRET, payload64);
	return { token: payload64 + "." + base64UrlEncodeBytes(sig), expires_in: ttlSeconds };
}

async function validateToken(request, env) {
	const auth = request.headers.get("Authorization") || "";
	const m = auth.match(/^Bearer ([A-Za-z0-9\-_]+)\.([A-Za-z0-9\-_]+)$/);
	if (!m) { return false; }
	try {
		const payload64 = m[1];
		const sig = base64UrlDecode(m[2]);
		const validSig = await hmacVerify(env.TOKEN_SECRET, payload64, sig);
		if (!validSig) { return false; }
		const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload64)));
		const now = Math.floor(Date.now() / 1000);
		return typeof payload.exp === "number" && payload.exp > now;
	} catch (e) {
		return false;
	}
}

async function safeEqual(a, b) {
	const [ha, hb] = await Promise.all([
		crypto.subtle.digest("SHA-256", enc.encode(String(a))),
		crypto.subtle.digest("SHA-256", enc.encode(String(b)))
	]);
	const x = new Uint8Array(ha);
	const y = new Uint8Array(hb);
	let diff = 0;
	for (let i = 0; i < x.length; i++) { diff |= x[i] ^ y[i]; }
	return diff === 0;
}

function ensureWriteOrigin(request, env) {
	const origin = request.headers.get("Origin");
	return !!origin && allowedOrigins(env).includes(origin);
}

function str(v, max) {
	return v === null || v === undefined || v === "" ? null : String(v).slice(0, max);
}

function num(v) {
	if (v === null || v === undefined || v === "") { return null; }
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function monthAbbrFromIso(iso) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) { return null; }
	const m = Number(String(iso).slice(5, 7));
	const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
	return months[m - 1] || null;
}

function buildDisplayLot(depotCode, actualLot, auctionDateIso) {
	const depot = String(depotCode || "").trim().toUpperCase();
	const actual = String(actualLot || "").trim();
	const date = String(auctionDateIso || "");
	const month = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5, 7) : "";
	const year2 = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(2, 4) : "";
	if (!depot || !actual || !month || !year2) { return ""; }
	return depot + "_" + actual + "_" + month + "_" + year2;
}

function safeSegment(text) {
	return String(text || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
}

function sanitizeMetadata(type, input, env) {
	if (!input || !Array.isArray(input.lots)) { throw new Error("lots array required"); }
	const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "") + "/products/" + type + "/";
	const seenDisplayLots = new Set();

	const lots = input.lots.slice(0, 500).map((lot) => {
		const depotCode = str(lot.depot_code, 20);
		const auctionDate = str(lot.auction_date, 30);
		const actualLot = str(lot.actual_lot_number, 50) || str(lot.lot_number, 50);
		const quantity = num(lot.quantity_m3);
		const displayLot = buildDisplayLot(depotCode, actualLot, auctionDate);
		if (!depotCode || !auctionDate || !actualLot || !displayLot) {
			throw new Error("depot_code, actual_lot_number and auction_date are required");
		}
		if (quantity === null || quantity <= 0) {
			throw new Error("quantity_m3 is required and must be greater than 0");
		}
		if (seenDisplayLots.has(displayLot.toUpperCase())) {
			throw new Error("duplicate display lot " + displayLot);
		}
		seenDisplayLots.add(displayLot.toUpperCase());
		const lotId = "lot_" + safeSegment(displayLot);

		const media = lot.media || {};
		const images = (media.images || []).slice(0, 30).map((img) => ({
			url: String(img.url || ""),
			alt: str(img.alt, 200) || ("Lot " + displayLot),
			is_thumbnail: !!img.is_thumbnail
		}));
		const videos = (media.videos || []).slice(0, 10).map(String);

		images.map((img) => img.url).concat(videos).forEach((url) => {
			if (!url.startsWith(base) || url.includes("..")) {
				throw new Error("media url must stay under " + base);
			}
		});

		return {
			lot_id: lotId,
			lot_number: displayLot,
			actual_lot_number: actualLot,
			depot_code: depotCode.toUpperCase(),
			auction_date: auctionDate,
			display_lot_number: displayLot,
			quantity_m3: quantity,
			number_of_logs: num(lot.number_of_logs),
			status: lot.status === "sold_out" ? "sold_out" : "available",
			price: str(lot.price, 50),
			class: str(lot.class, 50),
			length_range: str(lot.length_range, 50),
			girth_range: str(lot.girth_range, 50),
			comment: str(lot.comment, 500),
			created_at: str(lot.created_at, 30) || new Date().toISOString().slice(0, 10),
			media: { images, videos }
		};
	});

	return {
		product_type: type,
		title: str(input.title, 100) || type,
		description: str(input.description, 500),
		updated_at: new Date().toISOString().slice(0, 10),
		lots
	};
}

async function route(request, env, url) {
	const method = request.method;
	const reply = function (body, status) { return json(request, env, body, status); };

	if (url.pathname === "/api/login" && method === "POST") {
		let body;
		try { body = await request.json(); } catch (e) { return reply({ error: "Invalid JSON payload." }, 400); }

		const usernameOk = await safeEqual(body.username || "", env.ADMIN_USERNAME || "");
		const passwordOk = await safeEqual(body.password || "", env.ADMIN_PASSWORD || "");
		if (!(usernameOk && passwordOk)) {
			await new Promise((resolve) => setTimeout(resolve, 700));
			return reply({ error: "Wrong username or password." }, 401);
		}

		return reply(await issueToken(env));
	}

	if (!await validateToken(request, env)) {
		return reply({ error: "Session expired. Please log in again." }, 401);
	}

	if (method !== "GET" && !ensureWriteOrigin(request, env)) {
		return reply({ error: "Origin not allowed." }, 403);
	}

	const productMatch = url.pathname.match(/^\/api\/products\/([a-z-]+)$/);
	if (productMatch) {
		const type = productMatch[1];
		if (!PRODUCT_TYPES.includes(type)) { return reply({ error: "Unknown product type." }, 404); }
		const metadataKey = "products/" + type + "/metadata.json";

		if (method === "GET") {
			const object = await env.BUCKET.get(metadataKey);
			if (!object) { return reply({ product_type: type, title: type, lots: [] }); }
			return new Response(object.body, {
				headers: Object.assign({
					"content-type": "application/json",
					"cache-control": "no-store"
				}, corsHeaders(request, env))
			});
		}

		if (method === "PUT") {
			let payload;
			try { payload = sanitizeMetadata(type, await request.json(), env); }
			catch (e) { return reply({ error: e.message }, 400); }
			await env.BUCKET.put(metadataKey, JSON.stringify(payload, null, 2), {
				httpMetadata: {
					contentType: "application/json",
					cacheControl: "public, max-age=60"
				}
			});
			return reply(payload);
		}
	}

	if (url.pathname === "/api/upload" && method === "POST") {
		const type = url.searchParams.get("product");
		const lot = String(url.searchParams.get("lot") || "").trim();
		if (!PRODUCT_TYPES.includes(type) || !lot) {
			return reply({ error: "Invalid upload target." }, 400);
		}

		const contentType = (request.headers.get("content-type") || "").split(";")[0].trim();
		const ext = MIME_EXT[contentType];
		if (!ext) { return reply({ error: "Unsupported file type." }, 415); }

		const maxUploadBytes = toInt(env.MAX_UPLOAD_MB, 90) * 1024 * 1024;
		const len = Number(request.headers.get("content-length") || 0);
		if (!len || len > maxUploadBytes) {
			return reply({ error: "File too large (max " + (maxUploadBytes / (1024 * 1024)) + " MB)." }, 413);
		}

		const key = "products/" + type + "/lot_" + safeSegment(lot) + "/" + Date.now() + "-" + crypto.randomUUID().slice(0, 8) + "." + ext;
		await env.BUCKET.put(key, request.body, {
			httpMetadata: {
				contentType: contentType,
				cacheControl: "public, max-age=31536000, immutable"
			}
		});

		return reply({
			url: env.PUBLIC_BASE_URL.replace(/\/+$/, "") + "/" + key,
			kind: contentType.startsWith("video/") ? "video" : "image"
		});
	}

	if (url.pathname === "/api/media" && method === "DELETE") {
		const target = url.searchParams.get("url") || "";
		const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "") + "/";
		if (!target.startsWith(base + "products/") || target.includes("..")) {
			return reply({ error: "Invalid media URL." }, 400);
		}
		const key = target.slice(base.length);
		if (key.endsWith("metadata.json")) {
			return reply({ error: "Deleting metadata is not allowed." }, 400);
		}
		await env.BUCKET.delete(key);
		return reply({ ok: true });
	}

	if (url.pathname === "/api/me" && method === "GET") {
		return reply({ ok: true });
	}

	return reply({ error: "Not found." }, 404);
}

export default {
	async fetch(request, env) {
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders(request, env) });
		}

		const url = new URL(request.url);
		if (!url.pathname.startsWith("/api/")) {
			return new Response("Not found", { status: 404 });
		}

		if (!env.BUCKET || !env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.TOKEN_SECRET || !env.PUBLIC_BASE_URL) {
			return json(request, env, { error: "Worker is missing required bindings or variables." }, 500);
		}

		try {
			return await route(request, env, url);
		} catch (e) {
			return json(request, env, { error: "Server error." }, 500);
		}
	}
};
