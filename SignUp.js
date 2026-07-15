document.querySelectorAll('.field label[for]').forEach((label) => {
  label.addEventListener('click', (event) => {
    event.preventDefault();
  });
});

document.getElementById('back-btn').addEventListener('click', () => {
  window.history.back();
});

const apiUrl = document.querySelector('meta[name="signup-api"]').content;
const form = document.querySelector('#signup-form');
const errorMessage = document.querySelector('#error-message');

// 임시 로컬 인증 저장소 (백엔드 연동 전까지만 사용).
// login.js가 이 목록을 읽어 "회원가입된 사용자만 로그인 가능"을 흉내 냅니다.
// 백엔드 연동 후에는 LOCAL_ACCOUNTS_KEY 관련 코드를 전부 지우고
// 서버가 계정 존재 여부를 판단하도록 하세요.
const LOCAL_ACCOUNTS_KEY = 'localAccounts';

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  const payload = {
    username: document.querySelector('#username').value,
    password: document.querySelector('#password').value,
    name: document.querySelector('#name').value,
    nickname: document.querySelector('#nickname').value,
  };

  // 백엔드 연동 지점 2/2: 회원가입 API 요청.
  // 아래 요청 바디와 응답 처리 방식을 백엔드 스펙에 맞게 수정하세요.
  // 성공 응답을 받으면 아래 catch 블록의 로컬 임시 저장 로직은 삭제하고
  // 바로 로그인 화면으로 이동시키면 됩니다.
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('회원가입 요청 실패');
    window.location.href = 'login.html';
  } catch (error) {
    console.log('[SignUp] 백엔드 미연동 상태 - 로컬 임시 저장으로 대체:', payload);

    const accounts = JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '[]');
    if (accounts.some((account) => account.username === payload.username)) {
      showError('이미 사용 중인 아이디예요.');
      return;
    }

    accounts.push(payload);
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
    window.location.href = 'login.html';
  }
});