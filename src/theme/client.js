// @flow
/*
 * Vellum browser runtime. Intentionally a classic script: it can be copied
 * verbatim by the built-in asset pipeline or bundled by Rsbuild.
 */
(function () {
  "use strict";

  const doc = document;
  const body = doc.body;
  if (!body) {
    return;
  }

  function each(selector /*: string */, callback /*: (node: any, index: number) => void */) {
    const nodes = doc.querySelectorAll(selector);
    for (let index = 0; index < nodes.length; index += 1) {
      callback(nodes[index], index);
    }
  }

  function on(
    element /*: any */,
    event /*: string */,
    handler /*: (event: any) => void */,
    options /*: any */,
  ) {
    if (element) {
      element.addEventListener(event, handler, options);
    }
  }

  function safeStorageGet(key /*: string */) /*: string | null */ {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function safeStorageSet(key /*: string */, value /*: string */) /*: void */ {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      /* Private mode or storage disabled: the toggle still works for this page. */
    }
  }

  function prefersDark() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  /* Theme ----------------------------------------------------------------- */

  const themeToggle = doc.querySelector("[data-theme-toggle]");

  function currentTheme() /*: string */ {
    const stored = doc.documentElement.getAttribute("data-theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return prefersDark() ? "dark" : "light";
  }

  function syncThemeButton(theme /*: string */) /*: void */ {
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
  }

  const initialTheme = safeStorageGet("vellum-theme");
  if (initialTheme === "light" || initialTheme === "dark") {
    doc.documentElement.setAttribute("data-theme", initialTheme);
  }
  syncThemeButton(currentTheme());

  on(themeToggle, "click", function () {
    const next = currentTheme() === "dark" ? "light" : "dark";
    doc.documentElement.setAttribute("data-theme", next);
    safeStorageSet("vellum-theme", next);
    syncThemeButton(next);
  });

  /* Mobile navigation ----------------------------------------------------- */

  const menuToggle = doc.querySelector("[data-menu-toggle]");
  const sidebar = doc.getElementById("sidebar");

  function syncSidebarAccessibility() /*: void */ {
    if (!sidebar) {
      return;
    }
    const mobile = window.innerWidth <= 900;
    sidebar.inert = mobile && !body.classList.contains("menu-open");
  }

  function setMenu(open /*: boolean */) /*: void */ {
    body.classList.toggle("menu-open", open);
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    }
    syncSidebarAccessibility();
    if (open && sidebar) {
      const firstLink = sidebar.querySelector("a, summary");
      if (firstLink && typeof firstLink.focus === "function") {
        firstLink.focus();
      }
    }
  }

  syncSidebarAccessibility();

  on(menuToggle, "click", function () {
    setMenu(!body.classList.contains("menu-open"));
  });

  each("[data-menu-close]", function (element) {
    on(element, "click", function () {
      setMenu(false);
    });
  });

  let navigationSequence = 0;

  function updateActiveLinks(nextDocument /*: any */, selector /*: string */) /*: void */ {
    const nextActive = nextDocument.querySelector(selector + ".is-active");
    each(selector, function (link) {
      link.classList.remove("is-active");
      link.removeAttribute("aria-current");
    });
    if (!nextActive) {
      return;
    }
    const destination = nextActive.getAttribute("href");
    each(selector, function (link) {
      if (link.getAttribute("href") === destination) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
        let branch = link.parentElement;
        while (branch && branch !== sidebar) {
          if (branch.tagName === "DETAILS") {
            branch.open = true;
          }
          branch = branch.parentElement;
        }
      }
    });
  }

  function updatePageMetadata(nextDocument /*: any */) /*: void */ {
    doc.title = nextDocument.title;
    const selectors = [
      'meta[name="description"]',
      'meta[name="robots"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
    ];
    for (let index = 0; index < selectors.length; index += 1) {
      const current = doc.head.querySelector(selectors[index]);
      const next = nextDocument.head.querySelector(selectors[index]);
      if (current && next) {
        current.setAttribute("content", next.getAttribute("content") || "");
      }
    }
    const currentCanonical = doc.head.querySelector('link[rel="canonical"]');
    const nextCanonical = nextDocument.head.querySelector('link[rel="canonical"]');
    if (currentCanonical && nextCanonical) {
      currentCanonical.href = nextCanonical.href;
    }
    const route = nextDocument.body.getAttribute("data-route");
    if (route) {
      body.setAttribute("data-route", route);
    }
  }

  function navigateFromSidebar(url /*: string */, pushHistory /*: boolean */) /*: void */ {
    const sequence = navigationSequence + 1;
    navigationSequence = sequence;
    const currentMain = doc.getElementById("main-content");
    if (currentMain) {
      currentMain.setAttribute("aria-busy", "true");
    }

    fetch(url, { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Page returned " + response.status);
        }
        return response.text();
      })
      .then(function (html) {
        if (sequence !== navigationSequence) {
          return;
        }
        const nextDocument = new DOMParser().parseFromString(html, "text/html");
        const nextMain = nextDocument.getElementById("main-content");
        if (!currentMain || !nextMain || !nextDocument.querySelector(".page-shell.has-sidebar")) {
          throw new Error("Destination does not use the documentation layout");
        }
        if (pushHistory) {
          window.history.pushState({ vellum: true }, "", url);
        }
        currentMain.innerHTML = nextMain.innerHTML;
        currentMain.removeAttribute("aria-busy");
        updatePageMetadata(nextDocument);
        updateActiveLinks(nextDocument, ".sidebar-link");
        updateActiveLinks(nextDocument, ".top-nav-link");
        if (body.classList.contains("menu-open")) {
          setMenu(false);
        }
        initPageContent();
        window.scrollTo(0, 0);
        currentMain.focus();
      })
      .catch(function () {
        if (sequence !== navigationSequence) {
          return;
        }
        if (currentMain) {
          currentMain.removeAttribute("aria-busy");
        }
        window.location.href = url;
      });
  }

  if (sidebar) {
    on(sidebar, "click", function (event) {
      const target = event.target;
      const link = target && target.closest ? target.closest("a") : null;
      if (!link) {
        return;
      }
      if (window.innerWidth <= 900) {
        setMenu(false);
      }
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        (!!link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      ) {
        return;
      }
      let destination /*: any */;
      try {
        destination = new URL(link.href, window.location.href);
      } catch (_error) {
        return;
      }
      if (destination.origin !== window.location.origin || destination.hash) {
        return;
      }
      event.preventDefault();
      if (destination.href !== window.location.href) {
        navigateFromSidebar(destination.href, true);
      }
    });
  }

  on(window, "popstate", function () {
    navigateFromSidebar(window.location.href, false);
  });

  on(window, "resize", function () {
    if (window.innerWidth > 900) {
      setMenu(false);
    }
    syncSidebarAccessibility();
  });

  /* Search ---------------------------------------------------------------- */

  const searchMeta = doc.querySelector('meta[name="vellum-search"]');
  const searchDialog = doc.querySelector("[data-search-dialog]");
  const searchInput = doc.querySelector("[data-search-input]");
  const searchResults = doc.querySelector("[data-search-results]");
  const searchEmpty = doc.querySelector("[data-search-empty]");
  const searchStatus = doc.querySelector("[data-search-status]");
  let searchIndex /*: Array<any> | null */ = null;
  let searchLoading /*: Promise<any> | null */ = null;
  let searchActive = -1;
  let searchItems = [];
  let lastFocused = null;

  function searchLimit() /*: number */ {
    const value = parseInt(body.getAttribute("data-search-max") || "10", 10);
    return Number.isFinite(value) && value > 0 ? value : 10;
  }

  function loadSearchIndex() /*: Promise<any> */ {
    if (searchIndex) {
      return Promise.resolve(searchIndex);
    }
    if (searchLoading) {
      return searchLoading;
    }
    if (!searchMeta) {
      return Promise.resolve([]);
    }
    searchLoading = fetch(searchMeta.getAttribute("content"), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Search index returned " + response.status);
        }
        return response.json();
      })
      .then(function (records) {
        searchIndex = Array.isArray(records) ? records : [];
        return searchIndex;
      })
      .catch(function (error) {
        searchLoading = null;
        throw error;
      });
    return searchLoading;
  }

  function normalize(value /*: mixed */) /*: string */ {
    return String(value || "").toLowerCase();
  }

  function scoreRecord(record /*: any */, terms /*: Array<string> */, phrase /*: string */) /*: number */ {
    const title = normalize(record.title);
    const description = normalize(record.description);
    const headings = normalize((record.headings || []).join(" "));
    const text = normalize(record.text);
    const haystack = title + " " + description + " " + headings + " " + text;
    for (let index = 0; index < terms.length; index += 1) {
      if (haystack.indexOf(terms[index]) < 0) {
        return 0;
      }
    }
    let score = 0;
    for (let index = 0; index < terms.length; index += 1) {
      const term = terms[index];
      if (title.indexOf(term) >= 0) score += 14;
      if (title.indexOf(term) === 0) score += 8;
      if (headings.indexOf(term) >= 0) score += 7;
      if (description.indexOf(term) >= 0) score += 4;
      if (text.indexOf(term) >= 0) score += 1;
    }
    if (phrase && title.indexOf(phrase) >= 0) score += 22;
    if (phrase && headings.indexOf(phrase) >= 0) score += 8;
    if (phrase && text.indexOf(phrase) >= 0) score += 4;
    return score;
  }

  function runSearch(query /*: string */) /*: Array<any> */ {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return [];
    }
    const phrase = terms.join(" ");
    const scored = [];
    const records = searchIndex || [];
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      const score = scoreRecord(record, terms, phrase);
      if (score > 0) {
        scored.push({ record: record, score: score });
      }
    }
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    return scored.slice(0, searchLimit()).map(function (item) {
      return item.record;
    });
  }

  function appendHighlighted(parent /*: any */, value /*: mixed */, terms /*: Array<string> */) /*: void */ {
    const text = String(value || "");
    if (terms.length === 0) {
      parent.appendChild(doc.createTextNode(text));
      return;
    }
    const escaped = terms
      .slice()
      .sort(function (a, b) {
        return b.length - a.length;
      })
      .map(function (term) {
        return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      });
    const pattern = new RegExp("(" + escaped.join("|") + ")", "gi");
    const parts = text.split(pattern);
    for (let index = 0; index < parts.length; index += 1) {
      if (!parts[index]) {
        continue;
      }
      if (index % 2 === 1) {
        const mark = doc.createElement("mark");
        mark.textContent = parts[index];
        parent.appendChild(mark);
      } else {
        parent.appendChild(doc.createTextNode(parts[index]));
      }
    }
  }

  function setSearchActive(index /*: number */) /*: void */ {
    if (searchItems.length === 0) {
      searchActive = -1;
      return;
    }
    searchActive = (index + searchItems.length) % searchItems.length;
    for (let cursor = 0; cursor < searchItems.length; cursor += 1) {
      searchItems[cursor].classList.toggle("is-active", cursor === searchActive);
      searchItems[cursor].setAttribute("aria-selected", cursor === searchActive ? "true" : "false");
    }
    const active = searchItems[searchActive];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: "nearest" });
    }
  }

  function renderSearchResults(records /*: Array<any> */, terms /*: Array<string> */) /*: void */ {
    if (!searchResults) {
      return;
    }
    searchResults.textContent = "";
    searchItems = [];
    searchActive = -1;

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      const link = doc.createElement("a");
      link.className = "search-result";
      link.href = record.route;
      link.setAttribute("role", "option");
      link.setAttribute("aria-selected", "false");

      const title = doc.createElement("span");
      title.className = "search-result-title";
      appendHighlighted(title, record.title, terms);
      link.appendChild(title);

      if (record.description) {
        const description = doc.createElement("span");
        description.className = "search-result-description";
        appendHighlighted(description, record.description, terms);
        link.appendChild(description);
      }

      const path = doc.createElement("span");
      path.className = "search-result-path";
      path.textContent = record.route;
      link.appendChild(path);

      on(link, "mouseenter", function () {
        setSearchActive(index);
      });
      searchResults.appendChild(link);
      searchItems.push(link);
    }

    if (searchEmpty) {
      searchEmpty.hidden = records.length > 0;
    }
    if (searchStatus) {
      searchStatus.textContent =
        records.length === 0
          ? "No results"
          : records.length + (records.length === 1 ? " result" : " results");
    }
    setSearchActive(0);
  }

  function updateSearch() /*: void */ {
    if (!searchInput) {
      return;
    }
    const query = searchInput.value.trim();
    if (!query) {
      if (searchResults) searchResults.textContent = "";
      searchItems = [];
      searchActive = -1;
      if (searchEmpty) searchEmpty.hidden = true;
      if (searchStatus) searchStatus.textContent = "";
      return;
    }
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    loadSearchIndex()
      .then(function () {
        renderSearchResults(runSearch(query), terms);
      })
      .catch(function () {
        if (searchResults) searchResults.textContent = "";
        searchItems = [];
        if (searchEmpty) {
          searchEmpty.hidden = false;
          searchEmpty.textContent = "Search is unavailable. Run `vellum build` or check the dev server.";
        }
        if (searchStatus) searchStatus.textContent = "Search unavailable";
      });
  }

  function openSearch() /*: void */ {
    if (!searchDialog || !searchInput) {
      return;
    }
    lastFocused = doc.activeElement;
    searchDialog.hidden = false;
    body.classList.add("search-open");
    searchInput.value = "";
    if (searchResults) searchResults.textContent = "";
    if (searchEmpty) searchEmpty.hidden = true;
    if (searchStatus) searchStatus.textContent = "";
    searchInput.focus();
    loadSearchIndex().catch(function () {
      /* Error is surfaced when the user types. */
    });
  }

  function closeSearch() /*: void */ {
    if (!searchDialog || searchDialog.hidden) {
      return;
    }
    searchDialog.hidden = true;
    body.classList.remove("search-open");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  if (searchDialog && searchInput) {
    each("[data-search-open]", function (button) {
      on(button, "click", openSearch);
    });
    each("[data-search-close]", function (button) {
      on(button, "click", closeSearch);
    });
    on(searchInput, "input", updateSearch);
    on(searchInput, "keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSearchActive(searchActive + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSearchActive(searchActive - 1);
      } else if (event.key === "Enter") {
        if (searchItems.length > 0 && searchActive >= 0) {
          event.preventDefault();
          window.location.href = searchItems[searchActive].href;
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
      }
    });
    on(searchDialog, "keydown", function (event) {
      if (event.key !== "Tab") {
        return;
      }
      const focusables = searchDialog.querySelectorAll(
        'input, button, a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  on(doc, "keydown", function (event) {
    const target = event.target;
    const typing =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);
    if (event.key === "Escape") {
      if (body.classList.contains("menu-open")) {
        setMenu(false);
      }
      closeSearch();
      return;
    }
    if (typing) {
      return;
    }
    const key = event.key;
    if (key === "/" || ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "k")) {
      event.preventDefault();
      openSearch();
    }
  });

  let tocScrollHandler /*: any */ = null;

  function initPageContent() /*: void */ {
    if (tocScrollHandler) {
      window.removeEventListener("scroll", tocScrollHandler);
      tocScrollHandler = null;
    }

    /* Code copy ------------------------------------------------------------- */

    each("pre.code-block", function (pre) {
      const code = pre.querySelector("code");
      if (!code) {
        return;
      }
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "copy-button";
      button.textContent = "Copy";
      button.setAttribute("aria-label", "Copy code to clipboard");
      on(button, "click", function () {
        const text = code.textContent || "";
        function finish() /*: void */ {
          button.textContent = "Copied";
          window.setTimeout(function () {
            button.textContent = "Copy";
          }, 1600);
        }
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(text).then(finish).catch(function () {
            button.textContent = "Press \u2318C";
          });
          return;
        }
        const area = doc.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "readonly");
        area.style.position = "fixed";
        area.style.opacity = "0";
        doc.body.appendChild(area);
        area.select();
        try {
          doc.execCommand("copy");
          finish();
        } catch (_error) {
          button.textContent = "Copy failed";
        }
        doc.body.removeChild(area);
      });
      pre.appendChild(button);
    });

    /* Table of contents scroll spy ----------------------------------------- */

    const tocLinks = doc.querySelectorAll(".page-toc .toc a[href^='#']");
    if (tocLinks.length > 0) {
      const linkById /*: { [string]: any } */ = {};
      for (let index = 0; index < tocLinks.length; index += 1) {
        const link = tocLinks[index];
        linkById[link.getAttribute("href").slice(1)] = link;
      }
      const headings = [];
      Object.keys(linkById).forEach(function (id) {
        const heading = doc.getElementById(id);
        if (heading) {
          headings.push(heading);
        }
      });

      let ticking = false;
      function updateActiveToc() /*: void */ {
        ticking = false;
        const offset = 100;
        let activeId = "";
        for (let index = 0; index < headings.length; index += 1) {
          if (headings[index].getBoundingClientRect().top <= offset) {
            activeId = headings[index].id;
          } else {
            break;
          }
        }
        for (let index = 0; index < tocLinks.length; index += 1) {
          tocLinks[index].classList.toggle("is-active", tocLinks[index] === linkById[activeId]);
        }
      }
      tocScrollHandler = function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(updateActiveToc);
        }
      };
      on(window, "scroll", tocScrollHandler, { passive: true });
      updateActiveToc();
    }
  }

  initPageContent();
})();
