document.querySelectorAll('[data-nav]').forEach((button) => {
  button.addEventListener('click', () => {
    window.location.href = button.dataset.nav;
  });
});