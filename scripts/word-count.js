// Counts the words a reader actually sees, so content thresholds are not
// inflated by front matter, markup, image syntax or link targets.
function bodyWordCount(raw = '') {
  return String(raw || '')
    .replace(/^﻿/, '')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/[#*_>`~|]/g, ' ')
    .split(/\s+/)
    .filter(word => /[a-z0-9]/i.test(word))
    .length;
}

module.exports = { bodyWordCount };
