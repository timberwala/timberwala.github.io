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
		removedInDialog: []
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

	function safeArray(v) { return Array.isArray(v) ? v : []; }

	function monthAbbrFromIso(iso) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) { return null; }
		var m = Number(String(iso).slice(5, 7));
		var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
		return months[m - 1] || null;
	}

	function buildDisplayLot(depotCode, actualLotNumber, auctionDateIso) {
		var depot = String(depotCode || "").trim().toUpperCase();
		var actual = String(actualLotNumber || "").trim();
		var day = /^\d{4}-\d{2}-\d{2}$/.test(String(auctionDateIso || "")) ? String(auctionDateIso).slice(8, 10) : "";
		var month = monthAbbrFromIso(auctionDateIso) || "";
		if (!depot || !actual || !day || !month) { return ""; }
		return depot + "_" + actual + "_" + day + "_" + month;
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
		var actualLot = lot.actual_lot_number == null ? lot.lot_number : lot.actual_lot_number;
		var displayLot = lot.display_lot_number || buildDisplayLot(lot.depot_code, actualLot, lot.auction_date);
		return {
			lot_id: lot.lot_id || ("lot_" + String(displayLot || actualLot || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_")),
			lot_number: actualLot == null ? null : String(actualLot),
			actual_lot_number: actualLot == null ? null : String(actualLot),
			depot_code: lot.depot_code == null ? "" : String(lot.depot_code).toUpperCase(),
			auction_date: lot.auction_date == null ? "" : String(lot.auction_date),
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
		return readPublicProductData(state.productType).then(function (data) {
			data = data || {};
			data.lots = safeArray(data.lots).map(normalizeLot);
			state.data = data;
			setDirty(false);
			say($("app-msg"), "");
			renderMetrics();
			renderTable();
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
		$("empty-msg").hidden = lots.length > 0;

		lots.forEach(function (lot) {
			var tr = make("tr");
			tr.appendChild(make("td", "Lot " + (lot.display_lot_number || lot.lot_number || "-")));

			var statusCell = make("td");
			statusCell.appendChild(make("span", lot.status === "sold_out" ? "Sold out" : "Available", "badge " + lot.status));
			tr.appendChild(statusCell);

			tr.appendChild(make("td", lot.quantity_m3 == null ? "-" : String(lot.quantity_m3)));
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
	}

	function removeLot(lot) {
		if (!confirm("Delete lot " + (lot.display_lot_number || lot.lot_number || "") + "? Files are removed after Save changes.")) { return; }
		state.pendingDeletes = state.pendingDeletes.concat(mediaUrls(lot));
		state.data.lots = safeArray(state.data.lots).filter(function (l) { return l !== lot; });
		setDirty(true);
		renderMetrics();
		renderTable();
	}

	function openLotDialog(lot, isNew) {
		state.editing = normalizeLot(JSON.parse(JSON.stringify(lot)));
		state.original = isNew ? null : lot;
		state.newUploads = [];
		state.removedInDialog = [];

		$("lot-dialog-title").textContent = isNew ? "Add lot" : "Edit lot " + (lot.display_lot_number || lot.lot_number || "");
		var form = $("lot-form");
		LOT_FIELDS.forEach(function (field) {
			form.elements[field].value = state.editing[field] == null ? "" : state.editing[field];
		});

		say($("upload-msg"), "");
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

	function uploadFiles(files) {
		var form = $("lot-form").elements;
		var depot = String(form.depot_code.value || "").trim().toUpperCase();
		var actual = String(form.actual_lot_number.value || "").trim();
		var auctionDate = String(form.auction_date.value || "").trim();
		var displayLot = buildDisplayLot(depot, actual, auctionDate);
		if (!displayLot) {
			say($("upload-msg"), "Enter depot code, actual lot number and auction date before uploading.", "err");
			return Promise.resolve();
		}

		var chain = Promise.resolve();
		files.forEach(function (file, idx) {
			chain = chain.then(function () {
				say($("upload-msg"), "Uploading " + (idx + 1) + " of " + files.length + ": " + file.name + " ...");
				var query = "/api/upload?product=" + encodeURIComponent(state.productType) +
					"&depot=" + encodeURIComponent(depot) +
					"&actual=" + encodeURIComponent(actual) +
					"&auction_date=" + encodeURIComponent(auctionDate);
				return api(query, {
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
					state.newUploads.push(result.url);
					renderDialogMedia();
				});
			});
		});

		return chain.then(function () {
			say($("upload-msg"), "Upload complete.", "ok");
		}).catch(function (e) {
			say($("upload-msg"), "Upload failed: " + e.message, "err");
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
		lot.depot_code = String(lot.depot_code || "").trim().toUpperCase();
		lot.actual_lot_number = String(lot.actual_lot_number || "").trim();
		lot.auction_date = String(lot.auction_date || "").trim();
		lot.display_lot_number = buildDisplayLot(lot.depot_code, lot.actual_lot_number, lot.auction_date);
		lot.lot_number = lot.actual_lot_number;
		lot.quantity_m3 = toNumberOrNull(lot.quantity_m3);
		lot.number_of_logs = toNumberOrNull(lot.number_of_logs);
		lot.status = lot.status === "sold_out" ? "sold_out" : "available";
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
})();
