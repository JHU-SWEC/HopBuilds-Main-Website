export default function initLifeBoard() {
  const opener = document.querySelector('.life-open');
  const board = document.querySelector('#life-board');
  const photos = import.meta.glob('../assets/web/team-life/*.jpg', { eager: true, query: '?url', import: 'default' });
  const descriptions = [
    'A team member relaxing on a couch in the lounge',
    'Team members talking around a table in the lounge',
    'The team together outdoors at night',
    'Team members working together in a campus classroom',
    'Friends chatting at a team gathering',
    'A team member enjoying a meal with friends',
    'Team members hanging out in an apartment',
    'Friends gathered around the table for a celebration',
  ];
  const collection = board.querySelector('.life-board-photos');
  opener.addEventListener('click', () => {
    if (!collection.children.length) {
      Object.values(photos).forEach((src, index) => {
        const frame = document.createElement('figure');
        frame.className = 'board-photo';
        const image = document.createElement('img');
        image.src = src;
        image.alt = descriptions[index];
        image.loading = 'lazy';
        image.decoding = 'async';
        frame.append(image);
        collection.append(frame);
      });
    }
    board.showModal();
    document.body.classList.add('life-board-open');
  });
  board.addEventListener('close', () => {
    document.body.classList.remove('life-board-open');
    opener.focus({ preventScroll: true });
  });
  board.addEventListener('click', (event) => {
    if (event.target !== board) return;
    const rect = board.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) board.close();
  });
}
