const apiUrl = document.querySelector('meta[name="listings-api"]').content;
const listElement = document.querySelector('#listing-list');
const searchInput = document.querySelector('#search-input');
const typeButtons = document.querySelectorAll('.chip');
const addButton = document.querySelector('.add-button');

const LISTINGS_STORAGE_KEY = 'registeredListings';

let activeType = 'ONE_ROOM';
let listings = [];

function formatPrice(listing) {
  return `보증금 ${listing.deposit}만원 · 월세 ${listing.monthlyRent}만원`;
}

function formatContractEnd(listing) {
  return listing.contractEnd ? listing.contractEnd.replaceAll('-', '.') : '미정';
}

function matchesType(listing) {
  return listing.type === activeType;
}

function matchesKeyword(listing, keyword) {
  const haystack = `${listing.description || ''} ${listing.address || ''}`.toLowerCase();
  return haystack.includes(keyword);
}

function renderListings() {
  const keyword = searchInput.value.trim().toLowerCase();
  const visibleListings = listings.filter((listing) => matchesType(listing) && matchesKeyword(listing, keyword));

  if (!visibleListings.length) {
    listElement.innerHTML = '<p class="empty">조건에 맞는 매물이 없어요.</p>';
    return;
  }

  listElement.innerHTML = visibleListings.map((listing) => `
    <article class="listing" data-id="${listing.id}">
      ${listing.imageUrl
        ? `<img class="listing-image" src="${listing.imageUrl}" alt="매물 사진" />`
        : '<div class="listing-image"></div>'}
      <div class="listing-body">
        <strong class="listing-title">${listing.description || '설명이 없는 매물이에요.'}</strong>
        <p class="listing-price">${formatPrice(listing)}<br />${listing.address || '주소 미입력'}<br />계약 종료일 ${formatContractEnd(listing)}</p>
      </div>
      <button class="more" type="button" aria-label="더보기">⋮</button>
      <div class="listing-actions">
        <button class="like-button ${listing.liked ? 'liked' : ''}" type="button" aria-label="찜하기" data-id="${listing.id}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z" stroke-linejoin="round"/></svg>
        </button>
        <button type="button" aria-label="문의하기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5c0 4.1-3.6 7.5-8 7.5a8.9 8.9 0 0 1-3.1-.6L4 20l1.6-4.1A7.1 7.1 0 0 1 4 11.5C4 7.4 7.6 4 12 4s8 3.4 8 7.5Z" stroke-linejoin="round"/><path d="M8 11h.01M12 11h.01M16 11h.01" stroke-linecap="round" stroke-width="2.5"/></svg></button>
      </div>
    </article>`).join('');
}

function loadStoredListings() {
  try {
    return JSON.parse(localStorage.getItem(LISTINGS_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

// 백엔드 연동 지점 2/2: 매물 목록 조회 API 요청.
// 로그인 여부와 무관하게 호출되는 공개 API입니다 (Authorization 헤더를 붙이지 마세요).
// 응답 형식이 배열이 아니라면(예: { items: [...] } 같은 래핑) 아래 listings 할당부를 맞게 수정하세요.
// 지금은 백엔드가 없어 실패 시 upload.js가 저장해 둔 localStorage 값으로 대체합니다.
async function loadListings() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('매물 목록 요청 실패');
    listings = await response.json();
  } catch (error) {
    listings = loadStoredListings();
  }
  renderListings();
}

typeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeType = button.dataset.type;
    typeButtons.forEach((chip) => chip.classList.toggle('active', chip === button));
    renderListings();
  });
});

searchInput.addEventListener('input', renderListings);

addButton.addEventListener('click', () => {
  window.location.href = 'upload.html';
});

listElement.addEventListener('click', (event) => {
  const button = event.target.closest('.like-button');
  if (!button) return;
  const listing = listings.find((item) => String(item.id) === button.dataset.id);
  listing.liked = !listing.liked;
  renderListings();
});

loadListings();
