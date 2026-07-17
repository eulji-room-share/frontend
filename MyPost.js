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


// 1. 내 매물 조회 (전체 조회 후 이메일로 필터링)
async function loadMyListings() {
  try {
    // [Step 1] 내 정보 조회 API로 내 이메일 가져오기
    const meRes = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${authSession.token}` }
    });
    if (!meRes.ok) throw new Error('내 정보 조회 실패');
    const myInfo = await meRes.json();

    // [Step 2] 전체 매물 조회 API로 세상의 모든 방 다 가져오기
    const res = await fetch('/api/room-posts');
    if (!res.ok) throw new Error('전체 매물 조회 실패');
    const allPosts = await res.json();

    // [Step 3] 철희님의 sellerEmail과 유저 이메일 비교..
    const myListings = allPosts
      .filter(post => post.sellerEmail === myInfo.email) 
      .map(post => ({
        id: post.id,
        type: 'ONE_ROOM',
        address: post.location,
        deposit: post.deposit,
        monthlyRent: post.monthlyRent,
        contractEnd: post.contractEndDate,
        moveInDate: post.moveInDate,
        description: post.content,
        imageUrl: post.imageUrl || '',
        createdAt: new Date(post.createdAt).getTime() || Date.now()
      }));

    renderListings(myListings);
  } catch (error) {
    console.error('[MyPost] 내 매물 불러오기 에러:', error);
    listElement.innerHTML = '<p class="empty">매물을 불러오는 중 오류가 발생했어요.</p>';
  }
}

// 2. 매물 삭제 API 연동
async function deleteListing(id) {
  try {
    const response = await fetch(`/api/room-posts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authSession.token}` },
    });
    
    if (!response.ok) throw new Error('매물 삭제 요청 실패');
    alert('매물이 성공적으로 삭제되었어!');
    
  } catch (error) {
    console.error('[MyPost] 삭제 에러:', error);
    alert('삭제 중 오류가 발생했어.');
  }
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
