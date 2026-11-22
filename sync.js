/* Синхронизация отметок «знает / повторить» между устройствами.
   Хранилище — файл marks.json в приватном репозитории eivanovski-lab/quiz-marks (GitHub Contents API).
   Устройство подключается один раз: ключ доступа (fine-grained token только на этот репозиторий)
   сохраняется в localStorage этого устройства. Можно передать ссылкой: ...common/#sync=<ключ>.
   Слияние по каждому вопросу: побеждает более позднее изменение (в т. ч. снятие отметки). */
(function(){
  var REPO = 'eivanovski-lab/quiz-marks', FILE = 'marks.json';
  var API = window.QUIZ_SYNC_API || ('https://api.github.com/repos/' + REPO + '/contents/' + FILE);
  var TK = 'qsync-token', MK = 'qsync-meta', LK = 'qsync-last';
  var isMarks = function(k){ return /-marks-v\d+$/.test(k); };
  var ls; try { ls = window.localStorage; ls.setItem('__qs','1'); ls.removeItem('__qs'); } catch(e) { return; }
  var origSet = Storage.prototype.setItem;
  var rawSet = function(k, v){ return origSet.call(ls, k, v); };

  // Ключ из ссылки #sync=...
  var m = location.hash.match(/[#&]sync=([^&]+)/);
  if (m) { rawSet(TK, decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname + location.search); }

  function J(s, d){ try { var v = JSON.parse(s); return v == null ? d : v; } catch(e) { return d; } }
  function meta(){ return J(ls.getItem(MK), {}); }
  function saveMeta(x){ rawSet(MK, JSON.stringify(x)); }
  function token(){ return ls.getItem(TK) || ''; }

  // Отметки, которые были до подключения синхронизации, получают время 1 (уступают любым изменениям на сервере)
  function adoptLegacy(){
    var mt = meta(), ch = false;
    for (var i = 0; i < ls.length; i++) {
      var k = ls.key(i); if (!isMarks(k)) continue;
      var cur = J(ls.getItem(k), {}), b = mt[k] || (mt[k] = {});
      for (var id in cur) if (!b[id]) { b[id] = [cur[id], 1]; ch = true; }
    }
    if (ch) saveMeta(mt);
  }

  // Перехват записи отметок страницей: фиксируем время изменения каждого вопроса
  function onWrite(k, v){
    var old = J(ls.getItem(k), {}), nw = J(v, {}), mt = meta(), b = mt[k] || (mt[k] = {}), now = Date.now(), ch = false;
    var ids = {}; for (var a in old) ids[a] = 1; for (var c in nw) ids[c] = 1;
    for (var id in ids) if ((old[id] || null) !== (nw[id] || null)) { b[id] = [nw[id] || null, now]; ch = true; }
    if (ch) { saveMeta(mt); schedule(); }
  }
  Storage.prototype.setItem = function(k, v){
    if (this === ls && isMarks(String(k))) { try { onWrite(String(k), String(v)); } catch(e) {} }
    return origSet.call(this, k, v);
  };

  function merge(a, b){
    var out = {}, k, id;
    [a, b].forEach(function(src){ for (k in src) { out[k] = out[k] || {}; for (id in src[k]) {
      var x = src[k][id], y = out[k][id]; if (!y || x[1] > y[1]) out[k][id] = x; } } });
    return out;
  }
  function same(a, b){ return JSON.stringify(sortObj(a)) === JSON.stringify(sortObj(b)); }
  function sortObj(o){ if (!o || typeof o !== 'object' || Array.isArray(o)) return o; var r = {}; Object.keys(o).sort().forEach(function(k){ r[k] = sortObj(o[k]); }); return r; }
  function b64e(s){ return btoa(unescape(encodeURIComponent(s))); }
  function b64d(s){ return decodeURIComponent(escape(atob(s.replace(/\n/g, '')))); }

  function req(method, body){
    return fetch(API + (method === 'GET' ? '?t=' + Date.now() : ''), {
      method: method, cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + token(), 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  var state = { status: token() ? 'idle' : 'off', msg: '', busy: false, again: false };
  function setStatus(s, msg){ state.status = s; state.msg = msg || ''; if (s === 'ok') rawSet(LK, String(Date.now())); emit(); }
  function emit(){ try { window.dispatchEvent(new CustomEvent('qsync', { detail: state })); } catch(e) {} }

  function applyLocal(merged){
    var curKey = window.QUIZ_KEY, changedCur = false;
    for (var k in merged) {
      var marks = {}; for (var id in merged[k]) if (merged[k][id][0]) marks[id] = merged[k][id][0];
      var before = ls.getItem(k) || '{}', after = JSON.stringify(marks);
      if (!same(J(before, {}), marks)) { rawSet(k, after); if (k === curKey) changedCur = true; }
    }
    saveMeta(merged);
    if (changedCur && typeof window.QUIZ_APPLY === 'function') window.QUIZ_APPLY(J(ls.getItem(curKey), {}));
    if (typeof window.QUIZ_REFRESH === 'function') window.QUIZ_REFRESH();
  }

  function sync(){
    if (!token()) { setStatus('off'); return Promise.resolve(); }
    if (state.busy) { state.again = true; return Promise.resolve(); }
    state.busy = true; setStatus('busy');
    var tries = 0;
    function attempt(){
      tries++;
      return req('GET').then(function(r){
        if (r.status === 404) return { sha: null, data: { v: 1, books: {} } };
        if (r.status === 401 || r.status === 403) throw new Error('auth');
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json().then(function(j){ return { sha: j.sha, data: J(b64d(j.content), { v: 1, books: {} }) }; });
      }).then(function(rem){
        var remote = rem.data.books || {}, merged = merge(remote, meta());
        applyLocal(merged);
        if (same(merged, remote)) return;
        var body = { message: 'Отметки: ' + new Date().toISOString(), content: b64e(JSON.stringify({ v: 1, books: merged })) };
        if (rem.sha) body.sha = rem.sha;
        return req('PUT', body).then(function(r){
          if ((r.status === 409 || r.status === 422) && tries < 4) return attempt();
          if (r.status === 401 || r.status === 403) throw new Error('auth');
          if (!r.ok) throw new Error('http ' + r.status);
        });
      });
    }
    return attempt().then(function(){ setStatus('ok'); }, function(e){
      setStatus('error', e.message === 'auth' ? 'Ключ не подходит или истёк' : (navigator.onLine === false ? 'Нет интернета — отметки сохранятся позже' : 'Не удалось связаться с сервером'));
    }).then(function(){ state.busy = false; if (state.again) { state.again = false; sync(); } });
  }

  var timer = null;
  function schedule(){ if (!token()) return; clearTimeout(timer); timer = setTimeout(sync, 1200); }

  window.QUIZ_SYNC = {
    state: state, sync: sync,
    connect: function(t){ rawSet(TK, t.trim()); adoptLegacy(); return sync(); },
    disconnect: function(){ ls.removeItem(TK); setStatus('off'); },
    hasToken: function(){ return !!token(); },
    link: function(){ return location.origin + '/common/#sync=' + encodeURIComponent(token()); },
    last: function(){ return +ls.getItem(LK) || 0; }
  };

  if (token()) {
    adoptLegacy(); sync();
    document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') sync(); });
    window.addEventListener('online', sync);
    setInterval(function(){ if (document.visibilityState === 'visible') sync(); }, 60000);
    window.addEventListener('pagehide', function(){ if (timer) { clearTimeout(timer); sync(); } });
  }
})();
