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
  const visibleListings = listings
    .filter((listing) => matchesFilters(listing) && matchesKeyword(listing, keyword))
    // 최근 등록한 매물이 위로 오도록 정렬합니다. createdAt이 없는 데이터(예: 실제
    // 백엔드 응답에 아직 이 필드가 없는 경우)는 순서를 그대로 유지합니다.
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

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

async function loadListings() {
  try {
    // 백엔드 전체 목록 조회 API 호출
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('매물 목록 요청 실패');
    
    const backendData = await response.json();

    // 백엔드 DTO(RoomPostResponse)를 프론트엔드와 맵핑..
    listings = backendData.map(post => ({
      id: post.id,
      type: 'ONE_ROOM', // 백엔드에 방 종류 필드가 없다면 기본값 고정
      address: post.location,         // 백엔드의 location -> 프론트의 address
      deposit: post.deposit,
      monthlyRent: post.monthlyRent,
      contractEnd: post.contractEndDate, // 백엔드의 contractEndDate -> contractEnd
      moveInDate: post.moveInDate,
      description: post.content,      // 백엔드의 content -> description
      imageUrl: post.imageUrl || '',
      createdAt: new Date(post.createdAt).getTime() || Date.now() // 정렬용 시간
    }));

  } catch (error) {
    console.error('[Home] 백엔드 연동 에러:', error);
    listings = loadStoredListings(); // 실패 시 로컬 임시 데이터 사용
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

document.getElementById('mypage-my-listings').addEventListener('click', () => {
  window.location.href = 'MyPost.html';
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

// async를 붙여서 백엔드 통신을 기다리도록...
async function showMypageView() {
  const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
  const token = session ? session.token : null;
  
  let nickname = '게스트';
  let isLoggedIn = !!token;

  // 토큰이 있다면 백엔드에서 내 정보 받기
  if (isLoggedIn) {
    try {
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const myInfo = await res.json();
        nickname = myInfo.nickname || '회원'; // 백엔드에서 받은 닉네임 적용
      } else {
        isLoggedIn = false; // 토큰이 만료되었거나 이상하면 로그아웃 처리
      }
    } catch(e) {
      console.error('[Mypage] 내 정보 불러오기 에러', e);
    }
  }

  document.getElementById('profile-nickname').textContent = nickname;
  authButton.innerHTML = isLoggedIn ? LOGOUT_ROW_HTML : LOGIN_ROW_HTML;

  homeView.hidden = true;
  mypageView.hidden = false;
  addButton.hidden = true;
  navHomeButton.classList.remove('active');
  navMypageButton.classList.add('active');
}

navHomeButton.addEventListener('click', showHomeView);
navMypageButton.addEventListener('click', showMypageView);

// MyPost.html 등 다른 화면에서 "마이페이지로 돌아가기"로 넘어온 경우, 홈 목록 대신
// 마이페이지를 바로 보여줍니다.
if (new URLSearchParams(location.search).get('view') === 'mypage') {
  showMypageView();
  history.replaceState(null, '', 'home.html');
}

document.getElementById('nav-chat').addEventListener('click', () => {
  alert('채팅 기능은 준비 중이에요.');
});

document.getElementById('nav-explore').addEventListener('click', () => {
  alert('탐색 기능은 준비 중이에요.');
});

document.getElementById('nav-liked').addEventListener('click', () => {
  alert('찜 기능은 준비 중이에요.');
});

authButton.addEventListener('click', async () => {
  const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
  
  // 1. 이미 로그인된 상태라면 (토큰이 있다면)
  if (session && session.token) {
    try {
      // 백엔드 로그아웃 API 호출
      await fetch('/api/users/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
    } catch (error) {
      console.error('[Logout] 백엔드 로그아웃 처리 중 에러:', error);
    }
    
    // 2. 서버 호출이 끝난 뒤에 브라우저의 토큰 파기..
    localStorage.removeItem(AUTH_SESSION_KEY);
    
    // 3. 로그아웃 완료 후 메인 진입 화면으로 이동
    window.location.href = 'index.html'; // 또는 첫 화면인 login.html
  } 
  // 로그인 안 된 상태에서 눌렀을 때는 바로 로그인 화면으로
  else {
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

// home.js 맨 아래에 붙여넣을 백엔드 연동 코드
async function fetchRoomPosts() {
  try {
    // 1. 로그인 세션 정보에서 토큰 가져오기 (헤더 전송용)
    const authSession = JSON.parse(localStorage.getItem('authSession'));
    if (!authSession || !authSession.token) {
      console.warn('로그인 토큰이 없어 로그인 페이지로 이동합니다.');
      window.location.href = 'login.html';
      return;
    }

    // 2. 헤더에 Bearer 토큰을 담아 백엔드(http://localhost:8080/api/room-posts) 호출
    const response = await fetch('http://localhost:8080/api/room-posts', {
      headers: {
        'Authorization': `Bearer ${authSession.token}`
      }
    });
    
    if (!response.ok) throw new Error('백엔드 매물 목록 조회 실패');
    
    const backendPosts = await response.json();
    console.log('백엔드로부터 수신한 매물 목록:', backendPosts);

    // 3. 백엔드 DTO 데이터를 프론트엔드가 기대하는 필드 구조로 변환
    const listings = backendPosts.map(post => ({
      id: post.id,
      type: 'ONE_ROOM', // 기본 타입 매칭
      address: post.location || '주소 미입력',
      deposit: post.deposit,
      monthlyRent: post.monthlyRent,
      contractEnd: post.contractEndDate || '',
      moveInDate: post.moveInDate || '',
      description: post.content || '설명이 없는 매물이에요.',
      imageUrl: post.imageUrl || ''
    }));

    // 4. home.js 내에 이미 정의되어 있을 renderListings 함수를 호출해 화면에 그림
    if (typeof renderListings === 'function') {
      renderListings(listings);
    } else {
      // 혹시라도 home.js에 renderListings가 없다면 직접 그려주는 예비 코드
      const listElement = document.getElementById('listing-list');
      if (!listElement) return;

      if (listings.length === 0) {
        listElement.innerHTML = '<p class="empty">등록된 매물이 없습니다.</p>';
        return;
      }

      listElement.innerHTML = listings.map(listing => `
        <article class="listing" onclick="location.href='listing.html?id=${listing.id}'">
          ${listing.imageUrl 
            ? `<div class="listing-image"><img src="${listing.imageUrl}" alt="매물 사진" /></div>` 
            : '<div class="listing-image"></div>'}
          <div class="listing-body">
            <strong class="listing-title">${listing.description}</strong>
            <p class="listing-price">
              보증금 ${listing.deposit}만원 · 월세 ${listing.monthlyRent}만원<br />
              ${listing.address}
            </p>
          </div>
        </article>
      `).join('');
    }

  } catch (error) {
    console.error('[home.js] 매물 로딩 오류:', error);
    const listElement = document.getElementById('listing-list');
    if (listElement) {
      listElement.innerHTML = '<p class="empty">매물을 불러오는 중 오류가 발생했습니다.</p>';
    }
  }
}

// 화면이 열릴 때 자동으로 백엔드 목록을 요청합니다.
window.addEventListener('DOMContentLoaded', fetchRoomPosts);  