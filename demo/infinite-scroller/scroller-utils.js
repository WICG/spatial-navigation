function addBoxes(root, amount, dir) {
  const cnt = root.childElementCount;
  let initCnt = 0;
  let endCnt = 0;

  if (cnt) {
    initCnt = parseInt(root.firstChild.innerText);
    endCnt = parseInt(root.lastChild.innerText);
  }

  for (let i = 1; i <= amount; i++) {
    let temp = document.createElement('div');
    temp.setAttribute('class', 'item');
    temp.setAttribute('tabindex', 0);
    let para = document.createElement('p');
    temp.appendChild(para);

    if (dir === 'up') {
      para.appendChild(document.createTextNode(`${initCnt - i}`));
      root.prepend(temp);
    } else {
      para.appendChild(document.createTextNode(`${endCnt + i}`));
      root.append(temp);
    }   
  }

  return new Promise(function (resolve) {
    resolve(cnt + amount);
  });
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
