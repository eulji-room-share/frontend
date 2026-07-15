const apiUrl = document.querySelector('meta[name="listings-api"]').content;
const LISTINGS_STORAGE_KEY = 'registeredListings';
const TYPE_LABEL_MAP = { ONE_ROOM: '원룸', TWO_ROOM: '투룸', OFFICETEL: '오피스텔', SHARE_HOUSE: '쉐어하우스' };

const listingId = new URLSearchParams(location.search).get('id');

function loadStoredListings() {
  try {
    return JSON.parse(localStorage.getItem(LISTINGS_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveStoredListings(list) {
  localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(list));
}

function formatDate(value, fallback) {
  return value ? value.replaceAll('-', '.') : fallback;
}

// 백엔드 연동 지점 2/2: 매물 상세 조회 API 요청.
// `${apiUrl}/${id}` 같은 단건 조회 엔드포인트를 쓰는 걸 권장합니다.
// 지금은 백엔드가 없어 실패 시 upload.js가 저장해 둔 localStorage 값에서 id로 찾습니다.
async function loadListing(id) {
  try {
    const response = await fetch(`${apiUrl}/${id}`);
    if (!response.ok) throw new Error('매물 조회 실패');
    return await response.json();
  } catch (error) {
    return loadStoredListings().find((item) => String(item.id) === String(id)) || null;
  }
}

// 가로 스크롤(스와이프) 캐러셀 하나를 좌우 화살표 + 카운터와 함께 동작시킵니다.
// 메인 사진 캐러셀과 확대(라이트박스) 캐러셀에 공용으로 씁니다.
function setupCarousel({ track, counter, prevBtn, nextBtn, total }) {
  function currentIndex() {
    if (!track.clientWidth) return 0;
    return Math.min(Math.max(Math.round(track.scrollLeft / track.clientWidth), 0), Math.max(total - 1, 0));
  }

  function updateUI() {
    const index = currentIndex();
    if (counter) counter.textContent = `${index + 1}/${total}`;
    if (prevBtn) prevBtn.hidden = total <= 1 || index === 0;
    if (nextBtn) nextBtn.hidden = total <= 1 || index === total - 1;
  }

  function scrollToIndex(index, behavior = 'auto') {
    track.scrollTo({ left: index * track.clientWidth, behavior });
    // 스크롤 애니메이션이 끝나야 발생하는 scroll 이벤트를 기다리지 않고 즉시 화면을 갱신합니다.
    updateUI();
  }

  track.addEventListener('scroll', updateUI);
  if (prevBtn) prevBtn.addEventListener('click', () => scrollToIndex(Math.max(currentIndex() - 1, 0)));
  if (nextBtn) nextBtn.addEventListener('click', () => scrollToIndex(Math.min(currentIndex() + 1, total - 1)));

  if (counter) counter.hidden = total === 0;
  updateUI();

  return { scrollToIndex, currentIndex };
}

function openLightbox(images, startIndex) {
  const lightbox = document.getElementById('lightbox');
  const track = document.getElementById('lightbox-track');

  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  track.scrollLeft = startIndex * track.clientWidth;

  setupCarousel({
    track,
    counter: document.getElementById('lightbox-counter'),
    prevBtn: document.getElementById('lightbox-prev'),
    nextBtn: document.getElementById('lightbox-next'),
    total: images.length,
  });
}

function closeLightbox() {
  document.getElementById('lightbox').hidden = true;
  document.body.style.overflow = '';
}

function renderPhotos(listing) {
  const images = listing.images && listing.images.length ? listing.images : listing.imageUrl ? [listing.imageUrl] : [];
  const track = document.getElementById('photo-track');
  const lightboxTrack = document.getElementById('lightbox-track');

  if (images.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'photo-empty';
    empty.textContent = '등록된 사진이 없어요.';
    track.appendChild(empty);
    document.getElementById('photo-counter').hidden = true;
    return;
  }

  images.forEach((src, index) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `매물 사진 ${index + 1}`;
    img.addEventListener('click', () => openLightbox(images, index));
    track.appendChild(img);

    const lightboxImg = document.createElement('img');
    lightboxImg.src = src;
    lightboxImg.alt = `매물 사진 ${index + 1} 확대`;
    lightboxTrack.appendChild(lightboxImg);
  });

  setupCarousel({
    track,
    counter: document.getElementById('photo-counter'),
    prevBtn: document.getElementById('photo-prev'),
    nextBtn: document.getElementById('photo-next'),
    total: images.length,
  });
}

function renderListing(listing) {
  document.getElementById('type-chip').textContent = TYPE_LABEL_MAP[listing.type] || '매물';
  document.getElementById('description').textContent = listing.description || '설명이 없는 매물이에요.';
  document.getElementById('price-row').textContent = `보증금 ${listing.deposit}만원 · 월세 ${listing.monthlyRent}만원`;
  document.getElementById('address-line').textContent = listing.address || '주소 미입력';
  document.getElementById('contract-end-line').textContent = `계약 종료일 ${formatDate(listing.contractEnd, '미정')}`;
  document.getElementById('move-in-line').textContent = `입주 가능 시기 ${formatDate(listing.moveInDate, '협의 가능')}`;

  renderPhotos(listing);

  document.getElementById('like-btn').classList.toggle('liked', !!listing.liked);

  document.getElementById('listing-view').hidden = false;
  document.getElementById('bottom-bar').hidden = false;
}

document.getElementById('back-btn').addEventListener('click', () => {
  window.location.href = 'home.html';
});

document.getElementById('share-btn').addEventListener('click', async () => {
  const shareData = { title: document.title, url: location.href };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (error) {
      // 사용자가 공유를 취소한 경우 등은 무시합니다.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(location.href);
    alert('링크를 복사했어요.');
  } catch (error) {
    alert('공유하기를 지원하지 않는 환경이에요.');
  }
});

document.getElementById('chat-button').addEventListener('click', () => {
  alert('채팅 기능은 준비 중이에요.');
});

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !document.getElementById('lightbox').hidden) {
    closeLightbox();
  }
});

(async function init() {
  if (!listingId) {
    document.getElementById('not-found').hidden = false;
    return;
  }

  const listing = await loadListing(listingId);
  if (!listing) {
    document.getElementById('not-found').hidden = false;
    return;
  }

  renderListing(listing);

  document.getElementById('like-btn').addEventListener('click', () => {
    listing.liked = !listing.liked;
    document.getElementById('like-btn').classList.toggle('liked', listing.liked);

    const stored = loadStoredListings();
    const index = stored.findIndex((item) => String(item.id) === String(listing.id));
    if (index !== -1) {
      stored[index].liked = listing.liked;
      saveStoredListings(stored);
    }
  });
})();