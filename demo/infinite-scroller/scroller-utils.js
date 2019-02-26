function addBoxes(root, amount) {
  let cnt = root.childElementCount;
  for (let i = 0; i < amount; i++) {
    let temp = document.createElement('div');
    temp.setAttribute('class', 'item');
    temp.setAttribute('tabindex', 0);
    let para = document.createElement('p');
    para.appendChild(document.createTextNode(`${i + 1 + cnt}`));
    temp.appendChild(para);
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
    addBoxes(root, amount - childNum);
  }
}
