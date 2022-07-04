export function loadMyAvatar() {
  const avatarURL = window.APP.userID
    ? `https://asset.asblr.app/UserAvatar/${window.APP.userID}/Avatar.glb`
    : `https://asset-asblr.app/Asset/metaverse/avatar/public/defaultAvatar.glb`;
  const avatarURL2 = `https://asset.asblr.app/Asset/metaverse/avatar/public/defaultAvatar12.glb`;
  window.APP.store.update({
    profile: {
      ...window.APP.store.state.profile,
      ...{
        avatarId: avatarURL2
      }
    }
  });
  window.APP.scene.emit("avatar_updated");
}
