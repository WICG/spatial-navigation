function addBoxes(root, amount) {
  for (let i = 0; i < amount; i++) {
    let temp = document.createElement('div');
    temp.setAttribute('class', 'item');
    temp.setAttribute('tabindex', 0);
    root.appendChild(temp);
  }
}

function updateBoxes(root, amount) {
  const childNum = root.childElementCount;

  if (childNum > amount) {
    for (let i = 0; i < childNum - amount; i++) {
      root.removeChild(root.lastChild);
    }
  }
  else {
    addBoxes(root, amount);
  }
}