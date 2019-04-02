let resultIndex = 1;

function testInit() {
  const resultNode = document.createElement('div');
  resultNode.id = 'result';
  document.body.appendChild(resultNode);
}

function testRun(func, description) {
  try {
    func();
    addResult ('SUCCESS', description);
  } catch (error) {
    addResult ('FAIL', description, error);
  }
}

function addResult (success, description, error) {
  const resultNode = document.querySelector('#result');
  const testResult = document.createElement('div');
  const testDes1 = document.createElement('span');
  const testDes2 = document.createElement('span');
  const testDes3 = document.createElement('span');
  testDes1.innerText = resultIndex++ + '.' + success;
  testDes2.innerText = description;

  testResult.appendChild(testDes1);
  testResult.appendChild(testDes2);
  if (error) {
    testDes1.className = 'fail';
    testDes3.innerText = error;
    testDes3.className = 'error';
    testResult.appendChild(testDes3);
  }
  resultNode.appendChild(testResult);
}

function getString (obj) {
  if(!obj || typeof obj !== "object")
    return obj;
  else if ("nodeType" in obj && "nodeName" in obj && "nodeValue" in obj && "childNodes" in obj)
    return obj.outerHTML.substr(0,60) + '...';
  return obj.toString();
}

function assert_equals(actual, expected) {
  if (actual !== expected)
    throw `assert_equals: expected ${getString(expected)} but got  ${getString(actual)}`;
}

function assert_not_equals(actual, expected) {
  if (actual === expected)
    throw `assert_not_equals: dose not expected ${getString(expected)} but got  ${getString(actual)}`;
}
