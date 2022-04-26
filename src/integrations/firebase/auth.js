import firebase from "firebase/app";
import "firebase/database";
import "firebase/auth";

const getUserIdFromToken = async token => {
  return await new Promise(resolve => {
    firebase
      .database()
      .ref(`Land/user_token`)
      .orderByChild("token")
      .equalTo(token)
      .once("value", snap => {
        const data = snap.val();
        if (data) {
          const res = Object.values(data);
          resolve(res[0].uid);
        } else {
          resolve(null);
        }
      });
  });
};

const getUserEmailByToken = async token => {
  return await new Promise(async resolve => {
    const userID = await getUserIdFromToken(token);
    if (userID !== null) {
      firebase
        .database()
        .ref(`UserProfile/${userID}/Email`)
        .once("value", snap => {
          const data = snap.val();
          if (data) {
            resolve(data);
          } else {
            resolve(null);
          }
        });
    }
  });
};

async function signInWithAuthKey(key) {
  return await new Promise(resolve => {
    firebase
      .auth()
      .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        return firebase
          .auth()
          .signInWithCustomToken(key)
          .then(cred => {
            if (cred.user) {
              resolve(cred.user);
            } else {
              resolve(null);
            }
          })
          .catch(err => {
            console.log(err);
          });
      })
      .catch(error => {
        // Handle Errors here.
        const errorMessage = error.message;
        console.log(errorMessage);
      });
  });
}

const getTokenFromAuthKey = async authKey => {
  return await new Promise(resolve => {
    firebase
      .database()
      .ref("UserGeneratedToken")
      .child(authKey)
      .once("value", snap => {
        const data = snap.val();
        if (data.token) {
          resolve(data.token);
        } else {
          resolve(null);
        }
      });
  });
};

async function login(authKey) {
  const userToken = await getTokenFromAuthKey(authKey);
  return await signInWithAuthKey(userToken);
}

async function checkAuthStatus() {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      console.log("auth detected");
      // User logged in already or has just logged in.
      window.APP.userID = user.uid;
    } else {
      console.log("no auth detected");
      // User not logged in or has just logged out.
    }
  });
}

const getCurrentToken = async () => {
  return await new Promise(resolve => {
    firebase
      .auth()
      .currentUser.getIdToken(false)
      .then(token => {
        resolve(token);
      });
  });
};

window.getCurrentToken = getCurrentToken;

export { getUserEmailByToken, login, getCurrentToken, checkAuthStatus };
