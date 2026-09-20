(function () {
  'use strict';
  const details = window.WEDDING_DETAILS.resolve(location.search);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(details.date) ? new Date(`${details.date}T12:00:00`) : new Date(NaN);
  const validDate = !Number.isNaN(date.getTime()) && date.getFullYear() === Number(details.date.slice(0, 4)) && date.getMonth() + 1 === Number(details.date.slice(5, 7)) && date.getDate() === Number(details.date.slice(8, 10));
  const fullDate = validDate ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${new Intl.DateTimeFormat('ja-JP', { weekday: 'short' }).format(date)}）` : details.date;
  const shortDate = validDate ? new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replaceAll('/', '.') : details.date;
  const set = (selector, value) => document.querySelectorAll(selector).forEach(node => { node.textContent = value; });
  set('[data-event-names]', details.names);
  set('[data-event-date]', fullDate);
  set('[data-event-date-short]', shortDate);
  set('[data-event-venue]', details.venue);
  document.querySelectorAll('[data-event-time]').forEach(node => {
    node.textContent = details.getTime(node.dataset.eventTime) || '後日ご案内';
  });
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(details.deadline) ? new Date(`${details.deadline}T12:00:00`) : new Date(NaN);
  if (!Number.isNaN(deadline.getTime()) && deadline.getFullYear() === Number(details.deadline.slice(0, 4)) && deadline.getMonth() + 1 === Number(details.deadline.slice(5, 7)) && deadline.getDate() === Number(details.deadline.slice(8, 10))) {
    set('[data-event-deadline]', `${new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(deadline)}までにご回答ください`);
  }
})();
