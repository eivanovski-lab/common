/* Каталог квизов. Чтобы добавить книгу — допишите одну запись сюда.
   status: 'ready' — опубликован (есть папка slug/), 'soon' — готовится (показывается в меню без ссылки).
   key — ключ localStorage с отметками (для прогресса в меню). */
window.QUIZ_CATALOG = [
  { slug:'vera-anfisa', title:'Про Веру и Анфису', author:'Эдуард Успенский', count:200, status:'ready', key:'vera-anfisa-marks-v1' },
  { slug:'alya', title:'Аля, Кляксич и буква «А»', author:'Ирина Токмакова', count:184, status:'ready', key:'alya-klyaksich-marks-v1' },
  { slug:'udivitelnyj-den', title:'Удивительный день', author:'Виктор Драгунский', count:150, status:'ready', key:'udivitelnyj-den-marks-v1' },
  { slug:'tsvetik', title:'Цветик-семицветик', author:'Валентин Катаев', count:100, status:'soon', note:'готовится' }
];
