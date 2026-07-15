const apiUrl = document.querySelector('meta[name="listings-api"]').content;
const listElement = document.getElementById('listing-list');

const AUTH_SESSION_KEY = 'authSession';
const LISTINGS_STORAGE_KEY = 'registeredListings';

function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
  } catch (error) {
    return null;
  }
}

// 매물 등록(upload.html)과 같은 방식으로, 로그인한 사용자만 이 페이지에 들어올 수 있게 막습니다.
const authSession = getAuthSession();
if (!authSession) {
  window.location.href = 'login.html';
}

document.getElementById('back-btn').addEventListener('click', () => {
  window.location.href = 'home.html?view=mypage';
});

function loadStoredListings() {
  try {
    return JSON.parse(localStorage.getItem(LISTINGS_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function formatPrice(listing) {
  return `보증금 ${listing.deposit}만원 · 월세 ${listing.monthlyRent}만원`;
}

function formatContractEnd(listing) {
  return listing.contractEnd ? listing.contractEnd.replaceAll('-', '.') : '미정';
}

function formatMoveInDate(listing) {
  return listing.moveInDate ? listing.moveInDate.replaceAll('-', '.') : '협의 가능';
}

function renderListings(listings) {
  if (!listings.length) {
    listElement.innerHTML = '<p class="empty">아직 등록한 매물이 없어요.<br />홈 화면의 + 버튼으로 매물을 등록해보세요.</p>';
    return;
  }

  const sorted = listings.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  listElement.innerHTML = sorted
    .map(
      (listing) => `
    <article class="listing" data-id="${listing.id}">
      ${listing.imageUrl
        ? `<img class="listing-image" src="${listing.imageUrl}" alt="매물 사진" />`
        : '<div class="listing-image"></div>'}
      <div class="listing-body">
        <strong class="listing-title">${listing.description || '설명이 없는 매물이에요.'}</strong>
        <p class="listing-price">${formatPrice(listing)}<br />${listing.address || '주소 미입력'}<br />계약 종료일 ${formatContractEnd(listing)}<br />입주 가능 시기 ${formatMoveInDate(listing)}</p>
      </div>
      <button class="listing-delete" type="button" data-id="${listing.id}" aria-label="매물 삭제">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" stroke-linecap="round"/></svg>
      </button>
    </article>`,
    )
    .join('');
}

// 백엔드 연동 지점 2/3: 내가 등록한 매물 조회 API.
// 로그인한 사용자 본인의 매물만 내려주는 인증 필요 엔드포인트를 쓰는 걸 권장합니다
// (예: GET /api/listings/mine + Authorization 헤더에 authSession.token).
// 지금은 백엔드가 없어 localStorage에 저장된 전체 매물 중 ownerUsername이
// 로그인한 사용자와 같은 것만 걸러서 보여줍니다.
async function loadMyListings() {
  try {
    const response = await fetch(`${apiUrl}?ownerUsername=${encodeURIComponent(authSession.username)}`, {
      headers: authSession.token ? { Authorization: `Bearer ${authSession.token}` } : {},
    });
    if (!response.ok) throw new Error('내 매물 조회 실패');
    const listings = await response.json();
    renderListings(listings);
  } catch (error) {
    const myListings = loadStoredListings().filter((listing) => listing.ownerUsername === authSession.username);
    renderListings(myListings);
  }
}

// 백엔드 연동 지점 3/3: 매물 삭제 API.
// 실제로는 DELETE {listings-api 주소}/{매물 id} 형태의 인증 필요 엔드포인트를 호출하고,
// authSession.token을 Authorization 헤더로 실어 보내세요. 본인 소유가 아닌 매물의
// 삭제 요청은 서버에서 403으로 막아야 합니다. 아래 catch의 localStorage 삭제 로직은
// 백엔드 연동 후 지우면 됩니다.
async function deleteListing(id) {
  try {
    const response = await fetch(`${apiUrl}/${id}`, {
      method: 'DELETE',
      headers: authSession.token ? { Authorization: `Bearer ${authSession.token}` } : {},
    });
    if (!response.ok) throw new Error('매물 삭제 요청 실패');
  } catch (error) {
    console.log('[MyPost] 백엔드 미연동 상태 - 로컬 저장소에서만 삭제:', error);
  }

  // 백엔드 삭제 성공 여부와 무관하게 로컬 캐시에서도 지워서, 새로고침 전에도
  // 화면과 다음 조회 결과가 어긋나지 않도록 맞춰둡니다.
  const remaining = loadStoredListings().filter((listing) => String(listing.id) !== String(id));
  localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(remaining));
}

listElement.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('.listing-delete');
  if (!deleteButton) return;

  const confirmed = window.confirm('이 매물을 삭제할까요? 삭제하면 되돌릴 수 없어요.');
  if (!confirmed) return;

  deleteButton.disabled = true;
  await deleteListing(deleteButton.dataset.id);
  loadMyListings();
});

loadMyListings();
