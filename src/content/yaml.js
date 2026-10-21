// @flow
/*:: import type { YamlValue } from "../types.js"; */
import { fail } from "../util/errors.js";

/*::
type Token = {
  indent: number,
  content: string,
  number: number,
  blank: boolean,
};

type ParseResult = {
  value: YamlValue,
  next: number,
};
*/

function stripComment(value /*: string */) /*: string */ {
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === "\\" && quote === '"') {
        index += 1;
        continue;
      }
      if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "#" && (index === 0 || /\s/.test(value[index - 1]))) {
      return value.slice(0, index).replace(/\s+$/, "");
    }
  }
  return value.replace(/\s+$/, "");
}

function splitTopLevel(value /*: string */, separator /*: string */) /*: Array<string> */ {
  const parts = [];
  let current = "";
  let quote = "";
  let square = 0;
  let curly = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      current += char;
      if (char === "\\" && quote === '"') {
        if (index + 1 < value.length) {
          current += value[index + 1];
          index += 1;
        }
        continue;
      }
      if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "[") {
      square += 1;
    } else if (char === "]") {
      square -= 1;
    } else if (char === "{") {
      curly += 1;
    } else if (char === "}") {
      curly -= 1;
    }
    if (char === separator && square === 0 && curly === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts;
}

function findKeyColon(value /*: string */) /*: number */ {
  let quote = "";
  let square = 0;
  let curly = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === "\\" && quote === '"') {
        index += 1;
        continue;
      }
      if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "[") {
      square += 1;
      continue;
    }
    if (char === "]") {
      square -= 1;
      continue;
    }
    if (char === "{") {
      curly += 1;
      continue;
    }
    if (char === "}") {
      curly -= 1;
      continue;
    }
    if (char === ":" && square === 0 && curly === 0) {
      const next = value[index + 1];
      if (next === undefined || /\s/.test(next)) {
        return index;
      }
    }
  }
  return -1;
}

function unquote(value /*: string */) /*: string */ {
  if (value.length < 2) {
    return value;
  }
  const quote = value[0];
  if ((quote !== '"' && quote !== "'") || value[value.length - 1] !== quote) {
    return value;
  }
  const body = value.slice(1, -1);
  if (quote === "'") {
    return body.replace(/''/g, "'");
  }
  return body.replace(/\\(["\\/nrtbf])/g, (match, code) => {
    if (code === "n") return "\n";
    if (code === "r") return "\r";
    if (code === "t") return "\t";
    if (code === "b") return "\b";
    if (code === "f") return "\f";
    if (code === "/") return "/";
    return code;
  });
}

export function parseScalar(value /*: string */) /*: YamlValue */ {
  const text = stripComment(value).trim();
  if (text === "") {
    return null;
  }
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return unquote(text);
  }
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    if (inner === "") {
      return [];
    }
    return splitTopLevel(inner, ",").map((part) => parseScalar(part));
  }
  if (text.startsWith("{") && text.endsWith("}")) {
    const inner = text.slice(1, -1).trim();
    const result /*: { [string]: YamlValue } */ = {};
    if (inner === "") {
      return result;
    }
    for (const part of splitTopLevel(inner, ",")) {
      const colon = findKeyColon(part);
      if (colon < 0) {
        throw fail("Invalid inline mapping in frontmatter: `" + part + "`.");
      }
      const key = unquote(part.slice(0, colon).trim());
      result[key] = parseScalar(part.slice(colon + 1));
    }
    return result;
  }
  if (text === "null" || text === "Null" || text === "NULL" || text === "~") {
    return null;
  }
  if (text === "true" || text === "True" || text === "TRUE") {
    return true;
  }
  if (text === "false" || text === "False" || text === "FALSE") {
    return false;
  }
  if (/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(text)) {
    return Number(text);
  }
  return text;
}

function tokenize(raw /*: string */) /*: Array<Token> */ {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const tokens = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*$/.test(line)) {
      tokens.push({ indent: 0, content: "", number: index + 1, blank: true });
      continue;
    }
    if (/^\s*#/.test(line)) {
      tokens.push({ indent: 0, content: "", number: index + 1, blank: true });
      continue;
    }
    const leading = /^ */.exec(line);
    const indent = leading ? leading[0].length : 0;
    if (line[indent] === "\t") {
      throw fail("Tabs are not allowed for indentation in frontmatter (line " + (index + 1) + ").");
    }
    const content = line.slice(indent).replace(/\s+$/, "");
    tokens.push({ indent, content, number: index + 1, blank: false });
  }
  return tokens;
}

function nextContent(tokens /*: Array<Token> */, index /*: number */) /*: number */ {
  let cursor = index;
  while (cursor < tokens.length && tokens[cursor].blank) {
    cursor += 1;
  }
  return cursor;
}

function parseBlock(tokens /*: Array<Token> */, index /*: number */, indent /*: number */) /*: ParseResult */ {
  const start = nextContent(tokens, index);
  if (start >= tokens.length) {
    return { value: null, next: start };
  }
  if (tokens[start].indent < indent) {
    return { value: null, next: start };
  }
  if (tokens[start].content.startsWith("- ") || tokens[start].content === "-") {
    return parseSequence(tokens, start, tokens[start].indent);
  }
  return parseMapping(tokens, start, tokens[start].indent);
}

function collectBlockScalar(
  tokens /*: Array<Token> */,
  index /*: number */,
  parentIndent /*: number */,
  style /*: string */,
  chomp /*: string */,
) /*: ParseResult */ {
  let cursor = index;
  const rawLines = [];
  let baseIndent = -1;
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (!token.blank && token.indent <= parentIndent) {
      break;
    }
    if (!token.blank && baseIndent < 0) {
      baseIndent = token.indent;
    }
    rawLines.push(token);
    cursor += 1;
  }
  const content = rawLines.map((token) => {
    if (token.blank) {
      return "";
    }
    return token.content;
  });
  while (content.length > 0 && content[content.length - 1] === "") {
    content.pop();
  }
  let value;
  if (style === ">") {
    const folded = [];
    for (const line of content) {
      if (line === "") {
        folded.push("\n");
      } else if (folded.length > 0 && folded[folded.length - 1] !== "\n") {
        folded.push(" " + line);
      } else {
        folded.push(line);
      }
    }
    value = folded.join("");
  } else {
    value = content.join("\n");
  }
  if (chomp !== "-" && value !== "") {
    value += "\n";
  }
  return { value, next: cursor };
}

function parseMapping(tokens /*: Array<Token> */, index /*: number */, indent /*: number */) /*: ParseResult */ {
  const result /*: { [string]: YamlValue } */ = {};
  let cursor = index;
  while (cursor < tokens.length) {
    cursor = nextContent(tokens, cursor);
    if (cursor >= tokens.length) {
      break;
    }
    const token = tokens[cursor];
    if (token.indent < indent) {
      break;
    }
    if (token.indent > indent) {
      throw fail("Unexpected indentation in frontmatter at line " + token.number + ".");
    }
    if (token.content.startsWith("- ")) {
      break;
    }
    const colon = findKeyColon(token.content);
    if (colon < 0) {
      throw fail("Expected `key: value` in frontmatter at line " + token.number + ".");
    }
    const key = unquote(token.content.slice(0, colon).trim());
    const rest = token.content.slice(colon + 1).trim();
    cursor += 1;

    if (rest === "" || rest.startsWith("#")) {
      const lookahead = nextContent(tokens, cursor);
      if (lookahead < tokens.length && tokens[lookahead].indent > indent) {
        const nested = parseBlock(tokens, cursor, tokens[lookahead].indent);
        result[key] = nested.value;
        cursor = nested.next;
      } else {
        result[key] = null;
      }
      continue;
    }

    if (rest === "|" || rest === "|-" || rest === "|+" || rest === ">" || rest === ">-" || rest === ">+") {
      const style = rest[0];
      const chomp = rest.length > 1 ? rest[1] : "";
      const scalar = collectBlockScalar(tokens, cursor, indent, style, chomp);
      result[key] = scalar.value;
      cursor = scalar.next;
      continue;
    }

    result[key] = parseScalar(rest);
  }
  return { value: result, next: cursor };
}

function parseSequence(tokens /*: Array<Token> */, index /*: number */, indent /*: number */) /*: ParseResult */ {
  const result /*: Array<YamlValue> */ = [];
  let cursor = index;
  while (cursor < tokens.length) {
    cursor = nextContent(tokens, cursor);
    if (cursor >= tokens.length) {
      break;
    }
    const token = tokens[cursor];
    if (token.indent < indent) {
      break;
    }
    if (token.indent !== indent || (!token.content.startsWith("- ") && token.content !== "-")) {
      break;
    }
    const rest = token.content === "-" ? "" : token.content.slice(2).trim();
    cursor += 1;

    if (rest === "") {
      const lookahead = nextContent(tokens, cursor);
      if (lookahead < tokens.length && tokens[lookahead].indent > indent) {
        const nested = parseBlock(tokens, cursor, tokens[lookahead].indent);
        result.push(nested.value);
        cursor = nested.next;
      } else {
        result.push(null);
      }
      continue;
    }

    if (rest === "|" || rest === "|-" || rest === "|+" || rest === ">" || rest === ">-" || rest === ">+") {
      const scalar = collectBlockScalar(tokens, cursor, indent, rest[0], rest.length > 1 ? rest[1] : "");
      result.push(scalar.value);
      cursor = scalar.next;
      continue;
    }

    const colon = findKeyColon(rest);
    if (colon >= 0) {
      const itemTokens = [
        { indent: indent + 2, content: rest, number: token.number, blank: false },
      ];
      let scan = cursor;
      let end = cursor;
      while (scan < tokens.length) {
        const next = tokens[scan];
        if (!next.blank && next.indent <= indent) {
          break;
        }
        itemTokens.push(next);
        if (!next.blank) {
          end = scan + 1;
        }
        scan += 1;
      }
      const mapping = parseMapping(itemTokens, 0, indent + 2);
      result.push(mapping.value);
      cursor = Math.max(end, cursor);
      continue;
    }

    result.push(parseScalar(rest));
  }
  return { value: result, next: cursor };
}

export function parseYaml(raw /*: string */) /*: YamlValue */ {
  const tokens = tokenize(raw);
  const start = nextContent(tokens, 0);
  if (start >= tokens.length) {
    return null;
  }
  const parsed = parseBlock(tokens, start, tokens[start].indent);
  const trailing = nextContent(tokens, parsed.next);
  if (trailing < tokens.length) {
    throw fail("Unexpected content in frontmatter at line " + tokens[trailing].number + ".");
  }
  return parsed.value;
}
