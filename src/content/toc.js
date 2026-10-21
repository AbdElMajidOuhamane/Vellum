// @flow
/*:: import type { Heading, TocNode } from "../types.js"; */
import { escapeAttr, escapeHtml } from "../util/html.js";

export function buildToc(
  headings /*: Array<Heading> */,
  maxLevel /*: number */ = 3,
) /*: Array<TocNode> */ {
  const roots = [];
  const stack = [];

  for (const heading of headings) {
    if (heading.level < 2 || heading.level > maxLevel || !heading.text) {
      continue;
    }
    const node /*: TocNode */ = {
      id: heading.id,
      text: heading.text,
      level: heading.level,
      children: [],
    };
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
}

function renderNodes(nodes /*: Array<TocNode> */) /*: string */ {
  if (nodes.length === 0) {
    return "";
  }
  let html = "<ol>";
  for (const node of nodes) {
    html +=
      '<li><a href="#' +
      escapeAttr(node.id) +
      '">' +
      escapeHtml(node.text) +
      "</a>" +
      renderNodes(node.children) +
      "</li>";
  }
  return html + "</ol>";
}

export function renderToc(nodes /*: Array<TocNode> */) /*: string */ {
  if (nodes.length === 0) {
    return "";
  }
  return (
    '<nav class="toc" aria-label="On this page">' +
    '<p class="toc-title">On this page</p>' +
    renderNodes(nodes) +
    "</nav>"
  );
}
