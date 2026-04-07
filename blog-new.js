(function () {
  "use strict";

  const BLOG_SOURCE_LIST_SELECTOR = ".blog--collection-list.w-dyn-items";
  const BLOG_TARGET_LIST_SELECTOR = ".blog--collection-list.is--filters";
  const BLOG_ITEM_SELECTOR = ".w-dyn-item";
  const FILTER_ROOT_SELECTOR = ".filter--parent";
  const FILTER_BUTTON_SELECTOR = ".filter--btn";
  const FILTER_BUTTON_LABEL_SELECTOR = ".filter--btn > div";
  const FILTER_ARROW_SELECTOR = ".filter--arrow";
  const FILTER_CONTENT_SELECTOR = ".filter--content";
  const FILTER_CONTENT_INNER_SELECTOR = ".filter--content-inner";
  const FILTER_TAG_SELECTOR = ".filter--tag";
  const PAGINATION_SELECTOR = ".blog--pagination";
  const PAGINATION_PREV_SELECTOR = ".arrow--pagination.is--prev";
  const PAGINATION_NEXT_SELECTOR = ".arrow--pagination.is--next";
  const PAGINATION_DOTS_SELECTOR = ".pagination--dots-wrapper";
  const TAGS_WRAPPER_SELECTOR = ".tags-wrapper";
  const CLIENT_PAGE_SIZE = 9;
  const MAX_PAGE_COUNT = 100;
  const DETAIL_FETCH_CONCURRENCY = 6;
  const TAG_CACHE_KEY = "waymark-blog-tag-cache-v1";
  const TAG_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
  const FADE_DURATION_MS = 180;
  const DROPDOWN_DURATION_MS = 220;
  const DEBUG_LOGS = true;

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function raf2(callback) {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  }

  function debugLog(message, payload) {
    if (!DEBUG_LOGS) return;

    if (typeof payload === "undefined") {
      console.log("[blog-new]", message);
      return;
    }

    console.log("[blog-new]", message, payload);
  }

  function normalizeWhitespace(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeTag(value) {
    return normalizeWhitespace(value).toLowerCase();
  }

  function getTagOptionsFromMap(tagMap) {
    return Array.from(tagMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  function readTagCache() {
    try {
      const raw = window.localStorage.getItem(TAG_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function writeTagCache(cache) {
    try {
      window.localStorage.setItem(TAG_CACHE_KEY, JSON.stringify(cache));
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function toAbsoluteUrl(url) {
    try {
      return new URL(url, window.location.origin).toString();
    } catch (_error) {
      return "";
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  async function finishAnimation(animation) {
    if (!animation) return;

    try {
      await animation.finished;
    } catch (_error) {
      // Ignore canceled animations.
    }
  }

  async function transitionList(list, items) {
    const canAnimate = !prefersReducedMotion() && typeof list.animate === "function";
    const hasExistingItems = list.children.length > 0;

    debugLog("transitionList", {
      canAnimate,
      hasExistingItems,
      nextItemCount: items.length,
    });

    if (!canAnimate) {
      replaceCollectionItems(list, items);
      return;
    }

    if (hasExistingItems) {
      await finishAnimation(list.animate(
        [
          { opacity: 1, transform: "translateY(0px)" },
          { opacity: 0, transform: "translateY(10px)" },
        ],
        {
          duration: FADE_DURATION_MS,
          easing: "ease",
          fill: "forwards",
        }
      ));
    }

    replaceCollectionItems(list, items);

    list.style.opacity = "0";
    list.style.transform = "translateY(10px)";

    await finishAnimation(list.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0px)" },
      ],
      {
        duration: FADE_DURATION_MS,
        easing: "ease",
        fill: "forwards",
      }
    ));

    list.style.opacity = "";
    list.style.transform = "";
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
    const list = $(BLOG_SOURCE_LIST_SELECTOR, doc) || $(".blog--collection-list", doc);
    if (!list) return [];

    const directItems = getDirectListItems(list);
    return directItems.length ? directItems : $all(BLOG_ITEM_SELECTOR, list);
  }

  function getItemUrl(item) {
    if (!item) return "";

    const cardLink = item.querySelector('.blog--link[href]:not([href="#"]):not([href^="javascript:"])');
    if (cardLink) {
      return toAbsoluteUrl(cardLink.getAttribute("href"));
    }

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
          template: importedItem,
          url: itemUrl,
          tags: [],
        });
      });

      debugLog("collected page", {
        page,
        pageItemCount: pageItems.length,
        totalCollected: items.length,
      });
    }

    return {
      items,
      itemsPerPage: CLIENT_PAGE_SIZE,
    };
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

  async function populateTags(items, onUpdate) {
    const allTags = new Map();
    const tagCache = readTagCache();
    const now = Date.now();
    const pendingItems = [];

    items.forEach((item) => {
      if (!item.url) {
        pendingItems.push(item);
        return;
      }

      const cachedEntry = tagCache[item.url];
      const isFresh = cachedEntry && now - cachedEntry.timestamp < TAG_CACHE_TTL_MS;

      if (!isFresh || !Array.isArray(cachedEntry.tags)) {
        pendingItems.push(item);
        return;
      }

      item.tags = cachedEntry.tags;
      cachedEntry.tags.forEach((tag) => {
        const normalized = normalizeTag(tag);
        if (!normalized || allTags.has(normalized)) return;
        allTags.set(normalized, tag);
      });
    });

    if (onUpdate) {
      debugLog("populateTags cache warm", {
        cachedTagCount: allTags.size,
        pendingItemCount: pendingItems.length,
      });
      onUpdate(getTagOptionsFromMap(allTags), true);
    }

    await runWithConcurrency(pendingItems, DETAIL_FETCH_CONCURRENCY, async (item) => {
      if (!item.url) return;

      const detailDoc = await fetchDocument(item.url);
      if (!detailDoc) return;

      const tags = extractTagsFromDocument(detailDoc);
      item.tags = tags;
      tagCache[item.url] = {
        tags: tags,
        timestamp: Date.now(),
      };

      let didAddTag = false;

      tags.forEach((tag) => {
        const normalized = normalizeTag(tag);
        if (!normalized || allTags.has(normalized)) return;
        allTags.set(normalized, tag);
        didAddTag = true;
      });

      writeTagCache(tagCache);

      if (didAddTag && onUpdate) {
        debugLog("populateTags new tag batch", {
          url: item.url,
          itemTagCount: tags.length,
          totalTagCount: allTags.size,
        });
        onUpdate(getTagOptionsFromMap(allTags), false);
      }
    });

    return getTagOptionsFromMap(allTags);
  }

  function replaceCollectionItems(list, items) {
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const element = item.template.cloneNode(true);
      element.dataset.blogTags = item.tags.map(normalizeTag).filter(Boolean).join("|");
      fragment.appendChild(element);
    });

    list.replaceChildren(fragment);
  }

  function getFilteredItems(items, activeFilter) {
    if (!activeFilter) return items.slice();

    return items.filter((item) => item.tags.some((tag) => normalizeTag(tag) === activeFilter));
  }

  function getItemsSignature(items) {
    return items.map((item) => item.url || "").join("||");
  }

  function initFilterDropdown(state) {
    const filterRoot = $(FILTER_ROOT_SELECTOR);
    const filterButton = $(FILTER_BUTTON_SELECTOR, filterRoot);
    const filterButtonLabel = $(FILTER_BUTTON_LABEL_SELECTOR, filterRoot);
    const filterArrow = $(FILTER_ARROW_SELECTOR, filterRoot);
    const filterContent = $(FILTER_CONTENT_SELECTOR, filterRoot);
    const filterContentInner = $(FILTER_CONTENT_INNER_SELECTOR, filterRoot);
    const filterTagTemplate = $(FILTER_TAG_SELECTOR, filterRoot);

    if (!filterRoot || !filterButton || !filterContent || !filterContentInner) return;

    let isOpen = false;

    function getOptions() {
      return [{ value: "", label: "All" }].concat(state.tagOptions);
    }

    async function setOpen(nextOpen) {
      if (isOpen === nextOpen) return;

      isOpen = nextOpen;
      filterRoot.classList.toggle("is-open", isOpen);
      filterButton.setAttribute("aria-expanded", String(isOpen));

      if (prefersReducedMotion() || typeof filterContent.animate !== "function") {
        filterContent.hidden = !isOpen;
        filterContent.style.display = isOpen ? "block" : "none";
        filterContent.style.height = "";
        filterContent.style.opacity = "";
        filterContent.style.overflow = "";

        if (filterArrow) {
          filterArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
        }

        return;
      }

      filterContent.style.overflow = "hidden";
      if (isOpen) {
        filterContent.hidden = false;
        filterContent.style.display = "block";
      }

      const currentHeight = filterContent.getBoundingClientRect().height;
      const targetHeight = isOpen ? filterContentInner.scrollHeight : 0;

      await Promise.all([
        finishAnimation(filterContent.animate(
          [
            {
              height: `${currentHeight}px`,
              opacity: isOpen ? 0 : 1,
            },
            {
              height: `${targetHeight}px`,
              opacity: isOpen ? 1 : 0,
            },
          ],
          {
            duration: DROPDOWN_DURATION_MS,
            easing: "ease",
            fill: "forwards",
          }
        )),
        filterArrow && typeof filterArrow.animate === "function"
          ? finishAnimation(filterArrow.animate(
            [
              { transform: isOpen ? "rotate(0deg)" : "rotate(180deg)" },
              { transform: isOpen ? "rotate(0deg)" : "rotate(180deg)" },
            ],
            {
              duration: DROPDOWN_DURATION_MS,
              easing: "ease",
              fill: "forwards",
            }
          ))
          : Promise.resolve(),
      ]);

      if (!isOpen) {
        filterContent.hidden = true;
        filterContent.style.display = "none";
      }

      filterContent.style.height = "";
      filterContent.style.opacity = "";
      filterContent.style.overflow = "";

      if (filterArrow) {
        filterArrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
      }
    }

    function updateButtonLabel() {
      if (!filterButtonLabel) return;

      const activeOption = getOptions().find((option) => option.value === state.activeFilter);
      if (activeOption && activeOption.value) {
        filterButtonLabel.textContent = `Filter by: ${activeOption.label}`;
        return;
      }

      filterButtonLabel.textContent = state.tagsLoading ? "Loading filters..." : "Filter by";
    }

    function createFilterOption(option) {
      const element = filterTagTemplate
        ? filterTagTemplate.cloneNode(true)
        : document.createElement("a");

      element.className = filterTagTemplate ? filterTagTemplate.className : "filter--tag";
      element.textContent = option.label;
      element.setAttribute("href", "#");
      element.dataset.filterValue = option.value;
      element.classList.toggle("is-active", option.value === state.activeFilter);

      element.addEventListener("click", (event) => {
        event.preventDefault();
        state.activeFilter = option.value;
        state.currentPage = 1;
        debugLog("filter selected", {
          value: option.value || "all",
          label: option.label,
        });

        $all(FILTER_TAG_SELECTOR, filterContentInner).forEach((tagElement) => {
          tagElement.classList.toggle("is-active", tagElement.dataset.filterValue === state.activeFilter);
        });

        updateButtonLabel();
        state.render("filter-change");
        void setOpen(false);
      });

      return element;
    }

    function renderOptions() {
      filterContentInner.replaceChildren(...getOptions().map((option) => createFilterOption(option)));
      updateButtonLabel();
    }

    filterButton.setAttribute("aria-haspopup", "true");
    filterButton.setAttribute("aria-expanded", "false");
    filterRoot.classList.remove("is-open");
    filterContent.hidden = true;
    filterContent.style.display = "none";
    filterContent.style.height = "";
    filterContent.style.opacity = "";
    filterContent.style.overflow = "";

    if (filterArrow) {
      filterArrow.style.transform = "rotate(180deg)";
    }

    filterButton.addEventListener("click", (event) => {
      event.preventDefault();
      void setOpen(!isOpen);
    });

    document.addEventListener("click", (event) => {
      if (!filterRoot.contains(event.target)) {
        void setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        void setOpen(false);
      }
    });

    renderOptions();

    return {
      renderOptions,
      setLoading: function setLoading(nextLoading) {
        state.tagsLoading = nextLoading;
        updateButtonLabel();
      },
    };
  }

  function initPagination(state) {
    const pagination = $(PAGINATION_SELECTOR);
    const prevButton = $(PAGINATION_PREV_SELECTOR, pagination);
    const nextButton = $(PAGINATION_NEXT_SELECTOR, pagination);
    const dotsWrapper = $(PAGINATION_DOTS_SELECTOR, pagination);

    if (!pagination || !prevButton || !nextButton || !dotsWrapper) {
      return {
        render: function renderPaginationFallback() {},
      };
    }

    function createDot(pageNumber) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "pagination--dot";
      dot.textContent = String(pageNumber);
      dot.classList.toggle("is-active", pageNumber === state.currentPage);
      dot.addEventListener("click", () => {
        state.currentPage = pageNumber;
        debugLog("pagination dot clicked", { pageNumber });
        state.render("pagination-dot");
      });
      return dot;
    }

    prevButton.addEventListener("click", () => {
      if (state.currentPage <= 1) return;
      state.currentPage -= 1;
      debugLog("pagination prev clicked", { currentPage: state.currentPage });
      state.render("pagination-prev");
    });

    nextButton.addEventListener("click", () => {
      if (state.currentPage >= state.totalPages) return;
      state.currentPage += 1;
      debugLog("pagination next clicked", { currentPage: state.currentPage });
      state.render("pagination-next");
    });

    return {
      render: function renderPagination() {
        pagination.hidden = state.totalPages <= 1;
        prevButton.classList.toggle("is-disabled", state.currentPage <= 1);
        nextButton.classList.toggle("is-disabled", state.currentPage >= state.totalPages);
        dotsWrapper.replaceChildren(
          ...Array.from({ length: state.totalPages }, function makeDot(_, index) {
            return createDot(index + 1);
          })
        );
      },
    };
  }

  async function initBlogFeed() {
    const list = $(BLOG_TARGET_LIST_SELECTOR);
    const filterButtonLabel = $(FILTER_BUTTON_LABEL_SELECTOR);

    debugLog("initBlogFeed start");

    if (!list) return;
    if (list.dataset.blogFeedMounted === "1") return;
    list.dataset.blogFeedMounted = "1";

    if (filterButtonLabel) {
      filterButtonLabel.textContent = "Loading filters...";
    }

    try {
      const result = await collectAllBlogItems();
      const items = result.items;
      debugLog("initBlogFeed items collected", {
        itemCount: items.length,
        itemsPerPage: result.itemsPerPage,
      });

      if (!items.length) {
        if (filterButtonLabel) filterButtonLabel.textContent = "Filter by";
        return;
      }

      const state = {
        activeFilter: "",
        currentPage: 1,
        items: items,
        itemsPerPage: result.itemsPerPage,
        lastRenderedSignature: "",
        tagOptions: [],
        tagsLoading: true,
        renderChain: Promise.resolve(),
        totalPages: 1,
        render: function render(reason, options) {
          const renderOptions = Object.assign({ animate: true }, options);

          debugLog("render queued", {
            reason: reason || "unspecified",
            activeFilter: state.activeFilter || "all",
            currentPage: state.currentPage,
            tagOptionCount: state.tagOptions.length,
            animate: renderOptions.animate,
          });

          state.renderChain = state.renderChain
            .catch(function ignoreRenderError() {})
            .then(async function runRender() {
              const filteredItems = getFilteredItems(state.items, state.activeFilter);
              state.totalPages = Math.max(1, Math.ceil(filteredItems.length / state.itemsPerPage));
              state.currentPage = Math.min(state.currentPage, state.totalPages);

              const startIndex = (state.currentPage - 1) * state.itemsPerPage;
              const pageItems = filteredItems.slice(startIndex, startIndex + state.itemsPerPage);
              const pageSignature = getItemsSignature(pageItems);
              const signatureChanged = pageSignature !== state.lastRenderedSignature;

              debugLog("render start", {
                reason: reason || "unspecified",
                filteredCount: filteredItems.length,
                pageItemCount: pageItems.length,
                currentPage: state.currentPage,
                totalPages: state.totalPages,
                signatureChanged,
                animate: renderOptions.animate,
              });

              paginationApi.render();

              if (!signatureChanged) {
                debugLog("render skipped list transition", {
                  reason: reason || "unspecified",
                });
                return;
              }

              if (renderOptions.animate) {
                await transitionList(list, pageItems);
              } else {
                debugLog("render replacing list without animation", {
                  reason: reason || "unspecified",
                });
                replaceCollectionItems(list, pageItems);
              }

              state.lastRenderedSignature = pageSignature;
            });

          return state.renderChain;
        },
      };

      const paginationApi = initPagination(state);
      const filterApi = initFilterDropdown(state);
      state.render("initial");

      populateTags(items, function handleTagUpdate(tagOptions, fromCache) {
        state.tagOptions = tagOptions;
        filterApi.renderOptions();
        debugLog("tag update received", {
          fromCache,
          tagOptionCount: tagOptions.length,
        });

        if (state.activeFilter) {
          state.render(fromCache ? "tag-update-cache" : "tag-update-network", {
            animate: false,
          });
        } else {
          debugLog("tag update skipped list render", {
            reason: fromCache ? "tag-update-cache" : "tag-update-network",
            activeFilter: "all",
          });
        }

        if (fromCache && tagOptions.length) {
          filterApi.setLoading(false);
        }
      }).then((tagOptions) => {
        state.tagOptions = tagOptions;
        state.tagsLoading = false;
        filterApi.renderOptions();
        filterApi.setLoading(false);
        debugLog("tag loading complete", {
          tagOptionCount: tagOptions.length,
        });

        if (state.activeFilter) {
          state.render("tag-loading-complete", { animate: false });
        } else {
          debugLog("tag loading complete skipped list render", {
            activeFilter: "all",
          });
        }
      }).catch((error) => {
        console.error("Failed to load blog tags.", error);
        state.tagsLoading = false;
        filterApi.setLoading(false);
      });
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
