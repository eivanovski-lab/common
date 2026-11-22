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
  window.QUIZ_NAV = { catalog:C, progress:progress, plural:plural };
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
      'Книги</button><div class="qnav-pop" role="menu"><div class="qnav-h">Выбрать книгу</div><div class="qnav-list"></div><a class="qnav-all" href="'+base+'">Все книги</a></div>';
    header.insertBefore(w, header.firstChild);
    var btn = w.querySelector('.qnav-btn');
    function set(o){ w.classList.toggle('open',o); btn.setAttribute('aria-expanded',o); if(o) w.querySelector('.qnav-list').innerHTML=items(); }
    btn.addEventListener('click', function(e){ e.stopPropagation(); set(!w.classList.contains('open')); });
    document.addEventListener('click', function(e){ if(!w.contains(e.target)) set(false); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') set(false); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
