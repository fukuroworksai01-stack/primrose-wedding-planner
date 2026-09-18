/* HappyWeddingSchedule.pdf に記載された確定日程。回答期限・受付時刻は未記載です。 */
(function (root, factory) {
  const details = factory();
  if (typeof module === 'object' && module.exports) module.exports = details;
  else root.WEDDING_DETAILS = details;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const confirmed = Object.freeze({
    date: '2027-03-07', names: '智哉 & 梨那', venue: 'PRIMROSE',
    time: '12:00', reception: '13:00', end: '15:20',
    ceremonyVenue: 'セント・ポール大聖堂', receptionVenue: 'ボヌール'
  });
  function resolve(search) {
    const params = new URLSearchParams(search || '');
    const suppliedDate = params.get('date');
    const date = !suppliedDate || suppliedDate === '2027-01-23' ? confirmed.date : suppliedDate;
    const sameWedding = date === confirmed.date;
    const getTime = key => {
      const value = params.get(key);
      // 以前の共有リンクに付いていた仮の11時を、PDFの確定時刻へ移行します。
      if (sameWedding && key === 'time' && value === '11:00') return confirmed.time;
      if (value !== null) return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '';
      return sameWedding ? confirmed[key] || '' : '';
    };
    return Object.freeze({
      date, names: params.get('from')?.trim() || confirmed.names,
      venue: params.get('venue')?.trim() || confirmed.venue,
      deadline: params.get('deadline') || '', getTime
    });
  }
  return Object.freeze({ confirmed, resolve });
});
