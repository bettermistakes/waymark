(function () {
  "use strict";

  const BLOG_LIST_SELECTOR = ".blog--collection-list.is--filters";
  const BLOG_ITEM_SELECTOR = ".w-dyn-item";
  const BLOG_CARD_SELECTOR = ".blog-card";
  const FILTER_ROOT_SELECTOR = ".filter--parent";
  const FILTER_BUTTON_SELECTOR = ".filter--btn";
  const FILTER_BUTTON_LABEL_SELECTOR = ".filter--btn > div";
  const FILTER_CONTENT_SELECTOR = ".filter--content";
  const FILTER_CONTENT_INNER_SELECTOR = ".filter--content-inner";
  const FILTER_TAG_SELECTOR = ".filter--tag";
  const TAGS_WRAPPER_SELECTOR = ".tags-wrapper";
  const MAX_PAGE_COUNT = 100;
  const DETAIL_FETCH_CONCURRENCY = 6;

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function raf2(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }

  function normalizeWhitespace(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeTag(value) {
    return normalizeWhitespace(value).toLowerCase();
  }

  function toAbsoluteUrl(url) {
    try {
      return new URL(url, window.location.origin).toString();
    } catch (_error) {
      return "";
    }
  }

  async function fetchDocument(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  function getDirectListItems(list) {
    return Array.from(list.children).filter((child) => child.matches(BLOG_ITEM_SELECTOR));
  }

  function getCollectionItems(doc) {
    const list = $(BLOG_LIST_SELECTOR, doc);
    if (!list) return [];

    const directItems = getDirectListItems(list);
    return directItems.length ? directItems : $all(BLOG_ITEM_SELECTOR, list);
  }

  function getItemUrl(item) {
    if (!item) return "";

    if (item.matches("a[href]")) {
      const href = item.getAttribute("href");
      if (href && href !== "#") return toAbsoluteUrl(href);
    }

    const link = item.querySelector('a[href]:not([href="#"]):not([href^="javascript:"])');
    return link ? toAbsoluteUrl(link.getAttribute("href")) : "";
  }

  async function collectAllBlogItems() {
    const items = [];
    const seenKeys = new Set();

    for (let page = 1; page <= MAX_PAGE_COUNT; page += 1) {
      const pageDoc = await fetchDocument(`/blogs/${page}`);
      if (!pageDoc) break;

      const pageItems = getCollectionItems(pageDoc);
      if (!pageItems.length) break;

      pageItems.forEach((pageItem, index) => {
        const importedItem = document.importNode(pageItem, true);
        const itemUrl = getItemUrl(importedItem) || getItemUrl(pageItem);
        const itemKey = itemUrl || `page-${page}-item-${index}`;

        if (seenKeys.has(itemKey)) return;
        seenKeys.add(itemKey);

        items.push({
          element: importedItem,
          url: itemUrl,
          tags: [],
        });
      });
    }

    return items;
  }

  function extractTagsFromDocument(doc) {
    const tagsWrapper = $(TAGS_WRAPPER_SELECTOR, doc);
    if (!tagsWrapper) return [];

    const candidateElements = Array.from(tagsWrapper.children).length
      ? Array.from(tagsWrapper.children)
      : $all("a, button, div, span, p", tagsWrapper);

    const seenTags = new Set();
    const tags = [];

    candidateElements.forEach((element) => {
      const tag = normalizeWhitespace(element.textContent);
      const normalized = normalizeTag(tag);

      if (!normalized || seenTags.has(normalized)) return;
      seenTags.add(normalized);
      tags.push(tag);
    });

    return tags;
  }

  async function runWithConcurrency(items, concurrency, worker) {
    let cursor = 0;

    async function runWorker() {
      while (cursor < items.length) {
        const currentIndex = cursor;
        cursor += 1;
        await worker(items[currentIndex], currentIndex);
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, runWorker);
    await Promise.all(workers);
  }

  async function populateTags(items) {
    const allTags = new Map();

    await runWithConcurrency(items, DETAIL_FETCH_CONCURRENCY, async (item) => {
      if (!item.url) return;

      const detailDoc = await fetchDocument(item.url);
      if (!detailDoc) return;

      const tags = extractTagsFromDocument(detailDoc);
      item.tags = tags;

      tags.forEach((tag) => {
        const normalized = normalizeTag(tag);
        if (!normalized || allTags.has(normalized)) return;
        allTags.set(normalized, tag);
      });
    });

    return Array.from(allTags.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  function attachTagsToItems(items) {
    items.forEach((item) => {
      const normalizedTags = item.tags.map(normalizeTag).filter(Boolean);
      item.element.dataset.blogTags = normalizedTags.join("|");
    });
  }

  function replaceCollectionItems(list, items) {
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      fragment.appendChild(item.element);
    });

    list.replaceChildren(fragment);
  }

  function setItemVisibility(item, isVisible) {
    item.hidden = !isVisible;
    item.style.display = isVisible ? "" : "none";
  }

  function initFilterDropdown(list, tagOptions) {
    const filterRoot = $(FILTER_ROOT_SELECTOR);
    const filterButton = $(FILTER_BUTTON_SELECTOR, filterRoot);
    const filterButtonLabel = $(FILTER_BUTTON_LABEL_SELECTOR, filterRoot);
    const filterContent = $(FILTER_CONTENT_SELECTOR, filterRoot);
    const filterContentInner = $(FILTER_CONTENT_INNER_SELECTOR, filterRoot);
    const filterTagTemplate = $(FILTER_TAG_SELECTOR, filterRoot);

    if (!filterRoot || !filterButton || !filterContent || !filterContentInner || !list) {
      return;
    }

    const listItems = getDirectListItems(list);
    const options = [{ value: "", label: "All" }].concat(tagOptions);
    let activeFilter = "";
    let isOpen = false;

    function setOpen(nextOpen) {
      isOpen = nextOpen;
      filterRoot.classList.toggle("is-open", isOpen);
      filterContent.hidden = !isOpen;
      filterButton.setAttribute("aria-expanded", String(isOpen));
    }

    function updateButtonLabel() {
      if (!filterButtonLabel) return;

      const activeOption = options.find((option) => option.value === activeFilter);
      filterButtonLabel.textContent = activeOption && activeOption.value
        ? `Filter by: ${activeOption.label}`
        : "Filter by";
    }

    function applyFilter() {
      listItems.forEach((listItem) => {
        const itemTags = (listItem.dataset.blogTags || "").split("|").filter(Boolean);
        const isVisible = !activeFilter || itemTags.includes(activeFilter);
        setItemVisibility(listItem, isVisible);
      });
    }

    function createFilterOption(option) {
      const element = filterTagTemplate
        ? filterTagTemplate.cloneNode(true)
        : document.createElement("a");

      element.className = filterTagTemplate ? filterTagTemplate.className : "filter--tag";
      element.textContent = option.label;
      element.setAttribute("href", "#");
      element.dataset.filterValue = option.value;
      element.classList.toggle("is-active", option.value === activeFilter);

      element.addEventListener("click", (event) => {
        event.preventDefault();
        activeFilter = option.value;

        $all(FILTER_TAG_SELECTOR, filterContentInner).forEach((tagElement) => {
          tagElement.classList.toggle("is-active", tagElement.dataset.filterValue === activeFilter);
        });

        updateButtonLabel();
        applyFilter();
        setOpen(false);
      });

      return element;
    }

    filterContentInner.replaceChildren(...options.map((option) => createFilterOption(option)));

    filterButton.setAttribute("aria-haspopup", "true");
    filterButton.setAttribute("aria-expanded", "false");
    filterContent.hidden = true;

    filterButton.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(!isOpen);
    });

    document.addEventListener("click", (event) => {
      if (!filterRoot.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });

    updateButtonLabel();
    applyFilter();
  }

  async function initBlogFeed() {
    const list = $(BLOG_LIST_SELECTOR);
    const filterButtonLabel = $(FILTER_BUTTON_LABEL_SELECTOR);

    if (!list) return;

    if (filterButtonLabel) {
      filterButtonLabel.textContent = "Loading...";
    }

    try {
      const items = await collectAllBlogItems();
      if (!items.length) {
        if (filterButtonLabel) filterButtonLabel.textContent = "Filter by";
        return;
      }

      const tagOptions = await populateTags(items);
      attachTagsToItems(items);
      replaceCollectionItems(list, items);
      initFilterDropdown(list, tagOptions);
    } catch (error) {
      console.error("Failed to rebuild blog list.", error);

      if (filterButtonLabel) {
        filterButtonLabel.textContent = "Filter by";
      }
    }
  }

  raf2(() => {
    initBlogFeed();
  });
})();
