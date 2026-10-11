function include(scriptUrl) {
	document.write('<script src="' + scriptUrl + '"></script>');
};

function isIE() {
	var myNav = navigator.userAgent.toLowerCase();
	return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
};

/* cookie.JS
 ========================================================*/
include('js/jquery.cookie.js');

/* Easing library
 ========================================================*/
include('js/jquery.easing.js');

/* Stick up menus
 ========================================================*/

(function ($) {
	var o = $('html');
	if (o.hasClass('desktop')) {
		include('js/tmstickup.js');

		$(window).load(function () {
			$('#stuck_container').TMStickUp({})
		});
	}
})(jQuery);

/* ToTop
 ========================================================*/
;
(function ($) {
	var o = $('html');
	if (o.hasClass('desktop')) {
		include('js/jquery.ui.totop.js');

		$(document).ready(function () {
			$().UItoTop({easingType: 'easeOutQuart'});
		});
	}
})(jQuery);

/* EqualHeights
 ========================================================*/
;
(function ($) {
	var o = $('[data-equal-group]');
	if (o.length > 0) {
		include('js/jquery.equalheights.js');
	}
})(jQuery);

/* SMOOTH SCROLLIG
 ========================================================*/
;
(function ($) {
	var o = $('html');
	if (o.hasClass('desktop')) {
		include('js/jquery.mousewheel.min.js');
		include('js/jquery.simplr.smoothscroll.min.js');

		$(document).ready(function () {
			$.srSmoothscroll({
				step: 150,
				speed: 800
			});
		});
	}
})(jQuery);

/* Copyright Year
 ========================================================*/
var currentYear = (new Date).getFullYear();
$(document).ready(function () {
	$("#copyright-year").text((new Date).getFullYear());
});

/* Superfish menus
 ========================================================*/
;
(function ($) {
	include('js/superfish.js');

	var o = $('.sf-menu-toggle');
	if (o.length > 0) {
		$(document).ready(function () {
			var n = $('.nav');
			o.click(function () {
				n.toggleClass('active');
				return false;
			});

			$(document).click(function (e) {
				if (n.hasClass('active')) {
					var target = e.clientX;
					if (target > (n.width())) {
						n.removeClass('active');
					}
				}
			});
		});
	} else {
		include('js/jquery.mobilemenu.js');
	}
})(jQuery);


/* RD Google Maps
 ========================================================*/
;
(function ($) {
	include('js/jquery.rd-google-map.js');

	$(document).ready( function () {
		var rdGoogleMaps = $(".rd-google-map");

		if( rdGoogleMaps.length ) {
			var i;

			$.getScript("//maps.google.com/maps/api/js?key=AIzaSyAwH60q5rWrS8bXwpkZwZwhw9Bw0pqKTZM&sensor=false&libraries=geometry,places&v=3.7", function () {
				var head = document.getElementsByTagName('head')[0],
					insertBefore = head.insertBefore;

				head.insertBefore = function (newElement, referenceElement) {
					if (newElement.href && newElement.href.indexOf('//fonts.googleapis.com/css?family=Roboto') != -1 || newElement.innerHTML.indexOf('gm-style') != -1) {
						return;
					}
					insertBefore.call(head, newElement, referenceElement);
				};

				for (i = 0; i < rdGoogleMaps.length; i++) {
					var $this = $(rdGoogleMaps[i]),
						styles = $this.attr("data-styles");

					$this.googleMap({
						marker: {
							basic: $this.data('marker'),
							active: $this.data('marker-active')
						},
						styles: styles ? JSON.parse(styles) : [],
						onInit: function (map) {
							var inputAddress = $('#rd-google-map-address');



							if (inputAddress.length) {
								var input = inputAddress;
								var geocoder = new google.maps.Geocoder();
								var marker = new google.maps.Marker(
									{
										map: map,
										icon: $this.data('marker-url'),
									}
								);

								var autocomplete = new google.maps.places.Autocomplete(inputAddress[0]);
								autocomplete.bindTo('bounds', map);
								inputAddress.attr('placeholder', '');
								inputAddress.on('change', function () {
									$("#rd-google-map-address-submit").trigger('click');
								});
								inputAddress.on('keydown', function (e) {
									if (e.keyCode == 13) {
										$("#rd-google-map-address-submit").trigger('click');
									}
								});


								$("#rd-google-map-address-submit").on('click', function (e) {
									e.preventDefault();
									var address = input.val();
									geocoder.geocode({'address': address}, function (results, status) {
										if (status == google.maps.GeocoderStatus.OK) {
											var latitude = results[0].geometry.location.lat();
											var longitude = results[0].geometry.location.lng();

											map.setCenter(new google.maps.LatLng(
												parseFloat(latitude),
												parseFloat(longitude)
											));
											marker.setPosition(new google.maps.LatLng(
												parseFloat(latitude),
												parseFloat(longitude)
											))
										}
									});
								});
							}
						}
					});
				}
			});
		}
	});
})(jQuery);

/* WOW
 ========================================================*/
;
(function ($) {
	var o = $('html');

	if ((navigator.userAgent.toLowerCase().indexOf('msie') == -1 ) || (isIE() && isIE() > 9)) {
		if (o.hasClass('desktop')) {
			include('js/wow/wow.js');

			$(document).ready(function () {
				new WOW().init();
			});
		}
	}
})(jQuery);

/* Unveil
 ========================================================*/
;
(function ($) {
	var o = $('.lazy-img img');

	if (o.length > 0) {
		include('js/jquery.unveil.js');

		$(document).ready(function () {
			$(o).unveil(0, function () {
				if (isIE() && isIE() < 9) {
					$(this).load().addClass("lazy-loaded");
				} else {
					$(this).load(function () {
						$(this).addClass("lazy-loaded");
					})
				}
			});
		});

		$(window).load(function () {
			$(window).trigger('lookup.unveil');
		});

	}
})(jQuery);

/* Orientation tablet fix
 ========================================================*/
$(function () {
	// IPad/IPhone
	var viewportmeta = document.querySelector && document.querySelector('meta[name="viewport"]'),
		ua = navigator.userAgent,

		gestureStart = function () {
			viewportmeta.content = "width=device-width, minimum-scale=0.25, maximum-scale=1.6, initial-scale=1.0";
		},

		scaleFix = function () {
			if (viewportmeta && /iPhone|iPad/.test(ua) && !/Opera Mini/.test(ua)) {
				viewportmeta.content = "width=device-width, minimum-scale=1.0, maximum-scale=1.0";
				document.addEventListener("gesturestart", gestureStart, false);
			}
		};

	scaleFix();
	// Menu Android
	if (window.orientation != undefined) {
		var regM = /ipod|ipad|iphone/gi,
			result = ua.match(regM);
		if (!result) {
			$('.sf-menus li').each(function () {
				if ($(">ul", this)[0]) {
					$(">a", this).toggle(
						function () {
							return false;
						},
						function () {
							window.location.href = $(this).attr("href");
						}
					);
				}
			})
		}
	}
});
var ua = navigator.userAgent.toLocaleLowerCase(),
	regV = /ipod|ipad|iphone/gi,
	result = ua.match(regV),
	userScale = "";
if (!result) {
	userScale = ",user-scalable=0"
}
document.write('<meta name="viewport" content="width=device-width,initial-scale=1.0' + userScale + '">')

/* Contact Form
 ========================================================*/
;
(function ($) {
	var o = $('#contact-form');
	if (o.length > 0) {
		include('js/modal.js');
		include('js/TMForm.js');
	}
})(jQuery);

/* Search.js
 ========================================================*/
;
(function ($) {
	var o = $('#search-results');
	if (o.length > 0) {
		include('search/search.js');
	}
})(jQuery);

/* Owl Carousel
 ========================================================*/
;
(function ($) {
	var o = $('.owl-carousel');
	if (o.length > 0) {
		include('js/owl.carousel.min.js');
		$(document).ready(function () {
			o.owlCarousel({
				margin: 30,
				smartSpeed: 450,
				loop: true,
				dots: true,
				dotsEach: 1,
				nav: false,
				responsive: {
					0: { items: 1 },
					768: { items: 2 },
					980: { ietms: 3 }
				}
			});
		});
	}
})(jQuery);

/* Camera
 ========================================================*/
;
(function ($) {
	var o = $('#camera');
	if (o.length > 0) {
		if (!(isIE() && (isIE() > 9))) {
			include('js/jquery.mobile.customized.min.js');
		}

		include('js/camera.js');

		$(document).ready(function () {
			o.camera({
				autoAdvance: true,
				height: '32.03125%',
				minHeight: '300px',
				pagination: false,
				thumbnails: false,
				playPause: false,
				hover: false,
				loader: 'none',
				navigation: true,
				navigationHover: false,
				mobileNavHover: false,
				fx: 'simpleFade'
			})
		});
	}
})(jQuery);