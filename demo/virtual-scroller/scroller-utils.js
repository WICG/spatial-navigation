function addBoxes (root, amount) {
  for (let i = 0; i < amount; i++) {
    
    let item = document.createElement('div');
    item.setAttribute('class', 'item');
    item.style.backgroundColor = '#'+ getRandomInt(0, 999);
    root.appendChild(item);
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}