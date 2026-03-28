function isNonEmptyString(value) {
  return typeof value === 'string' && !!value.trim()
}

export function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString
  }

  if (typeof cookiesString !== 'string') {
    return []
  }

  const cookiesStrings = []
  let pos = 0
  let start
  let ch
  let lastComma
  let nextStart
  let cookiesSeparatorFound

  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1
    }
    return pos < cookiesString.length
  }

  function notSpecialChar() {
    ch = cookiesString.charAt(pos)
    return ch !== '=' && ch !== ';' && ch !== ','
  }

  while (pos < cookiesString.length) {
    start = pos
    cookiesSeparatorFound = false

    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos)
      if (ch === ',') {
        lastComma = pos
        pos += 1

        skipWhitespace()
        nextStart = pos

        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1
        }

        if (pos < cookiesString.length && cookiesString.charAt(pos) === '=') {
          cookiesSeparatorFound = true
          pos = nextStart
          cookiesStrings.push(cookiesString.substring(start, lastComma))
          start = pos
        } else {
          pos = lastComma + 1
        }
      } else {
        pos += 1
      }
    }

    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length))
    }
  }

  return cookiesStrings.filter(isNonEmptyString)
}

export default { splitCookiesString }
