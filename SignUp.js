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

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  // ✨ 백엔드 명세서에 맞춰 딱 3개(email, password, nickname)만 전송 패키징!
  const payload = {
    email: document.querySelector('#username').value,
    password: document.querySelector('#password').value,
    nickname: document.querySelector('#nickname').value,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert('회원가입이 완료되었습니다! 로그인 화면으로 이동합니다.');
      window.location.href = 'login.html';
    } 
    else if (response.status === 400 || response.status === 409) {
      showError('이미 사용 중인 이메일이거나 입력값이 올바르지 않습니다.');
    } 
    else {
      showError('회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

  } catch (error) {
    console.error('[SignUp] 통신 에러:', error);
    showError('서버와 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.');
  }
});