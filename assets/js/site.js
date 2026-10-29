/* Lance McHan · Cornerstone Real Estate Group — site behaviour
   Progressive enhancement only: every feature works without JS. */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. Navigation (mobile drawer + desktop dropdowns)
  --------------------------------------------------------- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (!nav) return;

    var panels = [].slice.call(nav.querySelectorAll('.nav__disclosure'));

    function closeAllPanels(except) {
      panels.forEach(function (btn) {
        if (btn === except) return;
        btn.setAttribute('aria-expanded', 'false');
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        if (panel) panel.classList.remove('is-open');
      });
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open) closeAllPanels(null);
      });
    }

    panels.forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var open = btn.getAttribute('aria-expanded') === 'true';
        closeAllPanels(btn);
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.classList.toggle('is-open', !open);
      });
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
        closeAllPanels(null);
        if (window.matchMedia('(min-width: 1100px)').matches) return;
        if (nav.classList.contains('is-open')) {
          nav.classList.remove('is-open');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeAllPanels(null);
      if (nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      }
    });
  }

  /* ---------------------------------------------------------
     2. Forms → LeadrVision
     - hidden _page is stamped with the current URL on load
     - fetch() posts to the same action URL; plain POST still works
     - ?submitted=1 shows the confirmation after a no-JS submit
  --------------------------------------------------------- */
  var THANKS = 'Thanks, your message was sent. Lance will be in touch shortly — for anything urgent, call (209) 279-2235.';

  function showStatus(box, message, isError) {
    if (!box) return;
    box.textContent = message;
    box.classList.toggle('form-status--error', !!isError);
    box.classList.add('is-visible');
  }

  function initForms() {
    var forms = [].slice.call(document.querySelectorAll('form[data-leadr]'));

    forms.forEach(function (form) {
      var pageField = form.querySelector('input[name="_page"]');
      if (pageField) pageField.value = window.location.href;

      var status = form.parentNode.querySelector('.form-status');

      form.addEventListener('submit', function (e) {
        if (!window.fetch) return; // let the browser do a normal POST
        e.preventDefault();

        var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
        var originalLabel = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending…';
        }

        var payload = {};
        new FormData(form).forEach(function (value, key) {
          if (payload[key] !== undefined) {
            payload[key] = [].concat(payload[key], value).join(', ');
          } else {
            payload[key] = value;
          }
        });
        payload._page = window.location.href;

        fetch(form.getAttribute('action'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            return res.json().catch(function () { return { ok: res.ok }; });
          })
          .then(function (data) {
            if (data && data.ok) {
              showStatus(status, THANKS, false);
              form.reset();
              if (pageField) pageField.value = window.location.href;
              if (status && status.scrollIntoView) {
                status.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            } else {
              throw new Error('Submission rejected');
            }
          })
          .catch(function () {
            showStatus(
              status,
              'Sorry — that did not go through. Please call (209) 279-2235 or email lance@lancemchan.com.',
              true
            );
          })
          .then(function () {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalLabel;
            }
          });
      });
    });

    // Confirmation after a plain (no-JS) HTML submission
    if (/[?&]submitted=1(&|$)/.test(window.location.search)) {
      var box = document.querySelector('.form-status');
      if (box) {
        showStatus(box, THANKS, false);
        if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  /* ---------------------------------------------------------
     3. Mortgage calculator (self-contained, no network)
  --------------------------------------------------------- */
  function initCalculator() {
    var form = document.getElementById('mortgage-calc');
    if (!form) return;

    var out = {
      total: document.getElementById('calc-total'),
      pi: document.getElementById('calc-pi'),
      tax: document.getElementById('calc-tax'),
      ins: document.getElementById('calc-ins'),
      hoa: document.getElementById('calc-hoa'),
      loan: document.getElementById('calc-loan'),
      interest: document.getElementById('calc-interest')
    };

    var money = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0
    });

    function num(id) {
      var el = document.getElementById(id);
      if (!el) return 0;
      var v = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ''));
      return isFinite(v) && v > 0 ? v : 0;
    }

    function recalc() {
      var price = num('calc-price');
      var downPct = num('calc-down');
      var years = num('calc-term') || 30;
      var ratePct = num('calc-rate');
      var taxPct = num('calc-taxrate');
      var insYear = num('calc-insurance');
      var hoaMonth = num('calc-hoafee');

      var down = price * (downPct / 100);
      var principal = Math.max(price - down, 0);
      var n = years * 12;
      var r = ratePct / 100 / 12;

      var pi;
      if (principal === 0 || n === 0) {
        pi = 0;
      } else if (r === 0) {
        pi = principal / n;
      } else {
        pi = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }

      var tax = price * (taxPct / 100) / 12;
      var ins = insYear / 12;
      var total = pi + tax + ins + hoaMonth;
      var totalInterest = pi * n - principal;

      if (out.total) out.total.textContent = money.format(total || 0);
      if (out.pi) out.pi.textContent = money.format(pi || 0);
      if (out.tax) out.tax.textContent = money.format(tax || 0);
      if (out.ins) out.ins.textContent = money.format(ins || 0);
      if (out.hoa) out.hoa.textContent = money.format(hoaMonth || 0);
      if (out.loan) out.loan.textContent = money.format(principal || 0);
      if (out.interest) out.interest.textContent = money.format(totalInterest > 0 ? totalInterest : 0);
    }

    form.addEventListener('input', recalc);
    form.addEventListener('change', recalc);
    form.addEventListener('submit', function (e) { e.preventDefault(); recalc(); });
    recalc();
  }

  /* ---------------------------------------------------------
     4. Mark the current page in the nav
  --------------------------------------------------------- */
  function markCurrent() {
    var path = window.location.pathname.replace(/index\.html$/, '');
    if (path.length > 1 && path.slice(-1) !== '/') path += '/';
    [].slice.call(document.querySelectorAll('.nav a[href^="/"]')).forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === path) a.setAttribute('aria-current', 'page');
    });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initNav();
    initForms();
    initCalculator();
    markCurrent();
  });
})();
