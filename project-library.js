(() => {
 const cards=[...document.querySelectorAll(".library-card")];
 const categoryRoot=document.getElementById("category-filters");
 const tagRoot=document.getElementById("tag-filters");
 const search=document.getElementById("project-search");
 const tagSearch=document.getElementById("tag-search");
 const sort=document.getElementById("project-sort");
 const count=document.getElementById("result-count");
 const activeWrap=document.getElementById("active-filters");
 const activeChips=document.getElementById("active-filter-chips");
 const noResults=document.getElementById("no-results");
 const matchButtons=[...document.querySelectorAll("[data-match]")];
 const categories=[...new Set(cards.map(card=>card.dataset.category))];
 const tags=[...new Set(cards.flatMap(card=>card.dataset.tags.split("|")))].sort((a,b)=>a.localeCompare(b));
 const state={category:"All projects",tags:new Set(),match:"all",query:"",tagQuery:"",sort:"featured",showAllTags:false};
 const norm=value=>value.toLocaleLowerCase().trim();
 const matchesQuery=card=>!state.query||norm(card.innerText).includes(norm(state.query));
 const matchesCategory=card=>state.category==="All projects"||card.dataset.category===state.category;
 const matchesTags=card=>{const cardTags=card.dataset.tags.split("|");if(!state.tags.size)return true;return state.match==="all"?[...state.tags].every(tag=>cardTags.includes(tag)):[...state.tags].some(tag=>cardTags.includes(tag));};
 const resultSet=()=>cards.filter(card=>matchesQuery(card)&&matchesCategory(card)&&matchesTags(card));
 function renderCategories(){
  const categoryCounts=new Map([["All projects",cards.filter(matchesQuery).length],...categories.map(category=>[category,cards.filter(card=>card.dataset.category===category&&matchesQuery(card)).length])]);
  categoryRoot.innerHTML="";
  ["All projects",...categories].forEach(category=>{const button=document.createElement("button");button.type="button";button.className="filter-pill";button.setAttribute("aria-pressed",String(state.category===category));button.innerHTML="<span>"+category+"</span><span class='count'>"+categoryCounts.get(category)+"</span>";button.addEventListener("click",()=>{state.category=category;render()});categoryRoot.append(button)});
 }
 function renderTags(){
  const base=cards.filter(card=>matchesQuery(card)&&matchesCategory(card));
  const tagCounts=new Map(tags.map(tag=>[tag,base.filter(card=>card.dataset.tags.split("|").includes(tag)).length]));
  const matched=tags.filter(tag=>!state.tagQuery||norm(tag).includes(norm(state.tagQuery)));
  tagRoot.innerHTML="";
  matched.forEach((tag,index)=>{const button=document.createElement("button");button.type="button";button.className="tag-filter";button.textContent=tag+" · "+tagCounts.get(tag);button.dataset.tag=tag;button.setAttribute("aria-pressed",String(state.tags.has(tag)));button.hidden=!state.showAllTags&&state.tagQuery===""&&index>=14;button.addEventListener("click",()=>{state.tags.has(tag)?state.tags.delete(tag):state.tags.add(tag);render()});tagRoot.append(button)});
  const more=document.getElementById("show-more-tags");
  const shouldOfferMore=matched.length>14&&state.tagQuery==="";
  more.classList.toggle("is-visible",shouldOfferMore);
  more.hidden=!shouldOfferMore;
  more.setAttribute("aria-expanded",String(state.showAllTags));
  more.textContent=state.showAllTags?"Show fewer tags":"Show all "+matched.length+" tags";
 }
 function renderActive(){
  activeChips.innerHTML="";
  const filters=[];
  if(state.category!=="All projects")filters.push(["area",state.category,()=>{state.category="All projects"}]);
  state.tags.forEach(tag=>filters.push(["tag",tag,()=>state.tags.delete(tag)]));
  if(state.query)filters.push(["search",state.query,()=>{state.query="";search.value=""}]);
  if(!filters.length){activeWrap.hidden=true;return}
  activeWrap.hidden=false;
  filters.forEach(([kind,value,remove])=>{const button=document.createElement("button");button.type="button";button.className="active-filter-chip";const kindLabel=document.createElement("span");kindLabel.textContent=kind;button.append(kindLabel,document.createTextNode(" "+value+" "));const removeMark=document.createElement("span");removeMark.setAttribute("aria-hidden","true");removeMark.textContent="×";button.append(removeMark);button.setAttribute("aria-label","Remove "+kind+" filter "+value);button.addEventListener("click",()=>{remove();render()});activeChips.append(button)});
 }
 function render(){
  const visible=resultSet();
  const sorted=[...cards];
  if(state.sort==="title-asc")sorted.sort((a,b)=>a.dataset.title.localeCompare(b.dataset.title));
  else if(state.sort==="category")sorted.sort((a,b)=>a.dataset.category.localeCompare(b.dataset.category)||a.dataset.title.localeCompare(b.dataset.title));
  else sorted.sort((a,b)=>Number(b.classList.contains("is-featured"))-Number(a.classList.contains("is-featured"))||Number(a.dataset.index)-Number(b.dataset.index));
  sorted.forEach(card=>document.getElementById("project-grid").append(card));
  cards.forEach(card=>card.hidden=!visible.includes(card));
  count.textContent=visible.length+" of "+cards.length+" projects";
  noResults.hidden=visible.length>0;
  renderCategories();renderTags();renderActive();syncUrl();
 }
 function clearFilters(){state.category="All projects";state.tags.clear();state.query="";state.tagQuery="";state.sort="featured";state.match="all";state.showAllTags=false;search.value="";tagSearch.value="";sort.value="featured";matchButtons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.match==="all")));render()}
 function syncUrl(){const params=new URLSearchParams();if(state.query)params.set("q",state.query);if(state.category!=="All projects")params.set("area",state.category);if(state.tags.size)params.set("tag",[...state.tags].join(","));if(state.match!=="all")params.set("match",state.match);const query=params.toString();history.replaceState(null,"",query?"?"+query:location.pathname)}
 search.addEventListener("input",()=>{state.query=search.value;render()});
 tagSearch.addEventListener("input",()=>{state.tagQuery=tagSearch.value;state.showAllTags=Boolean(state.tagQuery);renderTags()});
 sort.addEventListener("change",()=>{state.sort=sort.value;render()});
 matchButtons.forEach(button=>button.addEventListener("click",()=>{state.match=button.dataset.match;matchButtons.forEach(item=>item.setAttribute("aria-pressed",String(item===button)));render()}));
 document.getElementById("show-more-tags").addEventListener("click",event=>{state.showAllTags=!state.showAllTags;event.currentTarget.setAttribute("aria-expanded",String(state.showAllTags));renderTags()});
 document.getElementById("clear-filters").addEventListener("click",clearFilters);
 document.getElementById("empty-clear").addEventListener("click",clearFilters);
 cards.forEach(card=>card.querySelectorAll(".tag-chip").forEach(button=>button.addEventListener("click",()=>{const tag=button.dataset.tag;state.tags.has(tag)?state.tags.delete(tag):state.tags.add(tag);render();document.querySelector("#tag-filters [data-tag='"+CSS.escape(tag)+"']")?.focus()})));
 document.addEventListener("keydown",event=>{if(event.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!event.metaKey&&!event.ctrlKey){event.preventDefault();search.focus()}});
 const params=new URLSearchParams(location.search);
 state.query=params.get("q")||"";search.value=state.query;
 state.category=params.get("area")||"All projects";if(!["All projects",...categories].includes(state.category))state.category="All projects";
 (params.get("tag")||"").split(",").filter(Boolean).forEach(tag=>{const known=tags.find(item=>norm(item)===norm(tag));if(known)state.tags.add(known)});
 state.match=params.get("match")==="any"?"any":"all";matchButtons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.match===state.match)));
 sort.value=state.sort;
 document.getElementById("current-year").textContent=String(new Date().getFullYear());
 render();
})();