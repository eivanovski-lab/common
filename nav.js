/* Общее меню «Книги» для всех страниц квизов. Подключение на странице квиза:
   <script src="../catalog.js"></script><script src="../nav.js"></script> */
(function(){
  var C = window.QUIZ_CATALOG || [];
  var path = location.pathname.replace(/index\.html$/,'');
  var parts = path.split('/').filter(Boolean);
  var cur = parts[parts.length-1];
  var isRoot = !C.some(function(b){ return b.slug===cur; });
  var base = isRoot ? '' : '../';
  function progress(b){
    if(!b.key) return null;
    try{ var m = JSON.parse(localStorage.getItem(b.key)||'{}'), ok=0, rep=0;
      for(var k in m){ if(m[k]==='ok') ok++; else if(m[k]==='rep') rep++; }
      return {ok:ok, rep:rep};
    }catch(e){ return null; }
  }
  function plural(n){ var a=n%10,b=n%100; return (a===1&&b!==11)?'вопрос':(a>=2&&a<=4&&(b<12||b>14))?'вопроса':'вопросов'; }
  window.QUIZ_NAV = { catalog:C, progress:progress, plural:plural, openSync:openSync, syncLabel:syncLabel };

  /* ---------- Синхронизация между устройствами (логика — sync.js) ---------- */
  var scss = document.createElement('style');
  scss.textContent =
  '.qs-dlg{margin:auto;border:1px solid var(--line,#e2d6c0);border-radius:14px;background:var(--surface,#fffaf1);color:var(--ink,#2a231d);padding:20px;max-width:520px;width:calc(100% - 32px);font:15px/1.5 "Golos Text",system-ui,sans-serif}'+
  '.qs-dlg::backdrop{background:rgba(20,15,10,.45)}'+
  '.qs-dlg h2{font-size:17px;margin:0 0 8px}.qs-dlg p{font-size:13.5px;color:var(--muted,#76695a);margin:0 0 10px}'+
  '.qs-dlg input{width:100%;border:1px solid var(--line,#e2d6c0);border-radius:9px;background:var(--surface-2,#efe6d5);padding:9px 10px;font:13px ui-monospace,monospace;color:inherit;box-sizing:border-box}'+
  '.qs-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:12px}'+
  '.qs-btn{border:1px solid var(--line,#e2d6c0);background:var(--surface,#fffaf1);color:inherit;border-radius:9px;padding:7px 12px;font:inherit;font-size:13.5px;cursor:pointer}'+
  '.qs-btn.pri{background:var(--accent,#c9741f);border-color:var(--accent,#c9741f);color:#fff;font-weight:600}'+
  '.qs-st{font-size:14px;font-weight:600;margin:4px 0 10px}.qs-st.ok{color:var(--ok,#2f7a4a)}.qs-st.err{color:var(--rep,#b8502a)}'+
  '.qs-dlg details{font-size:13px;color:var(--muted,#76695a);margin-top:10px}.qs-dlg ol{padding-left:20px;margin:6px 0}'+
  '.qs-msg{font-size:13px;color:var(--ok,#2f7a4a);min-height:1.2em;margin-top:6px}'+
  '.qnav-sync{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;color:inherit;text-align:left;padding:9px 10px;border-radius:10px;font:inherit;font-size:13.5px;cursor:pointer}'+
  '.qnav-sync:hover{background:var(--surface-2,#efe6d5)}'+
  '.qs-dot{width:9px;height:9px;border-radius:50%;background:var(--line,#e2d6c0);flex:none}.qs-dot.ok{background:var(--ok,#2f7a4a)}.qs-dot.err{background:var(--rep,#b8502a)}.qs-dot.busy{background:var(--accent,#c9741f)}';
  document.head.appendChild(scss);
  function hhmm(t){ if(!t) return ''; var d=new Date(t); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  function syncLabel(){
    var S=window.QUIZ_SYNC; if(!S||!S.hasToken()) return {cls:'', text:'Синхронизация выключена'};
    var st=S.state.status;
    if(st==='error') return {cls:'err', text:S.state.msg||'Ошибка синхронизации'};
    if(st==='busy') return {cls:'busy', text:'Синхронизация…'};
    return {cls:'ok', text:'Синхронизировано'+(S.last()?' в '+hhmm(S.last()):'')};
  }
  var dlg=null;
  function openSync(){
    var S=window.QUIZ_SYNC; if(!S){ alert('Синхронизация недоступна в этом браузере'); return; }
    if(!dlg){ dlg=document.createElement('dialog'); dlg.className='qs-dlg'; document.body.appendChild(dlg);
      dlg.addEventListener('click',function(e){ if(e.target===dlg) dlg.close(); }); }
    draw();
    if(!dlg.open) dlg.showModal();
    function draw(){
      var L=syncLabel();
      if(!S.hasToken()){
        dlg.innerHTML='<h2>Синхронизация между устройствами</h2>'+
        '<p>Отметки «знает / повторить» по всем книгам будут храниться на сервере и сами появляться на телефоне, планшете и компьютере. Подключить устройство нужно один раз.</p>'+
        '<p>Проще всего открыть на этом устройстве ссылку для подключения (её можно взять на уже подключённом устройстве). Или вставьте ключ доступа:</p>'+
        '<input id="qsTok" placeholder="github_pat_…" autocomplete="off" spellcheck="false">'+
        '<div class="qs-msg" id="qsMsg"></div>'+
        '<details><summary>Где взять ключ (для взрослого, один раз)</summary><ol>'+
        '<li>Откройте <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → Fine-grained token</a>.</li>'+
        '<li>Token name: «quiz-marks»; Expiration: «No expiration» (или самый долгий срок).</li>'+
        '<li>Repository access: «Only select repositories» → <b>eivanovski-lab/quiz-marks</b>.</li>'+
        '<li>Permissions → Repository permissions → <b>Contents: Read and write</b>.</li>'+
        '<li>Generate token → скопируйте ключ и вставьте сюда.</li></ol>'+
        'Ключ даёт доступ только к файлу с отметками и хранится только на этом устройстве.</details>'+
        '<div class="qs-row"><button class="qs-btn" id="qsClose">Закрыть</button><button class="qs-btn pri" id="qsGo">Подключить</button></div>';
        dlg.querySelector('#qsGo').onclick=function(){
          var t=dlg.querySelector('#qsTok').value.trim(); if(!t){ dlg.querySelector('#qsTok').focus(); return; }
          dlg.querySelector('#qsMsg').textContent='Подключаю…';
          S.connect(t).then(function(){ if(S.state.status==='error'){ var e=S.state.msg; S.disconnect(); draw(); dlg.querySelector('#qsMsg').style.color='var(--rep,#b8502a)'; dlg.querySelector('#qsMsg').textContent=e; } else { draw(); setTimeout(function(){ location.reload(); }, 900); } });
        };
      } else {
        dlg.innerHTML='<h2>Синхронизация между устройствами</h2>'+
        '<div class="qs-st '+(L.cls==='err'?'err':L.cls==='ok'?'ok':'')+'">'+L.text+'</div>'+
        '<p>Отметки по всем книгам сохраняются на сервере и сами подтягиваются на других подключённых устройствах — при открытии страницы и раз в минуту.</p>'+
        '<p>Чтобы подключить другое устройство, отправьте на него ссылку и откройте её там один раз. Ссылка содержит ключ — не публикуйте её.</p>'+
        '<div class="qs-msg" id="qsMsg"></div>'+
        '<div class="qs-row"><button class="qs-btn" id="qsOff">Отключить на этом устройстве</button><button class="qs-btn" id="qsNow">Синхронизировать сейчас</button><button class="qs-btn pri" id="qsLink">Скопировать ссылку для другого устройства</button></div>'+
        '<div class="qs-row"><button class="qs-btn" id="qsClose">Закрыть</button></div>';
        dlg.querySelector('#qsNow').onclick=function(){ S.sync(); };
        dlg.querySelector('#qsOff').onclick=function(){ if(confirm('Отключить синхронизацию на этом устройстве? Отметки здесь останутся, но перестанут обновляться.')){ S.disconnect(); draw(); } };
        dlg.querySelector('#qsLink').onclick=function(){
          var u=S.link(), msg=dlg.querySelector('#qsMsg');
          function done(){ msg.textContent='Ссылка скопирована — отправьте её себе на другое устройство.'; }
          if(navigator.clipboard) navigator.clipboard.writeText(u).then(done,function(){ prompt('Скопируйте ссылку:',u); });
          else prompt('Скопируйте ссылку:',u);
        };
      }
      dlg.querySelector('#qsClose').onclick=function(){ dlg.close(); };
    }
    window.addEventListener('qsync', function(){ if(dlg&&dlg.open&&S.hasToken()){ var el=dlg.querySelector('.qs-st'); if(el){ var L=syncLabel(); el.textContent=L.text; el.className='qs-st '+(L.cls==='err'?'err':L.cls==='ok'?'ok':''); } } });
  }
  if(isRoot) return;

  var css = document.createElement('style');
  css.textContent =
  '.qnav{position:relative;flex:none}'+
  '.qnav-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line,#e2d6c0);background:var(--surface-2,#efe6d5);border-radius:10px;padding:7px 12px;font-size:14px;font-weight:600}'+
  '.qnav-btn svg{flex:none}'+
  '.qnav-pop{position:absolute;top:calc(100% + 8px);left:0;z-index:50;width:min(360px,calc(100vw - 28px));background:var(--surface,#fffaf1);border:1px solid var(--line,#e2d6c0);border-radius:14px;box-shadow:0 10px 30px rgba(40,25,10,.18);padding:8px;display:none}'+
  '.qnav.open .qnav-pop{display:block}'+
  '.qnav-h{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#76695a);padding:6px 10px 4px}'+
  '.qnav-item{display:block;padding:9px 10px;border-radius:10px;color:inherit;text-decoration:none}'+
  'a.qnav-item:hover{background:var(--surface-2,#efe6d5)}'+
  '.qnav-item.cur{background:var(--surface-2,#efe6d5);box-shadow:inset 3px 0 0 var(--accent,#c9741f)}'+
  '.qnav-t{font-weight:600;font-size:14.5px;line-height:1.3}'+
  '.qnav-s{font-size:12.5px;color:var(--muted,#76695a);margin-top:2px}'+
  '.qnav-s .ok{color:var(--ok,#2f7a4a)}.qnav-s .rep{color:var(--rep,#b8502a)}'+
  '.qnav-item.soon{opacity:.6;cursor:default}'+
  '.qnav-tag{display:inline-block;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;border:1px solid currentColor;color:var(--muted,#76695a);margin-left:6px;vertical-align:1px}'+
  '.qnav-all{display:block;text-align:center;border-top:1px solid var(--line,#e2d6c0);margin-top:6px;padding:9px;font-size:13.5px;color:var(--accent,#c9741f);text-decoration:none}';
  document.head.appendChild(css);

  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function items(){
    return C.map(function(b){
      var sub = esc(b.author)+' · '+b.count+' '+plural(b.count);
      if(b.status!=='ready')
        return '<div class="qnav-item soon"><div class="qnav-t">'+esc(b.title)+'<span class="qnav-tag">'+esc(b.note||'скоро')+'</span></div><div class="qnav-s">'+sub+'</div></div>';
      var p = progress(b);
      if(p && (p.ok||p.rep)) sub += ' · <span class="ok">знает '+p.ok+'</span>'+(p.rep?' · <span class="rep">повторить '+p.rep+'</span>':'');
      var isCur = b.slug===cur;
      return '<a class="qnav-item'+(isCur?' cur':'')+'" href="'+base+b.slug+'/"'+(isCur?' aria-current="page"':'')+'><div class="qnav-t">'+esc(b.title)+'</div><div class="qnav-s">'+sub+'</div></a>';
    }).join('');
  }
  function mount(){
    var header = document.querySelector('header'); if(!header) return;
    var w = document.createElement('div'); w.className='qnav';
    w.innerHTML = '<button class="qnav-btn" type="button" aria-haspopup="true" aria-expanded="false">'+
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6.5A2.5 2.5 0 0 0 4 20.5 2.5 2.5 0 0 0 6.5 23H19"/><path d="M8 7h7"/></svg>'+
      'Книги<span class="qs-dot" style="margin-left:2px"></span></button><div class="qnav-pop" role="menu"><div class="qnav-h">Выбрать книгу</div><div class="qnav-list"></div><button class="qnav-sync" type="button"><span class="qs-dot"></span><span class="qs-t"></span></button><a class="qnav-all" href="'+base+'">Все книги</a></div>';
    header.insertBefore(w, header.firstChild);
    var btn = w.querySelector('.qnav-btn');
    function syncItem(){ var L=syncLabel(); w.querySelector('.qs-t').textContent=L.text; w.querySelector('.qnav-sync .qs-dot').className='qs-dot '+L.cls; var d=btn.querySelector('.qs-dot'); if(d) d.className='qs-dot '+L.cls; }
    function set(o){ w.classList.toggle('open',o); btn.setAttribute('aria-expanded',o); if(o){ w.querySelector('.qnav-list').innerHTML=items(); syncItem(); } }
    w.querySelector('.qnav-sync').addEventListener('click', function(){ set(false); openSync(); });
    window.addEventListener('qsync', syncItem); setTimeout(syncItem, 0);
    btn.addEventListener('click', function(e){ e.stopPropagation(); set(!w.classList.contains('open')); });
    document.addEventListener('click', function(e){ if(!w.contains(e.target)) set(false); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') set(false); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
