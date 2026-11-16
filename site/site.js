// Language (EN / AR, RTL) and theme switching. English lives in the HTML.
(() => {
  const ar = {
    'nav.how': 'إزاي بيشتغل',
    'nav.start': 'ابدأ',
    'hero.eyebrow': 'مفتوح المصدر · Linux X11 · Chrome على الماك',
    'hero.title': 'تراك باد الماك بتاعك، على لابتوب اللينكس.',
    'hero.lead': 'افتح لينك واحد في Chrome على الماك، دوس مرة، والتراك باد والكليك والسكرول بصباعين والكيبورد يتحكموا في جهاز اللينكس اللي جنبك. مفيش حاجة تتسطّب على الماك.',
    'hero.cta': 'ابدأ دلوقتي',
    'hero.src': 'الكود على GitHub',
    'stat.1': 'من الإرسال لحد ما الماوس يتحرك',
    'stat.2': 'لحقن حركة واحدة',
    'stat.3': 'شغل السيرفر لكل حدث',
    'stat.4': 'برامج تتسطّب على الماك',
    'stat.note': 'القياس على اللابتوب نفسه عن طريق عنوان الواي فاي بتاعه. الواي فاي لحد الماك بيزوّد حوالي ١–٥ ms في الاتجاه الواحد، والصفحة بتعرض أرقامك الحقيقية لايف.',
    'how.title': 'إزاي بيشتغل',
    'how.1.t': 'الالتقاط على الماك',
    'how.1.p': 'صفحة /control بتقفل الماوس وبتقرا حركة التراك باد الخام وأكواد المفاتيح الفعلية، فلغة كيبورد اللينكس هي اللي بتحدد الحروف.',
    'how.2.t': 'رسايل صغيرة من غير استنى',
    'how.2.p': 'كل حدث بيتبعت فورًا على WebSocket و Nagle مقفول. وفيه ping كل ١٠٠ ms بيقيس التأخير وبيخلي الواي فاي في الجهازين صاحي.',
    'how.3.t': 'بيتنفذ في ~٠٫١ ms',
    'how.3.p': 'اللابتوب بيجمع الحركات اللي بتوصل في نفس اللحظة وبيحقنها عن طريق XTest بعد ما قفلنا التأخير الافتراضي ١٠ ms بتاع libnut.',
    'how.cap': 'المعمارية (ملف Excalidraw في docs/).',
    'feat.title': 'معمول عشان تحس إنه جهازك',
    'feat.1.t': '⌘ بيشتغل كـ Ctrl',
    'feat.1.p': '⌘C و ⌘V و ⌘Z بيشتغلوا زي ما إيدك متعودة. وتقدر تقفلها بزرار.',
    'feat.2.t': 'سكرول ناعم',
    'feat.2.p': 'سكرول التراك باد بالبيكسل بيتحول لخطوات عجلة، والباقي الصغير بيتحفظ.',
    'feat.3.t': 'مفيش زرار يفضل مدّاس',
    'feat.3.p': 'أي زرار أو كليك متساب بيتساب لوحده لو الواي فاي قطع أو بدلت لحاجة تانية.',
    'feat.4.t': 'مفتاح ربط',
    'feat.4.p': 'الاتصال محتاج مفتاح سري وبيرفض أي موقع تاني، فمفيش صفحة على الشبكة تقدر تكتب على اللابتوب.',
    'feat.5.t': 'التأخير لايف',
    'feat.5.p': 'تقدير الاتجاه الواحد، والمتوسط و p95، والوقت اللي اللابتوب أخده في كل حدث.',
    'feat.6.t': 'اضغط Esc مطوّل للخروج',
    'feat.6.p': 'التقاط كامل للكيبورد في الفل سكرين؛ اضغط Esc مطوّل والماك يرجعلك.',
    'start.title': 'ابدأ',
    'start.1': 'على جهاز اللينكس',
    'start.1p': 'هيطبع لينك ربط زي http://192.168.1.x:3030/control#t=… والصفحة المحلية http://127.0.0.1:3030 فيها زرار نسخ.',
    'start.2': 'على الماك، مرة واحدة',
    'start.2p': 'في Chrome افتح chrome://flags/#unsafely-treat-insecure-origin-as-secure وضيف http://<laptop-ip>:3030 وفعّله واعمل relaunch. ده بيفتح الحركة الخام والتقاط ⌘W و Esc.',
    'start.3': 'اتحكم',
    'start.3p': 'افتح لينك الربط ودوس Take control. اضغط Esc مطوّل عشان ترجّع التحكم.',
    'faq.title': 'حاجات مهم تعرفها',
    'faq.1.q': 'ليه مش أقل من ١٠ ms على الواي فاي عندي؟',
    'faq.1.a': 'توفير الطاقة في الواي فاي هو السبب المعتاد لقفزات ٢٠–٢٠٠ ms. اقفله على اللابتوب: nmcli connection modify "<wifi>" 802-11-wireless.powersave 2. واستخدم 5 GHz أو كابل لو تقدر.',
    'faq.2.q': 'بيشتغل على Wayland؟',
    'faq.2.a': 'الحقن بيستخدم XTest، فادخل بجلسة Xorg ("Ubuntu on Xorg"). على Wayland برامج XWayland بس هي اللي بتستقبل.',
    'faq.3.q': 'إيه الاختصارات اللي بتفضل على الماك؟',
    'faq.3.a': '⌘Tab و ⌘Space و ⌘Q تبع macOS ومفيش صفحة ويب تقدر تلقطهم. أي حاجة تانية بتوصل للابتوب.',
    'faq.4.q': 'Safari؟',
    'faq.4.a': 'استخدم Chrome (أو أي متصفح Chromium). Safari مفيهوش Keyboard Lock فاختصارات كتير هتفضل على الماك.',
  };

  const nodes = [...document.querySelectorAll('[data-i18n]')];
  const en = Object.fromEntries(nodes.map((n) => [n.dataset.i18n, n.textContent]));
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };

  function setLang(lang) {
    const dict = lang === 'ar' ? ar : en;
    for (const n of nodes) if (dict[n.dataset.i18n]) n.textContent = dict[n.dataset.i18n];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    store.set('mc.lang', lang);
  }
  for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));
  const saved = store.get('mc.lang');
  if (saved === 'ar' || (!saved && navigator.language?.startsWith('ar'))) setLang('ar');

  const root = document.documentElement;
  const t = store.get('mc.theme');
  if (t) root.dataset.theme = t;
  document.getElementById('theme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('mc.theme', root.dataset.theme);
  });
})();
