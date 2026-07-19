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

const AUTH_SESSION_KEY = 'authSession';

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  // 백엔드에 맞춰서 username -> email 로 변환...
  const payload = {
    email: document.querySelector('#username').value, 
    password: document.querySelector('#password').value,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      // JWT 토큰을 JSON이 아닌 '순수 문자열'로 주므로 .text() 로 읽습니다!
      let token = await response.text(); 

      if (token) {
        
        // 다른 API 호출하기 위해 토큰을 Json 객체형태로 저장...
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token: token }));
        window.location.href = 'home.html';
      } else {
        showError('로그인은 성공했지만 서버에서 토큰을 받지 못했습니다.');
      }
    } 
    else if (response.status === 401 || response.status === 403 || response.status === 404) {
      showError('아이디 또는 비밀번호가 올바르지 않아요. 회원가입이 필요할 수도 있어요.');
    } 
    else {
      showError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

  } catch (error) {
    console.error('[Login] 통신 에러:', error);
    showError('서버와 연결할 수 없습니다. 서버(IntelliJ)가 켜져 있는지 확인해 주세요.');
  }
});