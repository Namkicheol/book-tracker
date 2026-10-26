/* Completed books grow the tree; each distinct book unlocks one watering turn. */
(function () {
  'use strict';
  const KEY = 'bookTracker.garden.v1'; // Preserve the existing seed preference.
  const GAME_KEY = 'bookTracker.garden.watered.v1';
  const seeds = [
    { id:'forest', name:'초록 나무', detail:'푸른 잎이 가득한 나무' },
    { id:'flower', name:'꽃나무', detail:'꽃을 좋아하는 아이에게' },
    { id:'fruit', name:'사과나무', detail:'열매를 기다리는 즐거움' }
  ];
  const milestones = [0,1,3,5,10,20];
  const labels = ['씨앗','새싹','어린 나무','튼튼한 나무','꽃이 핀 나무','친구들이 사는 나무'];
  const TREES_KEY = 'bookTracker.garden.trees.v1';
  const COLLECTION_KEY = 'bookTracker.garden.collection.v1';
  const illustrations = {
    clover:'<path d="M32 56Q38 42 32 29" fill="none" stroke="#417950" stroke-width="4"/><path d="M32 31C7 36 9 11 22 17C22 2 45 8 36 24C56 10 65 36 44 38C55 58 27 64 29 44C10 54 4 32 24 29Z" fill="#72b779" stroke="#417950" stroke-width="2"/>',
    flowers:'<path d="M23 57V27M43 57V35" stroke="#548758" stroke-width="3"/><path d="M23 47Q5 35 11 50ZM43 51Q58 39 56 52Z" fill="#80b57b"/><g fill="#e99bb0" stroke="#b85f7e" stroke-width="1.5"><circle cx="23" cy="16" r="8"/><circle cx="13" cy="25" r="8"/><circle cx="33" cy="25" r="8"/><circle cx="23" cy="32" r="8"/></g><circle cx="23" cy="24" r="6" fill="#ffe3a1"/><g fill="#c0a0da"><circle cx="43" cy="29" r="6"/><circle cx="36" cy="36" r="6"/><circle cx="50" cy="36" r="6"/><circle cx="43" cy="42" r="6"/></g><circle cx="43" cy="36" r="4" fill="#ffe3a1"/>',
    mushroom:'<path d="M25 31L22 55Q32 62 42 55L39 31" fill="#fff0d4" stroke="#a07861" stroke-width="2"/><path d="M7 34C8 4 55 4 57 34Q34 42 7 34Z" fill="#db8178" stroke="#9f5958" stroke-width="2"/><g fill="#fff0d4"><circle cx="22" cy="22" r="5"/><circle cx="40" cy="19" r="4"/><circle cx="45" cy="31" r="3"/></g>',
    bird:'<path d="M12 45L5 28L24 35" fill="#75a7bd" stroke="#4e758c" stroke-width="2"/><path d="M14 38C14 22 31 13 41 23C54 19 60 40 45 49C31 58 18 52 14 38Z" fill="#8ebdcc" stroke="#4e758c" stroke-width="2"/><path d="M24 34Q47 28 35 47Q23 49 24 34" fill="#c5e2de"/><path d="M52 29L62 34L52 37" fill="#e5b56e"/><circle cx="46" cy="29" r="2" fill="#374656"/><path d="M28 52V59M39 51V59" stroke="#9f795c" stroke-width="2"/>',
    rabbit:'<path d="M23 31C5 3 23 0 28 25C29-2 47 1 37 31" fill="#fff0df" stroke="#b48c86" stroke-width="2"/><path d="M21 12L25 26M36 12L33 26" stroke="#e9b0b1" stroke-width="3"/><ellipse cx="32" cy="47" rx="21" ry="14" fill="#fff0df" stroke="#b48c86" stroke-width="2"/><circle cx="32" cy="34" r="15" fill="#fff0df" stroke="#b48c86" stroke-width="2"/><circle cx="26" cy="33" r="2" fill="#624b51"/><circle cx="38" cy="33" r="2" fill="#624b51"/><path d="M29 39L32 42L35 39" fill="#d5909c"/><ellipse cx="19" cy="57" rx="8" ry="4" fill="#fff0df"/><ellipse cx="43" cy="57" rx="8" ry="4" fill="#fff0df"/>',
    lantern:'<path d="M23 17V12Q32 1 41 12V17" fill="none" stroke="#98765a" stroke-width="3"/><path d="M18 19L13 51L23 58H41L51 51L46 19Z" fill="#f8dda2" stroke="#98765a" stroke-width="2"/><path d="M23 22L20 50H44L41 22Z" fill="#fff3c6"/><path d="M32 50C18 42 34 35 32 28C46 42 40 47 32 50Z" fill="#efb96d"/><path d="M16 18H48M13 52H51M24 59H40" stroke="#98765a" stroke-width="4"/>'
  };
  function itemArt(id) {
    return illustrations[id] ? `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">${illustrations[id]}</svg>` : '';
  }
  const items = [
    {id:'clover',name:'행운 클로버',at:1}, {id:'flowers',name:'작은 꽃밭',at:3},
    {id:'mushroom',name:'숲속 버섯',at:5}, {id:'bird',name:'파랑새',at:10},
    {id:'rabbit',name:'토끼 친구',at:20}, {id:'lantern',name:'반짝 등불',at:30}
  ];
  function collectionSelection() {
    try {
      const value = JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]');
      return Array.isArray(value) ? [...new Set(value.filter(id => items.some(item => item.id === id)))].slice(0,2) : [];
    } catch (_) { return []; }
  }
  function getCollection(books = Storage.getAllBooks()) {
    const count = completedKeys(books).length;
    const selected = collectionSelection();
    const catalogue = items.map(item => ({...item,svg:itemArt(item.id),earned:count >= item.at,equipped:count >= item.at && selected.includes(item.id)}));
    return {count,items:catalogue,earnedCount:catalogue.filter(item => item.earned).length,
      equipped:catalogue.filter(item => item.equipped),next:catalogue.find(item => !item.earned) || null};
  }
  function toggleItem(id, books = Storage.getAllBooks()) {
    if (Storage.isOwnerCurrent && !Storage.isOwnerCurrent()) return {ok:false,error:'owner'};
    const collection = getCollection(books);
    const item = collection.items.find(item => item.id === id);
    if (!item) return {ok:false,error:'unknown'};
    if (!item.earned) return {ok:false,error:'locked'};
    if (!item.equipped && collection.equipped.length >= 2) return {ok:false,error:'full'};
    const selected = collection.equipped.filter(entry => entry.id !== id).map(entry => entry.id);
    if (!item.equipped) selected.push(id);
    try { localStorage.setItem(COLLECTION_KEY,JSON.stringify(selected)); }
    catch (_) { return {ok:false,error:'storage'}; }
    return {ok:true};
  }
  let expanded = true;
  let collectionExpanded = false;
  function identity(book) {
    const isbns = String(book.isbn || '').trim().split(/\s+/).filter(Boolean);
    const isbn = isbns.find(value => /^\d{13}$/.test(value)) || isbns[0];
    return isbn ? 'isbn:' + isbn.replace(/[^\dXx]/g,'').toUpperCase() : book.id != null ? 'id:' + book.id : null;
  }
  function completedKeys(books) {
    return [...new Set(books.filter(book => !book.status).map(identity).filter(Boolean))];
  }
  function progress(books) {
    const count = completedKeys(books).length;
    const stage = milestones.reduce((result,n,i) => count >= n ? i : result,0);
    return { count, stage, next:milestones[stage+1] || null };
  }
  function seedChoices() {
    try {
      const choices = JSON.parse(localStorage.getItem(TREES_KEY) || 'null');
      if (Array.isArray(choices)) return choices.filter(id => seeds.some(seed => seed.id === id));
    } catch (_) {}
    const legacy = localStorage.getItem(KEY);
    return seeds.some(seed => seed.id === legacy) ? [legacy] : [];
  }
  // A read-only view: growth always reflects the current distinct completed books.
  // Choices survive removal of books, so restoring a book cannot create extra trees.
  function getGarden(books = Storage.getAllBooks()) {
    const count = completedKeys(books).length;
    const choices = seedChoices();
    const matureCount = Math.floor(count / 20);
    const fallback = choices[0] || 'forest';
    const matureTrees = Array.from({length:matureCount},(_,index) => ({
      index, seed:choices[index] || fallback, stage:5, count:20
    }));
    const currentSeed = choices[matureCount] || null;
    const treeCount = count % 20;
    const stage = milestones.reduce((result,n,i) => treeCount >= n ? i : result,0);
    const currentTree = currentSeed ? {index:matureCount,seed:currentSeed,stage,count:treeCount} : null;
    return {count,matureTrees,currentTree,currentSeed,stage,next:milestones[stage+1],
      currentCount:treeCount,awaitingSeed:!currentSeed};
  }
  function plant(seedId, books = Storage.getAllBooks()) {
    if (Storage.isOwnerCurrent && !Storage.isOwnerCurrent()) return false;
    if (!seeds.some(seed => seed.id === seedId)) return false;
    const garden = getGarden(books);
    if (!garden.awaitingSeed) return false;
    const choices = seedChoices();
    while (choices.length < garden.matureTrees.length) choices.push(choices[0] || 'forest');
    choices.push(seedId);
    localStorage.setItem(TREES_KEY,JSON.stringify(choices));
    localStorage.setItem(KEY,seedId);
    return true;
  }
  function wateredKeys() {
    try {
      const stored = JSON.parse(localStorage.getItem(GAME_KEY) || '[]');
      return Array.isArray(stored) ? stored.filter(value => typeof value === 'string') : [];
    } catch (_) { return []; }
  }
  function availableWater(books, watered = wateredKeys()) {
    const used = new Set(watered);
    return completedKeys(books).filter(key => !used.has(key));
  }
  function water(books) {
    if (Storage.isOwnerCurrent && !Storage.isOwnerCurrent()) return false;
    const used = wateredKeys();
    const key = availableWater(books,used)[0];
    if (!key) return false;
    localStorage.setItem(GAME_KEY,JSON.stringify([...used,key]));
    return true;
  }
  function render() {
    const root = document.getElementById('readingGarden');
    if (!root) return;
    const currentDetails = root.querySelector('details');
    if (currentDetails) expanded = currentDetails.open;
    const books = Storage.getAllBooks();
    const garden = getGarden(books);
    const selected = seeds.find(seed => seed.id === garden.currentSeed);
    const p = {count:garden.currentCount,stage:garden.stage,next:garden.next};
    const waterCount = availableWater(books).length;
    const picker = !selected;
    const grove = garden.matureTrees.length ? `<section class="garden-grove" aria-label="다 자란 나무"><h2>내 정원 · 나무 ${garden.matureTrees.length}그루</h2><div class="garden-grove-trees">${garden.matureTrees.map(tree => `<div class="garden-grown seed-${tree.seed}"><span class="garden-sprite garden-mature seed-${tree.seed}" role="img" aria-label="${tree.index+1}번째 ${seeds.find(seed => seed.id === tree.seed).name}, 다 자란 나무"></span><small>${tree.index+1}번째 ${seeds.find(seed => seed.id === tree.seed).name}</small></div>`).join('')}</div></section>` : '';
    root.innerHTML = `<details class="garden-game" ${expanded ? 'open' : ''}><summary><span class="garden-mini-sprite garden-sprite garden-stage-${selected ? p.stage : garden.matureTrees.length ? 5 : 0}" aria-hidden="true"></span><span><strong>내 독서 정원</strong><small>${garden.matureTrees.length ? `나무 ${garden.matureTrees.length}그루 · ` : ''}${selected ? `${labels[p.stage]} · 이번 나무 ${p.count}/20권` : '새 씨앗을 심어 주세요'} · 총 ${garden.count}권</small></span><span class="garden-toggle" aria-hidden="true">열기</span></summary><div class="garden-game-body">${grove}${picker ? `<h2>${garden.matureTrees.length ? '다음 나무의 씨앗을 심어요' : '어떤 씨앗을 심을까?'}</h2><div class="garden-seeds">${seeds.map(seed => `<button type="button" data-seed="${seed.id}" aria-pressed="${selected?.id === seed.id}"><span class="garden-seed-art garden-mature seed-${seed.id}" aria-hidden="true"></span><strong>${seed.name}</strong><small>${seed.detail}</small></button>`).join('')}</div><p class="garden-note">책 20권마다 나무 한 그루가 완성돼요. 지금까지 읽은 책도 정원에 반영돼요.${garden.currentCount ? ` 다음 나무는 이미 ${garden.currentCount}권만큼 자랐어요.` : ''}</p>` : `<div class="garden-scene seed-${selected.id}"><div class="garden-sky" aria-hidden="true"></div><div class="garden-ground" aria-hidden="true"></div><div class="garden-sprite garden-stage-${p.stage}" role="img" aria-label="${selected.name}, ${labels[p.stage]}"></div><div class="garden-water-drops" aria-hidden="true">${'<i></i>'.repeat(6)}</div></div><div class="garden-game-stats"><div><h2>${selected.name}</h2><p>${labels[p.stage]} · 이번 나무 ${p.count}/20권</p></div><span class="garden-tree-number">${garden.matureTrees.length+1}번째 나무</span></div><progress max="${p.next || 20}" value="${Math.min(p.count,p.next || 20)}" aria-label="나무 성장, 읽은 책 ${p.count}권"></progress><p class="garden-next">${p.next ? `${p.next-p.count}권 더 읽으면 ${labels[p.stage+1]}!` : '꽃과 동물 친구들이 모두 모였어요.'}</p><div class="garden-actions"><button type="button" class="garden-water" ${waterCount ? '' : 'disabled'}>물 주기 <span>${waterCount}회</span></button><a href="scan.html">책 기록하기</a></div><p class="garden-feedback" role="status" aria-live="polite">${waterCount ? '읽은 책이 물 선물이 됐어요. 나무에 물을 줘 보세요!' : '새로운 책을 다 읽으면 물을 한 번 줄 수 있어요.'}</p><p class="garden-note">나무는 현재 서재의 서로 다른 완독 책 수로 자라요. 책을 삭제하면 성장이 다시 계산돼요. 씨앗과 물 주기는 이 기기에 저장돼요.</p>`}</div></details>`;
    const collection = getCollection(books);
    const decorations = collection.equipped.map(item => `<span class="garden-decoration" role="img" aria-label="${item.name}">${item.svg}</span>`).join('');
    const nextSummary = collection.next ? `다음: ${collection.next.name} · ${collection.next.at-collection.count}권 남음` : '모든 소품을 모았어요!';
    if (decorations) {
      const scene = root.querySelector('.garden-scene');
      if (scene) scene.insertAdjacentHTML('beforeend',`<div class="garden-decorations">${decorations}</div>`);
      else root.querySelector('.garden-game-body').insertAdjacentHTML('afterbegin',`<div class="garden-decoration-display" aria-label="정원에 놓은 소품">${decorations}</div>`);
    }
    root.querySelector('.garden-game-body').insertAdjacentHTML('beforeend',`<details class="garden-collection" ${collectionExpanded ? 'open' : ''}><summary><span><strong>정원 소품함</strong><small>모은 소품 ${collection.earnedCount}/${items.length} · 정원에 ${collection.equipped.length}/2개</small></span><span class="garden-toggle" aria-hidden="true">열기</span></summary><p class="garden-collection-next">${collection.next ? `${collection.next.at-collection.count}권 더 읽으면 ${collection.next.name}을 만나요` : '여섯 가지 소품을 모두 모았어요!'}</p>${collection.next ? `<progress max="${collection.next.at}" value="${collection.count}" aria-label="${collection.next.name}까지 완독 ${collection.count}/${collection.next.at}권"></progress>` : ''}<p class="garden-collection-help">정원에 최대 2개를 놓을 수 있어요. 소품은 서로 다른 완독 책 수로 열려요. 선택은 이 기기에 저장돼요.</p><div class="garden-collection-grid">${collection.items.map(item => `<button type="button" data-garden-item="${item.id}" aria-pressed="${item.equipped}" ${item.earned ? '' : 'disabled'}>${item.svg}<strong>${item.name}</strong><small>${item.earned ? item.equipped ? '정원에서 빼기' : '정원에 놓기' : `${item.at}권 완독하면 열려요`}</small></button>`).join('')}</div><p class="garden-collection-feedback" role="status" aria-live="polite"></p></details>`);
    root.querySelector('.garden-collection summary>span').insertAdjacentHTML('beforeend',`<small>${nextSummary}</small>`);
    root.querySelector('.garden-collection-next').insertAdjacentHTML('afterend','<p class="garden-collection-link"><a href="recommendations.html#recShelfTitle">다음에 읽을 책 찾기</a></p>');
    root.querySelector('.garden-collection').addEventListener('toggle',event => { collectionExpanded=event.target.open; });
    root.querySelectorAll('[data-garden-item]').forEach(button => button.addEventListener('click',() => {
      const result = toggleItem(button.dataset.gardenItem,Storage.getAllBooks());
      const feedback = root.querySelector('.garden-collection-feedback');
      if (!result.ok) {
        feedback.textContent = result.error === 'full' ? '소품은 2개까지 놓을 수 있어요. 하나를 빼고 골라 주세요.' : result.error === 'storage' ? '소품 선택을 저장하지 못했어요. 다시 시도해 주세요.' : '서재가 바뀌었어요. 새로고침 후 다시 골라 주세요.';
        return;
      }
      const equipped = getCollection().equipped.some(item => item.id === button.dataset.gardenItem);
      collectionExpanded=true;render();
      root.querySelector('.garden-collection-feedback').textContent = equipped ? '소품을 정원에 놓았어요.' : '소품을 정원에서 뺐어요.';
      root.querySelector(`[data-garden-item="${button.dataset.gardenItem}"]`)?.focus();
    }));
    root.querySelector('details').addEventListener('toggle',event => { expanded=event.target.open; });
    root.querySelectorAll('[data-seed]').forEach(button => button.addEventListener('click',() => {
      plant(button.dataset.seed,Storage.getAllBooks()); expanded=true; render();
    }));
    root.querySelector('.garden-water')?.addEventListener('click',() => {
      if (!water(Storage.getAllBooks())) return;
      render();
      root.classList.add('is-watering');
      root.querySelector('.garden-feedback').textContent='물을 줬어요! 책 한 권이 나무의 힘이 됐어요.';
      setTimeout(() => root.classList.remove('is-watering'),1400);
    });
  }
  window.ReadingGarden={render,progress,identity,availableWater,water,getGarden,plant,getCollection,toggleItem,itemArt,items};
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('storage',render);
  window.addEventListener('pageshow',render);
})();
