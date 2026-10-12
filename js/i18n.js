(function () {
	"use strict";

	var STORAGE_KEY = "cw_lang";
	var PROMPTED_KEY = "cw_lang_prompted";

	var LANG_META = {
		en: { label: "English" },
		hi: { label: "हिन्दी" },
		kn: { label: "ಕನ್ನಡ" },
		bn: { label: "বাংলা" },
		ta: { label: "தமிழ்" },
		ml: { label: "മലയാളം" }
	};

	var DICT = {
		en: {
			"common.language": "Language",
			"header.location": "Location:",
			"header.phone": "Phone:",
			"menu.timbers": "Timbers",
			"menu.contact_us": "Contact Us",
			"menu.available_lots": "Available Lots",
			"home.our_products": "our products",
			"cta.check_available_lots": "Check Available Lots",
			"product.available_lots_upper": "AVAILABLE LOTS",
			"product.available_lots": "Available Lots",
			"product.need_something_else": "Need something else?",
			"product.need_something_else_desc": "Can't find the lot, size or quantity you need? Tell us your requirement and we'll get back to you with the best available options.",
			"product.send_enquiry": "Send an Enquiry",
			"product.or_call": "or call",
			"contact.page_title": "Contact Us",
			"contact.whatsapp_cta": "Contact Through WhatsApp",
			"contact.or": "OR",
			"contact.form_title": "Contact form",
			"contact.full_name": "Full Name",
			"contact.phone_number": "Phone Number",
			"contact.email": "Email",
			"contact.product": "Product",
			"contact.select_timber": "Select Timber Type",
			"contact.message": "Message",
			"contact.message_placeholder": "Specify Your Requirements",
			"contact.not_robot": "I'm not a robot",
			"contact.submit": "Submit",
			"contact.form_success": "Thanks For Contacting CenturyWood Timbers. We will Get You Shortly",
			"contact.form_error": "Oops! There was a problem.",
			"stock.loading": "Loading available lots...",
			"stock.empty": "No lots are listed right now. Please contact us for current availability.",
			"stock.available": "Available",
			"stock.sold_out": "Sold Out",
			"stock.no_photo": "No photo",
			"stock.no_of_logs": "No. of logs",
			"stock.actual_lot": "Actual Lot",
			"stock.depot": "Depot",
			"stock.auction_date": "Auction Date",
			"stock.quantity": "Quantity",
			"stock.class": "Class",
			"stock.length": "Length",
			"stock.girth": "Girth",
			"stock.price": "Price",
			"stock.listed": "Listed",
			"stock.view_media": "View media",
			"stock.enquire_whatsapp": "Enquire on WhatsApp",
			"stock.share_whatsapp": "Share Lot on WhatsApp",
			"stock.call": "Call",
			"stock.summary_lots_available": "Lots available",
			"stock.summary_available_volume": "Available volume",
			"stock.summary_last_updated": "Last updated",
			"stock.filter_all": "All",
			"lang.prompt.hi": "We detected your browser language as Hindi. Switch site language to Hindi?",
			"lang.prompt.kn": "We detected your browser language as Kannada. Switch site language to Kannada?",
			"lang.prompt.bn": "We detected your browser language as Bengali. Switch site language to Bengali?",
			"lang.prompt.ta": "We detected your browser language as Tamil. Switch site language to Tamil?",
			"lang.prompt.ml": "We detected your browser language as Malayalam. Switch site language to Malayalam?"
		},
		hi: {
			"common.language": "भाषा",
			"header.location": "स्थान:",
			"header.phone": "फ़ोन:",
			"menu.timbers": "टिम्बर",
			"menu.contact_us": "संपर्क करें",
			"menu.available_lots": "उपलब्ध लॉट",
			"home.our_products": "हमारे उत्पाद",
			"cta.check_available_lots": "उपलब्ध लॉट देखें",
			"product.available_lots_upper": "उपलब्ध लॉट",
			"product.available_lots": "उपलब्ध लॉट",
			"product.need_something_else": "कुछ और चाहिए?",
			"product.need_something_else_desc": "क्या आपको ज़रूरी लॉट, साइज़ या मात्रा नहीं मिली? अपनी आवश्यकता बताइए, हम उपलब्ध सर्वोत्तम विकल्पों के साथ आपसे संपर्क करेंगे।",
			"product.send_enquiry": "पूछताछ भेजें",
			"product.or_call": "या कॉल करें",
			"contact.page_title": "संपर्क करें",
			"contact.whatsapp_cta": "व्हाट्सऐप पर संपर्क करें",
			"contact.or": "या",
			"contact.form_title": "संपर्क फ़ॉर्म",
			"contact.full_name": "पूरा नाम",
			"contact.phone_number": "फ़ोन नंबर",
			"contact.email": "ईमेल",
			"contact.product": "उत्पाद",
			"contact.select_timber": "टिम्बर प्रकार चुनें",
			"contact.message": "संदेश",
			"contact.message_placeholder": "अपनी आवश्यकता लिखें",
			"contact.not_robot": "मैं रोबोट नहीं हूँ",
			"contact.submit": "सबमिट करें",
			"contact.form_success": "CenturyWood Timbers से संपर्क करने के लिए धन्यवाद। हम जल्द आपसे संपर्क करेंगे।",
			"contact.form_error": "ओह! कोई समस्या हुई।",
			"stock.loading": "उपलब्ध लॉट लोड हो रहे हैं...",
			"stock.empty": "अभी कोई लॉट सूचीबद्ध नहीं है। वर्तमान उपलब्धता के लिए कृपया हमसे संपर्क करें।",
			"stock.available": "उपलब्ध",
			"stock.sold_out": "समाप्त",
			"stock.no_photo": "फोटो नहीं",
			"stock.no_of_logs": "लॉग की संख्या",
			"stock.actual_lot": "वास्तविक लॉट",
			"stock.depot": "डिपो",
			"stock.auction_date": "नीलामी तिथि",
			"stock.quantity": "मात्रा",
			"stock.class": "क्लास",
			"stock.length": "लंबाई",
			"stock.girth": "घेरा",
			"stock.price": "कीमत",
			"stock.listed": "सूचीबद्ध",
			"stock.view_media": "मीडिया देखें",
			"stock.enquire_whatsapp": "व्हाट्सऐप पर पूछताछ",
			"stock.share_whatsapp": "लॉट व्हाट्सऐप पर साझा करें",
			"stock.call": "कॉल करें",
			"stock.summary_lots_available": "उपलब्ध लॉट",
			"stock.summary_available_volume": "उपलब्ध मात्रा",
			"stock.summary_last_updated": "अंतिम अपडेट",
			"stock.filter_all": "सभी",
			"lang.prompt.hi": "हमने आपके ब्राउज़र की भाषा हिंदी पहचानी है। क्या आप साइट को हिंदी में देखना चाहते हैं?",
			"lang.prompt.kn": "हमने आपके ब्राउज़र की भाषा कन्नड़ पहचानी है। क्या आप साइट को कन्नड़ में देखना चाहते हैं?"
		},
		kn: {
			"common.language": "ಭಾಷೆ",
			"header.location": "ಸ್ಥಳ:",
			"header.phone": "ಫೋನ್:",
			"menu.timbers": "ಟಿಂಬರ್ಸ್",
			"menu.contact_us": "ಸಂಪರ್ಕಿಸಿ",
			"menu.available_lots": "ಲಭ್ಯ ಲಾಟ್‌ಗಳು",
			"home.our_products": "ನಮ್ಮ ಉತ್ಪನ್ನಗಳು",
			"cta.check_available_lots": "ಲಭ್ಯ ಲಾಟ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
			"product.available_lots_upper": "ಲಭ್ಯ ಲಾಟ್‌ಗಳು",
			"product.available_lots": "ಲಭ್ಯ ಲಾಟ್‌ಗಳು",
			"product.need_something_else": "ಇನ್ನೇನಾದರೂ ಬೇಕೆ?",
			"product.need_something_else_desc": "ನಿಮಗೆ ಬೇಕಾದ ಲಾಟ್, ಗಾತ್ರ ಅಥವಾ ಪ್ರಮಾಣ ಸಿಗಲಿಲ್ಲವೇ? ನಿಮ್ಮ ಅಗತ್ಯವನ್ನು ತಿಳಿಸಿ, ಲಭ್ಯವಿರುವ ಉತ್ತಮ ಆಯ್ಕೆಗಳೊಂದಿಗೆ ನಾವು ಸಂಪರ್ಕಿಸುತ್ತೇವೆ.",
			"product.send_enquiry": "ವಿಚಾರಣೆ ಕಳುಹಿಸಿ",
			"product.or_call": "ಅಥವಾ ಕರೆ ಮಾಡಿ",
			"contact.page_title": "ಸಂಪರ್ಕಿಸಿ",
			"contact.whatsapp_cta": "ವಾಟ್ಸಾಪ್ ಮೂಲಕ ಸಂಪರ್ಕಿಸಿ",
			"contact.or": "ಅಥವಾ",
			"contact.form_title": "ಸಂಪರ್ಕ ಫಾರ್ಮ್",
			"contact.full_name": "ಪೂರ್ಣ ಹೆಸರು",
			"contact.phone_number": "ಫೋನ್ ಸಂಖ್ಯೆ",
			"contact.email": "ಇಮೇಲ್",
			"contact.product": "ಉತ್ಪನ್ನ",
			"contact.select_timber": "ಟಿಂಬರ್ ಪ್ರಕಾರ ಆಯ್ಕೆಮಾಡಿ",
			"contact.message": "ಸಂದೇಶ",
			"contact.message_placeholder": "ನಿಮ್ಮ ಅಗತ್ಯವನ್ನು ಬರೆಯಿರಿ",
			"contact.not_robot": "ನಾನು ರೋಬೋಟ್ ಅಲ್ಲ",
			"contact.submit": "ಸಲ್ಲಿಸಿ",
			"contact.form_success": "CenturyWood Timbers ಸಂಪರ್ಕಿಸಿದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಾವು ಶೀಘ್ರದಲ್ಲೇ ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸುತ್ತೇವೆ.",
			"contact.form_error": "ಅಯ್ಯೋ! ಸಮಸ್ಯೆ ಉಂಟಾಗಿದೆ.",
			"stock.loading": "ಲಭ್ಯ ಲಾಟ್‌ಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...",
			"stock.empty": "ಈಗ ಯಾವುದೇ ಲಾಟ್‌ಗಳು ಪಟ್ಟಿಯಲ್ಲಿಲ್ಲ. ಪ್ರಸ್ತುತ ಲಭ್ಯತೆಗೆ ದಯವಿಟ್ಟು ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ.",
			"stock.available": "ಲಭ್ಯ",
			"stock.sold_out": "ಮುಗಿದಿದೆ",
			"stock.no_photo": "ಫೋಟೋ ಇಲ್ಲ",
			"stock.no_of_logs": "ಲಾಗ್‌ಗಳ ಸಂಖ್ಯೆ",
			"stock.actual_lot": "ನಿಜವಾದ ಲಾಟ್",
			"stock.depot": "ಡಿಪೋ",
			"stock.auction_date": "ಲಿಲಾವು ದಿನಾಂಕ",
			"stock.quantity": "ಪ್ರಮಾಣ",
			"stock.class": "ವರ್ಗ",
			"stock.length": "ಉದ್ದ",
			"stock.girth": "ಗುತ್ತಿಗೆ",
			"stock.price": "ಬೆಲೆ",
			"stock.listed": "ಪಟ್ಟಿ ದಿನಾಂಕ",
			"stock.view_media": "ಮೀಡಿಯಾ ನೋಡಿ",
			"stock.enquire_whatsapp": "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ವಿಚಾರಿಸಿ",
			"stock.share_whatsapp": "ಲಾಟ್ ಅನ್ನು ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ",
			"stock.call": "ಕರೆ",
			"stock.summary_lots_available": "ಲಭ್ಯ ಲಾಟ್‌ಗಳು",
			"stock.summary_available_volume": "ಲಭ್ಯ ಪ್ರಮಾಣ",
			"stock.summary_last_updated": "ಕೊನೆಯ ನವೀಕರಣ",
			"stock.filter_all": "ಎಲ್ಲ",
			"lang.prompt.hi": "ನಿಮ್ಮ ಬ್ರೌಸರ್ ಭಾಷೆ ಹಿಂದಿ ಎಂದು ಕಂಡುಬಂದಿದೆ. ಸೈಟ್ ಅನ್ನು ಹಿಂದಿಗೆ ಬದಲಾಯಿಸಬೇಕೇ?",
			"lang.prompt.kn": "ನಿಮ್ಮ ಬ್ರೌಸರ್ ಭಾಷೆ ಕನ್ನಡ ಎಂದು ಕಂಡುಬಂದಿದೆ. ಸೈಟ್ ಅನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಬೇಕೇ?"
		},
		bn: {
			"common.language": "ভাষা",
			"header.location": "অবস্থান:",
			"header.phone": "ফোন:",
			"menu.timbers": "টিম্বার",
			"menu.contact_us": "যোগাযোগ করুন",
			"menu.available_lots": "উপলব্ধ লট",
			"home.our_products": "আমাদের পণ্য",
			"cta.check_available_lots": "উপলব্ধ লট দেখুন",
			"product.available_lots_upper": "উপলব্ধ লট",
			"product.available_lots": "উপলব্ধ লট",
			"product.need_something_else": "আর কিছু দরকার?",
			"product.need_something_else_desc": "আপনার প্রয়োজনীয় লট, সাইজ বা পরিমাণ পাচ্ছেন না? আপনার চাহিদা জানান, আমরা সেরা উপলব্ধ বিকল্প নিয়ে যোগাযোগ করব।",
			"product.send_enquiry": "অনুসন্ধান পাঠান",
			"product.or_call": "অথবা কল করুন",
			"contact.page_title": "যোগাযোগ করুন",
			"contact.whatsapp_cta": "হোয়াটসঅ্যাপে যোগাযোগ করুন",
			"contact.or": "অথবা",
			"contact.form_title": "যোগাযোগ ফর্ম",
			"contact.full_name": "পূর্ণ নাম",
			"contact.phone_number": "ফোন নম্বর",
			"contact.email": "ইমেইল",
			"contact.product": "পণ্য",
			"contact.select_timber": "টিম্বারের ধরন নির্বাচন করুন",
			"contact.message": "বার্তা",
			"contact.message_placeholder": "আপনার প্রয়োজন লিখুন",
			"contact.not_robot": "আমি রোবট নই",
			"contact.submit": "জমা দিন",
			"contact.form_success": "CenturyWood Timbers-এ যোগাযোগ করার জন্য ধন্যবাদ। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।",
			"contact.form_error": "ওহ! একটি সমস্যা হয়েছে।",
			"stock.loading": "উপলব্ধ লট লোড হচ্ছে...",
			"stock.empty": "এখন কোনো লট তালিকাভুক্ত নেই। বর্তমান উপলভ্যতার জন্য অনুগ্রহ করে যোগাযোগ করুন।",
			"stock.available": "উপলব্ধ",
			"stock.sold_out": "শেষ",
			"stock.no_photo": "ছবি নেই",
			"stock.no_of_logs": "লগের সংখ্যা",
			"stock.actual_lot": "আসল লট",
			"stock.depot": "ডিপো",
			"stock.auction_date": "নিলামের তারিখ",
			"stock.quantity": "পরিমাণ",
			"stock.class": "ক্লাস",
			"stock.length": "দৈর্ঘ্য",
			"stock.girth": "ঘের",
			"stock.price": "মূল্য",
			"stock.listed": "তালিকাভুক্ত",
			"stock.view_media": "মিডিয়া দেখুন",
			"stock.enquire_whatsapp": "হোয়াটসঅ্যাপে জিজ্ঞাসা করুন",
			"stock.share_whatsapp": "হোয়াটসঅ্যাপে লট শেয়ার করুন",
			"stock.call": "কল",
			"stock.summary_lots_available": "উপলব্ধ লট",
			"stock.summary_available_volume": "উপলব্ধ পরিমাণ",
			"stock.summary_last_updated": "শেষ আপডেট",
			"stock.filter_all": "সব",
			"lang.prompt.bn": "আমরা আপনার ব্রাউজারের ভাষা বাংলা শনাক্ত করেছি। আপনি কি সাইট বাংলা ভাষায় দেখতে চান?"
		},
		ta: {
			"common.language": "மொழி",
			"header.location": "இடம்:",
			"header.phone": "தொலைபேசி:",
			"menu.timbers": "மரங்கள்",
			"menu.contact_us": "தொடர்பு கொள்ளுங்கள்",
			"menu.available_lots": "கிடைக்கும் லாட்கள்",
			"home.our_products": "எங்கள் தயாரிப்புகள்",
			"cta.check_available_lots": "கிடைக்கும் லாட்களை பார்க்கவும்",
			"product.available_lots_upper": "கிடைக்கும் லாட்கள்",
			"product.available_lots": "கிடைக்கும் லாட்கள்",
			"product.need_something_else": "வேறு ஏதும் தேவைதா?",
			"product.need_something_else_desc": "உங்களுக்கு தேவையான லாட், அளவு அல்லது அளவுத்தொகை கிடைக்கவில்லையா? உங்கள் தேவையை சொல்லுங்கள், சிறந்த கிடைக்கும் விருப்பங்களுடன் நாங்கள் தொடர்புகொள்கிறோம்.",
			"product.send_enquiry": "விசாரணை அனுப்பவும்",
			"product.or_call": "அல்லது அழைக்கவும்",
			"contact.page_title": "தொடர்பு கொள்ளுங்கள்",
			"contact.whatsapp_cta": "வாட்ஸ்அப்பில் தொடர்பு கொள்ளுங்கள்",
			"contact.or": "அல்லது",
			"contact.form_title": "தொடர்பு படிவம்",
			"contact.full_name": "முழுப்பெயர்",
			"contact.phone_number": "தொலைபேசி எண்",
			"contact.email": "மின்னஞ்சல்",
			"contact.product": "தயாரிப்பு",
			"contact.select_timber": "மர வகையை தேர்ந்தெடுக்கவும்",
			"contact.message": "செய்தி",
			"contact.message_placeholder": "உங்கள் தேவையை குறிப்பிடவும்",
			"contact.not_robot": "நான் ரோபோ இல்லை",
			"contact.submit": "சமர்ப்பிக்கவும்",
			"contact.form_success": "CenturyWood Timbers-ஐ தொடர்புகொண்டதற்கு நன்றி. விரைவில் உங்களைத் தொடர்புகொள்கிறோம்.",
			"contact.form_error": "அய்யோ! ஒரு பிரச்சனை ஏற்பட்டது.",
			"stock.loading": "கிடைக்கும் லாட்கள் ஏற்றப்படுகின்றன...",
			"stock.empty": "தற்போது எந்த லாட்களும் பட்டியலில் இல்லை. தற்போதைய கிடைப்பை அறிய தொடர்புகொள்ளவும்.",
			"stock.available": "கிடைக்கும்",
			"stock.sold_out": "முடிந்தது",
			"stock.no_photo": "புகைப்படம் இல்லை",
			"stock.no_of_logs": "லாக் எண்ணிக்கை",
			"stock.actual_lot": "உண்மை லாட்",
			"stock.depot": "டெப்போ",
			"stock.auction_date": "ஏலம் தேதி",
			"stock.quantity": "அளவு",
			"stock.class": "வகுப்பு",
			"stock.length": "நீளம்",
			"stock.girth": "சுற்றளவு",
			"stock.price": "விலை",
			"stock.listed": "பட்டியலிடப்பட்டது",
			"stock.view_media": "மீடியா பார்க்கவும்",
			"stock.enquire_whatsapp": "வாட்ஸ்அப்பில் விசாரிக்கவும்",
			"stock.share_whatsapp": "லாட்டை வாட்ஸ்அப்பில் பகிரவும்",
			"stock.call": "அழைப்பு",
			"stock.summary_lots_available": "கிடைக்கும் லாட்கள்",
			"stock.summary_available_volume": "கிடைக்கும் அளவு",
			"stock.summary_last_updated": "கடைசி புதுப்பிப்பு",
			"stock.filter_all": "அனைத்தும்",
			"lang.prompt.ta": "உங்கள் உலாவி மொழி தமிழாக கண்டறியப்பட்டது. தளத்தை தமிழுக்கு மாற்றவா?"
		},
		ml: {
			"common.language": "ഭാഷ",
			"header.location": "സ്ഥലം:",
			"header.phone": "ഫോൺ:",
			"menu.timbers": "ടിംബേഴ്സ്",
			"menu.contact_us": "ബന്ധപ്പെടുക",
			"menu.available_lots": "ലഭ്യമായ ലോട്ടുകൾ",
			"home.our_products": "ഞങ്ങളുടെ ഉൽപ്പന്നങ്ങൾ",
			"cta.check_available_lots": "ലഭ്യമായ ലോട്ടുകൾ പരിശോധിക്കുക",
			"product.available_lots_upper": "ലഭ്യമായ ലോട്ടുകൾ",
			"product.available_lots": "ലഭ്യമായ ലോട്ടുകൾ",
			"product.need_something_else": "ഇനിയും എന്തെങ്കിലും വേണ്ടോ?",
			"product.need_something_else_desc": "താങ്കൾക്ക് വേണ്ട ലോട്ട്, വലിപ്പം അല്ലെങ്കിൽ അളവ് കിട്ടിയില്ലേ? നിങ്ങളുടെ ആവശ്യകത പറഞ്ഞാൽ ലഭ്യമായ മികച്ച ഓപ്ഷനുകളോടെ ഞങ്ങൾ നിങ്ങളെ ബന്ധപ്പെടും.",
			"product.send_enquiry": "ചോദ്യം അയയ്ക്കുക",
			"product.or_call": "അല്ലെങ്കിൽ വിളിക്കുക",
			"contact.page_title": "ബന്ധപ്പെടുക",
			"contact.whatsapp_cta": "വാട്ട്സ്ആപ്പിൽ ബന്ധപ്പെടുക",
			"contact.or": "അല്ലെങ്കിൽ",
			"contact.form_title": "ബന്ധപ്പെടൽ ഫോം",
			"contact.full_name": "പൂർണ്ണ നാമം",
			"contact.phone_number": "ഫോൺ നമ്പർ",
			"contact.email": "ഇമെയിൽ",
			"contact.product": "ഉൽപ്പന്നം",
			"contact.select_timber": "ടിംബർ തരം തിരഞ്ഞെടുക്കുക",
			"contact.message": "സന്ദേശം",
			"contact.message_placeholder": "നിങ്ങളുടെ ആവശ്യകത വ്യക്തമാക്കുക",
			"contact.not_robot": "ഞാൻ റോബോട്ട് അല്ല",
			"contact.submit": "സമർപ്പിക്കുക",
			"contact.form_success": "CenturyWood Timbers-നെ ബന്ധപ്പെട്ടതിന് നന്ദി. ഉടൻ തന്നെ ഞങ്ങൾ നിങ്ങളെ ബന്ധപ്പെടും.",
			"contact.form_error": "അയ്യോ! ഒരു പ്രശ്നമുണ്ടായി.",
			"stock.loading": "ലഭ്യമായ ലോട്ടുകൾ ലോഡ് ചെയ്യുന്നു...",
			"stock.empty": "ഇപ്പോൾ ലോട്ടുകൾ ഒന്നും പട്ടികപ്പെടുത്തിയിട്ടില്ല. നിലവിലെ ലഭ്യതയ്ക്ക് ദയവായി ബന്ധപ്പെടുക.",
			"stock.available": "ലഭ്യം",
			"stock.sold_out": "തീർന്നു",
			"stock.no_photo": "ഫോട്ടോ ഇല്ല",
			"stock.no_of_logs": "ലോഗുകളുടെ എണ്ണം",
			"stock.actual_lot": "യഥാർത്ഥ ലോട്ട്",
			"stock.depot": "ഡിപ്പോ",
			"stock.auction_date": "ലേലം തീയതി",
			"stock.quantity": "അളവ്",
			"stock.class": "ക്ലാസ്",
			"stock.length": "നീളം",
			"stock.girth": "ചുറ്റളവ്",
			"stock.price": "വില",
			"stock.listed": "പട്ടികപ്പെടുത്തിയ തീയതി",
			"stock.view_media": "മീഡിയ കാണുക",
			"stock.enquire_whatsapp": "വാട്ട്സ്ആപ്പിൽ ചോദിക്കുക",
			"stock.share_whatsapp": "വാട്ട്സ്ആപ്പിൽ ലോട്ട് പങ്കിടുക",
			"stock.call": "വിളിക്കുക",
			"stock.summary_lots_available": "ലഭ്യമായ ലോട്ടുകൾ",
			"stock.summary_available_volume": "ലഭ്യമായ അളവ്",
			"stock.summary_last_updated": "അവസാന അപ്ഡേറ്റ്",
			"stock.filter_all": "എല്ലാം",
			"lang.prompt.ml": "നിങ്ങളുടെ ബ്രൗസർ ഭാഷ മലയാളമെന്ന് കണ്ടെത്തി. സൈറ്റ് മലയാളത്തിലേക്ക് മാറ്റണോ?"
		}
	};

	var currentLang = "en";

	function hasLang(lang) {
		return Object.prototype.hasOwnProperty.call(DICT, lang);
	}

	function detectBrowserLang() {
		var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]);
		for (var i = 0; i < list.length; i++) {
			var code = String(list[i] || "").toLowerCase().split("-")[0];
			if (hasLang(code)) { return code; }
		}
		return "en";
	}

	function t(key, fallback) {
		var langDict = DICT[currentLang] || DICT.en;
		return (langDict && langDict[key]) || DICT.en[key] || fallback || key;
	}

	function applyTranslations() {
		document.documentElement.setAttribute("lang", currentLang);
		var nodes = document.querySelectorAll("[data-i18n]");
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			var key = node.getAttribute("data-i18n");
			node.textContent = t(key, node.textContent);
		}
		var placeholders = document.querySelectorAll("[data-i18n-placeholder]");
		for (var j = 0; j < placeholders.length; j++) {
			var p = placeholders[j];
			p.setAttribute("placeholder", t(p.getAttribute("data-i18n-placeholder"), p.getAttribute("placeholder")));
		}
		var titles = document.querySelectorAll("[data-i18n-title]");
		for (var k = 0; k < titles.length; k++) {
			var n = titles[k];
			n.setAttribute("title", t(n.getAttribute("data-i18n-title"), n.getAttribute("title")));
		}
		document.dispatchEvent(new CustomEvent("cw:lang-changed", { detail: { lang: currentLang } }));
	}

	function setLang(lang, persist) {
		var next = hasLang(lang) ? lang : "en";
		currentLang = next;
		if (persist) {
			localStorage.setItem(STORAGE_KEY, next);
			localStorage.setItem(PROMPTED_KEY, "1");
		}
		applyTranslations();
		var select = document.getElementById("cw-lang-select");
		if (select && select.value !== next) { select.value = next; }
	}

	function ensureSwitcher() {
		var select = document.getElementById("cw-lang-select");
		if (!select || select.getAttribute("data-ready") === "1") { return; }
		select.innerHTML = "";
		Object.keys(LANG_META).forEach(function (lang) {
			var option = document.createElement("option");
			option.value = lang;
			option.textContent = LANG_META[lang].label;
			select.appendChild(option);
		});
		select.value = currentLang;
		select.addEventListener("change", function () {
			setLang(select.value, true);
		});
		select.setAttribute("data-ready", "1");
	}

	function maybePromptDetectedLanguage() {
		var saved = localStorage.getItem(STORAGE_KEY);
		if (saved) { return; }
		if (localStorage.getItem(PROMPTED_KEY) === "1") { return; }
		var detected = detectBrowserLang();
		if (detected === "en" || !hasLang(detected)) {
			localStorage.setItem(PROMPTED_KEY, "1");
			return;
		}
		var accepted = window.confirm(t("lang.prompt." + detected, "Switch language?"));
		if (accepted) { setLang(detected, true); }
		else {
			setLang("en", true);
		}
	}

	function init() {
		var saved = localStorage.getItem(STORAGE_KEY);
		setLang(saved && hasLang(saved) ? saved : "en", false);
		applyTranslations();
		maybePromptDetectedLanguage();

		// Header is injected asynchronously via jQuery.load(); poll briefly until it exists.
		var attempts = 0;
		var maxAttempts = 30; // ~9 seconds
		var timer = setInterval(function () {
			ensureSwitcher();
			applyTranslations();
			var select = document.getElementById("cw-lang-select");
			attempts += 1;
			if ((select && select.getAttribute("data-ready") === "1") || attempts >= maxAttempts) {
				clearInterval(timer);
			}
		}, 300);
	}

	window.CW_I18N = {
		t: t,
		getLang: function () { return currentLang; },
		setLang: function (lang) { setLang(lang, true); }
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
