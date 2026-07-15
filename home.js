const apiUrl = document.querySelector('meta[name="listings-api"]').content;
const listElement = document.querySelector('#listing-list');
const searchInput = document.querySelector('#search-input');
const addButton = document.querySelector('.add-button');

const LISTINGS_STORAGE_KEY = 'registeredListings';

let listings = [];

let filters = {
  type: 'ALL',
  location: '',
  rentMin: null,
  rentMax: null,
  moveInFrom: '',
  moveInTo: '',
  contractEndFrom: '',
  contractEndTo: '',
};

function formatPrice(listing) {
  return `보증금 ${listing.deposit}만원 · 월세 ${listing.monthlyRent}만원`;
}

function formatContractEnd(listing) {
  return listing.contractEnd ? listing.contractEnd.replaceAll('-', '.') : '미정';
}

function formatMoveInDate(listing) {
  return listing.moveInDate ? listing.moveInDate.replaceAll('-', '.') : '협의 가능';
}

function matchesFilters(listing) {
  if (filters.type !== 'ALL' && listing.type !== filters.type) return false;

  if (filters.location) {
    const address = (listing.address || '').toLowerCase();
    if (!address.includes(filters.location.toLowerCase())) return false;
  }

  if (filters.rentMin !== null && listing.monthlyRent < filters.rentMin) return false;
  if (filters.rentMax !== null && listing.monthlyRent > filters.rentMax) return false;

  if (filters.moveInFrom && listing.moveInDate && listing.moveInDate < filters.moveInFrom) return false;
  if (filters.moveInTo && listing.moveInDate && listing.moveInDate > filters.moveInTo) return false;

  if (filters.contractEndFrom && listing.contractEnd && listing.contractEnd < filters.contractEndFrom) return false;
  if (filters.contractEndTo && listing.contractEnd && listing.contractEnd > filters.contractEndTo) return false;

  return true;
}

function matchesKeyword(listing, keyword) {
  const haystack = `${listing.description || ''} ${listing.address || ''}`.toLowerCase();
  return haystack.includes(keyword);
}

function renderListings() {
  const keyword = searchInput.value.trim().toLowerCase();
  const visibleListings = listings.filter((listing) => matchesFilters(listing) && matchesKeyword(listing, keyword));

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
        <p class="listing-price">${formatPrice(listing)}<br />${listing.address || '주소 미입력'}<br />계약 종료일 ${formatContractEnd(listing)}<br />입주 가능 시기 ${formatMoveInDate(listing)}</p>
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

searchInput.addEventListener('input', renderListings);

document.querySelectorAll('.filter-field label[for]').forEach((label) => {
  label.addEventListener('click', (event) => {
    event.preventDefault();
  });
});

const filterToggleButton = document.getElementById('filter-toggle');
const filterPanel = document.getElementById('filter-panel');

filterToggleButton.addEventListener('click', () => {
  const isOpen = filterPanel.classList.toggle('open');
  filterToggleButton.setAttribute('aria-expanded', String(isOpen));
});

const filterTypeButtons = document.querySelectorAll('#filter-type-group .chip');
let selectedFilterType = 'ALL';

filterTypeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedFilterType = button.dataset.type;
    filterTypeButtons.forEach((chip) => chip.classList.toggle('active', chip === button));
  });
});

['filter-movein-from', 'filter-movein-to', 'filter-contractend-from', 'filter-contractend-to'].forEach((id) => {
  const dateInput = document.getElementById(id);
  dateInput.addEventListener('click', () => {
    if (typeof dateInput.showPicker === 'function') dateInput.showPicker();
  });
});

document.getElementById('filter-apply').addEventListener('click', () => {
  const rentMinValue = document.getElementById('filter-rent-min').value;
  const rentMaxValue = document.getElementById('filter-rent-max').value;

  filters = {
    type: selectedFilterType,
    location: document.getElementById('filter-location').value.trim(),
    rentMin: rentMinValue ? Number(rentMinValue) : null,
    rentMax: rentMaxValue ? Number(rentMaxValue) : null,
    moveInFrom: document.getElementById('filter-movein-from').value,
    moveInTo: document.getElementById('filter-movein-to').value,
    contractEndFrom: document.getElementById('filter-contractend-from').value,
    contractEndTo: document.getElementById('filter-contractend-to').value,
  };

  filterPanel.classList.remove('open');
  filterToggleButton.setAttribute('aria-expanded', 'false');
  renderListings();
});

const FILTER_INPUT_IDS = [
  'filter-location',
  'filter-rent-min',
  'filter-rent-max',
  'filter-movein-from',
  'filter-movein-to',
  'filter-contractend-from',
  'filter-contractend-to',
];

document.getElementById('filter-reset').addEventListener('click', () => {
  FILTER_INPUT_IDS.forEach((id) => {
    document.getElementById(id).value = '';
  });

  selectedFilterType = 'ALL';
  filterTypeButtons.forEach((chip) => chip.classList.toggle('active', chip.dataset.type === 'ALL'));

  filters = {
    type: 'ALL',
    location: '',
    rentMin: null,
    rentMax: null,
    moveInFrom: '',
    moveInTo: '',
    contractEndFrom: '',
    contractEndTo: '',
  };

  renderListings();
});

const AUTH_SESSION_KEY = 'authSession';

addButton.addEventListener('click', () => {
  const isLoggedIn = !!localStorage.getItem(AUTH_SESSION_KEY);
  if (!isLoggedIn) {
    const wantsLogin = window.confirm('매물을 등록하려면 로그인이 필요해요. 로그인하시겠어요?');
    if (wantsLogin) {
      window.location.href = 'login.html';
    }
    return;
  }
  window.location.href = 'upload.html';
});

const homeView = document.getElementById('home-view');
const mypageView = document.getElementById('mypage-view');
const navHomeButton = document.getElementById('nav-home');
const navMypageButton = document.getElementById('nav-mypage');

function showHomeView() {
  homeView.hidden = false;
  mypageView.hidden = true;
  addButton.hidden = false;
  navHomeButton.classList.add('active');
  navMypageButton.classList.remove('active');
}

const authButton = document.getElementById('auth-btn');

const LOGOUT_ROW_HTML = `
  <svg class="row-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17l5-5-5-5M21 12H9" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <span>로그아웃</span>
  <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;

const LOGIN_ROW_HTML = `
  <svg class="row-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 21h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 17l5-5-5-5M16 12H3" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <span>로그인</span>
  <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;

function showMypageView() {
  const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
  document.getElementById('profile-nickname').textContent = session ? session.nickname || session.name || '회원' : '게스트';
  authButton.innerHTML = session ? LOGOUT_ROW_HTML : LOGIN_ROW_HTML;

  homeView.hidden = true;
  mypageView.hidden = false;
  addButton.hidden = true;
  navHomeButton.classList.remove('active');
  navMypageButton.classList.add('active');
}

navHomeButton.addEventListener('click', showHomeView);
navMypageButton.addEventListener('click', showMypageView);

document.getElementById('nav-chat').addEventListener('click', () => {
  alert('채팅 기능은 준비 중이에요.');
});

authButton.addEventListener('click', () => {
  const isLoggedIn = !!localStorage.getItem(AUTH_SESSION_KEY);
  if (isLoggedIn) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.location.href = 'index.html';
  } else {
    window.location.href = 'login.html';
  }
});

listElement.addEventListener('click', (event) => {
  const likeButton = event.target.closest('.like-button');
  if (likeButton) {
    const listing = listings.find((item) => String(item.id) === likeButton.dataset.id);
    listing.liked = !listing.liked;

    const storedListings = loadStoredListings();
    const storedIndex = storedListings.findIndex((item) => String(item.id) === String(listing.id));
    if (storedIndex !== -1) {
      storedListings[storedIndex].liked = listing.liked;
      localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(storedListings));
    }

    renderListings();
    return;
  }

  if (event.target.closest('.listing-actions') || event.target.closest('.more')) return;

  const article = event.target.closest('.listing');
  if (!article) return;
  window.location.href = `listing.html?id=${article.dataset.id}`;
});

loadListings();