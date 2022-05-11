import axios from "axios";
import JSZip from "jszip";
import base64 from "base64-js";
import mcrypt from "js-rijndael";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE from "three";
import { getModelByID, insertModel } from "../indexDB";
const Buffer = require("buffer").Buffer;

const getBLRID = urlPath => {
  const array = urlPath.split("/");
  const result = array[array.length - 1];
  return result;
};

function generateHash(length) {
  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const blrInfoExtractor = blrID => {
  let componentType, directory, userID, projectPath;
  if (blrID.includes("_blrf-")) {
    componentType = blrID.split("_")[0];
    directory = componentType === "1" ? "UserComponents" : "PublicComponents";
    userID = blrID.split("_")[1];
    projectPath = `https://asset.asblr.app/${directory}/${userID}/${blrID}.blr`;
  } else {
    projectPath = "https://asset.asblr.app/assets-2020-12-28/web/" + blrID.split("_")[1] + "/" + blrID + ".blr";
  }
  return projectPath;
};

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
        meshChild.material = new THREE.MeshStandardMaterial({
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
      } catch (error) {}

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

async function downloadBLRObject(projectPath) {
  return await new Promise(resolve => {
    axios
      .get(projectPath, {
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/pblr"
        }
        // onDownloadProgress: (progressEvent) => {
        //   const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        // }
      })
      .then(async res => {
        const buffer = new Uint8Array(res.data);
        resolve(buffer);
      })
      .catch(async err => {
        console.log(err);
        resolve(null);
      });
  });
}

async function loadMaterial(model, objectInfo) {
  model.traverse(mesh => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (mesh.isMesh) {
      mesh.traverse(async meshChild => {
        meshChild.castShadow = true;
        meshChild.receiveShadow = true;
        let materialName = "";
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

function measureRunningTime(name, startTime) {
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  if (!window.totalLoadTime) window.totalLoadTime = 0;
  window.totalLoadTime += totalTime;
}

async function loadModelToScene(objectInfo, modelID, fromLocal) {
  return await new Promise(async resolve => {
    let combinedArray, ab;
    let startTime = performance.now();

    const blrVersion = parseInt(objectInfo.blrversion.fileAccessorV);
    if (!fromLocal) {
      const ivdata = objectInfo["info"].substring(objectInfo["info"].length - 24, objectInfo["info"].length - 2) + "==";
      const keyData =
        objectInfo["creator"].substring(objectInfo["creator"].length - 44, objectInfo["creator"].length - 1) + "=";
      const dataBlrObject = objectInfo["blr3dcontent"];
      const key = [].slice.call(base64.toByteArray(keyData));
      const iv = [].slice.call(base64.toByteArray(ivdata));
      const message = [].slice.call(base64.toByteArray(dataBlrObject));
      measureRunningTime("decrypt process", startTime);
      startTime = performance.now();
      const clearText = await mcrypt.decrypt(message, iv, key, "rijndael-128", "cbc");

      measureRunningTime("copy bufer 1", startTime);
      startTime = performance.now();
      const buffer = await Buffer.from(clearText);

      measureRunningTime("copy bufer 2", startTime);
      startTime = performance.now();
      const clearTextOffset = blrVersion === 5 ? 2 : 17;

      measureRunningTime("copy bufer 3", startTime);
      startTime = performance.now();
      ab = await new ArrayBuffer(clearText.length - clearTextOffset);

      measureRunningTime("copy bufer 4", startTime);
      startTime = performance.now();
      const view = await new Uint8Array(ab);

      measureRunningTime("copy bufer 5", startTime);
      startTime = performance.now();
      const newArray = Array(clearText.length - clearTextOffset);
      let arrayIndex = 0;

      measureRunningTime("copy bufer 6", startTime);
      startTime = performance.now();
      for (const item of newArray) {
        view[arrayIndex] = await buffer[arrayIndex];
        arrayIndex++;
      }

      if (blrVersion === 5) {
        measureRunningTime("copy bufer 7", startTime);
        startTime = performance.now();
        const blrxData = objectInfo["blrx"];
        const blrx = new Buffer.from(blrxData);
        const tempAB = new Uint8Array(ab);
        combinedArray = Buffer.from([...blrx.slice(0, 6782), ...tempAB, ...blrx.slice(6782, blrx.byteLength - 17)])
          .buffer;
        measureRunningTime("copy bufer 8", startTime);
        startTime = performance.now();
      }

      const limit = 1000;
      const treshold = 700;
      const modelData = {
        ...objectInfo,
        blr3dcontent: {},
        id: modelID,

        updatedTime: objectInfo.updatedTime
      };

      if (blrVersion === 5) delete modelData.blrx;

      let decoyIndex = 0;

      //ENCRYPT DECODED DATA ON STORAGE
      for (let x = 0; x <= limit; x++) {
        const key = generateHash(32);
        const decoyBuffer = await new ArrayBuffer(500);
        const decoy = await new Uint8Array(decoyBuffer);

        const decoyArray = Array(500);

        let indexs, items;
        for ([indexs, items] of decoyArray.entries()) {
          //decoy[decoyIndex] = Math.random() * (126 - 32) + 32;
          decoy[indexs] = await buffer[decoyIndex];
          decoyIndex++;
        }
        modelData.blr3dcontent[key] = decoyBuffer;
        if (x === treshold) {
          if (blrVersion === 5) {
            modelData.blr3dcontent["havf75vx7mycl72zkf7ru88s0g38bv6w"] = combinedArray;
          } else {
            modelData.blr3dcontent["havf75vx7mycl72zkf7ru88s0g38bv6w"] = ab;
          }

          decoyIndex = 0;
        }
      }
      if (modelID) {
        insertModel(modelData);
      }
    } else {
      if (blrVersion === 5) {
        combinedArray = objectInfo.blr3dcontent["havf75vx7mycl72zkf7ru88s0g38bv6w"];
      } else {
        ab = objectInfo.blr3dcontent["havf75vx7mycl72zkf7ru88s0g38bv6w"];
      }
    }

    const manager = new THREE.LoadingManager();
    const loader = new FBXLoader(manager);
    const mesh = await loader.parse(blrVersion === 5 ? combinedArray : ab);
    resolve(mesh);
  });
  //ENCRYPT DECODED DATA ON STORAGE
}

async function loadBLRFileByURL(url) {
  return await new Promise(async resolve => {
    let data;
    let fromLocal = false;
    const blrID = getBLRID(url);
    const localFile = await getModelByID(blrID);
    if (localFile != null) {
      data = localFile;
      fromLocal = true;
    } else {
      const buffer = await downloadBLRObject(url);
      data = await parsingZipFile(buffer);
    }
    const mesh = await loadModelToScene(data, blrID, fromLocal);
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
    const buffer = await downloadBLRObject(downloadPATH);
    const data = await parsingZipFile(buffer);

    const mesh = await loadModelToScene(data);
    loadMaterial(mesh, data);
    resolve(mesh);
  });
}

export { loadBLRFile, loadBLRFileByURL, blrInfoExtractor };
