import axios from "axios";
import JSZip from "jszip";
import base64 from "base64-js";
import mcrypt from "js-rijndael";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
var Buffer = require("buffer").Buffer;

const blrInfoExtractor = blrID => {
  const componentType = blrID.split("_")[0];
  const directory = componentType === "1" ? "UserComponents/" : "PublicComponents";
  const userID = blrID.split("_")[1];
  return `https://asset.asblr.app/${directory}/${userID}/${blrID}.blr`;
};

async function loadBLRFileByURL(url) {
  return await new Promise(async resolve => {
    const buffer = await downloadBLRObject(url);
    const data = await parsingZipFile(buffer);
    console.log({ data });

    const mesh = await loadModelToScene(data);
    loadMaterial(mesh, data);
    resolve(mesh);
  });
}

async function loadBLRFile(blrID) {
  return await new Promise(async resolve => {
    const userID = blrID.split("_")[1];
    const componentType = blrID.split("_")[0];

    const directory = componentType === "1" ? "UserComponents/" : "PublicComponents";

    const downloadPATH = `https://asset.asblr.app/${directory}/${userID}/${blrID}.blr`;
    console.log({ userID, componentType, downloadPATH });
    const buffer = await downloadBLRObject(downloadPATH);
    const data = await parsingZipFile(buffer);
    console.log({ data });

    const mesh = await loadModelToScene(data);
    loadMaterial(mesh, data);
    resolve(mesh);
  });
}

async function downloadBLRObject(projectPath) {
  return await new Promise(resolve => {
    axios
      .get(projectPath, {
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/pblr"
        },
        onDownloadProgress: progressEvent => {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(percentage);
        }
      })
      .then(async res => {
        var buffer = new Uint8Array(res.data);
        resolve(buffer);
      })
      .catch(async err => {
        console.log(err);
        resolve(null);
      });
  });
}

async function parsingZipFile(buffer) {
  return await new Promise(async resolve => {
    await JSZip.loadAsync(buffer).then(async function(zip) {
      let resObject = {};
      let tempInfo = await zip.file("info").async("base64");
      resObject.info = tempInfo;

      let tempCreator = await zip.file("creator").async("base64");
      resObject.creator = tempCreator;

      let tempBlr3dContent = await zip.file("blr3dcontent").async("base64");
      resObject.blr3dcontent = tempBlr3dContent;

      try {
        let blrx = await zip.file("blrx").async("arraybuffer");
        resObject.blrx = blrx;
      } catch (error) {
        console.log("not contain blrx file");
      }

      let tempMetadata = await zip.file("metadata.data").async("string");
      resObject.metadata = JSON.parse(JSON.stringify(eval("(" + tempMetadata + ")")));

      let tempBlrversion = await zip.file("blrversion").async("string");
      resObject.blrversion = JSON.parse(JSON.stringify(eval("(" + tempBlrversion + ")")));

      let tempAnimationData = await zip.file("animationdata").async("string");
      resObject.animationdata = JSON.parse(JSON.stringify(eval("(" + tempAnimationData + ")")));

      try {
        let tempMaterialistData = await zip.file("materiallistdata").async("base64");
        resObject.materialistdata = tempMaterialistData;
      } catch (error) {}
      if (zip.folder("materialdata") !== null) {
        await Promise.all(
          Object.values(zip.folder("materialdata")["files"]).map(async file => {
            if (zip.file("materialdata/" + file.name.split("/").pop()) !== null) {
              let matData = await zip.file("materialdata/" + file.name.split("/").pop()).async("string");
              let tempMatData = JSON.parse(JSON.stringify(eval("(" + matData + ")")));
              resObject["textureaddress" + tempMatData.objectName] = tempMatData.materialNames;
              for (var index = 0; index < tempMatData.materialNames.length; index++) {
                if (zip.file("materials/" + tempMatData.materialNames[index] + ".txt") !== null) {
                  let tempMaterialData = await zip
                    .file("materials/" + tempMatData.materialNames[index] + ".txt")
                    .async("string");
                  resObject["materialdata" + tempMatData.materialNames[index]] = tempMaterialData;
                  let tempTextureData = JSON.parse(JSON.stringify(eval("(" + tempMaterialData + ")")));

                  for (let k = 0; k < tempTextureData.materialTexProperties.length; k++) {
                    let tempTexture = await zip
                      .file("textures/" + tempTextureData.materialTexProperties[k].imageId + ".png")
                      .async("base64");
                    let textureName = tempTextureData.materialTexProperties[k].imageId;

                    resObject["texture" + textureName] = tempTexture;
                  }
                }
              }
            }
          })
        );
      }
      resolve(resObject);
    });
  });
}

async function loadModelToScene(objectInfo) {
  return await new Promise(async resolve => {
    let combinedArray, buffer, ab;
    let ivdata = objectInfo["info"].substring(objectInfo["info"].length - 24, objectInfo["info"].length - 2) + "==";
    let keyData =
      objectInfo["creator"].substring(objectInfo["creator"].length - 44, objectInfo["creator"].length - 1) + "=";
    var dataBlrObject = objectInfo["blr3dcontent"];
    var key = [].slice.call(base64.toByteArray(keyData));
    var iv = [].slice.call(base64.toByteArray(ivdata));
    var message = [].slice.call(base64.toByteArray(dataBlrObject));
    const blrVersion = parseInt(objectInfo.blrversion.fileAccessorV);

    var clearText = mcrypt.decrypt(message, iv, key, "rijndael-128", "cbc");

    buffer = await Buffer.from(clearText);

    var clearTextOffset = blrVersion === 5 ? 2 : 17;
    ab = await new ArrayBuffer(clearText.length - clearTextOffset);

    var view = await new Uint8Array(ab);

    let newArray = Array(clearText.length - clearTextOffset);
    let arrayIndex = 0;

    for (var item of newArray) {
      view[arrayIndex] = await buffer[arrayIndex];
      arrayIndex++;
    }
    if (blrVersion === 5) {
      const blrxData = objectInfo["blrx"];
      const blrx = new Buffer.from(blrxData);
      const tempAB = new Uint8Array(ab);
      combinedArray = Buffer.from([...blrx.slice(0, 6782), ...tempAB, ...blrx.slice(6782, blrx.byteLength - 17)])
        .buffer;
    }
    const manager = new THREE.LoadingManager();
    const loader = new FBXLoader(manager);
    const mesh = await loader.parse(blrVersion === 5 ? combinedArray : ab);

    resolve(mesh);
  });
  //ENCRYPT DECODED DATA ON STORAGE
}

function loadMaterial(model, objectInfo) {
  model.traverse(mesh => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (mesh.isMesh) {
      mesh.traverse(async meshChild => {
        meshChild.castShadow = true;
        meshChild.receiveShadow = true;
        var materialName = "";
        if (meshChild.hasOwnProperty("material") && meshChild.material[1]) {
          await multiMaterialParser(meshChild, objectInfo);
        } else if (meshChild.hasOwnProperty("material")) {
          if (meshChild.material.name) {
            materialName = meshChild.material.name;
          } else {
            const name = meshChild.name;
            const keyList = Object.keys(objectInfo);
            keyList.forEach(el => {
              let formatedName = "";

              //REMOVE DOT FROM MATERIAL NAME
              for (let x = 0; x < el.length; x++) {
                if (el[x] !== ".") {
                  formatedName += el[x];
                }
              }
              if (el === "textureaddress" + meshChild.name || formatedName === "textureaddress" + name) {
                materialName = objectInfo[`${el}`][0];
              }
            });
          }
          await materialParser(materialName, meshChild, objectInfo);
        }
      });
    }
  });
}

async function materialParser(materialName, meshChild, objectInfo) {
  let materialProperties;
  if (objectInfo.hasOwnProperty("materialdata" + materialName)) {
    materialProperties = JSON.parse(JSON.stringify(eval("(" + objectInfo["materialdata" + materialName] + ")")));

    let metallness,
      glossiness = 0;
    const shaderType = materialProperties.shader.toLowerCase();
    let materialColor = new THREE.Color(0xffffff);
    let materialAlpha = 1;

    if (materialProperties.hasOwnProperty("materialColorProperties")) {
      materialColor = new THREE.Color(
        materialProperties.materialColorProperties[0].x,
        materialProperties.materialColorProperties[0].y,
        materialProperties.materialColorProperties[0].z
      );
    }

    let mainMaterialCursor, mainTexture;
    if (
      materialProperties.hasOwnProperty("materialTexIds") &&
      materialProperties.hasOwnProperty("materialTexProperties") &&
      materialProperties.materialTexIds.length > 0
    ) {
      materialProperties.materialTexIds.forEach((el, index) => {
        if (el === "_MainTex") mainMaterialCursor = index;
      });

      if (mainMaterialCursor >= 0) {
        const mainMaterialAddress = materialProperties.materialTexProperties[mainMaterialCursor].imageId;
        const imageBase64 = objectInfo["texture" + mainMaterialAddress];
        if (imageBase64) mainTexture = new THREE.TextureLoader().load("data:image/png;base64," + imageBase64);
      }
    }

    meshChild.material.color = materialColor;
    meshChild.material.map = null;
    let alphaProperties1;
    //if(!mainTexture) return
    switch (shaderType) {
      case "mobile/diffusetint":
        meshChild.material = new THREE.MeshPhongMaterial({
          color: materialColor,
          side: THREE.FrontSide,
          transparent: false
        });
        if (mainTexture) meshChild.material.map = mainTexture;
        meshChild.material.needsUpdate = true;
        break;
      case "unlit/texture":
        meshChild.material = new THREE.MeshBasicMaterial({
          color: materialColor,
          side: THREE.FrontSide
        });

        if (mainTexture) meshChild.material.map = mainTexture;
        meshChild.material.needsUpdate = true;
        break;
      case "standard":
        if (materialProperties.hasOwnProperty("materialFloatIds") && materialProperties.materialFloatIds.length > 0) {
          materialProperties.materialFloatIds.forEach((element, index) => {
            if (element === "_Glossiness") {
              glossiness = 1 - materialProperties.materialFloatProperties[index];
            } else if (element === "_Metallic") {
              metallness = materialProperties.materialFloatProperties[index];
            }
          });
        }

        meshChild.material = new THREE.MeshStandardMaterial({
          color: materialColor,
          side: THREE.FrontSide,
          metalness: metallness,
          roughness: glossiness
        });

        if (mainTexture) meshChild.material.map = mainTexture;

        if (materialProperties.hasOwnProperty("materialTexIds") && materialProperties.materialTexIds.length > 1) {
          materialProperties.materialTexIds.forEach((el, index) => {
            if (el === "_BumpMap") {
              const bumpMapBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
              const bumpMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + bumpMapBase64);
              meshChild.material.normalMap = bumpMapTexture;
            } else if (el === "_MetallicGlossMap") {
              const metalMaBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
              const metalMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + metalMaBase64);
              meshChild.material.metalnessMap = metalMapTexture;
            } else if (el === "_OcclusionMap") {
              const occlusionMapBase64 =
                objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
              const occlusionMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + occlusionMapBase64);
              meshChild.material.aoMap = occlusionMapTexture;
            }
          });
        }
        meshChild.material.needsUpdate = true;
        break;
      case "standardcustom/transparent":
        if (materialProperties.hasOwnProperty("materialFloatIds") && materialProperties.materialFloatIds.length > 0) {
          materialProperties.materialFloatIds.forEach((element, index) => {
            if (element === "_Glossiness") {
              glossiness = 1 - materialProperties.materialFloatProperties[index];
            } else if (element === "_Metallic") {
              metallness = materialProperties.materialFloatProperties[index] + 0.5;
            }
          });
        }

        alphaProperties1 = materialProperties.materialColorProperties[0].w;
        materialAlpha = alphaProperties1;
        if (materialAlpha < 0.6) {
          materialAlpha = 0.6;
        }

        meshChild.material = new THREE.MeshStandardMaterial({
          color: materialColor,
          side: THREE.DoubleSide,
          metalness: metallness,
          roughness: glossiness,
          transparent: true,
          alphaTest: 0.2,
          opacity: materialAlpha
        });

        meshChild.material.persistentOpacity = materialAlpha;
        if (mainTexture) meshChild.material.map = mainTexture;
        break;
      case "standardcustom/transparent2":
        if (materialProperties.hasOwnProperty("materialFloatIds") && materialProperties.materialFloatIds.length > 0) {
          materialProperties.materialFloatIds.forEach((element, index) => {
            if (element === "_Glossiness") {
              glossiness = 1 - materialProperties.materialFloatProperties[index];
            } else if (element === "_Metallic") {
              metallness = materialProperties.materialFloatProperties[index] + 0.5;
            }
          });
        }

        alphaProperties1 = materialProperties.materialColorProperties[0].w;
        materialAlpha = alphaProperties1;

        if (materialAlpha < 0.6) {
          materialAlpha = 0.6;
        }

        meshChild.material = new THREE.MeshStandardMaterial({
          color: materialColor,
          side: THREE.DoubleSide,
          metalness: metallness,
          roughness: glossiness,
          transparent: true,
          alphaTest: 0.2,
          opacity: materialAlpha
        });

        meshChild.material.persistentOpacity = materialAlpha;
        if (mainTexture) meshChild.material.map = mainTexture;
        break;
      case "assemblr/alphamask":
        if (materialProperties.hasOwnProperty("materialFloatIds") && materialProperties.materialFloatIds.length > 0) {
          materialProperties.materialFloatIds.forEach((element, index) => {
            if (element === "_Glossiness") {
              glossiness = 1 - materialProperties.materialFloatProperties[index];
            } else if (element === "_Metallic") {
              metallness = materialProperties.materialFloatProperties[index] + 0.5;
            }
          });
        }

        alphaProperties1 = materialProperties.materialColorProperties[0].w;
        materialAlpha = alphaProperties1;
        meshChild.material = new THREE.MeshStandardMaterial({
          color: materialColor,
          side: THREE.DoubleSide,
          metalness: metallness,
          roughness: glossiness,
          transparent: true,
          alphaTest: 0.2,
          opacity: materialAlpha
        });

        meshChild.material.persistentOpacity = materialAlpha;
        if (mainTexture) meshChild.material.map = mainTexture;
        if (materialProperties.hasOwnProperty("materialTexIds") && materialProperties.materialTexIds.length > 1) {
          materialProperties.materialTexIds.forEach((el, index) => {
            if (el === "_BumpMap") {
              const bumpMapBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
              const bumpMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + bumpMapBase64);
              meshChild.material.normalMap = bumpMapTexture;
            } else if (el === "_MetallicGlossMap") {
              const metalMaBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
              const metalMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + metalMaBase64);
              meshChild.material.metalnessMap = metalMapTexture;
            } else if (el === "_OcclusionMap") {
              const occlusionMapBase64 =
                objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
              const occlusionMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + occlusionMapBase64);
              meshChild.material.aoMap = occlusionMapTexture;
            } else if (el === "_AlphaMap") {
              const alphaMapBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
              const alphaMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + alphaMapBase64);
              meshChild.material.alphaMap = alphaMapTexture;
            }
          });
        }
        break;
      default:
        break;
    }
  }
}

async function multiMaterialParser(meshChild, objectInfo) {
  let materialProperties;

  meshChild.material.forEach((mat, index) => {
    if (objectInfo.hasOwnProperty("materialdata" + mat.name)) {
      materialProperties = JSON.parse(JSON.stringify(eval("(" + objectInfo["materialdata" + mat.name] + ")")));

      let metallness,
        glossiness = 0;
      const shaderType = materialProperties.shader.toLowerCase();
      let materialColor = new THREE.Color(0xffffff);
      let materialAlpha = 1;

      if (materialProperties.hasOwnProperty("materialColorProperties")) {
        materialColor = new THREE.Color(
          materialProperties.materialColorProperties[0].x,
          materialProperties.materialColorProperties[0].y,
          materialProperties.materialColorProperties[0].z
        );
        materialAlpha = materialProperties.materialColorProperties[0].w;
      }

      let mainMaterialCursor, mainTexture;
      if (
        materialProperties.hasOwnProperty("materialTexIds") &&
        materialProperties.hasOwnProperty("materialTexProperties") &&
        materialProperties.materialTexIds.length > 0
      ) {
        materialProperties.materialTexIds.forEach((el, index) => {
          if (el === "_MainTex") mainMaterialCursor = index;
        });

        if (mainMaterialCursor >= 0) {
          const mainMaterialAddress = materialProperties.materialTexProperties[mainMaterialCursor].imageId;
          const imageBase64 = objectInfo["texture" + mainMaterialAddress];
          if (imageBase64) mainTexture = new THREE.TextureLoader().load("data:image/png;base64," + imageBase64);
          mainTexture.mapping = THREE.EquirectangularReflectionMapping;
          mainTexture.wrapS = THREE.RepeatWrapping;
          mainTexture.wrapT = THREE.RepeatWrapping;
        }
      }
      switch (shaderType) {
        case "mobile/diffusetint":
          meshChild.material[index] = new THREE.MeshPhongMaterial({
            color: materialColor,
            side: THREE.FrontSide
          });

          if (mainTexture) meshChild.material[index].map = mainTexture;
          meshChild.material[index].needsUpdate = true;
          break;
        case "unlit/texture":
          meshChild.material[index] = new THREE.MeshBasicMaterial({
            color: materialColor,
            side: THREE.FrontSide
          });

          if (mainTexture) meshChild.material[index].map = mainTexture;
          meshChild.material[index].needsUpdate = true;
          break;
        case "standard":
          if (materialProperties.hasOwnProperty("materialFloatIds") && materialProperties.materialFloatIds.length > 0) {
            materialProperties.materialFloatIds.forEach((element, index) => {
              if (element === "_Glossiness") {
                glossiness = 1 - materialProperties.materialFloatProperties[index];
              } else if (element === "_Metallic") {
                metallness = materialProperties.materialFloatProperties[index];
              }
            });
          }

          meshChild.material[index] = new THREE.MeshStandardMaterial({
            color: materialColor,
            side: THREE.FrontSide,
            metalness: metallness,
            roughness: glossiness
          });

          if (mainTexture) meshChild.material[index].map = mainTexture;

          if (materialProperties.hasOwnProperty("materialTexIds") && materialProperties.materialTexIds.length > 1) {
            materialProperties.materialTexIds.forEach((el, index) => {
              if (el === "_BumpMap") {
                const bumpMapBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const bumpMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + bumpMapBase64);
                meshChild.material[index].normalMap = bumpMapTexture;
              } else if (el === "_MetallicGlossMap") {
                const metalMaBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const metalMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + metalMaBase64);
                meshChild.material[index].metalnessMap = metalMapTexture;
              } else if (el === "_OcclusionMap") {
                const occlusionMapBase64 =
                  objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const occlusionMapTexture = new THREE.TextureLoader().load(
                  "data:image/png;base64," + occlusionMapBase64
                );
                meshChild.material[index].aoMap = occlusionMapTexture;
              }
            });
          }
          meshChild.material[index].needsUpdate = true;
          break;
        case "standardcustom/transparent":
          if (materialProperties.hasOwnProperty("materialFloatIds") && materialProperties.materialFloatIds.length > 0) {
            materialProperties.materialFloatIds.forEach((element, index) => {
              if (element === "_Glossiness") {
                glossiness = 1 - materialProperties.materialFloatProperties[index];
              } else if (element === "_Metallic") {
                metallness = materialProperties.materialFloatProperties[index];
              }
            });
          }

          materialAlpha = materialProperties.materialColorProperties[0].w;

          if (materialAlpha < 0.6) {
            materialAlpha = 0.6;
          } else if (materialAlpha === 1) {
            materialAlpha = 0.8;
          }

          meshChild.material[index] = new THREE.MeshStandardMaterial({
            color: materialColor,
            side: THREE.FrontSide,
            metalness: metallness,
            roughness: glossiness,
            transparent: true,
            opacity: materialAlpha
          });

          meshChild.material[index].persistentOpacity = materialAlpha;

          if (mainTexture) meshChild.material[index].map = mainTexture;

          if (materialProperties.hasOwnProperty("materialTexIds") && materialProperties.materialTexIds.length > 1) {
            materialProperties.materialTexIds.forEach((el, index) => {
              if (el === "_BumpMap") {
                const bumpMapBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const bumpMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + bumpMapBase64);
                meshChild.material[index].normalMap = bumpMapTexture;
              } else if (el === "_MetallicGlossMap") {
                const metalMaBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const metalMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + metalMaBase64);
                meshChild.material[index].metalnessMap = metalMapTexture;
              } else if (el === "_OcclusionMap") {
                const occlusionMapBase64 =
                  objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const occlusionMapTexture = new THREE.TextureLoader().load(
                  "data:image/png;base64," + occlusionMapBase64
                );
                meshChild.material[index].aoMap = occlusionMapTexture;
              }
            });
          }
          meshChild.material[index].needsUpdate = true;
          break;
        case "standardcustom/transparent2":
          if (materialProperties.hasOwnProperty("materialFloatIds") && materialProperties.materialFloatIds.length > 0) {
            materialProperties.materialFloatIds.forEach((element, index) => {
              if (element === "_Glossiness") {
                glossiness = 1 - materialProperties.materialFloatProperties[index];
              } else if (element === "_Metallic") {
                metallness = materialProperties.materialFloatProperties[index];
              }
            });
          }

          materialAlpha = materialProperties.materialColorProperties[0].w;

          if (materialAlpha < 0.6) {
            materialAlpha = 0.6;
          } else if (materialAlpha === 1) {
            materialAlpha = 0.8;
          }

          meshChild.material[index] = new THREE.MeshStandardMaterial({
            color: materialColor,
            side: THREE.FrontSide,
            metalness: metallness,
            roughness: glossiness,
            transparent: true,
            opacity: materialAlpha
          });

          meshChild.material[index].persistentOpacity = materialAlpha;

          if (mainTexture) meshChild.material[index].map = mainTexture;

          if (materialProperties.hasOwnProperty("materialTexIds") && materialProperties.materialTexIds.length > 1) {
            materialProperties.materialTexIds.forEach((el, index) => {
              if (el === "_BumpMap") {
                const bumpMapBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const bumpMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + bumpMapBase64);
                meshChild.material[index].normalMap = bumpMapTexture;
              } else if (el === "_MetallicGlossMap") {
                const metalMaBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const metalMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + metalMaBase64);
                meshChild.material[index].metalnessMap = metalMapTexture;
              } else if (el === "_OcclusionMap") {
                const occlusionMapBase64 =
                  objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const occlusionMapTexture = new THREE.TextureLoader().load(
                  "data:image/png;base64," + occlusionMapBase64
                );
                meshChild.material[index].aoMap = occlusionMapTexture;
              }
            });
          }
          meshChild.material[index].needsUpdate = true;
          break;
        case "assemblr/alphamask":
          if (materialProperties.hasOwnProperty("materialFloatIds") && materialProperties.materialFloatIds.length > 0) {
            materialProperties.materialFloatIds.forEach((element, index) => {
              if (element === "_Glossiness") {
                glossiness = 1 - materialProperties.materialFloatProperties[index];
              } else if (element === "_Metallic") {
                metallness = materialProperties.materialFloatProperties[index];
              }
            });
          }

          meshChild.material[index] = new THREE.MeshStandardMaterial({
            color: materialColor,
            side: THREE.FrontSide,
            metalness: metallness,
            roughness: glossiness
          });

          if (mainTexture) meshChild.material[index].map = mainTexture;

          if (materialProperties.hasOwnProperty("materialTexIds") && materialProperties.materialTexIds.length > 1) {
            materialProperties.materialTexIds.forEach((el, index) => {
              if (el === "_BumpMap") {
                const bumpMapBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const bumpMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + bumpMapBase64);
                meshChild.material[index].normalMap = bumpMapTexture;
              } else if (el === "_MetallicGlossMap") {
                const metalMaBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const metalMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + metalMaBase64);
                meshChild.material[index].metalnessMap = metalMapTexture;
              } else if (el === "_OcclusionMap") {
                const occlusionMapBase64 =
                  objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const occlusionMapTexture = new THREE.TextureLoader().load(
                  "data:image/png;base64," + occlusionMapBase64
                );
                meshChild.material[index].aoMap = occlusionMapTexture;
              } else if (el === "_AlphaMap") {
                const alphaMapBase64 = objectInfo["texture" + materialProperties.materialTexProperties[index].imageId];
                const alphaMapTexture = new THREE.TextureLoader().load("data:image/png;base64," + alphaMapBase64);
                meshChild.material[index].alphaMap = alphaMapTexture;
              }
            });
          }
          meshChild.material[index].needsUpdate = true;
          break;

        default:
          break;
      }
    }
  });
}
export { loadBLRFile, loadBLRFileByURL, blrInfoExtractor };
