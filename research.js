(function () {
  "use strict";

  const LIST_SELECTOR = ".resources-c-collection-list.w-dyn-items";
  const ITEM_SELECTOR = ".w-dyn-item";
  const CARD_SELECTOR = ".resource--card";
  const FILTER_PARENT_SELECTOR = ".filter--parent";
  const FILTER_BUTTON_SELECTOR = ".filter--btn";
  const FILTER_BUTTON_LABEL_SELECTOR = ".filter--btn > div";
  const FILTER_ARROW_SELECTOR = ".filter--arrow";
  const FILTER_CONTENT_SELECTOR = ".filter--content";
  const FILTER_CONTENT_INNER_SELECTOR = ".filter--content-inner";
  const FILTER_TAG_SELECTOR = ".filter--tag";
  const SWIPER_SELECTOR = ".swiper.is--research";
  const PAGINATION_SELECTOR = ".blog--pagination";
  const PAGINATION_PREV_SELECTOR = ".arrow--pagination.is--prev";
  const PAGINATION_NEXT_SELECTOR = ".arrow--pagination.is--next";
  const PAGINATION_DOTS_SELECTOR = ".pagination--dots-wrapper";
  const PAGE_SIZE = 4;
  const FADE_DURATION_MS = 180;
  const DROPDOWN_DURATION_MS = 220;

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

  function getItemsSignature(items) {
    return items.map((item) => item.id).join("|");
  }

  function getFilterParentByLabel(labelText) {
    return $all(FILTER_PARENT_SELECTOR).find((parent) => {
      const label = normalizeWhitespace($(FILTER_BUTTON_LABEL_SELECTOR, parent)?.textContent);
      return label.toLowerCase() === labelText.toLowerCase();
    }) || null;
  }

  function getNextMatchingSibling(element, selector) {
    let sibling = element ? element.nextElementSibling : null;

    while (sibling) {
      if (sibling.matches(selector)) return sibling;
      sibling = sibling.nextElementSibling;
    }

    return null;
  }

  function getFilterOptionsFromMap(optionMap) {
    return Array.from(optionMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  function extractTagsFromItem(item) {
    const seen = new Set();
    const tags = [];

    const visibleTagNodes = $all(".resource--card ~ div .w-dyn-item > div", item);
    const hiddenTagNodes = $all('[fs-cmsfilter-field="categories"]', item);
    const nodes = visibleTagNodes.length ? visibleTagNodes : hiddenTagNodes;

    nodes.forEach((node) => {
      const label = normalizeWhitespace(node.textContent);
      const value = normalizeTag(label);

      if (!value || seen.has(value)) return;
      seen.add(value);
      tags.push(label);
    });

    return tags;
  }

  function extractSourceFromItem(item) {
    const sourceNode = $(`${CARD_SELECTOR} .body-13`, item);
    const sourceText = normalizeWhitespace(sourceNode?.textContent);
    const sourceLabel = normalizeWhitespace(sourceText.split(",")[0]);

    return sourceLabel;
  }

  function collectResearchItems(list) {
    const rawItems = Array.from(list.children).filter((child) => child.matches(ITEM_SELECTOR));
    const tagMap = new Map();
    const sourceMap = new Map();

    const items = rawItems.map((item, index) => {
      const template = item.cloneNode(true);
      const tags = extractTagsFromItem(item);
      const source = extractSourceFromItem(item);

      tags.forEach((tag) => {
        const normalized = normalizeTag(tag);
        if (!normalized || tagMap.has(normalized)) return;
        tagMap.set(normalized, tag);
      });

      const normalizedSource = normalizeTag(source);
      if (normalizedSource && !sourceMap.has(normalizedSource)) {
        sourceMap.set(normalizedSource, source);
      }

      return {
        id: String(index),
        template,
        tags,
        source,
        order: index,
      };
    });

    return {
      items,
      sourceOptions: getFilterOptionsFromMap(sourceMap),
      tagOptions: getFilterOptionsFromMap(tagMap),
    };
  }

  function replaceListItems(list, items) {
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const element = item.template.cloneNode(true);
      element.dataset.researchTags = item.tags.map(normalizeTag).join("|");
      fragment.appendChild(element);
    });

    list.replaceChildren(fragment);
  }

  async function transitionList(list, items, animate) {
    const canAnimate = animate && !prefersReducedMotion() && typeof list.animate === "function";
    const hasExistingItems = list.children.length > 0;

    if (!canAnimate) {
      replaceListItems(list, items);
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

    replaceListItems(list, items);

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

  function getFilteredAndSortedItems(state) {
    let items = state.items.slice();

    if (state.activeSource) {
      items = items.filter((item) => normalizeTag(item.source) === state.activeSource);
    }

    if (state.activeFilter) {
      items = items.filter((item) => item.tags.some((tag) => normalizeTag(tag) === state.activeFilter));
    }

    return items;
  }

  function initDropdown(parent, getOptions, state, onSelect) {
    if (!parent) return null;

    const button = $(FILTER_BUTTON_SELECTOR, parent);
    const buttonLabel = $(FILTER_BUTTON_LABEL_SELECTOR, parent);
    const arrow = $(FILTER_ARROW_SELECTOR, parent);
    const content = $(FILTER_CONTENT_SELECTOR, parent);
    const contentInner = $(FILTER_CONTENT_INNER_SELECTOR, parent);
    const tagTemplate = $(FILTER_TAG_SELECTOR, parent);

    if (!button || !buttonLabel || !content || !contentInner) return null;

    let isOpen = false;

    async function setOpen(nextOpen) {
      if (isOpen === nextOpen) return;

      isOpen = nextOpen;
      parent.classList.toggle("is-open", isOpen);
      button.setAttribute("aria-expanded", String(isOpen));

      if (prefersReducedMotion() || typeof content.animate !== "function") {
        content.hidden = !isOpen;
        content.style.display = isOpen ? "block" : "none";
        content.style.height = "";
        content.style.opacity = "";
        content.style.overflow = "";

        if (arrow) {
          arrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
        }

        return;
      }

      content.style.overflow = "hidden";

      if (isOpen) {
        content.hidden = false;
        content.style.display = "block";
      }

      const currentHeight = content.getBoundingClientRect().height;
      const targetHeight = isOpen ? contentInner.scrollHeight : 0;

      await Promise.all([
        finishAnimation(content.animate(
          [
            { height: `${currentHeight}px`, opacity: isOpen ? 0 : 1 },
            { height: `${targetHeight}px`, opacity: isOpen ? 1 : 0 },
          ],
          {
            duration: DROPDOWN_DURATION_MS,
            easing: "ease",
            fill: "forwards",
          }
        )),
        arrow && typeof arrow.animate === "function"
          ? finishAnimation(arrow.animate(
            [
              { transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" },
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
        content.hidden = true;
        content.style.display = "none";
      }

      content.style.height = "";
      content.style.opacity = "";
      content.style.overflow = "";

      if (arrow) {
        arrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
      }
    }

    function renderOptions() {
      const options = getOptions();

      contentInner.replaceChildren(
        ...options.map((option) => {
          const element = tagTemplate ? tagTemplate.cloneNode(true) : document.createElement("a");

          element.className = tagTemplate ? tagTemplate.className : "filter--tag";
          element.textContent = option.label;
          element.setAttribute("href", "#");
          element.dataset.optionValue = option.value;
          element.classList.toggle("is-active", option.value === option.activeValue);
          element.addEventListener("click", (event) => {
            event.preventDefault();
            onSelect(option.value, option.label);
            void setOpen(false);
          });

          return element;
        })
      );
    }

    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    parent.classList.remove("is-open");
    content.hidden = true;
    content.style.display = "none";
    content.style.height = "";
    content.style.opacity = "";
    content.style.overflow = "";

    if (arrow) {
      arrow.style.transform = "rotate(180deg)";
    }

    button.addEventListener("click", (event) => {
      event.preventDefault();
      void setOpen(!isOpen);
    });

    document.addEventListener("click", (event) => {
      if (!parent.contains(event.target)) {
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
    };
  }

  function initPagination(anchor, state) {
    const sectionRoot = anchor?.closest(".w-dyn-list") || anchor;
    const pagination = getNextMatchingSibling(sectionRoot, PAGINATION_SELECTOR);
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
        state.render("pagination-dot", { animate: true });
      });
      return dot;
    }

    prevButton.addEventListener("click", () => {
      if (state.currentPage <= 1) return;
      state.currentPage -= 1;
      state.render("pagination-prev", { animate: true });
    });

    nextButton.addEventListener("click", () => {
      if (state.currentPage >= state.totalPages) return;
      state.currentPage += 1;
      state.render("pagination-next", { animate: true });
    });

    return {
      render: function renderPagination() {
        pagination.hidden = state.totalPages <= 1;
        prevButton.classList.toggle("is-disabled", state.currentPage <= 1);
        nextButton.classList.toggle("is-disabled", state.currentPage >= state.totalPages);
        dotsWrapper.replaceChildren(
          ...Array.from({ length: state.totalPages }, (_, index) => createDot(index + 1))
        );
      },
    };
  }

  function initResearchSwiper() {
    const swiperElement = $(SWIPER_SELECTOR);
    if (!swiperElement) return;
    if (swiperElement.dataset.researchSwiperMounted === "1") return;
    if (typeof window.Swiper !== "function") return;

    const pagination = getNextMatchingSibling(swiperElement, PAGINATION_SELECTOR);
    const prevButton = $(PAGINATION_PREV_SELECTOR, pagination);
    const nextButton = $(PAGINATION_NEXT_SELECTOR, pagination);
    const dotsWrapper = $(PAGINATION_DOTS_SELECTOR, pagination);

    if (!pagination || !prevButton || !nextButton || !dotsWrapper) return;

    swiperElement.dataset.researchSwiperMounted = "1";

    function syncNavigation(swiper) {
      prevButton.classList.toggle("is-disabled", swiper.isBeginning);
      nextButton.classList.toggle("is-disabled", swiper.isEnd);
    }

    new window.Swiper(swiperElement, {
      slidesPerView: 1,
      slidesPerGroup: 1,
      spaceBetween: 24,
      speed: 400,
      watchOverflow: true,
      navigation: {
        prevEl: prevButton,
        nextEl: nextButton,
        disabledClass: "is-disabled",
      },
      pagination: {
        el: dotsWrapper,
        clickable: true,
        bulletClass: "pagination--dot",
        bulletActiveClass: "is-active",
        renderBullet: function renderBullet(index, className) {
          return `<button type="button" class="${className}">${index + 1}</button>`;
        },
      },
      breakpoints: {
        992: {
          slidesPerView: 1,
          slidesPerGroup: 1,
          spaceBetween: 24,
        },
      },
      on: {
        init: syncNavigation,
        slideChange: syncNavigation,
        resize: syncNavigation,
      },
    });
  }

  async function initResearchFeed() {
    const list = $(LIST_SELECTOR);
    if (!list) return;
    if (list.dataset.researchFeedMounted === "1") return;
    list.dataset.researchFeedMounted = "1";

    const { items, sourceOptions, tagOptions } = collectResearchItems(list);
    if (!items.length) return;

    const state = {
      activeFilter: "",
      activeSource: "",
      currentPage: 1,
      items,
      totalPages: 1,
      lastRenderedSignature: "",
      renderChain: Promise.resolve(),
      render: function render(reason, options) {
        const renderOptions = Object.assign({ animate: true }, options);

        state.renderChain = state.renderChain
          .catch(() => {})
          .then(async function runRender() {
            const visibleItems = getFilteredAndSortedItems(state);
            state.totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
            state.currentPage = Math.min(state.currentPage, state.totalPages);

            const startIndex = (state.currentPage - 1) * PAGE_SIZE;
            const pageItems = visibleItems.slice(startIndex, startIndex + PAGE_SIZE);
            const signature = getItemsSignature(pageItems);
            const shouldAnimate = renderOptions.animate && signature !== state.lastRenderedSignature;

            paginationApi.render();

            if (signature === state.lastRenderedSignature) {
              return;
            }

            await transitionList(list, pageItems, shouldAnimate);
            state.lastRenderedSignature = signature;
          });

        return state.renderChain;
      },
    };

    const paginationApi = initPagination(list, state);

    const sortParent = getFilterParentByLabel("Sort by");
    const filterParent = getFilterParentByLabel("Filter by");

    const sortApi = initDropdown(
      sortParent,
      function getSortOptions() {
        return [{ value: "", label: "All", activeValue: state.activeSource }].concat(
          sourceOptions.map((option) => ({
            value: option.value,
            label: option.label,
            activeValue: state.activeSource,
          }))
        );
      },
      state,
      function handleSortChange(value, label) {
        state.activeSource = value;
        state.currentPage = 1;

        const labelNode = $(FILTER_BUTTON_LABEL_SELECTOR, sortParent);
        if (labelNode) {
          labelNode.textContent = value ? `Sort by: ${label}` : "Sort by";
        }

        sortApi.renderOptions();
        state.render("sort-change", { animate: true });
      }
    );

    if (sortParent) {
      const labelNode = $(FILTER_BUTTON_LABEL_SELECTOR, sortParent);
      if (labelNode) {
        labelNode.textContent = "Sort by";
      }
    }

    const filterApi = initDropdown(
      filterParent,
      function getFilterOptions() {
        return [{ value: "", label: "All", activeValue: state.activeFilter }].concat(
          tagOptions.map((option) => ({
            value: option.value,
            label: option.label,
            activeValue: state.activeFilter,
          }))
        );
      },
      state,
      function handleFilterChange(value, label) {
        state.activeFilter = value;
        state.currentPage = 1;

        const labelNode = $(FILTER_BUTTON_LABEL_SELECTOR, filterParent);
        if (labelNode) {
          labelNode.textContent = value ? `Filter by: ${label}` : "Filter by";
        }

        filterApi.renderOptions();
        state.render("filter-change", { animate: true });
      }
    );

    if (filterParent) {
      const labelNode = $(FILTER_BUTTON_LABEL_SELECTOR, filterParent);
      if (labelNode) {
        labelNode.textContent = "Filter by";
      }
    }

    await state.render("initial", { animate: false });
  }

  raf2(() => {
    initResearchSwiper();
    initResearchFeed();
  });
})();
