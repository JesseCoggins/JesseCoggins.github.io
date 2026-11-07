(async () => {
  document.getElementById("current-year").textContent = String(new Date().getFullYear());
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const validUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) return false;
    try { return ["http:", "https:"].includes(new URL(value, document.baseURI).protocol); }
    catch { return false; }
  };
  try {
    const response = await fetch("projects.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Project data request failed");
    const projects = await response.json();
    if (!Array.isArray(projects) || !projects.length) throw new Error("Project list is empty");
    const ids = new Set(), summaries = new Set();
    projects.forEach((project) => {
      if (!project || !/^PRJ-\d{3,}$/.test(project.id) || ids.has(project.id)) throw new Error("Invalid or duplicate project ID");
      ids.add(project.id);
      for (const field of ["title", "category", "finding", "findingNote", "businessImpact"])
        if (typeof project[field] !== "string" || !project[field].trim()) throw new Error("Missing project field: " + field);
      if (!validUrl(project.summary) || summaries.has(project.summary)) throw new Error("Invalid or duplicate project summary");
      summaries.add(project.summary);
      for (const field of ["tools", "tags"])
        if (!Array.isArray(project[field]) || !project[field].length || project[field].some((text) => typeof text !== "string" || !text.trim())) throw new Error("Invalid " + field);
      if (!Array.isArray(project.links) || project.links.some((link) => !link || typeof link.label !== "string" || !link.label.trim() || !validUrl(link.href))) throw new Error("Invalid project links");
    });
    const fragment = document.createDocumentFragment();
    projects.forEach((project, index) => {
      const row = make("tr", "project-record");
      row.setAttribute("role", "row");
      Object.assign(row.dataset, { projectId: project.id, title: project.title, category: project.category, tags: [...new Set([...project.tags, ...project.tools])].join("|"), index: String(index) });
      const id = make("th", "record-id", project.id);
      id.scope = "row"; id.setAttribute("role", "rowheader"); row.append(id);
      const cell = (className, label) => { const element = make("td", className); element.dataset.label = label; element.setAttribute("role", "cell"); row.append(element); return element; };
      const main = cell("record-project", "Project");
      const heading = make("h3", "project-title");
      const title = make("a", "project-summary-link", project.title); title.href = project.summary; heading.append(title); main.append(heading);
      main.append(make("p", "record-area", project.category), make("p", "record-tools", project.tools.join(" · ")));
      if (project.tags.includes("M.S. coursework")) main.append(make("span", "record-course", "M.S. coursework"));
      const finding = cell("record-finding", "Key findings"); finding.append(make("strong", "", project.finding), make("p", "", project.findingNote));
      cell("record-impact", "Business impact").textContent = project.businessImpact;
      const links = cell("record-links", "Links");
      const resourceLinks = project.links.some((link) => link.href === project.summary) ? project.links : [{label:"Summary", href:project.summary}, ...project.links];
      resourceLinks.forEach((link) => {
        const anchor = make("a", "", link.label); anchor.href = link.href; anchor.setAttribute("aria-label", link.label + ": " + project.title);
        if (new URL(link.href, document.baseURI).origin !== location.origin) { anchor.target = "_blank"; anchor.rel = "noreferrer"; }
        links.append(anchor);
      });
      fragment.append(row);
    });
    document.getElementById("project-grid").replaceChildren(fragment);
    document.getElementById("project-status").hidden = true;
  } catch (error) {
    console.error("Unable to load portfolio projects", error);
    const status = document.getElementById("project-status");
    status.textContent = "Projects are temporarily unavailable. ";
    const link = make("a", "", "View my projects on GitHub"); link.href = "https://github.com/jessecoggins"; status.append(link);
    document.querySelector(".project-tools").hidden = true;
    document.querySelector(".collection-count").textContent = "";
    return;
  }

  const cards = Array.from(document.querySelectorAll(".project-record"));
  const projectGrid = document.getElementById("project-grid");
  const categoryRoot = document.getElementById("category-filters");
  const tagRoot = document.getElementById("tag-filters");
  const search = document.getElementById("project-search");
  const tagSearch = document.getElementById("tag-search");
  const sort = document.getElementById("project-sort");
  const count = document.getElementById("result-count");
  const activeWrap = document.getElementById("active-filters");
  const activeChips = document.getElementById("active-filter-chips");
  const noResults = document.getElementById("no-results");
  const matchControls = document.getElementById("match-controls");
  const matchButtons = Array.from(document.querySelectorAll("[data-match]"));
  const categories = [...new Set(cards.map((card) => card.dataset.category))];
  const tags = [...new Set(cards.flatMap((card) => card.dataset.tags.split("|")))]
    .sort((a, b) => a.localeCompare(b));
  const state = {
    category: "All projects",
    tags: new Set(),
    match: "all",
    query: "",
    tagQuery: "",
    sort: "featured",
    showAllTags: false,
  };
  const normalize = (value) => value.toLocaleLowerCase().trim();

  const matchesQuery = (card) =>
    !state.query || normalize(card.textContent + " " + card.dataset.tags).includes(normalize(state.query));
  const matchesCategory = (card) =>
    state.category === "All projects" || card.dataset.category === state.category;
  const matchesTags = (card) => {
    if (!state.tags.size) return true;
    const cardTags = card.dataset.tags.split("|");
    const selected = [...state.tags];
    return state.match === "all"
      ? selected.every((tag) => cardTags.includes(tag))
      : selected.some((tag) => cardTags.includes(tag));
  };
  const resultSet = () =>
    cards.filter((card) => matchesQuery(card) && matchesCategory(card) && matchesTags(card));

  function renderCategories() {
    const filteredByOtherControls = cards.filter((card) => matchesQuery(card) && matchesTags(card));
    const categoryCounts = new Map([
      ["All projects", filteredByOtherControls.length],
      ...categories.map((category) => [
        category,
        filteredByOtherControls.filter((card) => card.dataset.category === category).length,
      ]),
    ]);
    categoryRoot.replaceChildren();

    ["All projects", ...categories].forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-pill";
      button.setAttribute("aria-pressed", String(state.category === category));

      const label = document.createElement("span");
      label.textContent = category;
      const number = document.createElement("span");
      number.className = "count";
      number.textContent = String(categoryCounts.get(category));

      button.append(label, number);
      button.addEventListener("click", () => {
        state.category = category;
        render();
      });
      categoryRoot.append(button);
    });
  }

  function renderTags() {
    const base = cards.filter((card) => matchesQuery(card) && matchesCategory(card));
    const tagCounts = new Map(
      tags.map((tag) => [
        tag,
        base.filter((card) => card.dataset.tags.split("|").includes(tag)).length,
      ]),
    );
    const matchedTags = tags.filter(
      (tag) => !state.tagQuery || normalize(tag).includes(normalize(state.tagQuery)),
    );
    tagRoot.replaceChildren();

    matchedTags.forEach((tag, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tag-filter";
      button.dataset.tag = tag;
      button.textContent = tag + " · " + tagCounts.get(tag);
      button.setAttribute("aria-pressed", String(state.tags.has(tag)));
      button.hidden =
        !state.showAllTags &&
        state.tagQuery === "" &&
        index >= 12 &&
        !state.tags.has(tag);
      button.addEventListener("click", () => {
        if (state.tags.has(tag)) state.tags.delete(tag);
        else state.tags.add(tag);
        render();
      });
      tagRoot.append(button);
    });

    const more = document.getElementById("show-more-tags");
    const shouldOfferMore = matchedTags.length > 12 && state.tagQuery === "";
    more.hidden = !shouldOfferMore;
    more.setAttribute("aria-expanded", String(state.showAllTags));
    more.textContent = state.showAllTags
      ? "Show fewer tags"
      : "Show all " + matchedTags.length + " tags";
    matchControls.hidden = state.tags.size < 2;
  }

  function renderActiveFilters() {
    activeChips.replaceChildren();
    const filters = [];

    if (state.category !== "All projects") {
      filters.push(["area", state.category, () => (state.category = "All projects")]);
    }
    state.tags.forEach((tag) => filters.push(["tag", tag, () => state.tags.delete(tag)]));
    if (state.query) {
      filters.push([
        "search",
        state.query,
        () => {
          state.query = "";
          search.value = "";
        },
      ]);
    }

    activeWrap.hidden = filters.length === 0;
    filters.forEach(([kind, value, remove]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "active-filter-chip";
      button.setAttribute("aria-label", "Remove " + kind + " filter " + value);

      const label = document.createElement("span");
      label.textContent = kind;
      const text = document.createTextNode(" " + value + " ");
      const close = document.createElement("span");
      close.setAttribute("aria-hidden", "true");
      close.textContent = "×";

      button.append(label, text, close);
      button.addEventListener("click", () => {
        remove();
        render();
      });
      activeChips.append(button);
    });
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.category !== "All projects") params.set("area", state.category);
    if (state.tags.size) params.set("tag", [...state.tags].join(","));
    if (state.match !== "all") params.set("match", state.match);
    if (state.sort !== "featured") params.set("sort", state.sort);
    const query = params.toString();
    history.replaceState(null, "", query ? "?" + query + "#projects" : location.pathname);
  }

  function render() {
    const focusedTag = document.activeElement?.closest("#tag-filters") ? document.activeElement.dataset.tag : null;
    const focusedArea = document.activeElement?.closest("#category-filters") ? document.activeElement.querySelector("span")?.textContent : null;
    const visible = resultSet();
    const sorted = [...cards];

    if (state.sort === "title-asc") {
      sorted.sort((a, b) => a.dataset.title.localeCompare(b.dataset.title));
    } else if (state.sort === "category") {
      sorted.sort(
        (a, b) =>
          a.dataset.category.localeCompare(b.dataset.category) ||
          Number(a.dataset.index) - Number(b.dataset.index),
      );
    } else {
      sorted.sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
    }

    sorted.forEach((card) => projectGrid.append(card));
    cards.forEach((card) => {
      card.hidden = !visible.includes(card);
    });

    count.textContent = visible.length + " of " + cards.length + " projects";
    noResults.hidden = visible.length > 0;
    renderCategories();
    renderTags();
    renderActiveFilters();
    syncUrl();
    if (focusedTag) tagRoot.querySelector('[data-tag="' + CSS.escape(focusedTag) + '"]')?.focus();
    if (focusedArea) [...categoryRoot.children].find((button) => button.querySelector("span")?.textContent === focusedArea)?.focus();
  }

  function clearFilters() {
    state.category = "All projects";
    state.tags.clear();
    state.match = "all";
    state.query = "";
    state.tagQuery = "";
    state.sort = "featured";
    state.showAllTags = false;
    search.value = "";
    tagSearch.value = "";
    sort.value = "featured";
    matchButtons.forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.match === "all")),
    );
    render();
  }

  search.addEventListener("input", () => {
    state.query = search.value;
    render();
  });
  tagSearch.addEventListener("input", () => {
    state.tagQuery = tagSearch.value;
    state.showAllTags = Boolean(state.tagQuery);
    renderTags();
  });
  sort.addEventListener("change", () => {
    state.sort = sort.value;
    render();
  });
  matchButtons.forEach((button) =>
    button.addEventListener("click", () => {
      state.match = button.dataset.match;
      matchButtons.forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
      render();
    }),
  );
  document.getElementById("show-more-tags").addEventListener("click", () => {
    state.showAllTags = !state.showAllTags;
    renderTags();
  });
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.getElementById("empty-clear").addEventListener("click", clearFilters);

  document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement?.tagName || "";
    if (
      event.key === "/" &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(activeTag) &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      event.preventDefault();
      search.focus();
    }
  });

  const params = new URLSearchParams(location.search);
  state.query = params.get("q") || "";
  search.value = state.query;
  state.category = params.get("area") || "All projects";
  if (!["All projects", ...categories].includes(state.category)) {
    state.category = "All projects";
  }
  (params.get("tag") || "")
    .split(",")
    .filter(Boolean)
    .forEach((selectedTag) => {
      const match = tags.find((tag) => normalize(tag) === normalize(selectedTag));
      if (match) state.tags.add(match);
    });
  state.match = params.get("match") === "any" ? "any" : "all";
  state.sort = ["title-asc", "category"].includes(params.get("sort"))
    ? params.get("sort")
    : "featured";
  sort.value = state.sort;
  matchButtons.forEach((button) =>
    button.setAttribute("aria-pressed", String(button.dataset.match === state.match)),
  );
  document.getElementById("current-year").textContent = String(new Date().getFullYear());
  document.querySelector(".table-filters").open = state.tags.size > 0;
  document.querySelector(".collection-count").textContent = cards.length + " projects";
  render();
})();

