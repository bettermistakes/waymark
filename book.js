// ------------------ gsap ------------------ //

gsap.registerPlugin(ScrollTrigger, CustomEase);

// ------------------ smooth ease ------------------ //

CustomEase.create("smooth", "M0,0 C0.38,0.005 0.215,1 1,1");

// ------------------ loading screen ------------------ //

function pageLoad() {
  let tl = gsap.timeline();

  tl.to(".main--wrapper", {
    opacity: 1,
    ease: "smooth",
    duration: 0.6,
  });

  // Add a label to mark the starting point of simultaneous animations
  tl.add("loadingAnimationsStart");

  // Add the 'loading' animation and set its position to the label
  tl.from(
    "[animation=loading]",
    {
      y: "20rem",
      opacity: "0",
      stagger: { each: 0.1, from: "start" },
      ease: "smooth",
      duration: 0.6,
    },
    "loadingAnimationsStart"
  ); // <-- position parameter set to the label
}

pageLoad();

// ------------------ chapter ordering and title toggle ------------------- //
document.addEventListener("DOMContentLoaded", function () {
  function sortChapters() {
    // Select the dynamic list container
    const dynListContainer = document.querySelector(".w-dyn-list");
    const bookBarParts = document.querySelector(".book-bar-parts");

    // Find all the chapter names, links, and summaries
    const chapters = [];
    const chapterItems = document.querySelectorAll(".w-dyn-item");

    chapterItems.forEach((item) => {
      const partName = item
        .querySelector(".chapter-bar--part-name")
        .innerText.trim(); // Ensure no extra spaces
      const chapterNumber = parseInt(
        item.querySelector(".book-bar-chapter-number").innerText.trim()
      );
      const chapterLink = item.querySelector(".book-bar-chapter-link");
      const chapterSummary = item.querySelector(".chapter--summary");

      // Add the chapter information to the array
      chapters.push({
        partName,
        chapterNumber,
        chapterLink,
        chapterSummary,
      });
    });

    // Group chapters by partName
    const groupedChapters = chapters.reduce((acc, chapter) => {
      if (chapter.partName === "Introduction") return acc; // Skip Introduction
      if (!acc[chapter.partName]) {
        acc[chapter.partName] = [];
      }
      acc[chapter.partName].push(chapter);
      return acc;
    }, {});

    console.log("Grouped Chapters before sorting:", groupedChapters); // Debugging grouped chapters

    // Ensure epilogue title is correct and trim whitespace
    const epilogueTitle =
      "Epilogue: A Vision for Strengthening Medicaid and Advancing Health Equity";

    // Sort the parts and chapters with the special ordering
    const sortedParts = Object.keys(groupedChapters).sort((a, b) => {
      console.log(`Comparing: a = "${a}", b = "${b}"`); // Debugging comparisons
      if (a === "Acknowledgements") return 1; // "Acknowledgements" should be third last
      if (b === "Acknowledgements") return -1;
      if (a === "Endnotes") return 1; // "Endnotes" should be second last
      if (b === "Endnotes") return -1;
      if (a === epilogueTitle) return 1; // "Epilogue" should be last
      if (b === epilogueTitle) return -1;
      return a.localeCompare(b); // Alphabetical sort for other parts
    });

    console.log("Sorted Parts:", sortedParts); // Debugging sorted parts

    // Clear the original list
    bookBarParts.innerHTML = "";

    sortedParts.forEach((partName) => {
      console.log(`Rendering part: "${partName}"`); // Debugging part rendering

      // Sort chapters within the part by chapter number
      const sortedChapters = groupedChapters[partName].sort(
        (a, b) => a.chapterNumber - b.chapterNumber
      );

      // Create the part item container
      const partItem = document.createElement("div");
      partItem.className = "book-bar-part-item";

      // Create the part link
      const partLink = document.createElement("a");
      partLink.className = "book-bar-part-link";
      partLink.innerText = partName;
      partItem.appendChild(partLink);

      // Append the sorted chapters and summaries to the part item
      sortedChapters.forEach((chapter) => {
        partItem.appendChild(chapter.chapterLink);
        if (chapter.chapterSummary) {
          partItem.appendChild(chapter.chapterSummary);
        }
      });

      // Append the part item directly to the book-bar-parts
      bookBarParts.appendChild(partItem);
    });

    // Remove the original dynamic list container
    dynListContainer.remove();

    // Now that sorting is done, run the function to add the `is--disabled` class
    addDisabledClassToChapterTitle();

    // Once sorting and title toggle are done, run the arrows logic
    initArrowsLogic();
  }

  // Function to add the `is--disabled` class
  function addDisabledClassToChapterTitle() {
    const currentChapterLink = document.querySelector(
      ".book-bar-chapter-link.w--current"
    );

    if (currentChapterLink) {
      console.log("Current chapter found:", currentChapterLink.innerText); // Debugging

      const currentPartItem = currentChapterLink.closest(".book-bar-part-item");

      if (currentPartItem) {
        const firstChapterLink = currentPartItem.querySelector(
          ".book-bar-chapter-link"
        );
        const partName = currentPartItem
          .querySelector(".book-bar-part-link")
          .innerText.trim();

        // Ensure we have the right part and first link, or if it's "Endnotes", "Acknowledgements", or the Epilogue title
        const epilogueTitle =
          "Epilogue: A Vision for Strengthening Medicaid and Advancing Health Equity";

        if (
          currentChapterLink !== firstChapterLink ||
          partName === "Endnotes" ||
          partName === "Acknowledgements"
        ) {
          console.log(
            "Current chapter is either not the first one in the part, or it's Endnotes, Acknowledgements, or the Epilogue."
          );

          // Select the global .chapter--title-parent.is--margin-bottom element
          const titleParent = document.querySelector(
            ".chapter--title-parent.is--margin-bottom"
          );

          if (titleParent) {
            console.log(
              "Found the .chapter--title-parent element, adding class."
            );
            titleParent.classList.add("is--disabled");
          } else {
            console.log(".chapter--title-parent.is--margin-bottom not found!");
          }
        } else {
          console.log("Current chapter is the first one in the part.");
        }
      } else {
        console.log("Current part item not found.");
      }
    } else {
      console.error("No current chapter link found!");
    }
  }

  // Run the sorting function first
  sortChapters();
});

// ------------------ arrows ------------------ //
document.addEventListener("DOMContentLoaded", function () {
  function initArrowsLogic() {
    // Find the current chapter link
    const currentChapter = document.querySelector(
      ".book-bar-chapter-link.w--current"
    );

    console.log("Current Chapter:", currentChapter);

    if (currentChapter) {
      // Find all chapter links
      const allChapters = Array.from(
        document.querySelectorAll(".book-bar-chapter-link")
      );
      const allSummaries = Array.from(
        document.querySelectorAll(".chapter--summary")
      );
      const currentIndex = allChapters.indexOf(currentChapter);

      console.log("All Chapters:", allChapters);
      console.log("All Summaries:", allSummaries); // Log all summaries
      console.log("Current Chapter Index:", currentIndex);

      // Find the next chapter link
      const nextChapter = allChapters[currentIndex + 1];
      const nextArrow = document.querySelector(".book-chapter-arrow.is--next");
      const nextContainer = document.querySelector(
        ".container--924.is--next-chapter"
      );
      const nextButton = document.querySelector(".btn.is--next-chapter");
      const nextHeading = document.querySelector(
        ".heading--46.is--next-chapter"
      );
      const nextParagraph = document.querySelector(
        ".paragraph--14.is--next-chapter"
      );
      const chapterSummaryWrapper = document.querySelector(
        ".chapter--summary-wrapper"
      );

      console.log("Next Chapter:", nextChapter);

      if (nextChapter) {
        const nextHref = nextChapter.getAttribute("href");
        const nextChapterText = nextChapter.textContent || nextHref;

        // Log next chapter text and href
        console.log("Next Chapter Text:", nextChapterText);
        console.log("Next Chapter Href:", nextHref);

        // Select the next chapter's summary using the index
        const nextChapterSummary = allSummaries[currentIndex + 1];

        // Log the summary
        console.log("Next Chapter Summary Element:", nextChapterSummary);
        console.log(
          "Next Chapter Summary Text:",
          nextChapterSummary
            ? nextChapterSummary.textContent
            : "Summary not available"
        );

        nextArrow.setAttribute("href", nextHref);
        nextContainer.setAttribute("href", nextHref);
        nextButton.setAttribute("href", nextHref);

        // Check if the next chapter is "Epilogue" or "Endnotes"
        if (
          nextChapterText === "Epilogue" ||
          nextChapterText === "Endnotes" ||
          nextChapterText === "Acknowledgements"
        ) {
          nextButton.textContent = "Read more";
          if (chapterSummaryWrapper) {
            chapterSummaryWrapper.style.display = "none";
          }
        } else {
          nextButton.textContent = "Next Chapter"; // or whatever the default text is
          if (chapterSummaryWrapper) {
            chapterSummaryWrapper.style.display = "block"; // Restore visibility
          }
        }

        // Set both heading and paragraph contents simultaneously
        if (nextHeading) {
          console.log("Updating next heading with:", nextChapterText);
          nextHeading.textContent = nextChapterText;
        }

        if (nextParagraph) {
          console.log(
            "Updating next paragraph with:",
            nextChapterSummary
              ? nextChapterSummary.textContent
              : "Summary not available"
          );
          nextParagraph.textContent = nextChapterSummary
            ? nextChapterSummary.textContent
            : "Summary not available";
        }
      } else {
        console.log("No Next Chapter Available");

        nextArrow.classList.add("is--inactive");
        nextContainer.classList.add("is--inactive");
        nextButton.classList.add("is--inactive");

        if (nextHeading) {
          nextHeading.textContent = "No next chapter available";
        }

        if (nextParagraph) {
          nextParagraph.textContent = "";
        }
      }

      // Find the previous chapter link
      const prevChapter = allChapters[currentIndex - 1];
      const prevArrow = document.querySelector(".book-chapter-arrow.is--prev");

      console.log("Previous Chapter:", prevChapter);

      if (prevChapter) {
        prevArrow.setAttribute("href", prevChapter.getAttribute("href"));
      } else {
        prevArrow.classList.add("is--inactive");
      }
    }
  }

  // Initialize the arrows logic
  initArrowsLogic();
});

// ------------------ set initial class based on screen size ---------------- //

// Function to set the correct combo class based on screen size
function setNavbarComboClass() {
  const navbarTrigger = document.querySelector(".navbar--bar-trigger");

  if (window.innerWidth > 992) {
    // Screen above 992px
    navbarTrigger.classList.remove("is--toopen");
    navbarTrigger.classList.add("is--toclose");
  } else {
    // Screen below 992px
    navbarTrigger.classList.remove("is--toclose");
    navbarTrigger.classList.add("is--toopen");
  }
}

// Set the correct combo class on page load
window.addEventListener("load", setNavbarComboClass);

// Update combo class when window is resized
window.addEventListener("resize", setNavbarComboClass);

// ------------------ bar open and close with combo classes ---------------- //

document
  .querySelector(".navbar--bar-trigger")
  .addEventListener("click", function () {
    const bookBar = document.querySelector(".book-bar");
    const triggerIcon = document.querySelector(".navbar--trigger-icon");
    const triggerIconClose = document.querySelector(
      ".navbar--trigger-icon-close"
    );
    const navbarTrigger = document.querySelector(".navbar--bar-trigger");
    const searchTrigger = document.querySelector(
      ".navbar--bar-function-trigger.is--search.is--tooclose"
    );

    if (navbarTrigger.classList.contains("is--toopen")) {
      // Forward animation when clicking .is--toopen (menu opens)
      gsap
        .timeline()
        .to(bookBar, {
          marginLeft: "0rem",
          duration: 0.5,
        })
        .to(
          triggerIcon,
          {
            opacity: 0,
            duration: 0.3,
          },
          0
        ) // Start this animation at the same time as bookBar animation
        .to(
          triggerIconClose,
          {
            opacity: 1,
            duration: 0.3,
          },
          0
        ); // Start this animation at the same time as bookBar animation

      // Switch the class from is--toopen to is--toclose after animation
      navbarTrigger.classList.remove("is--toopen");
      navbarTrigger.classList.add("is--toclose");
    } else if (navbarTrigger.classList.contains("is--toclose")) {
      // Reverse animation when clicking .is--toclose (menu closes)
      gsap
        .timeline()
        .to(bookBar, {
          marginLeft: "-282rem",
          duration: 0.5,
        })
        .to(
          triggerIconClose,
          {
            opacity: 0,
            duration: 0.3,
          },
          0
        ) // Start this animation at the same time as bookBar animation
        .to(
          triggerIcon,
          {
            opacity: 1,
            duration: 0.3,
          },
          0
        ); // Start this animation at the same time as bookBar animation

      // Switch the class from is--toclose back to is--toopen after animation
      navbarTrigger.classList.remove("is--toclose");
      navbarTrigger.classList.add("is--toopen");

      // Trigger click on .navbar--bar-function-trigger.is--search.is--tooclose
      if (searchTrigger) {
        searchTrigger.click();
      }
    }
  });

// ----------------- settings trigger ------------------- //

const settingsTrigger = document.querySelector(
  ".navbar--bar-function-trigger.is--settings"
);
const popup = settingsTrigger.querySelector(".navbar--function-popup");

// Function to open the popup
function openPopup() {
  gsap.to(popup, {
    display: "flex",
    opacity: 1,
    duration: 0.2,
    onStart: () => (popup.style.display = "flex"),
  });
}

// Function to close the popup
function closePopup() {
  gsap.to(popup, {
    opacity: 0,
    duration: 0.2,
    onComplete: () => (popup.style.display = "none"),
  });
}

// Toggle popup on click
settingsTrigger.addEventListener("click", function (event) {
  event.stopPropagation(); // Prevent the click event from bubbling up
  if (popup.style.display === "flex") {
    closePopup();
  } else {
    openPopup();
  }
});

// Close the popup if clicked outside
document.addEventListener("click", function (event) {
  if (
    popup.style.display === "flex" &&
    !popup.contains(event.target) &&
    !settingsTrigger.contains(event.target)
  ) {
    closePopup();
  }
});

// Prevent the popup from closing when clicking inside it
popup.addEventListener("click", function (event) {
  event.stopPropagation();
});

// ------------------ search function ------------------ //

document.addEventListener("DOMContentLoaded", function () {
  const chapterLinks = document.querySelectorAll(".book-bar-chapter-link");
  const partItems = document.querySelectorAll(".book-bar-part-item");
  const searchBarInput = document.getElementById("search-bar");
  const resetButton = document.querySelector(".searchbar--reset");

  let chapterContents = {};

  // Define clearHighlights function here so it is accessible globally
  function clearHighlights() {
    document
      .querySelectorAll(".book--richtext, .heading--29.is--chapter-title")
      .forEach((element) => {
        element.innerHTML = element.innerHTML.replace(
          /<mark class="highlight">|<\/mark>/gim,
          ""
        );
      });
  }

  // Prefetch all chapter contents
  chapterLinks.forEach(async (link) => {
    let url = link.getAttribute("href");
    try {
      let response = await fetch(url);
      let text = await response.text();

      // Extract both the .book--richtext and .heading--29.is--chapter-title content
      let tempDiv = document.createElement("div");
      tempDiv.innerHTML = text;

      let chapterTitle = tempDiv.querySelector(".heading--29.is--chapter-title")
        ? tempDiv
            .querySelector(".heading--29.is--chapter-title")
            .innerText.toLowerCase()
        : "";

      let chapterText = "";

      // Select all instances of .book--richtext in the tempDiv
      let allRichtextElements = tempDiv.querySelectorAll(".book--richtext");

      if (allRichtextElements.length > 0) {
        allRichtextElements.forEach((element) => {
          // Concatenate the text content of each .book--richtext element
          chapterText += element.innerText.toLowerCase() + " ";
        });
      }

      // Concatenate the chapter title and text content
      let chapterContent = chapterTitle + " " + chapterText;

      chapterContents[url] = chapterContent;
    } catch (error) {
      console.error("Error fetching page:", error);
    }
  });

  // Filter Chapter Links
  function filterChapterLinks(term, cachedContents) {
    let anyPartVisible = false;

    partItems.forEach((partItem) => {
      let partLink = partItem.querySelector(".book-bar-part-link");
      let chapterLinksInPart = partItem.querySelectorAll(
        ".book-bar-chapter-link"
      );
      let anyVisible = false;

      // Check if the part name matches the search term
      if (partLink && partLink.innerText.toLowerCase().includes(term)) {
        // If part name matches, show all chapters in this part
        chapterLinksInPart.forEach((link) => {
          link.style.display = "block";
        });
        partItem.style.display = "flex";
        anyPartVisible = true;
        anyVisible = true;
      } else {
        // Otherwise, filter individual chapter links
        chapterLinksInPart.forEach((link) => {
          let url = link.getAttribute("href");

          // Check if the content is already fetched and cached
          if (cachedContents[url]) {
            // Check both the chapter title and the chapter content in cache
            if (cachedContents[url].includes(term)) {
              link.style.display = "block"; // Show link if term found
              anyVisible = true;
            } else {
              // If not found in cached content, check all visible .book--richtext and .heading--29.is--chapter-title elements
              let currentChapterContents = document.querySelectorAll(
                `.book--richtext, .heading--29.is--chapter-title`
              );

              let termFound = false;
              currentChapterContents.forEach((content) => {
                if (
                  content.innerHTML.includes(
                    `<mark class="highlight">${term}</mark>`
                  )
                ) {
                  termFound = true;
                }
              });

              if (termFound) {
                link.style.display = "block"; // Show link if term found in any instance of visible content
                anyVisible = true;
              } else {
                link.style.display = "none"; // Hide link if term not found
              }
            }
          }
        });

        // Show or hide the whole part item based on the visibility of its chapter links
        if (anyVisible) {
          partItem.style.display = "flex";
          anyPartVisible = true;
        } else {
          partItem.style.display = "none";
        }
      }
    });

    // Show or hide the .noresults element based on the visibility of all part items
    const noResultsElement = document.querySelector(".noresults");
    if (!anyPartVisible) {
      noResultsElement.style.display = "block";
    } else {
      noResultsElement.style.display = "none";
    }
  }

  // Add input listener for search bar
  searchBarInput.addEventListener("input", function () {
    let searchTerm = this.value.trim().toLowerCase();

    // Clear previous highlights
    clearHighlights();

    if (searchTerm) {
      // Use a word boundary (\b) to match the exact word
      let regex = new RegExp(`(${searchTerm})`, "gi");

      // Function to safely replace text within text nodes
      const highlightText = (node) => {
        if (node.nodeType === 3) {
          // Text node
          let match = node.textContent.match(regex);
          if (match) {
            const span = document.createElement("span");
            span.innerHTML = node.textContent.replace(
              regex,
              `<mark class="highlight">$1</mark>`
            );
            node.parentNode.replaceChild(span, node);
          }
        } else if (
          node.nodeType === 1 &&
          node.childNodes &&
          !/(script|style)/i.test(node.tagName)
        ) {
          for (let i = 0; i < node.childNodes.length; i++) {
            highlightText(node.childNodes[i]);
          }
        }
      };

      // Start the highlighting process on both .book--richtext and .heading--29.is--chapter-title
      document
        .querySelectorAll(".book--richtext, .heading--29.is--chapter-title")
        .forEach((element) => {
          highlightText(element);
        });
    }

    // Instantly filter chapter links and part items
    filterChapterLinks(searchTerm, chapterContents);
  });

  // Reset Button Logic
  resetButton.addEventListener("click", function () {
    searchBarInput.value = ""; // Clear the search input
    gsap.to(resetButton, { opacity: 0, duration: 0, ease: "smooth" }); // Hide the reset button
    searchBarInput.focus(); // Set focus back to the input field

    // Clear any highlights
    clearHighlights();

    // Reset the filter to show all items
    filterChapterLinks("", chapterContents); // Reset the filter
  });
});

// Search and Reset Button Logic
const searchTrigger = document.querySelector(
  ".navbar--bar-function-trigger.is--search"
);
const searchInputWrapper = document.querySelector(".book-bar-searchbar-parent");
const searchBarInput = document.getElementById("search-bar");
const resetButton = document.querySelector(".searchbar--reset");

// Function to open the search input wrapper
function openSearchInput() {
  gsap.to(searchInputWrapper, {
    height: "auto",
    duration: 0.3,
    ease: "smooth",
  });
  searchBarInput.focus(); // Automatically focus on the search bar
}

// Function to close the search input wrapper
function closeSearchInput() {
  gsap.to(searchInputWrapper, {
    height: 0,
    duration: 0.3,
    ease: "smooth",
  });
}

// Add class is--toopen on page load
document.addEventListener("DOMContentLoaded", function () {
  searchTrigger.classList.add("is--toopen");
});

// Toggle search input wrapper and class on click
searchTrigger.addEventListener("click", function (event) {
  event.stopPropagation(); // Prevent the click event from bubbling up
  if (searchTrigger.classList.contains("is--toopen")) {
    $(".navbar--bar-trigger.is--toopen").click();
    openSearchInput();
    searchTrigger.classList.remove("is--toopen");
    searchTrigger.classList.add("is--tooclose");
  } else if (searchTrigger.classList.contains("is--tooclose")) {
    closeSearchInput();
    searchTrigger.classList.remove("is--tooclose");
    searchTrigger.classList.add("is--toopen");
  }
});

// Show the reset button when the user starts typing
searchBarInput.addEventListener("input", function () {
  if (searchBarInput.value.length > 0) {
    gsap.to(resetButton, { opacity: 1, duration: 0.3, ease: "smooth" });
  } else {
    gsap.to(resetButton, { opacity: 0, duration: 0.3, ease: "smooth" });
  }
});

// ------------- settings options ------------------- //

// Function to handle toggling active class
function toggleActiveClass(groupSelector, clickedButton) {
  // Remove is--active from all buttons in the same group
  document
    .querySelectorAll(groupSelector + " .navbar--setting-trigger")
    .forEach((btn) => {
      btn.classList.remove("is--active");
    });

  // Add is--active to the clicked button
  clickedButton.classList.add("is--active");
}

// Function to update font styles
function updateFont(fontType) {
  const chapterTitle = document.querySelector(".heading--29.is--chapter-title");
  const bodyTextElements = document.querySelectorAll(".book--richtext");
  const heading46Elements = document.querySelectorAll(".heading--46");
  const authorElements = document.querySelectorAll(".heading--author");

  if (fontType === "Sans") {
    // Update chapter title font
    chapterTitle.style.setProperty(
      "font-family",
      "Poppins, sans-serif",
      "important"
    );

    // Update body text elements font
    bodyTextElements.forEach((bodyText) => {
      bodyText
        .querySelectorAll("p, li, h2, h3, h4, h5, h6")
        .forEach((element) => {
          element.style.setProperty(
            "font-family",
            "Heebo, sans-serif",
            "important"
          );
        });
    });

    // Update .heading--46 font
    heading46Elements.forEach((heading) => {
      heading.style.setProperty(
        "font-family",
        "Heebo, sans-serif",
        "important"
      );
    });

    // Update .heading--author font
    authorElements.forEach((author) => {
      author.style.setProperty("font-family", "Heebo, sans-serif", "important");
    });
  } else if (fontType === "Serif") {
    // Update chapter title font
    chapterTitle.style.setProperty("font-family", "PT Serif", "important");

    // Update body text elements font
    bodyTextElements.forEach((bodyText) => {
      bodyText
        .querySelectorAll("p, li, h2, h3, h4, h5, h6")
        .forEach((element) => {
          element.style.setProperty("font-family", "PT Serif", "important");
        });
    });

    // Update .heading--46 font
    heading46Elements.forEach((heading) => {
      heading.style.setProperty("font-family", "PT Serif", "important");
    });

    // Update .heading--author font
    authorElements.forEach((author) => {
      author.style.setProperty("font-family", "PT Serif", "important");
    });
  } else {
    // Reset to default font for all elements
    chapterTitle.style.removeProperty("font-family");
    bodyTextElements.forEach((bodyText) => {
      bodyText
        .querySelectorAll("p, li, h2, h3, h4, h5, h6")
        .forEach((element) => {
          element.style.removeProperty("font-family");
        });
    });
    heading46Elements.forEach((heading) => {
      heading.style.removeProperty("font-family");
    });
    authorElements.forEach((author) => {
      author.style.removeProperty("font-family");
    });
  }

  // Find the clicked button and toggle the active class
  const clickedButton = Array.from(
    document.querySelectorAll(".font-style .navbar--setting-trigger")
  ).find((btn) => btn.innerText === fontType);

  toggleActiveClass(".font-style", clickedButton);
  localStorage.setItem("selectedFont", fontType);
}

// Function to update font sizes
function updateFontSize(size) {
  const chapterTitle = document.querySelector(".heading--29.is--chapter-title");
  const bodyTextElements = document.querySelectorAll(".book--richtext");

  if (size === "Big") {
    chapterTitle.style.fontSize = `${
      parseFloat(getComputedStyle(chapterTitle).fontSize) * 1.2
    }px`;

    bodyTextElements.forEach((bodyText) => {
      bodyText.querySelectorAll("p, li").forEach((element) => {
        element.style.fontSize = `${
          parseFloat(getComputedStyle(element).fontSize) * 1.2
        }px`;
      });
    });
  } else {
    chapterTitle.style.fontSize = "";

    bodyTextElements.forEach((bodyText) => {
      bodyText.querySelectorAll("p, li").forEach((element) => {
        element.style.fontSize = "";
      });
    });
  }

  const clickedButton = Array.from(
    document.querySelectorAll(".font-size .navbar--setting-trigger")
  ).find((btn) => btn.innerText === size);

  toggleActiveClass(".font-size", clickedButton);
  localStorage.setItem("selectedFontSize", size);
}

// Function to update theme modes
function updateTheme(mode) {
  const root = document.documentElement;
  const themeSettings = {
    Light: {
      "--book--background": "#fffcf4",
      "--book--text": "#252733",
      "--book--btn-background": "#fef7e7",
      "--book--btn-background-active": "#fff1cc",
      "--book--current-link": "#808eff",
      "--book--nextchapter-background": "#ffde9f",
      "--book--nextchapter-background-second": "#fef7e7",
      "--book--nextchapter-btn-bg": "#252733",
      "--book--nextchapter-btn-color": "#fffcf4",
      "--book--search-border": "#beb9ad",
      "--book--link": "#001cff",
    },
    Medium: {
      "--book--background": "#F0F3FF",
      "--book--text": "#252733",
      "--book--btn-background": "#E6EAFF",
      "--book--btn-background-active": "#D6DDFF",
      "--book--current-link": "#808eff",
      "--book--nextchapter-background": "#BAC2FF",
      "--book--nextchapter-background-second": "#F0F3FF",
      "--book--nextchapter-btn-bg": "#252733",
      "--book--nextchapter-btn-color": "#fffcf4",
      "--book--search-border": "#beb9ad",
      "--book--link": "#001cff",
    },
    Dark: {
      "--book--background": "#252733",
      "--book--text": "#EEEEEE",
      "--book--btn-background": "#383A4D",
      "--book--btn-background-active": "#4C5066",
      "--book--current-link": "#FFDE9F",
      "--book--nextchapter-background": "#363848",
      "--book--nextchapter-background-second": "#696B7E",
      "--book--nextchapter-btn-bg": "#BAC2FF",
      "--book--nextchapter-btn-color": "#252733",
      "--book--search-border": "#646672",
      "--book--link": "#BAC2FF",
    },
  };

  gsap.to(root, {
    "--book--background": themeSettings[mode]["--book--background"],
    "--book--text": themeSettings[mode]["--book--text"],
    "--book--btn-background": themeSettings[mode]["--book--btn-background"],
    "--book--btn-background-active":
      themeSettings[mode]["--book--btn-background-active"],
    "--book--current-link": themeSettings[mode]["--book--current-link"],
    "--book--nextchapter-background":
      themeSettings[mode]["--book--nextchapter-background"],
    "--book--nextchapter-background-second":
      themeSettings[mode]["--book--nextchapter-background-second"],
    "--book--nextchapter-btn-bg":
      themeSettings[mode]["--book--nextchapter-btn-bg"],
    "--book--nextchapter-btn-color":
      themeSettings[mode]["--book--nextchapter-btn-color"],
    "--book--search-border": themeSettings[mode]["--book--search-border"],
    "--book--link": themeSettings[mode]["--book--link"],
    duration: 0.3,
  });

  const clickedButton = Array.from(
    document.querySelectorAll(".theme-mode .navbar--setting-trigger")
  ).find((btn) => btn.innerText === mode);

  toggleActiveClass(".theme-mode", clickedButton);
  localStorage.setItem("selectedMode", mode);
}

// Load preferences on page load
function loadPreferences() {
  const selectedFont = localStorage.getItem("selectedFont") || "Sans";
  const selectedFontSize = localStorage.getItem("selectedFontSize") || "Normal";
  const selectedMode = localStorage.getItem("selectedMode") || "Light";

  updateFont(selectedFont);
  updateFontSize(selectedFontSize);
  updateTheme(selectedMode);

  // Manually add is--active class to the correct elements on page load
  document
    .querySelectorAll(".font-style .navbar--setting-trigger")
    .forEach((btn) => {
      if (btn.innerText === selectedFont) btn.classList.add("is--active");
    });

  document
    .querySelectorAll(".font-size .navbar--setting-trigger")
    .forEach((btn) => {
      if (btn.innerText === selectedFontSize) btn.classList.add("is--active");
    });

  document
    .querySelectorAll(".theme-mode .navbar--setting-trigger")
    .forEach((btn) => {
      if (btn.innerText === selectedMode) btn.classList.add("is--active");
    });
}

// Event listeners for buttons
document.querySelectorAll(".navbar--setting-trigger").forEach((button) => {
  button.addEventListener("click", function () {
    const group = this.closest(".navbar--settings-wrapper");
    toggleActiveClass(`.${group.classList[1]}`, this);

    const text = this.innerText;

    if (group.classList.contains("font-style")) {
      updateFont(text);
    } else if (group.classList.contains("font-size")) {
      updateFontSize(text);
    } else if (group.classList.contains("theme-mode")) {
      updateTheme(text);
    }
  });
});

// Call the function on page load
loadPreferences();

// ---------------- copy the link of the page -------------- //

document.querySelectorAll(".copy--link-page").forEach(function (copyButton) {
  copyButton.addEventListener("click", function () {
    const pageUrl = window.location.href; // Get the current page URL
    navigator.clipboard
      .writeText(pageUrl)
      .then(function () {
        console.log("Link copied to clipboard!");

        // Get the specific .svg--copy and .svg--copy-top within the same context
        const svgCopy = copyButton.querySelector(".svg--copy");
        const svgCopyTop = copyButton.querySelector(".svg--copy-top");

        // Add .is--disabled class to the specific .svg--copy
        svgCopy.classList.add("is--disabled");

        // Set opacity of the specific .svg--copy-top to 1
        svgCopyTop.style.opacity = "1";

        // After 3 seconds, reset the opacity and remove the .is--disabled class
        setTimeout(function () {
          svgCopyTop.style.opacity = "0";
          svgCopy.classList.remove("is--disabled");
        }, 3000); // 3000 milliseconds = 3 seconds
      })
      .catch(function (error) {
        console.error("Failed to copy the link: ", error);
      });
  });
});