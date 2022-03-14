import firebase from "firebase/app";
import "firebase/database";
import "firebase/auth";
function initializeFirebase() {
  console.log("init firebase");
  //PROD
  var firebaseConfig = {
    databaseURL: "https://assemblr-1ff3f.firebaseio.com/",
    projectId: "assemblr-1ff3f",
    authDomain: "assemblr-1ff3f.firebaseapp.com",
    apiKey: "AIzaSyD9G99r2egrPP3tLPBHun6W_VLSbcoEYRc",
    appId: "1:946233551537:web:191bb994b52ddec4"
  };

  try {
    firebase.initializeApp(firebaseConfig);
    console.log("firebase initialized");
  } catch (error) {
    console.log(error);
  }
}

export default initializeFirebase;
