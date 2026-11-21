// A faster drop-in for make.fun's csv-reader 1.0.0: run({text, header}) returns
// exactly what csv-reader 1.0.0 returns, {columns, rows, errors}, on every input.
// Same broken-CSV policy: BOM drop, LF/CRLF record ends, stray_cr, quote_junk,
// unterminated_quote, short_row/long_row padding and cutting, errors {code, line, row}
// in the order met. Written from the competition's specification; the reference
// parser (baselines/csv-reader/vendor/csv-reader/index.js) was read only to
// confirm the exact policy, and this implementation was checked against it on
// the practice set, a hand-built edge battery and thousands of fuzzed inputs.
//
// Speed comes from never scanning one character at a time: unquoted fields jump
// to the next delimiter with indexOf, quoted fields jump to the next quote and
// slice their contents in one piece (newlines inside a quoted field are
// normalised only when the chunk actually holds one), and the field readers
// communicate through shared out-parameters instead of allocating a result
// array per field.

const COMMA = 0;
const LINE = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  const n = text.length;
  let pos = 0;
  let line = 1;
  if (text.charCodeAt(0) === 0xfeff) pos = 1;

  let recordLine = 1;
  let recordRow = null;

  // The last field read: its value, how it ended (COMMA, LINE, END) and how
  // many characters the unquoted scan kept (the initial value does not count).
  let fValue = '';
  let fEnded = END;
  let fAdded = 0;

  // Read an unquoted field starting at pos, appending to `value`.
  const DELIM = /[,\r\n]/g;
  function readUnquoted(value) {
    let added = 0;
    for (;;) {
      DELIM.lastIndex = pos;
      const m = DELIM.exec(text);
      let next = n;
      let kind = END;
      if (m !== null) {
        next = m.index;
        const c = m[0];
        kind = c === ',' ? COMMA : (c === '\n' ? LINE : 3);
      }
      if (next > pos) {
        value += text.slice(pos, next);
        added += next - pos;
        pos = next;
      }
      if (kind === END) { fValue = value; fEnded = END; fAdded = added; return; }
      if (kind === COMMA) { pos += 1; fValue = value; fEnded = COMMA; fAdded = added; return; }
      if (kind === LINE) { pos += 1; line += 1; fValue = value; fEnded = LINE; fAdded = added; return; }
      // A CR: with a following LF it ends the record; alone it is dropped.
      if (text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
        fValue = value; fEnded = LINE; fAdded = added; return;
      }
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      pos += 1;
    }
  }

  // Read a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let value = '';
    pos += 1;
    let closed = false;
    for (;;) {
      const qi = text.indexOf('"', pos);
      const end = qi === -1 ? n : qi;
      if (end > pos) {
        const chunk = text.slice(pos, end);
        if (chunk.indexOf('\r') === -1 && chunk.indexOf('\n') === -1) {
          value += chunk;
        } else {
          // Inside quotes every CRLF or lone CR reads as one LF (and counts
          // a line); a bare LF counts a line as it stands.
          value += chunk.replace(/\r\n?|\n/g, () => { line += 1; return '\n'; });
        }
        pos = end;
      }
      if (qi === -1) break;
      if (text.charCodeAt(qi + 1) === 34) {
        value += '"';
        pos = qi + 2;
        continue;
      }
      pos = qi + 1;
      closed = true;
      break;
    }
    if (!closed) {
      // The quote never closes: it is a literal character, and the text
      // after it is read again as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      readUnquoted('"');
      return;
    }
    if (pos >= n) { fValue = value; fEnded = END; fAdded = 0; return; }
    const c = text.charCodeAt(pos);
    if (c === 44) { pos += 1; fValue = value; fEnded = COMMA; fAdded = 0; return; }
    if (c === 10) { pos += 1; line += 1; fValue = value; fEnded = LINE; fAdded = 0; return; }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      fValue = value; fEnded = LINE; fAdded = 0; return;
    }
    // What follows the closing quote is appended as it stands, up to the
    // next comma or line break.
    readUnquoted(value);
    if (fAdded > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === 34;
      if (quoted) readQuoted(); else readUnquoted('');
      fields.push(fValue);
    } while (fEnded === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
