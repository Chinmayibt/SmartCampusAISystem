/**
 * MM-0141B539 — vanilla JS only (ES5-compatible patterns where practical).
 */
(function () {
  'use strict';

  var TICKET_ID = 'MM-0141B539';

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  onReady(function () {
    document.documentElement.setAttribute('data-js', '1');

    var yearEl = document.getElementById('site-year');
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }

    var copyBtn = document.getElementById('copy-ticket');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyText(TICKET_ID).then(
          function () {
            showToast('Copied ' + TICKET_ID);
          },
          function () {
            showToast('Copy not available');
          }
        );
      });
    }
  });
})();
