document.querySelectorAll('[data-nav="home"]').forEach((button) => {
  button.addEventListener('click', () => {
    window.location.href = 'home.html';
  });
});

const listingsApiUrl = document.querySelector('meta[name="listings-api"]').content;
// login.js가 로그인 성공 시 저장하는 세션 정보. 매물 등록에 "누가 등록했는지" 붙이는 데 씁니다.
const AUTH_SESSION_KEY = 'authSession';

function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
  } catch (error) {
    return null;
  }
}

// 백엔드 연동 지점 2/3: 매물 등록은 로그인한 사용자만 가능해야 합니다.
// 지금은 로그인 여부를 localStorage의 authSession으로 임시 판단하지만,
// 실제로는 서버가 이 페이지가 부르는 등록 API를 인증 필요 엔드포인트로 막아야 합니다
// (비로그인 요청은 401 응답 → 프론트는 그 응답을 보고 login.html로 보내는 방식으로 바꾸세요).
const authSession = getAuthSession();
if (!authSession) {
  window.location.href = 'login.html';
}

document.querySelectorAll('.field label[for]').forEach((label) => {
  label.addEventListener('click', (event) => {
    event.preventDefault();
  });
});

['contract-end', 'move-in-date'].forEach((id) => {
  const dateInput = document.getElementById(id);
  dateInput.addEventListener('click', () => {
    if (typeof dateInput.showPicker === 'function') {
      dateInput.showPicker();
    }
  });
});

const appRoot = document.querySelector('.app');
const stepScreens = document.querySelectorAll('.step-screen');

function goToStep(step) {
  stepScreens.forEach((screen) => {
    screen.classList.toggle('active', screen.dataset.step === String(step));
  });
  appRoot.classList.toggle('no-topbar', String(step) === 'complete');
}

const step1Form = document.getElementById('step1-form');

document.getElementById('step1-next').addEventListener('click', () => {
  if (!step1Form.reportValidity()) return;
  goToStep(2);
});

document.getElementById('step2-next').addEventListener('click', () => {
  goToStep(3);
});

document.getElementById('complete-confirm').addEventListener('click', () => {
  window.location.href = 'home.html';
});

document.getElementById('back-btn').addEventListener('click', () => {
  const activeScreen = document.querySelector('.step-screen.active');
  const step = activeScreen.dataset.step;
  if (step === '2') {
    goToStep(1);
    return;
  }
  if (step === '3') {
    goToStep(2);
    return;
  }
  window.location.href = 'home.html';
});

['address', 'deposit', 'rent'].forEach((id) => {
  document.getElementById(id).addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.target.blur();
  });
});

const MAX_PHOTOS = 10;
const photos = [];
const photoInput = document.getElementById('photo-input');
const photoGrid = document.getElementById('photo-grid');
const photoAddTile = document.getElementById('photo-add-tile');

const PHOTO_ADD_TILE_EMPTY_HTML = `
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2" stroke-linejoin="round"/><circle cx="9" cy="10.5" r="1.7"/><path d="m4 18 5.2-5.6a2 2 0 0 1 2.9-.1L15 15.2m2-2 1.6-1.7a2 2 0 0 1 2.9 0L21 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <strong>사진을 추가해 주세요</strong>
  <span>최대 10장까지 등록 가능</span>
`;

function openPhotoPicker() {
  if (photos.length >= MAX_PHOTOS) return;
  photoInput.click();
}

photoAddTile.addEventListener('click', openPhotoPicker);

photoInput.addEventListener('change', () => {
  const remaining = MAX_PHOTOS - photos.length;
  Array.from(photoInput.files)
    .slice(0, remaining)
    .forEach((file) => {
      photos.push({ file, url: URL.createObjectURL(file) });
    });
  photoInput.value = '';
  renderPhotos();
});

function renderPhotos() {
  const isEmpty = photos.length === 0;
  photoGrid.classList.toggle('empty', isEmpty);
  photoAddTile.disabled = photos.length >= MAX_PHOTOS;
  photoAddTile.innerHTML = isEmpty
    ? PHOTO_ADD_TILE_EMPTY_HTML
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg><span>${photos.length}/${MAX_PHOTOS}</span>`;

  photoGrid.querySelectorAll('.photo-thumb').forEach((thumb) => thumb.remove());

  photos.forEach((photo, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = `매물 사진 ${index + 1}`;
    thumb.appendChild(img);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'photo-remove';
    removeButton.dataset.index = String(index);
    removeButton.setAttribute('aria-label', `${index + 1}번째 사진 삭제`);
    removeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/></svg>';
    thumb.appendChild(removeButton);

    photoGrid.appendChild(thumb);
  });
}

photoGrid.addEventListener('click', (event) => {
  const removeButton = event.target.closest('.photo-remove');
  if (!removeButton) return;
  const index = Number(removeButton.dataset.index);
  URL.revokeObjectURL(photos[index].url);
  photos.splice(index, 1);
  renderPhotos();
});

renderPhotos();

const LISTINGS_STORAGE_KEY = 'registeredListings';
const TYPE_CODE_MAP = { 원룸: 'ONE_ROOM', 투룸: 'TWO_ROOM', 오피스텔: 'OFFICETEL', 쉐어하우스: 'SHARE_HOUSE' };

// 원본 사진을 그대로 base64로 저장하면 
// localStorage 용량 제한을 넘겨서 저장 실패...
// 캔버스로 리사이즈 + JPEG 압축해 훨씬 작은 크기로 줄여서 저장....
function fileToDataUrl(file, maxDimension = 1000, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러오지 못했어요.'));
    };

    img.src = objectUrl;
  });
}

async function saveListing() {
  // 백엔드 RoomPostRequest DTO에 맞춤...
  // 프론트에 '제목' 입력란이 없으므로 주소를 활용해 임시 제목을 만듦...
  const requestBody = {
    title: document.getElementById('address').value + " 매물", 
    content: document.getElementById('description').value,
    deposit: Number(document.getElementById('deposit').value) || 0,
    monthlyRent: Number(document.getElementById('rent').value) || 0,
    location: document.getElementById('address').value,
    moveInDate: document.getElementById('move-in-date').value,
    contractEndDate: document.getElementById('contract-end').value
  };

  try {
    // 백엔드로 매물 등록 API 보내기
    const response = await fetch(listingsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Bearer를 붙여서 보내줌...
        ...(authSession && authSession.token ? { Authorization: `Bearer ${authSession.token}` } : {}),
      },
      body: JSON.stringify(requestBody), // 변환한 데이터 전송
    });

    if (!response.ok) {
      throw new Error('매물 등록 요청 실패: ' + response.status);
    }
    
    // 성공 시 홈으로 이동 로직은 아래 버튼 이벤트에 있으므로 패스..
  } catch (error) {
    console.error('[Upload] 백엔드 연동 에러:', error);
    throw error; // 에러를 던져서 화면에 알림창이 뜨게 함
  }
}

document.getElementById('step3-next').addEventListener('click', async () => {
  const button = document.getElementById('step3-next');
  button.disabled = true;
  try {
    await saveListing();
    goToStep('complete');
  } catch (error) {
    console.error('[Upload] 매물 등록 처리 중 오류:', error);
    alert('매물 등록 중 문제가 발생했어요. 다시 시도해주세요.');
  } finally {
    button.disabled = false;
  }
});

// upload.js 내부에 들어갈 등록 로직
const uploadForm = document.querySelector('#uploadForm'); // HTML 폼 태그 선택자

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // 1. 입력 필드값 가져오기
  const postData = {
    title: document.querySelector('#title').value,
    content: document.querySelector('#content').value,
    deposit: parseInt(document.querySelector('#deposit').value),
    monthlyRent: parseInt(document.querySelector('#monthlyRent').value),
    location: document.querySelector('#location').value,
    // ... 나머지 필요한 필드 데이터 수집
  };

  // 2. 로그인할 때 localStorage에 저장해둔 토큰 가져오기
  const token = localStorage.getItem('token'); 

  try {
    const response = await fetch('http://localhost:8080/api/room-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 여기에 토큰을 실어 보냅니다!
      },
      body: JSON.stringify(postData)
    });

    if (response.ok) {
      alert('성공적으로 등록되었습니다!');
      window.location.href = 'listing.html'; // 등록 후 목록 페이지로 이동
    } else {
      alert('등록 실패! 로그인 상태를 확인해 주세요.');
    }
  } catch (error) {
    console.error('통신 에러:', error);
  }
});