document.querySelector('form').addEventListener('submit', (e) => {
    if (!document.getElementById('txt').value) {
        alert('please enter First and Last names');
        e.preventDefault(); }
});
