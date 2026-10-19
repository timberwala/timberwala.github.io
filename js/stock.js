(function () {
	"use strict";

	var cfg = window.STOCK_CONFIG || {};
	var BASE = (cfg.dataBaseUrl || "data/products").replace(/\/+$/, "");
	var WA = cfg.whatsappNumber || "919019531346";
	var PHONE = cfg.phoneNumber || "+919019531346";
	var CONTACT = cfg.contactPage || "Contacts.html";
	var LENGTH_MIN_FT = 3;
	var LENGTH_MAX_FT = 25;
	var GIRTH_MIN_FT = 1;
	var GIRTH_MAX_FT = 10;

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

	function parseRangeInFeet(value, fallbackUnit) {
		if (!has(value)) { return null; }
		var s = String(value).toLowerCase();
		var nums = s.match(/\d+(?:\.\d+)?/g);
		if (!nums || !nums.length) { return null; }

		var vals = nums.map(function (n) { return parseFloat(n); }).filter(function (n) { return !isNaN(n); });
		if (!vals.length) { return null; }

		var min = vals[0];
		var max = vals.length > 1 ? vals[1] : vals[0];
		if (vals.length > 2) {
			min = Math.min.apply(null, vals);
			max = Math.max.apply(null, vals);
		}
		if (min > max) {
			var tmp = min;
			min = max;
			max = tmp;
		}

		var unit = fallbackUnit || "ft";
		if (/cm/.test(s)) {
			unit = "cm";
		} else if (/\b(m|meter|meters|metre|metres)\b/.test(s)) {
			unit = "m";
		} else if (/\b(ft|feet|foot)\b|\'/.test(s)) {
			unit = "ft";
		}

		if (unit === "cm") {
			min = min / 30.48;
			max = max / 30.48;
		} else if (unit === "m") {
			min = min * 3.28084;
			max = max * 3.28084;
		}

		return { min: min, max: max };
	}

	function overlaps(a, b) {
		return a.max >= b.min && a.min <= b.max;
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
			lengthFeet: parseRangeInFeet(raw.length_range, "ft"),
			girthFeet: parseRangeInFeet(raw.girth_range, "ft"),
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
		var actualLot = has(lot.actual) && String(lot.actual).trim() !== String(lot.number).trim() ? lot.actual : "";

		return '<article class="lot-card status-' + lot.status + '" data-lot="' + esc(lot.id) + '">' +
			'<div class="lot-media"' + (canView ? ' data-open="1" tabindex="0" role="button" aria-label="View lot ' + esc(lot.number) + ' media"' : "") + ">" +
				media +
				'<span class="lot-count">' + counts.join(" · ") + "</span>" +
			"</div>" +
			'<div class="lot-body">' +
				'<div class="lot-header-row"><span class="lot-status">' + esc(statusText(lot.status)) + '</span><span class="lot-number">Lot ' + esc(lot.number) + "</span></div>" +
				'<dl class="lot-specs">' +
					specRow(t("stock.no_of_logs", "No. of logs"), lot.logs) +
					specRow(t("stock.actual_lot", "Actual Lot"), actualLot) +
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
		var vol = lots.reduce(function (s, l) { return s + (parseFloat(l.qty) || 0); }, 0);
		var cells = [
			[lots.length, t("stock.summary_lots_matching", "Lots matching filters")],
			[fmtQty(vol) + " m³", t("stock.summary_matching_volume", "Matching volume")]
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
		var statusButtons = '<button type="button" class="active" data-filter="all">' + esc(t("stock.filter_all", "All")) + " (" + lots.length + ")</button>" +
			keys.map(function (k) {
				var n = lots.filter(function (l) { return l.status === k; }).length;
				return '<button type="button" data-filter="' + k + '">' + esc(statusText(k)) + " (" + n + ")</button>";
			}).join("");

		return '<div class="stock-filters" role="group" aria-label="Filter lots">' +
			'<button type="button" class="stock-filter-heading" data-filter-toggle="1" aria-expanded="false"><i class="fa fa-filter" aria-hidden="true"></i><span>Filters</span></button>' +
			'<div class="stock-filter-status">' + statusButtons + '<button type="button" class="stock-filter-reset" data-filter-reset="1">' + esc(t("stock.reset_filters", "Reset")) + "</button></div>" +
			'<div class="stock-filter-dimensions is-hidden">' +
				'<div class="stock-slider-group">' +
					'<label>' + esc(t("stock.length", "Length")) + ' (' + esc(t("stock.unit_feet", "ft")) + ')</label>' +
					'<div class="stock-slider-values"><span data-length-min-value></span><span class="stock-filter-sep">to</span><span data-length-max-value></span></div>' +
					'<div class="stock-slider-rails">' +
						'<span class="stock-slider-track"></span>' +
						'<input type="range" min="' + LENGTH_MIN_FT + '" max="' + LENGTH_MAX_FT + '" value="' + LENGTH_MIN_FT + '" step="1" data-length-min>' +
						'<input type="range" min="' + LENGTH_MIN_FT + '" max="' + LENGTH_MAX_FT + '" value="' + LENGTH_MAX_FT + '" step="1" data-length-max>' +
					'</div>' +
				'</div>' +
				'<div class="stock-slider-group">' +
					'<label>' + esc(t("stock.girth", "Girth")) + ' (' + esc(t("stock.unit_feet", "ft")) + ')</label>' +
					'<div class="stock-slider-values"><span data-girth-min-value></span><span class="stock-filter-sep">to</span><span data-girth-max-value></span></div>' +
					'<div class="stock-slider-rails">' +
						'<span class="stock-slider-track"></span>' +
						'<input type="range" min="' + GIRTH_MIN_FT + '" max="' + GIRTH_MAX_FT + '" value="' + GIRTH_MIN_FT + '" step="1" data-girth-min>' +
						'<input type="range" min="' + GIRTH_MIN_FT + '" max="' + GIRTH_MAX_FT + '" value="' + GIRTH_MAX_FT + '" step="1" data-girth-max>' +
					'</div>' +
				'</div>' +
			'</div>' +
		"</div>";
	}

	function selectedRange(scope, minSel, maxSel, defaultMin, defaultMax) {
		var minEl = scope.querySelector(minSel);
		var maxEl = scope.querySelector(maxSel);
		if (!minEl || !maxEl) { return null; }

		var min = parseFloat(minEl.value);
		var max = parseFloat(maxEl.value);
		if (isNaN(min)) { min = defaultMin; }
		if (isNaN(max)) { max = defaultMax; }
		if (min > max) {
			var tmp = min;
			min = max;
			max = tmp;
		}
		if (min <= defaultMin && max >= defaultMax) { return null; }
		return { min: min, max: max };
	}

	function syncSliderPair(scope, minSel, maxSel, minValueSel, maxValueSel, defaultMin, defaultMax, sourceSel) {
		var minEl = scope.querySelector(minSel);
		var maxEl = scope.querySelector(maxSel);
		if (!minEl || !maxEl) { return; }

		var min = parseFloat(minEl.value);
		var max = parseFloat(maxEl.value);
		if (isNaN(min)) { min = defaultMin; }
		if (isNaN(max)) { max = defaultMax; }

		if (min > max) {
			if (sourceSel === minSel) {
				max = min;
			} else {
				min = max;
			}
		}

		minEl.value = String(min);
		maxEl.value = String(max);

		var minText = scope.querySelector(minValueSel);
		var maxText = scope.querySelector(maxValueSel);
		if (minText) { minText.textContent = min + " ft"; }
		if (maxText) { maxText.textContent = max + " ft"; }
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
		var controlsId = root.getAttribute("data-controls-id");
		var controlsHost = controlsId ? document.getElementById(controlsId) : null;
		var filterScope = controlsHost || root;
		var lots = (data.lots || []).map(normalizeLot);

		if (!lots.length) {
			if (controlsHost) { controlsHost.innerHTML = ""; }
			root.innerHTML = '<p class="stock-empty">' + esc(t("stock.empty", "No lots are listed right now. Please contact us for current availability.")) + ' <a href="' + esc(CONTACT) +
				'">' + esc(t("menu.contact_us", "contact us")) + "</a>.</p>";
			return;
		}

		root._stockDataCache = data;
		if (controlsHost) {
			controlsHost.innerHTML = filters(lots);
		}
		root.innerHTML = '<div class="stock-summary-wrap">' + summary(lots, data) + "</div>" +
			'<div class="lot-grid">' + lots.map(function (l) { return lotCard(title, l); }).join("") + "</div>";

		var byId = {};
		lots.forEach(function (l) { byId[l.id] = l; });

		function applyFilters() {
			var activeBtn = filterScope.querySelector("[data-filter].active");
			var status = activeBtn ? activeBtn.getAttribute("data-filter") : "all";
			var lengthRange = selectedRange(filterScope, "[data-length-min]", "[data-length-max]", LENGTH_MIN_FT, LENGTH_MAX_FT);
			var girthRange = selectedRange(filterScope, "[data-girth-min]", "[data-girth-max]", GIRTH_MIN_FT, GIRTH_MAX_FT);

			var visibleLots = [];
			[].forEach.call(root.querySelectorAll(".lot-card"), function (card) {
				var lot = byId[card.getAttribute("data-lot")];
				var ok = true;

				if (status !== "all" && lot.status !== status) { ok = false; }
				if (ok && lengthRange) { ok = !!lot.lengthFeet && overlaps(lot.lengthFeet, lengthRange); }
				if (ok && girthRange) { ok = !!lot.girthFeet && overlaps(lot.girthFeet, girthRange); }

				card.hidden = !ok;
				if (ok) { visibleLots.push(lot); }
			});

			var summaryWrap = root.querySelector(".stock-summary-wrap");
			if (summaryWrap) {
				summaryWrap.innerHTML = summary(visibleLots, data);
			}
		}

		function syncAllSliders(sourceSel) {
			syncSliderPair(filterScope, "[data-length-min]", "[data-length-max]", "[data-length-min-value]", "[data-length-max-value]", LENGTH_MIN_FT, LENGTH_MAX_FT, sourceSel);
			syncSliderPair(filterScope, "[data-girth-min]", "[data-girth-max]", "[data-girth-min-value]", "[data-girth-max-value]", GIRTH_MIN_FT, GIRTH_MAX_FT, sourceSel);
		}

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
				var allFilter = filterScope.querySelector('[data-filter="all"]');
				if (allFilter) {
					[].forEach.call(filterScope.querySelectorAll("[data-filter]"), function (b) { b.classList.toggle("active", b === allFilter); });
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

		filterScope.addEventListener("click", function (e) {
			var toggle = e.target.closest("[data-filter-toggle]");
			if (toggle) {
				var panel = filterScope.querySelector(".stock-filter-dimensions");
				if (panel) {
					var hidden = panel.classList.toggle("is-hidden");
					toggle.setAttribute("aria-expanded", hidden ? "false" : "true");
				}
				return;
			}

			var reset = e.target.closest("[data-filter-reset]");
			if (reset) {
				var allBtn = filterScope.querySelector('[data-filter="all"]');
				if (allBtn) {
					[].forEach.call(filterScope.querySelectorAll("[data-filter]"), function (b) { b.classList.toggle("active", b === allBtn); });
				}
				["[data-length-min]", "[data-length-max]", "[data-girth-min]", "[data-girth-max]"].forEach(function (sel) {
					var el = filterScope.querySelector(sel);
					if (!el) { return; }
					if (sel.indexOf("length") !== -1) {
						el.value = sel.indexOf("min") !== -1 ? String(LENGTH_MIN_FT) : String(LENGTH_MAX_FT);
					} else {
						el.value = sel.indexOf("min") !== -1 ? String(GIRTH_MIN_FT) : String(GIRTH_MAX_FT);
					}
				});
				syncAllSliders();
				applyFilters();
				return;
			}

			var f = e.target.closest("[data-filter]");
			if (f) {
				[].forEach.call(filterScope.querySelectorAll("[data-filter]"), function (b) { b.classList.toggle("active", b === f); });
				applyFilters();
				return;
			}
		});

		root.addEventListener("click", function (e) {
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

		["[data-length-min]", "[data-length-max]", "[data-girth-min]", "[data-girth-max]"].forEach(function (sel) {
			var el = filterScope.querySelector(sel);
			if (!el) { return; }
			el.addEventListener("input", function () {
				syncAllSliders(sel);
				applyFilters();
			});
			el.addEventListener("change", function () {
				syncAllSliders(sel);
				applyFilters();
			});
		});

		syncAllSliders();
		applyFilters();
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
