import { useState, useEffect } from "react";
import { loadMyAvatar } from "../../integrations/avatar";

export default function useAvatar() {
  const [state, setState] = useState({ hasVideoTextureTarget: false });

  useEffect(() => {
    const avatarModelEl = document.querySelector("#avatar-rig .model");

    function onAvatarModelLoaded() {
      const hasVideoTextureTarget = !!avatarModelEl.querySelector("[video-texture-target]");
      setState({ hasVideoTextureTarget });

      if (window.avatarTPSUpdated && avatarModelEl.object3D.animations.length > 10) {
        loadMyAvatar();
      }

      if (window.avatarTPSUpdated && avatarModelEl.object3D.animations.length < 10) {
        setTimeout(() => {
          window.avatarLoaded = true;
          window.APP.store.update({});
          window.APP.store.update({});
        }, 3000);
      }
    }

    onAvatarModelLoaded();

    avatarModelEl.addEventListener("model-loaded", onAvatarModelLoaded);

    return () => {
      avatarModelEl.removeEventListener("model-loaded", onAvatarModelLoaded);
    };
  }, []);

  return state;
}
