(function () {
'use strict';

var CONFIG = {
  email:    { text: 'nvienot@gmail.com',             href: 'mailto:nvienot@gmail.com' },
  github:   { text: 'github.com/nicolasvienot',      href: 'https://github.com/nicolasvienot' },
  linkedin: { text: 'linkedin.com/in/nicolasvienot', href: 'https://www.linkedin.com/in/nicolasvienot/' }
};

function t(text, kind) { return { text: text, kind: kind || 'out' }; }
function lk(label, key) { return { kind: 'link', label: label, text: CONFIG[key].text, href: CONFIG[key].href }; }

function osakaTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date());
}

var ABOUT = [
  t('finance (esce paris) → code (42 paris).'),
  t('4 years at meilisearch: developer, engineering manager, then tech lead.'),
  t('built their cloud infrastructure from scratch.'),
  t('typescript · react/next · ruby/rails · k8s · cloudflare', 'muted')
];

var CONTACT = [lk('email     ', 'email'), lk('github    ', 'github'), lk('linkedin  ', 'linkedin')];

var FILES = ['about.txt', 'contact.txt', 'projects/'];

var COMMANDS = [
  'help', 'whoami', 'about', 'contact', 'email', 'github', 'linkedin',
  'ls', 'cat', 'cd', 'pwd', 'time', 'date', 'echo',
  'history', 'clear', 'sudo', 'rm', 'exit'
];

var HOME = ['', '~', '.', '..', '-', '/'];

function exec(raw, hist) {
  var parts = raw.trim().split(/\s+/);
  var cmd = (parts[0] || '').toLowerCase();
  var arg = parts.slice(1).join(' ');
  var dir = arg.replace(/\/+$/, '');

  switch (cmd) {
    case '': return [];

    case 'help': return [
      t('whoami     who is this'),
      t('about      the longer version'),
      t('contact    how to reach me'),
      t('ls, cat    look around'),
      t('time       time in Osaka'),
      t('clear      clean the screen')
    ];

    case 'whoami': return [t('nicolas vienot — software engineer')];
    case 'about': return ABOUT;
    case 'contact': return CONTACT;
    case 'email': return [CONTACT[0]];
    case 'github': return [CONTACT[1]];
    case 'linkedin': return [CONTACT[2]];

    case 'ls':
      if (dir === 'projects') return [t('(empty)', 'muted')];
      if (HOME.indexOf(dir) !== -1) return [t(FILES.join('   '))];
      if (FILES.indexOf(dir) !== -1) return [t(dir)];
      return [t('ls: ' + dir + ': No such file or directory', 'muted')];

    case 'cat':
      if (arg === 'about.txt') return ABOUT;
      if (arg === 'contact.txt') return CONTACT;
      if (!arg) return [t('usage: cat [file ...]', 'muted')];
      if (arg === 'projects' || arg === 'projects/') return [t('cat: projects: Is a directory', 'muted')];
      return [t('cat: ' + arg + ': No such file or directory', 'muted')];

    case 'cd':
      if (HOME.indexOf(dir) !== -1) return [];
      if (dir === 'projects') return [t('nothing in there yet.', 'muted')];
      if (FILES.indexOf(dir) !== -1) return [t('cd: not a directory: ' + dir, 'muted')];
      return [t('cd: no such file or directory: ' + dir, 'muted')];

    case 'pwd': return [t('/home/nico/osaka')];

    case 'time':
    case 'date': return [t(osakaTime() + ' — Osaka (JST)')];

    case 'echo': return [t(arg)];

    case 'history':
      return hist.slice().reverse().map(function (h, i) {
        return t(String(i + 1).padStart(3, ' ') + '  ' + h);
      });

    case 'sudo':
    case 'rm': return [t('nice try.')];
    case 'exit': return [t('[process completed]', 'muted')];

    default: return [t('command not found: ' + cmd, 'muted')];
  }
}

var screenEl = document.getElementById('screen');
var promptEl = document.getElementById('promptline');
var linesEl = document.getElementById('lines');
var typedEl = document.getElementById('typed');
var cursorEl = document.getElementById('cursor');
var inputEl = document.getElementById('cmd');

var cmdHistory = [];
var hIndex = -1;
var blinkTimer = null;

function span(cls, text) {
  var el = document.createElement('span');
  el.className = cls;
  el.textContent = text;
  return el;
}

function renderLine(l) {
  var div = document.createElement('div');
  div.className = 'line';

  if (l.prompt) {
    div.appendChild(span('accent', '~'));
    div.appendChild(span('muted', ' $ '));
  }

  if (l.kind === 'link') {
    if (l.label) div.appendChild(span('muted', l.label));
    var a = document.createElement('a');
    a.href = l.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = l.text;
    div.appendChild(a);
  } else {
    if (l.kind !== 'out') div.classList.add(l.kind);
    div.appendChild(document.createTextNode(l.text || '\u00A0'));
  }

  return div;
}

function toBottom() {
  screenEl.scrollTop = screenEl.scrollHeight;
}

function blink() {
  cursorEl.classList.remove('off');
  clearInterval(blinkTimer);
  blinkTimer = setInterval(function () { cursorEl.classList.toggle('off'); }, 530);
}

function setValue(v) {
  inputEl.value = v;
  typedEl.textContent = v;
  blink();
}

function run(raw) {
  var clean = raw.trim();
  var cmd = clean.split(/\s+/)[0].toLowerCase();
  var out = exec(raw, cmdHistory);

  if (clean) cmdHistory.unshift(clean);
  hIndex = -1;

  if (cmd === 'clear') {
    linesEl.textContent = '';
  } else {
    var block = document.createElement('div');
    block.className = 'block';
    block.appendChild(renderLine({ kind: 'out', prompt: true, text: raw }));
    out.forEach(function (l) { block.appendChild(renderLine(l)); });
    linesEl.appendChild(block);
  }

  setValue('');
  toBottom();

  if (cmd === 'exit') {
    window.close();
    clearInterval(blinkTimer);
    promptEl.remove();
  }
}

function complete() {
  var v = inputEl.value;
  var m = v.match(/^(cat|ls|cd)\s+(\S*)$/);
  var hits;

  if (m) {
    hits = FILES.filter(function (f) { return f.indexOf(m[2]) === 0; });
    if (hits.length === 1) setValue(m[1] + ' ' + hits[0]);
    return;
  }

  if (!v || v.indexOf(' ') !== -1) return;
  hits = COMMANDS.filter(function (c) { return c.indexOf(v.toLowerCase()) === 0; });
  if (hits.length === 1) setValue(hits[0] + ' ');
}

inputEl.addEventListener('input', function () {
  typedEl.textContent = inputEl.value;
  blink();
});

inputEl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    run(inputEl.value);
  } else if (e.key === 'Tab') {
    e.preventDefault();
    complete();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    var i = Math.min(hIndex + 1, cmdHistory.length - 1);
    if (i >= 0) { hIndex = i; setValue(cmdHistory[i]); }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    hIndex = Math.max(hIndex - 1, -1);
    setValue(hIndex >= 0 ? cmdHistory[hIndex] : '');
  } else if (e.key === 'l' && e.ctrlKey) {
    e.preventDefault();
    linesEl.textContent = '';
    toBottom();
  }
});

document.addEventListener('click', function (e) {
  if (e.target.closest('a')) return;
  if (window.getSelection().toString()) return;
  inputEl.focus();
});

window.addEventListener('resize', toBottom);

blink();
inputEl.focus();
toBottom();

})();
