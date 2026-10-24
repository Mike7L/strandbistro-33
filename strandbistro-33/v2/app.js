// Opening hours (Europe/Berlin). 0 = Sunday … 6 = Saturday; null = Ruhetag.
const HOURS = {0:[12,20],1:[12,20],2:[12,20],3:[12,20],4:null,5:[12,20],6:[12,20]};
const DAY_NAMES = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

const bar = document.querySelector('.bar');
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#nav');

// Navigation
function setNav(open) {
  nav.classList.toggle('open', open);
  bar.classList.toggle('menu-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
}
navToggle.addEventListener('click', () => setNav(navToggle.getAttribute('aria-expanded') !== 'true'));
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setNav(false)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('open')) { setNav(false); navToggle.focus(); }
});

// Solid bar once the hero is scrolled past
const onScroll = () => bar.classList.toggle('solid', window.scrollY > window.innerHeight * 0.6);
window.addEventListener('scroll', onScroll, {passive: true});
onScroll();

// Live opening status, computed in island time regardless of the visitor's timezone
function berlinNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Berlin', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'}).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type).value;
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday'));
  return {day, minutes: Number(get('hour')) * 60 + Number(get('minute'))};
}
function nextOpening(day) {
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (HOURS[d]) return {day: d, inDays: i};
  }
}
function updateStatus() {
  const {day, minutes} = berlinNow();
  const today = HOURS[day];
  const status = document.querySelector('[data-status]');
  const label = status.querySelector('span');
  let open = false, text;
  if (today && minutes >= today[0] * 60 && minutes < today[1] * 60) {
    open = true;
    text = `Jetzt geöffnet · bis ${today[1]}:00`;
  } else if (today && minutes < today[0] * 60) {
    text = `Heute ab ${today[0]}:00 geöffnet`;
  } else {
    const next = nextOpening(day);
    const when = next.inDays === 1 ? 'morgen' : DAY_NAMES[next.day];
    text = `${today ? 'Geschlossen' : 'Ruhetag'} · ${when} ab ${HOURS[next.day][0]}:00`;
  }
  status.classList.toggle('open', open);
  status.classList.toggle('closed', !open);
  label.textContent = text;
  document.querySelectorAll('[data-week] tr').forEach(row => row.classList.toggle('today', Number(row.dataset.day) === day));
}
updateStatus();
setInterval(updateStatus, 60000);

// Menu tabs
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
const search = document.querySelector('[data-menu-search]');
function selectTab(index, focus) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[i].hidden = !selected;
  });
  if (focus) tabs[index].focus();
  if (search.value) { search.value = ''; filterMenu(''); }
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(i));
  tab.addEventListener('keydown', event => {
    const step = {ArrowRight: 1, ArrowLeft: -1}[event.key];
    if (step) { event.preventDefault(); selectTab((i + step + tabs.length) % tabs.length, true); }
  });
});

// Menu search across food and drinks, with highlighted matches
const fold = text => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const items = [...document.querySelectorAll('.menu .card li:not(.sizes)')].map(li => {
  const name = li.querySelector('.n').firstChild;
  // Section titles count too, so "Kaffee" or "Pasta" finds the whole section
  const subheading = li.parentElement.previousElementSibling;
  const section = subheading && subheading.tagName === 'H4' ? subheading : li.closest('.card').querySelector('h3');
  return {li, name, original: name.textContent, haystack: fold(li.textContent + ' ' + section.textContent)};
});
function highlight(item, query) {
  const node = item.name;
  if (!query) { if (node.nodeType !== 3) item.name = restore(item); return; }
  const start = fold(item.original).indexOf(query);
  if (start < 0) { if (node.nodeType !== 3) item.name = restore(item); return; }
  const span = document.createElement('span');
  const mark = document.createElement('mark');
  mark.textContent = item.original.slice(start, start + query.length);
  span.append(item.original.slice(0, start), mark, item.original.slice(start + query.length));
  node.replaceWith(span);
  item.name = span;
}
function restore(item) {
  const text = document.createTextNode(item.original);
  item.name.replaceWith(text);
  return text;
}
function filterMenu(raw) {
  const query = fold(raw.trim());
  const active = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
  panels.forEach((panel, i) => panel.hidden = query ? false : i !== active);
  let hits = 0;
  items.forEach(item => {
    const match = !query || item.haystack.includes(query);
    item.li.hidden = !match;
    if (match) hits++;
    highlight(item, query);
  });
  document.querySelectorAll('.menu .card').forEach(card => {
    if (card.classList.contains('card-photo')) { card.hidden = Boolean(query); return; }
    card.querySelectorAll('ul').forEach(list => {
      const empty = !list.querySelector('li:not(.sizes):not([hidden])');
      list.hidden = empty;
      const heading = list.previousElementSibling;
      if (heading && heading.tagName === 'H4') heading.hidden = empty;
    });
    card.hidden = !card.querySelector('ul:not([hidden])');
    const note = card.querySelector('.note');
    if (note) note.hidden = Boolean(query);
  });
  document.querySelector('[data-no-results]').hidden = hits > 0;
}
search.addEventListener('input', () => filterMenu(search.value));

document.querySelector('[data-year]').textContent = new Date().getFullYear();
