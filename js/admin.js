(function () {
	"use strict";

	var TOKEN_KEY = "cw_admin_token_v1";
	var cfg = window.STOCK_CONFIG || {};
	var API = (cfg.adminApiUrl || "").replace(/\/+$/, "");
	var PUBLIC_PRODUCTS_BASE = (cfg.dataBaseUrl || "").replace(/\/+$/, "");
	var PRODUCT_TYPES = [
		{ id: "acacia", label: "Acacia" },
		{ id: "rosewood", label: "East Indian RoseWood" },
		{ id: "dandeli-teak", label: "Dandeli Teak" }
	];
	var LOT_FIELDS = [
		"depot_code", "auction_date", "actual_lot_number", "status", "quantity_m3", "number_of_logs",
		"class", "price", "length_range", "girth_range", "comment"
	];
	var CFT_PER_CBM = 35.315;

	var $ = function (id) { return document.getElementById(id); };
	var token = null;
	var started = false;
	var state = {
		productType: PRODUCT_TYPES[0].id,
		data: null,
		dirty: false,
		editing: null,
		original: null,
		pendingDeletes: [],
		newUploads: [],
		removedInDialog: [],
		uploading: false,
		selectedLotIds: {}
	};

	function say(el, text, kind) {
		el.textContent = text || "";
		el.className = "msg" + (kind ? " " + kind : "");
	}

	function make(tag, text, cls) {
		var node = document.createElement(tag);
		if (text !== undefined) { node.textContent = text; }
		if (cls) { node.className = cls; }
		return node;
	}

	function toNumberOrNull(v) {
		if (v === null || v === undefined || v === "") { return null; }
		var n = Number(v);
		return isFinite(n) ? n : null;
	}

	function safeArray(v) {
		return Array.isArray(v) ? v : [];
	}

	function hasText(v) {
		return v !== null && v !== undefined && String(v).trim() !== "";
	}

	function monthAbbrFromIso(iso) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) { return null; }
		var m = Number(String(iso).slice(5, 7));
		var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
		return months[m - 1] || null;
	}

	function fmtNum(n, maxDecimals) {
		var x = Number(n);
		if (!isFinite(x)) { return "0"; }
		return x.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: maxDecimals == null ? 2 : maxDecimals });
	}

	function parsePricePerCft(v) {
		if (!hasText(v)) { return 0; }
		var n = parseFloat(String(v).replace(/,/g, ""));
		return isFinite(n) ? n : 0;
	}

	function parseRangeInFeet(value) {
		if (!hasText(value)) { return null; }
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

		var unit = "ft";
		if (/cm/.test(s)) {
			unit = "cm";
		} else if (/\b(m|meter|meters|metre|metres)\b/.test(s)) {
			unit = "m";
		} else if (/\b(ft|feet|foot)\b|'/.test(s)) {
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

	function thresholdCoverage(range, threshold, inclusive) {
		if (!range) { return 0; }
		if (range.min >= threshold) { return 1; }
		if (inclusive) {
			if (range.max < threshold) { return 0; }
			return 0.3;
		}
		if (range.max < threshold) { return 0; }
		return 0.3;
	}

	function lotQtyM3(lot) {
		return toNumberOrNull(lot.quantity_m3) || 0;
	}

	function lotQtyCft(lot) {
		return lotQtyM3(lot) * CFT_PER_CBM;
	}

	function lotTotalPrice(lot) {
		return lotQtyCft(lot) * parsePricePerCft(lot.price);
	}

	function selectedLots() {
		var ids = state.selectedLotIds || {};
		return safeArray(state.data && state.data.lots).filter(function (lot) {
			return !!ids[lot.lot_id];
		});
	}

	function renderSelectionSummary() {
		var summary = $("selection-summary");
		if (!summary) { return; }
		var selected = selectedLots();
		summary.hidden = selected.length === 0;
		if (!selected.length) { return; }

		var totalM3 = selected.reduce(function (s, lot) { return s + lotQtyM3(lot); }, 0);
		var totalCft = selected.reduce(function (s, lot) { return s + lotQtyCft(lot); }, 0);
		var totalPrice = selected.reduce(function (s, lot) { return s + lotTotalPrice(lot); }, 0);
		var avgCft = totalCft > 0 ? totalPrice / totalCft : 0;

		var girthEligible = selected.reduce(function (s, lot) {
			return s + lotQtyM3(lot) * thresholdCoverage(parseRangeInFeet(lot.girth_range), 3, false);
		}, 0);
		var lengthEligible = selected.reduce(function (s, lot) {
			return s + lotQtyM3(lot) * thresholdCoverage(parseRangeInFeet(lot.length_range), 12, true);
		}, 0);
		var girthPct = totalM3 > 0 ? (girthEligible / totalM3) * 100 : 0;
		var lengthPct = totalM3 > 0 ? (lengthEligible / totalM3) * 100 : 0;

		$("sel-count").textContent = String(selected.length);
		$("sel-total-cbm").textContent = fmtNum(totalM3, 2);
		$("sel-total-cft").textContent = fmtNum(totalCft, 2);
		$("sel-total-price").textContent = fmtNum(totalPrice, 2);
		$("sel-avg-cft-price").textContent = fmtNum(avgCft, 2);
		$("sel-girth-over-3").textContent = fmtNum(girthPct, 2) + "%";
		$("sel-length-over-12").textContent = fmtNum(lengthPct, 2) + "%";
	}

	function setToken(next) {
		token = next || null;
		if (token) { sessionStorage.setItem(TOKEN_KEY, token); }
		else { sessionStorage.removeItem(TOKEN_KEY); }
	}

	function api(path, opts) {
		opts = opts || {};
		opts.headers = Object.assign({}, opts.headers);
		if (token) { opts.headers.Authorization = "Bearer " + token; }
		return fetch(API + path, opts)
			.catch(function () {
				throw new Error("Cannot reach the admin API. Check adminApiUrl and Worker CORS ALLOWED_ORIGINS.");
			})
			.then(function (response) {
				return response.json().catch(function () { return {}; }).then(function (body) {
					if (response.status === 401 && token) {
						handleSessionExpired(body.error);
						throw new Error(body.error || "Session expired.");
					}
					if (!response.ok) { throw new Error(body.error || ("HTTP " + response.status)); }
					return body;
				});
			});
	}

	function handleSessionExpired(message) {
		setToken(null);
		showLogin(message || "Session expired. Please log in again.");
	}

	function setDirty(v) {
		state.dirty = !!v;
		$("save-all").disabled = !state.dirty;
	}

	function mediaUrls(lot) {
		var media = lot.media || {};
		return safeArray(media.images).map(function (img) { return img.url; }).concat(safeArray(media.videos));
	}

	function normalizeLot(lot) {
		lot = lot || {};
		var media = lot.media || {};
		var parsed = parseGeneratedLotNumber(lot.lot_number);
		var depotCode = hasText(lot.depot_code) ? String(lot.depot_code).toUpperCase() : (parsed ? parsed.depot_code : "");
		var auctionDate = hasText(lot.auction_date) ? String(lot.auction_date) : (parsed ? parsed.auction_date : "");
		var actualLot = hasText(lot.actual_lot_number) ? String(lot.actual_lot_number) : (parsed ? parsed.actual_lot_number : (lot.lot_number == null ? null : String(lot.lot_number)));
		var displayLot = hasText(lot.display_lot_number)
			? String(lot.display_lot_number)
			: ((parsed && parsed.display_lot_number) || buildDisplayLot(depotCode, actualLot, auctionDate));
		var lotNumber = hasText(lot.lot_number) ? String(lot.lot_number) : (displayLot || null);
		return {
			lot_id: lot.lot_id || ("lot_" + String(displayLot || actualLot || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_")),
			lot_number: lotNumber,
			actual_lot_number: actualLot == null ? null : String(actualLot),
			depot_code: depotCode,
			auction_date: auctionDate,
			display_lot_number: displayLot || null,
			status: lot.status === "sold_out" ? "sold_out" : "available",
			quantity_m3: toNumberOrNull(lot.quantity_m3),
			number_of_logs: toNumberOrNull(lot.number_of_logs),
			class: lot.class == null ? null : String(lot.class),
			price: lot.price == null ? null : String(lot.price),
			length_range: lot.length_range == null ? null : String(lot.length_range),
			girth_range: lot.girth_range == null ? null : String(lot.girth_range),
			comment: lot.comment == null ? null : String(lot.comment),
			created_at: lot.created_at || new Date().toISOString().slice(0, 10),
			media: {
				images: safeArray(media.images).map(function (img) {
					return {
						url: String(img.url || ""),
						alt: img.alt == null ? "" : String(img.alt),
						is_thumbnail: !!img.is_thumbnail
					};
				}).filter(function (img) { return img.url; }),
				videos: safeArray(media.videos).map(String).filter(Boolean)
			}
		};
	}

	function loadProduct() {
		say($("app-msg"), "Loading...");
		state.pendingDeletes = [];
		state.selectedLotIds = {};
		return readPublicProductData(state.productType).then(function (data) {
			data = data || {};
			data.lots = safeArray(data.lots).map(normalizeLot);
			state.data = data;
			setDirty(false);
			say($("app-msg"), "");
			renderMetrics();
			renderTable();
			renderSelectionSummary();
		}).catch(function (e) {
			say($("app-msg"), "Load failed: " + e.message, "err");
		});
	}

	function readPublicProductData(type) {
		if (!PUBLIC_PRODUCTS_BASE) {
			return Promise.reject(new Error("Set dataBaseUrl in js/stock-config.js."));
		}
		var url = PUBLIC_PRODUCTS_BASE + "/" + encodeURIComponent(type) + "/metadata.json";
		return fetch(url, { cache: "no-store" })
			.then(function (res) {
				if (res.status === 404) {
					return { product_type: type, title: type, lots: [] };
				}
				if (!res.ok) {
					throw new Error("Public metadata fetch failed (HTTP " + res.status + ").");
				}
				return res.json();
			});
	}

	function renderMetrics() {
		var lots = safeArray(state.data.lots);
		var available = lots.filter(function (lot) { return lot.status !== "sold_out"; });
		var sold = lots.length - available.length;
		var volume = available.reduce(function (sum, lot) {
			return sum + (toNumberOrNull(lot.quantity_m3) || 0);
		}, 0);

		$("metric-total").textContent = String(lots.length);
		$("metric-available").textContent = String(available.length);
		$("metric-sold").textContent = String(sold);
		$("metric-volume").textContent = volume.toLocaleString("en-IN", { maximumFractionDigits: 2 });
	}

	function renderTable() {
		var body = document.querySelector("#lots-table tbody");
		body.textContent = "";
		var lots = safeArray(state.data.lots).slice().sort(function (a, b) {
			return String(a.display_lot_number || a.lot_number || "").localeCompare(String(b.display_lot_number || b.lot_number || ""));
		});
		var validIds = {};
		lots.forEach(function (l) { validIds[l.lot_id] = true; });
		Object.keys(state.selectedLotIds).forEach(function (id) {
			if (!validIds[id]) { delete state.selectedLotIds[id]; }
		});

		$("empty-msg").hidden = lots.length > 0;

		lots.forEach(function (lot) {
			var tr = make("tr");

			var selectCell = make("td");
			var cb = document.createElement("input");
			cb.type = "checkbox";
			cb.checked = !!state.selectedLotIds[lot.lot_id];
			cb.addEventListener("change", function () {
				if (cb.checked) { state.selectedLotIds[lot.lot_id] = true; }
				else { delete state.selectedLotIds[lot.lot_id]; }
				renderSelectionSummary();
			});
			selectCell.appendChild(cb);
			tr.appendChild(selectCell);

			tr.appendChild(make("td", "Lot " + (lot.display_lot_number || lot.lot_number || "-")));

			var statusCell = make("td");
			statusCell.appendChild(make("span", lot.status === "sold_out" ? "Sold out" : "Available", "badge " + lot.status));
			tr.appendChild(statusCell);

			tr.appendChild(make("td", lot.quantity_m3 == null ? "-" : fmtNum(lot.quantity_m3, 2)));
			tr.appendChild(make("td", lot.quantity_m3 == null ? "-" : fmtNum(lotQtyCft(lot), 2)));
			tr.appendChild(make("td", hasText(lot.price) ? fmtNum(parsePricePerCft(lot.price), 2) : "-"));
			tr.appendChild(make("td", lot.quantity_m3 == null || !hasText(lot.price) ? "-" : fmtNum(lotTotalPrice(lot), 2)));
			tr.appendChild(make("td", lot.length_range || "-"));
			tr.appendChild(make("td", lot.girth_range || "-"));
			tr.appendChild(make("td", lot.number_of_logs == null ? "-" : String(lot.number_of_logs)));
			tr.appendChild(make("td", lot.class || "-"));
			tr.appendChild(make("td", mediaUrls(lot).length + " file(s)"));

			var actionCell = make("td", undefined, "row-actions");
			var editBtn = make("button", "Edit", "btn");
			editBtn.type = "button";
			editBtn.onclick = function () { openLotDialog(lot, false); };
			var delBtn = make("button", "Delete", "btn danger");
			delBtn.type = "button";
			delBtn.onclick = function () { removeLot(lot); };
			actionCell.appendChild(editBtn);
			actionCell.appendChild(delBtn);
			tr.appendChild(actionCell);
			body.appendChild(tr);
		});
		renderSelectionSummary();
	}

	function removeLot(lot) {
		if (!confirm("Delete lot " + (lot.display_lot_number || lot.lot_number || "") + "? Files are removed after Save changes.")) { return; }
		state.pendingDeletes = state.pendingDeletes.concat(mediaUrls(lot));
		delete state.selectedLotIds[lot.lot_id];
		state.data.lots = safeArray(state.data.lots).filter(function (l) { return l !== lot; });
		setDirty(true);
		renderMetrics();
		renderTable();
		renderSelectionSummary();
	}

	function openLotDialog(lot, isNew) {
		state.editing = normalizeLot(JSON.parse(JSON.stringify(lot)));
		state.original = isNew ? null : lot;
		state.newUploads = [];
		state.removedInDialog = [];
		state.uploading = false;

		$("lot-dialog-title").textContent = isNew ? "Add lot" : "Edit lot " + (lot.display_lot_number || lot.lot_number || "");
		var form = $("lot-form");
		LOT_FIELDS.forEach(function (field) {
			form.elements[field].value = state.editing[field] == null ? "" : state.editing[field];
		});

		say($("upload-msg"), "");
		resetUploadProgress();
		renderDialogMedia();
		$("lot-dialog").showModal();
	}

	function renderDialogMedia() {
		var box = $("media-grid");
		box.textContent = "";
		var media = state.editing.media;
		var hasThumb = safeArray(media.images).some(function (img) { return !!img.is_thumbnail; });

		safeArray(media.images).forEach(function (img, idx) {
			var cover = img.is_thumbnail || (!hasThumb && idx === 0);
			var tile = make("div", undefined, "thumb" + (cover ? " cover" : ""));
			var image = document.createElement("img");
			image.src = img.url;
			image.alt = img.alt || "";
			tile.appendChild(image);
			if (cover) { tile.appendChild(make("em", "Cover")); }
			tile.onclick = function () {
				media.images.forEach(function (entry) { entry.is_thumbnail = false; });
				img.is_thumbnail = true;
				renderDialogMedia();
			};
			tile.appendChild(removeMediaButton(function () {
				removeDialogMedia(img.url);
			}));
			box.appendChild(tile);
		});

		safeArray(media.videos).forEach(function (url) {
			var tile = make("div", undefined, "thumb");
			var video = document.createElement("video");
			video.src = url;
			video.preload = "metadata";
			video.muted = true;
			tile.appendChild(video);
			tile.appendChild(removeMediaButton(function () {
				removeDialogMedia(url);
			}));
			box.appendChild(tile);
		});
	}

	function removeMediaButton(action) {
		var btn = make("button", "x");
		btn.type = "button";
		btn.title = "Remove file";
		btn.onclick = function (e) {
			e.stopPropagation();
			action();
		};
		return btn;
	}

	function removeDialogMedia(url) {
		var media = state.editing.media;
		media.images = safeArray(media.images).filter(function (img) { return img.url !== url; });
		media.videos = safeArray(media.videos).filter(function (videoUrl) { return videoUrl !== url; });
		state.removedInDialog.push(url);
		renderDialogMedia();
	}

	function resetUploadProgress() {
		var bar = $("upload-progress");
		var label = $("upload-progress-label");
		if (!bar || !label) { return; }
		bar.hidden = true;
		bar.max = 1;
		bar.value = 0;
		label.textContent = "";
	}

	function showUploadProgress(done, total) {
		var bar = $("upload-progress");
		var label = $("upload-progress-label");
		if (!bar || !label) { return; }
		bar.hidden = false;
		bar.max = Math.max(total, 1);
		bar.value = Math.min(done, total);
		label.textContent = done + " / " + total + " uploaded";
	}

	function uploadFiles(files) {
		if (state.uploading) {
			say($("upload-msg"), "Upload already in progress. Please wait...", "err");
			return Promise.resolve();
		}

		var form = $("lot-form").elements;
		var target = buildUploadTarget(
			state.productType,
			form.depot_code.value,
			form.actual_lot_number.value,
			form.auction_date.value
		);
		if (!target) {
			say($("upload-msg"), "Enter depot code, actual lot number and auction date before uploading.", "err");
			resetUploadProgress();
			return Promise.resolve();
		}
		var displayLot = target.lot;
		var total = files.length;
		var uploaded = 0;
		var picker = $("file-picker");
		state.uploading = true;
		if (picker) { picker.disabled = true; }
		showUploadProgress(uploaded, total);

		var chain = Promise.resolve();
		files.forEach(function (file, idx) {
			chain = chain.then(function () {
				say($("upload-msg"), "Uploading " + (idx + 1) + " of " + total + ": " + file.name + " ...");
				return api(target.query, {
					method: "POST",
					headers: { "Content-Type": file.type },
					body: file
				}).then(function (result) {
					if (result.kind === "video") {
						state.editing.media.videos.push(result.url);
					} else {
						state.editing.media.images.push({
							url: result.url,
							alt: "Lot " + displayLot,
							is_thumbnail: safeArray(state.editing.media.images).length === 0
						});
					}
					uploaded += 1;
					showUploadProgress(uploaded, total);
					state.newUploads.push(result.url);
					renderDialogMedia();
				});
			});
		});

		return chain.then(function () {
			say($("upload-msg"), "Upload complete: " + total + " of " + total + " file(s).", "ok");
		}).catch(function (e) {
			say($("upload-msg"), "Upload failed: " + e.message, "err");
		}).finally(function () {
			state.uploading = false;
			if (picker) { picker.disabled = false; }
		});
	}

	function closeLotDialogAndRollback() {
		Promise.all(state.newUploads.map(deleteMedia)).finally(function () {
			state.newUploads = [];
			state.removedInDialog = [];
			$("lot-dialog").close();
		});
	}

	function saveEditedLot() {
		var form = $("lot-form");
		var lot = state.editing;
		LOT_FIELDS.forEach(function (field) {
			lot[field] = form.elements[field].value === "" ? null : form.elements[field].value;
		});

		var mapped = buildLotFromInputRow(lot);
		if (!mapped) {
			say($("upload-msg"), "Depot code, auction date and lot number are required.", "err");
			return;
		}

		Object.assign(lot, mapped);
		lot.lot_id = "lot_" + String(lot.display_lot_number || lot.lot_number).toLowerCase().replace(/[^a-z0-9_]+/g, "_");
		lot.created_at = lot.created_at || new Date().toISOString().slice(0, 10);

		if (!lot.depot_code || !lot.actual_lot_number || !lot.display_lot_number) {
			say($("upload-msg"), "Depot code, auction date and lot number are required.", "err");
			return;
		}

		if (lot.quantity_m3 === null || lot.quantity_m3 <= 0) {
			say($("upload-msg"), "Quantity is required and must be greater than 0.", "err");
			return;
		}

		var duplicate = safeArray(state.data.lots).some(function (other) {
			return other !== state.original &&
				String(other.display_lot_number || "").toUpperCase() === String(lot.display_lot_number || "").toUpperCase();
		});
		if (duplicate) {
			say($("upload-msg"), "Lot " + lot.display_lot_number + " already exists.", "err");
			return;
		}

		var wasSelected = !!(state.original && state.selectedLotIds[state.original.lot_id]);
		if (state.original) { delete state.selectedLotIds[state.original.lot_id]; }
		if (wasSelected) { state.selectedLotIds[lot.lot_id] = true; }

		var idx = safeArray(state.data.lots).indexOf(state.original);
		if (idx >= 0) { state.data.lots[idx] = normalizeLot(lot); }
		else { state.data.lots.push(normalizeLot(lot)); }

		state.pendingDeletes = state.pendingDeletes.concat(state.removedInDialog);
		state.newUploads = [];
		state.removedInDialog = [];

		$("lot-dialog").close();
		setDirty(true);
		renderMetrics();
		renderTable();
		renderSelectionSummary();
	}

	function deleteMedia(url) {
		return api("/api/media?url=" + encodeURIComponent(url), { method: "DELETE" }).catch(function () {});
	}

	function saveAllChanges() {
		$("save-all").disabled = true;
		say($("app-msg"), "Saving...");

		var payload = {
			product_type: state.productType,
			title: state.data.title || state.productType,
			description: state.data.description || null,
			updated_at: new Date().toISOString().slice(0, 10),
			lots: safeArray(state.data.lots).map(normalizeLot)
		};

		api("/api/products/" + state.productType, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload)
		}).then(function (saved) {
			var deletes = state.pendingDeletes.slice();
			state.pendingDeletes = [];
			state.data = saved || payload;
			state.data.lots = safeArray(state.data.lots).map(normalizeLot);
			setDirty(false);
			renderMetrics();
			renderTable();
			say($("app-msg"), "Saved. Public pages reflect changes shortly.", "ok");
			return Promise.all(deletes.map(deleteMedia));
		}).catch(function (e) {
			setDirty(true);
			say($("app-msg"), "Save failed: " + e.message, "err");
		});
	}

	function logout() {
		if (state.dirty && !confirm("Discard unsaved changes and log out?")) { return; }
		setToken(null);
		location.reload();
	}

	function showLogin(message) {
		if ($("lot-dialog").open) { $("lot-dialog").close(); }
		$("login-screen").hidden = false;
		$("app-screen").hidden = true;
		say($("login-msg"), message || (!API ? "Set adminApiUrl in js/stock-config.js first." : ""), "err");
	}

	function showApp() {
		$("login-screen").hidden = true;
		$("app-screen").hidden = false;
	}

	function startApp() {
		showApp();
		if (!started) {
			started = true;
			PRODUCT_TYPES.forEach(function (product) {
				var option = document.createElement("option");
				option.value = product.id;
				option.textContent = product.label;
				$("product").appendChild(option);
			});
		}
		return loadProduct();
	}

	$("login-form").addEventListener("submit", function (e) {
		e.preventDefault();
		if (!API) {
			showLogin("Set adminApiUrl in js/stock-config.js first.");
			return;
		}
		var fields = $("login-form").elements;
		$("login-btn").disabled = true;
		say($("login-msg"), "");
		api("/api/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: fields.username.value.trim(),
				password: fields.password.value
			})
		}).then(function (res) {
			fields.password.value = "";
			setToken(res.token);
			return startApp();
		}).catch(function (err) {
			$("login-btn").disabled = false;
			say($("login-msg"), err.message, "err");
		});
	});

	$("add-lot").onclick = function () {
		openLotDialog({
			depot_code: "",
			auction_date: "",
			actual_lot_number: "",
			status: "available",
			media: { images: [], videos: [] }
		}, true);
	};

	$("save-all").onclick = saveAllChanges;
	$("logout").onclick = logout;
	$("cancel-lot").onclick = closeLotDialogAndRollback;

	$("product").onchange = function (e) {
		if (state.dirty && !confirm("Discard unsaved changes?")) {
			e.target.value = state.productType;
			return;
		}
		state.productType = e.target.value;
		loadProduct();
	};

	$("lot-form").addEventListener("submit", function (e) {
		e.preventDefault();
		saveEditedLot();
	});

	$("file-picker").addEventListener("change", function (e) {
		var files = Array.prototype.slice.call(e.target.files || []);
		e.target.value = "";
		if (!files.length) { return; }
		uploadFiles(files);
	});

	window.addEventListener("beforeunload", function (e) {
		if (state.dirty) {
			e.preventDefault();
			e.returnValue = "";
		}
	});

	setToken(sessionStorage.getItem(TOKEN_KEY));
	if (token && API) { startApp(); } else { showLogin(); }

	function buildDisplayLot(depotCode, actualLotNumber, auctionDateIso) {
		var depot = String(depotCode || "").trim().toUpperCase();
		var actual = String(actualLotNumber || "").trim();
		var date = String(auctionDateIso || "");
		var month = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(5, 7) : "";
		var year2 = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(2, 4) : "";
		if (!depot || !actual || !month || !year2) { return ""; }
		return depot + "_" + actual + "_" + month + "_" + year2;
	}

	function parseGeneratedLotNumber(lotNumber) {
		var text = String(lotNumber || "").trim();
		if (!text) { return null; }
		var parts = text.split("_");
		if (parts.length < 4) { return null; }

		var depot = String(parts[0] || "").trim().toUpperCase();
		var yy = String(parts[parts.length - 1] || "").trim();
		var mm = String(parts[parts.length - 2] || "").trim();
		var actual = parts.slice(1, parts.length - 2).join("_").trim();
		if (!depot || !actual || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(yy)) { return null; }

		var monthNum = Number(mm);
		if (monthNum < 1 || monthNum > 12) { return null; }
		var year = Number(yy) >= 70 ? "19" + yy : "20" + yy;
		return {
			depot_code: depot,
			actual_lot_number: actual,
			auction_date: year + "-" + mm + "-01",
			display_lot_number: text,
			upload_lot: text
		};
	}

	function buildLotIdentity(depotCode, actualLotNumber, auctionDateIso) {
		var depot = String(depotCode || "").trim().toUpperCase();
		var actual = String(actualLotNumber || "").trim();
		var auctionDate = String(auctionDateIso || "").trim();
		var displayLot = buildDisplayLot(depot, actual, auctionDate);
		if (!displayLot) { return null; }
		return {
			depot_code: depot,
			actual_lot_number: actual,
			auction_date: auctionDate,
			display_lot_number: displayLot,
			upload_lot: displayLot
		};
	}

	function buildLotFromInputRow(row) {
		row = row || {};
		var identity = buildLotIdentity(row.depot_code, row.actual_lot_number, row.auction_date);
		if (!identity) { return null; }
		return {
			depot_code: identity.depot_code,
			auction_date: identity.auction_date,
			actual_lot_number: identity.actual_lot_number,
			display_lot_number: identity.display_lot_number,
			lot_number: identity.display_lot_number,
			status: row.status === "sold_out" ? "sold_out" : "available",
			quantity_m3: toNumberOrNull(row.quantity_m3),
			number_of_logs: toNumberOrNull(row.number_of_logs),
			class: row.class == null || row.class === "" ? null : String(row.class),
			price: row.price == null || row.price === "" ? null : String(row.price),
			length_range: row.length_range == null || row.length_range === "" ? null : String(row.length_range),
			girth_range: row.girth_range == null || row.girth_range === "" ? null : String(row.girth_range),
			comment: row.comment == null || row.comment === "" ? null : String(row.comment)
		};
	}

	function buildUploadTarget(productType, depotCode, actualLotNumber, auctionDateIso) {
		var identity = buildLotIdentity(depotCode, actualLotNumber, auctionDateIso);
		if (!productType || !identity) { return null; }
		var params = new URLSearchParams();
		params.set("product", productType);
		params.set("lot", identity.upload_lot);
		return { lot: identity.display_lot_number, query: "/api/upload?" + params.toString() };
	}
})();
