(function () {
	"use strict";

	var cfg = window.STOCK_CONFIG || {};
	var BASE = (cfg.dataBaseUrl || "data/products").replace(/\/+$/, "");
	var WA = cfg.whatsappNumber || "919019531346";
	var PHONE = cfg.phoneNumber || "+919019531346";
	var CONTACT = cfg.contactPage || "Contacts.html";

	function t(key, fallback) {
		if (window.CW_I18N && typeof window.CW_I18N.t === "function") {
			return window.CW_I18N.t(key, fallback);
		}
		return fallback || key;
	}

	var STATUS = {
		available: "stock.available",
		sold_out: "stock.sold_out"
	};

	function esc(v) {
		return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
			return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
		});
	}

	function safeUrl(u) {
		u = String(u || "").trim();
		return /^(javascript|data|vbscript):/i.test(u) ? "" : u;
	}

	function has(v) {
		return v !== null && v !== undefined && String(v).trim() !== "";
	}

	function statusKey(s) {
		s = String(s || "available").toLowerCase().replace(/[\s-]+/g, "_");
		if (s === "sold") { s = "sold_out"; }
		return STATUS[s] ? s : "available";
	}

	function statusText(k) {
		return t(STATUS[k], k === "sold_out" ? "Sold Out" : "Available");
	}

	function fmtDate(s) {
		var d = new Date(s);
		return isNaN(d) ? String(s) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
	}

	function fmtQty(n) {
		var x = parseFloat(n);
		return isNaN(x) ? String(n) : x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
	}

	function findLotQuery() {
		try {
			var params = new URLSearchParams(window.location.search || "");
			return (params.get("lot") || "").trim();
		} catch (e) {
			return "";
		}
	}

	function lotMatchKey(v) {
		return String(v || "").trim().toLowerCase();
	}

	function lotLink(lot) {
		try {
			var url = new URL(window.location.href);
			url.searchParams.set("lot", lot.id);
			url.hash = "";
			return url.toString();
		} catch (e) {
			return window.location.href.split("#")[0];
		}
	}

	function normalizeLot(raw) {
		var m = raw.media || {};
		var images = (m.images || (m.thumbnail ? [m.thumbnail] : [])).map(function (i) {
			return typeof i === "string" ? { url: i } : i;
		}).filter(function (i) { return i && safeUrl(i.url); });
		var thumb = images.filter(function (i) { return i.is_thumbnail; })[0];
		if (thumb) {
			images = [thumb].concat(images.filter(function (i) { return i !== thumb; }));
		}
		var videos = (m.videos || (m.video ? [m.video] : [])).filter(function (v) { return safeUrl(v); });
		var actual = has(raw.actual_lot_number) ? raw.actual_lot_number : (has(raw.lot_number) ? raw.lot_number : String(raw.lot_id || "").replace(/\D/g, ""));
		var display = has(raw.display_lot_number) ? raw.display_lot_number : actual;
		return {
			id: raw.lot_id || ("lot_" + String(display).toLowerCase().replace(/[^a-z0-9_]+/g, "_")),
			number: display,
			actual: actual,
			depot: raw.depot_code,
			auctionDate: raw.auction_date,
			status: statusKey(raw.status),
			qty: raw.quantity_m3,
			logs: raw.number_of_logs,
			price: raw.price,
			cls: raw["class"],
			length: raw.length_range,
			girth: raw.girth_range,
			comment: raw.comment,
			created: raw.created_at,
			images: images,
			videos: videos
		};
	}

	function specRow(label, value) {
		return has(value) ? "<dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd>" : "";
	}

	function waLink(title, lot) {
		var msg = "Hi, I'm interested in " + title + " - Lot " + lot.number +
			(has(lot.qty) ? " (" + fmtQty(lot.qty) + " m3)" : "") + ". Please share details.";
		return "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
	}

	function shareWaLink(title, lot) {
		var link = lotLink(lot);
		var msg = "Check this lot from " + title + " - Lot " + lot.number + ": " + link;
		return "https://wa.me/?text=" + encodeURIComponent(msg);
	}

	function lotCard(title, lot) {
		var cover = lot.images[0];
		var media = cover
			? '<img src="' + esc(safeUrl(cover.url)) + '" alt="' + esc(cover.alt || (title + " lot " + lot.number)) + '" loading="lazy">'
			: '<span class="lot-nophoto">' + esc(t("stock.no_photo", "No photo")) + "</span>";
		var counts = [];
		if (lot.images.length) { counts.push(lot.images.length + (lot.images.length > 1 ? " photos" : " photo")); }
		if (lot.videos.length) { counts.push(lot.videos.length + (lot.videos.length > 1 ? " videos" : " video")); }
		var canView = lot.images.length + lot.videos.length > 0;

		return '<article class="lot-card status-' + lot.status + '" data-lot="' + esc(lot.id) + '">' +
			'<div class="lot-media"' + (canView ? ' data-open="1" tabindex="0" role="button" aria-label="View lot ' + esc(lot.number) + ' media"' : "") + ">" +
				media +
				'<span class="lot-status">' + esc(statusText(lot.status)) + "</span>" +
				(counts.length ? '<span class="lot-count">' + counts.join(" · ") + "</span>" : "") +
			"</div>" +
			'<div class="lot-body">' +
				"<h4>Lot " + esc(lot.number) + "</h4>" +
				'<dl class="lot-specs">' +
					specRow(t("stock.no_of_logs", "No. of logs"), lot.logs) +
					specRow(t("stock.actual_lot", "Actual Lot"), lot.actual) +
					specRow(t("stock.depot", "Depot"), lot.depot) +
					specRow(t("stock.auction_date", "Auction Date"), lot.auctionDate) +
					specRow(t("stock.quantity", "Quantity"), has(lot.qty) ? fmtQty(lot.qty) + " m³" : "") +
					specRow(t("stock.class", "Class"), lot.cls) +
					specRow(t("stock.length", "Length"), lot.length) +
					specRow(t("stock.girth", "Girth"), lot.girth) +
					specRow(t("stock.price", "Price"), lot.price) +
					specRow(t("stock.listed", "Listed"), has(lot.created) ? fmtDate(lot.created) : "") +
				"</dl>" +
				(has(lot.comment) ? '<p class="lot-comment">' + esc(lot.comment) + "</p>" : "") +
				'<div class="lot-actions">' +
					(canView ? '<button type="button" data-open="1">' + esc(t("stock.view_media", "View media")) + "</button>" : "") +
					'<a class="lot-wa" target="_blank" rel="noopener" href="' + esc(waLink(title, lot)) + '">' + esc(t("stock.enquire_whatsapp", "Enquire on WhatsApp")) + "</a>" +
					'<a class="lot-share-wa" target="_blank" rel="noopener" href="' + esc(shareWaLink(title, lot)) + '">' + esc(t("stock.share_whatsapp", "Share Lot on WhatsApp")) + "</a>" +
					'<a href="tel:' + esc(PHONE) + '">' + esc(t("stock.call", "Call")) + "</a>" +
				"</div>" +
			"</div></article>";
	}

	function summary(lots, data) {
		var avail = lots.filter(function (l) { return l.status === "available"; });
		var vol = avail.reduce(function (s, l) { return s + (parseFloat(l.qty) || 0); }, 0);
		var cells = [
			[avail.length, t("stock.summary_lots_available", "Lots available")],
			[fmtQty(vol) + " m³", t("stock.summary_available_volume", "Available volume")]
		];
		if (data.updated_at) { cells.push([fmtDate(data.updated_at), t("stock.summary_last_updated", "Last updated")]); }
		return '<div class="stock-summary">' + cells.map(function (c) {
			return "<div><strong>" + esc(c[0]) + "</strong><span>" + c[1] + "</span></div>";
		}).join("") + "</div>";
	}

	function filters(lots) {
		var keys = Object.keys(STATUS).filter(function (k) {
			return lots.some(function (l) { return l.status === k; });
		});
		if (keys.length < 2) { return ""; }
		return '<div class="stock-filters" role="group" aria-label="Filter lots">' +
			'<button type="button" class="active" data-filter="all">' + esc(t("stock.filter_all", "All")) + " (" + lots.length + ")</button>" +
			keys.map(function (k) {
				var n = lots.filter(function (l) { return l.status === k; }).length;
				return '<button type="button" data-filter="' + k + '">' + esc(statusText(k)) + " (" + n + ")</button>";
			}).join("") + "</div>";
	}

	/* ---------- Lightbox ---------- */
	var box;

	function openLightbox(title, lot, start) {
		var items = lot.images.map(function (i) { return { type: "image", url: safeUrl(i.url), alt: i.alt || "" }; })
			.concat(lot.videos.map(function (v) { return { type: "video", url: safeUrl(v) }; }));
		if (!items.length) { return; }
		var idx = start || 0;
		var opener = document.activeElement;

		if (box) { box.remove(); }
		box = document.createElement("div");
		box.className = "lb";
		box.setAttribute("role", "dialog");
		box.setAttribute("aria-modal", "true");
		box.innerHTML =
			'<div class="lb-top"><span class="lb-title">' + esc(title) + " · Lot " + esc(lot.number) + "</span>" +
			'<span class="lb-count"></span><button type="button" class="lb-close" aria-label="Close">&times;</button></div>' +
			'<div class="lb-stage"><button type="button" class="lb-nav lb-prev" aria-label="Previous">&#8249;</button>' +
			'<div class="lb-view"></div>' +
			'<button type="button" class="lb-nav lb-next" aria-label="Next">&#8250;</button></div>' +
			'<div class="lb-thumbs"></div>';
		document.body.appendChild(box);
		document.body.classList.add("lb-open");

		var view = box.querySelector(".lb-view");
		var thumbs = box.querySelector(".lb-thumbs");
		thumbs.innerHTML = items.map(function (it, i) {
			return '<button type="button" class="lb-thumb" data-i="' + i + '" aria-label="Item ' + (i + 1) + '">' +
				(it.type === "image" ? '<img src="' + esc(it.url) + '" alt="">' : '<span class="lb-play">&#9654;</span>') + "</button>";
		}).join("");

		function show(i) {
			idx = (i + items.length) % items.length;
			var it = items[idx];
			view.innerHTML = it.type === "image"
				? '<img src="' + esc(it.url) + '" alt="' + esc(it.alt) + '">'
				: '<video src="' + esc(it.url) + '" controls autoplay playsinline></video>';
			box.querySelector(".lb-count").textContent = (idx + 1) + " / " + items.length;
			[].forEach.call(thumbs.children, function (t, n) { t.classList.toggle("active", n === idx); });
			box.classList.toggle("single", items.length < 2);
		}

		function close() {
			document.removeEventListener("keydown", onKey);
			box.remove();
			box = null;
			document.body.classList.remove("lb-open");
			if (opener && opener.focus) { opener.focus(); }
		}

		function onKey(e) {
			if (e.key === "Escape") { close(); }
			else if (e.key === "ArrowLeft") { show(idx - 1); }
			else if (e.key === "ArrowRight") { show(idx + 1); }
		}

		box.addEventListener("click", function (e) {
			var t = e.target;
			if (t.closest(".lb-close") || t.classList.contains("lb-stage") || t === box) { close(); }
			else if (t.closest(".lb-prev")) { show(idx - 1); }
			else if (t.closest(".lb-next")) { show(idx + 1); }
			else if (t.closest(".lb-thumb")) { show(parseInt(t.closest(".lb-thumb").getAttribute("data-i"), 10)); }
		});
		document.addEventListener("keydown", onKey);
		show(idx);
		box.querySelector(".lb-close").focus();
	}

	/* ---------- Page ---------- */
	function render(root, data) {
		var title = root.getAttribute("data-title") || data.title || data.product_type;
		var lots = (data.lots || []).map(normalizeLot);

		if (!lots.length) {
			root.innerHTML = '<p class="stock-empty">' + esc(t("stock.empty", "No lots are listed right now. Please contact us for current availability.")) + ' <a href="' + esc(CONTACT) +
				'">' + esc(t("menu.contact_us", "contact us")) + "</a>.</p>";
			return;
		}

		root._stockDataCache = data;
		root.innerHTML = summary(lots, data) + filters(lots) +
			'<div class="lot-grid">' + lots.map(function (l) { return lotCard(title, l); }).join("") + "</div>";

		var byId = {};
		lots.forEach(function (l) { byId[l.id] = l; });

		var requestedLot = findLotQuery();
		if (requestedLot) {
			var target = byId[requestedLot];
			if (!target) {
				target = lots.filter(function (lot) {
					var q = lotMatchKey(requestedLot);
					return q === lotMatchKey(lot.number) || q === lotMatchKey(lot.actual);
				})[0];
			}
			if (target) {
				var allFilter = root.querySelector('[data-filter="all"]');
				if (allFilter) {
					[].forEach.call(root.querySelectorAll("[data-filter]"), function (b) { b.classList.toggle("active", b === allFilter); });
					[].forEach.call(root.querySelectorAll(".lot-card"), function (c) { c.hidden = false; });
				}
				var cards = root.querySelectorAll(".lot-card");
				[].forEach.call(cards, function (card) { card.classList.remove("lot-highlight"); });
				var cardToHighlight = [].filter.call(cards, function (card) {
					return card.getAttribute("data-lot") === target.id;
				})[0];
				if (cardToHighlight) {
					cardToHighlight.classList.add("lot-highlight");
					setTimeout(function () { cardToHighlight.classList.remove("lot-highlight"); }, 5000);
					setTimeout(function () {
						cardToHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
					}, 50);
				}
			}
		}

		root.addEventListener("click", function (e) {
			var f = e.target.closest("[data-filter]");
			if (f) {
				var key = f.getAttribute("data-filter");
				[].forEach.call(root.querySelectorAll("[data-filter]"), function (b) { b.classList.toggle("active", b === f); });
				[].forEach.call(root.querySelectorAll(".lot-card"), function (c) {
					c.hidden = key !== "all" && !c.classList.contains("status-" + key);
				});
				return;
			}
			var o = e.target.closest("[data-open]");
			if (o) {
				openLightbox(title, byId[o.closest(".lot-card").getAttribute("data-lot")], 0);
			}
		});

		root.addEventListener("keydown", function (e) {
			var o = e.target.closest(".lot-media[data-open]");
			if (o && (e.key === "Enter" || e.key === " ")) {
				e.preventDefault();
				openLightbox(title, byId[o.closest(".lot-card").getAttribute("data-lot")], 0);
			}
		});
	}

	function init() {
		var root = document.getElementById("live-stock");
		var type = root && root.getAttribute("data-product");
		if (!type) { return; }

		fetch(BASE + "/" + encodeURIComponent(type) + "/metadata.json", { cache: "no-cache" })
			.then(function (r) {
				if (!r.ok) { throw new Error("HTTP " + r.status); }
				return r.json();
			})
			.then(function (data) { render(root, data); })
			.catch(function () {
				root.innerHTML = '<p class="stock-empty">' + esc(t("stock.loading", "Loading available lots...")) + ' <a href="' + esc(CONTACT) +
					'">' + esc(t("menu.contact_us", "contact us")) + "</a> or message us on WhatsApp for current availability.</p>";
			});
	}

	document.addEventListener("cw:lang-changed", function () {
		var root = document.getElementById("live-stock");
		if (root && root._stockDataCache) {
			render(root, root._stockDataCache);
		}
	});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
