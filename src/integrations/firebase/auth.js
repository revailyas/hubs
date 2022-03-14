import firebase from "firebase/app";
import "firebase/database";

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
  console.log("get user email");
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

export { getUserEmailByToken };
