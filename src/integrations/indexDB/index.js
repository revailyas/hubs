function getObjectStore(name, mode) {
  const tx = window.APP.Storage.transaction(name, mode);
  return tx.objectStore(name);
}

function clearObjectStore(name) {
  const store = getObjectStore(name, "readwrite", window.APP.Storage);

  if (store) {
    const req = store.clear();
    req.onsuccess = () => {
      console.log("clear object store success");
    };
    req.onerror = e => {
      console.error("clear object store: ", e.target.errorCode);
    };
  }
}
function createDBStore(storeName) {
  window.APP.Storage.createObjectStore(storeName, {
    autoIncrement: true
  });
}

export async function initLocalDatabase() {
  return await new Promise(resolve => {
    if (!window.indexedDB) {
      console.log(`Your browser doesn't support IndexedDB`);
      resolve(false);
    } else {
      let isUpdated = false;
      console.log(`Your browser support IndexedDB`);
      const request = indexedDB.open("scene", 11);
      request.onerror = event => {
        console.error(`Database error: ${event.target.errorCode}`);
      };

      request.onsuccess = event => {
        console.log("idexed db succes opened");
        console.log("db ready");
        window.APP.Storage = event.target.result;

        //console.log("is DB Updated : " + isUpdated);

        if (isUpdated) {
          clearObjectStore("Models", window.APP.Storage);
        }
        resolve(true);
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;
        window.APP.Storage = db;
        if (!db.objectStoreNames.contains("Models")) {
          createDBStore("Models");
        }

        if (!db.objectStoreNames.contains("Projects")) {
          createDBStore("Projects");
        }
        if (!db.objectStoreNames.contains("Images")) {
          createDBStore("Images");
        }

        isUpdated = true;
      };
    }
  });
}

export async function insertModel(model) {
  const txn = window.APP.Storage.transaction("Models", "readwrite");

  const models = txn.objectStore("Models");
  //
  const query = models.put(model, model.id);

  query.onsuccess = function(event) {
    //console.log(event);
  };

  // handle the error case
  query.onerror = function(event) {
    //console.log(event.target.errorCode);
  };

  // close the database once the
  // transaction completes
  txn.oncomplete = function() {
    //db.close();
  };
}

export async function removeModel(model) {
  const txn = window.APP.Storage.transaction("Models", "readwrite");

  const models = txn.objectStore("Models");
  //
  const query = models.delete(model.id);

  query.onsuccess = function(event) {
    //console.log(event);
  };

  // handle the error case
  query.onerror = function(event) {
    //console.log(event.target.errorCode);
  };

  // close the database once the
  // transaction completes
  txn.oncomplete = function() {
    //db.close();
  };
}

export async function insertProject(project) {
  const txn = window.APP.Storage.transaction("Projects", "readwrite");

  const projects = txn.objectStore("Projects");
  //
  const query = projects.put(project, project.id);

  query.onsuccess = function(event) {
    //(event);
  };

  query.onerror = function(event) {
    //console.log(event.target.errorCode);
  };
}

export async function insertImage(image) {
  const txn = window.APP.Storage.transaction("Images", "readwrite");

  const images = txn.objectStore("Images");
  //
  const query = images.put(image, image.id);

  query.onsuccess = function(event) {
    //console.log("save image to local success");
    //console.log(event);
  };

  // handle the error case
  query.onerror = function(event) {
    //console.log("save image to local failed");
    //console.log(event.target.errorCode);
  };

  // close the database once the
  // transaction completes
  txn.oncomplete = function() {
    //db.close();
  };
}

export async function getModelByID(id) {
  return await new Promise(resolve => {
    try {
      const txn = window.APP.Storage.transaction("Models", "readonly");
      const store = txn.objectStore("Models");

      const query = store.get(id);
      //console.log(query);
      query.onsuccess = event => {
        if (!event.target.result) {
          //console.log(`The model with ${id} not found`);
          resolve(null);
        } else {
          const buffer = event.target.result;
          resolve(buffer);
        }
      };

      query.onerror = event => {
        console.log(event.target.errorCode);
        resolve(null);
      };
    } catch (error) {
      resolve(null);
    }
  });
}

export async function getProjectByID(id) {
  return await new Promise(resolve => {
    try {
      const txn = window.APP.Storage.transaction("Projects", "readonly");
      const store = txn.objectStore("Projects");

      const query = store.get(id);
      query.onsuccess = event => {
        if (!event.target.result) {
          //console.log(`The project with ${id} not found`);
          resolve(null);
        } else {
          const buffer = event.target.result;
          resolve(buffer);
        }
      };

      query.onerror = event => {
        //console.log(event.target.errorCode);
        resolve(null);
      };
    } catch (error) {
      resolve(null);
    }
  });
}

export async function getImageByID(id) {
  return await new Promise(resolve => {
    try {
      const txn = window.APP.Storage.transaction("Images", "readonly");
      const store = txn.objectStore("Images");
      const query = store.get(id);
      query.onsuccess = event => {
        if (!event.target.result) {
          //console.log(`The images with ${id} not found`);
          resolve(null);
        } else {
          const buffer = event.target.result;
          //console.log(buffer);
          resolve(buffer);
        }
      };

      query.onerror = event => {
        //console.log(event.target.errorCode);
        resolve(null);
      };
    } catch (error) {
      resolve(null);
    }
  });
}

export const urlToBase64 = async imgUrl => {
  return await new Promise(resolve => {
    const img = new Image();

    img.crossOrigin = "Anonymous";
    img.src = `${imgUrl}?time=${window.acCacheTime}`;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const dataURL = canvas.toDataURL("image/png"),
        dataUrl = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
      resolve(dataUrl);
    };
  });
};
