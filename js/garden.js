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
  let expanded = false;
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
  window.ReadingGarden={render,progress,identity,availableWater,water,getGarden,plant};
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('storage',render);
  window.addEventListener('pageshow',render);
})();
