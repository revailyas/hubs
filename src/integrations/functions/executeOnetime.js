function executeOnetime(func, funcID) {
  const now = new Date();
  let prev = null;
  if (window.hasOwnProperty(funcID)) {
    prev = window[`${funcID}`];
  }

  if (prev != null) {
    const seconds = (now.getTime() - prev.getTime()) / 1000;
    console.log(seconds);

    if (seconds > 0.5) {
      console.log("execute function!");
      func();
      window[`${funcID}`] = new Date();
    }
  } else {
    console.log("execute function!");
    func();
    window[`${funcID}`] = new Date();
  }
}

export default executeOnetime;
