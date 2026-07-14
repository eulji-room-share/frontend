document.querySelectorAll('.field label[for]').forEach((label) => {
  label.addEventListener('click', (event) => {
    event.preventDefault();
  });
});

document.getElementById('go-signup').addEventListener('click', () => {
  window.location.href = 'SignUp.html';
});

document.getElementById('back-btn').addEventListener('click', () => {
  window.history.back();
});

const apiUrl = document.querySelector('meta[name="login-api"]').content;
const form = document.querySelector('#login-form');
const errorMessage = document.querySelector('#error-message');

// 임시 로컬 인증 저장소 (백엔드 연동 전까지만 사용). SignUp.js가 채워 넣습니다.
const LOCAL_ACCOUNTS_KEY = 'localAccounts';
// 로그인 세션 저장 키. upload.js가 이 값을 읽어 "누가 이 매물을 등록했는지" 붙입니다.
// 백엔드 연동 후에는 서버가 내려주는 실제 토큰/사용자 정보로 이 값을 채우세요.
const AUTH_SESSION_KEY = 'authSession';

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
  };

  // 백엔드 연동 지점 2/2: 로그인 API 요청.
  // 회원가입(SignUp.html)으로 등록된 계정만 로그인에 성공하도록
  // 서버에서 검증한다고 가정하고, 아래 응답 처리를 백엔드 스펙에 맞게 수정하세요.
  // 응답 바디에 { token, user: { username, name } } 같은 형태로 로그인 정보가
  // 내려온다고 가정하고, 성공 시 AUTH_SESSION_KEY에 그 값을 저장하도록 바꾸면 됩니다.
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('로그인 요청 실패');
    const data = await response.json();
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data));
    window.location.href = 'home.html';
  } catch (error) {
    console.log('[Login] 백엔드 미연동 상태 - 로컬 계정으로 대체 검증:', payload);

    const accounts = JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '[]');
    const matchedAccount = accounts.find(
      (account) => account.username === payload.username && account.password === payload.password,
    );

    if (!matchedAccount) {
      showError('아이디 또는 비밀번호가 올바르지 않아요. 회원가입이 필요할 수도 있어요.');
      return;
    }

    localStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify({ username: matchedAccount.username, name: matchedAccount.name }),
    );
    window.location.href = 'home.html';
  }
});
