export function loadMyAvatar() {
  const avatarURL = window.APP.userID
    ? `https://assemblrworld-asset.s3.ap-southeast-1.amazonaws.com/UserAvatar/${window.APP.userID}/Avatar.glb`
    : `https://assemblrworld-asset.s3.ap-southeast-1.amazonaws.com/Asset/metaverse/avatar/public/defaultAvatar.glb`;
  //const avatarURL2 = `https://assemblrworld-asset.s3.ap-southeast-1.amazonaws.com/Asset/metaverse/avatar/public/defaultAvatar10.glb`;
  window.APP.store.update({
    profile: {
      ...window.APP.store.state.profile,
      ...{
        avatarId: avatarURL
      }
    }
  });
  window.APP.scene.emit("avatar_updated");
}
