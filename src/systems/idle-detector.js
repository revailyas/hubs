import { paths } from "./userinput/paths";
const qs = new URLSearchParams(location.search);
const IDLE_TIMEOUT_MS = (parseInt(qs.get("idle_timeout"), 10) || 2 * 60 * 60) * 1000;
const INPUT_CHECK_INTERVAL_MS = 1000;

const CHARACTER_ACCELERATION_PATH = paths.actions.characterAcceleration;
const BASIC_ACTIVITY_PATHS = [
  paths.actions.startGazeTeleport,
  paths.actions.rightHand.startTeleport,
  paths.actions.leftHand.startTeleport,
  paths.actions.snapRotateRight,
  paths.actions.snapRotateLeft,
  paths.actions.cursor.right.grab,
  paths.actions.cursor.left.grab,
  paths.actions.rightHand.grab,
  paths.actions.leftHand.grab,
  paths.actions.angularVelocity
];

AFRAME.registerSystem("idle-detector", {
  init() {
    this.resetTimeout = this.resetTimeout.bind(this);
    this.idleTimeout = null;
    this.lastInputCheck = 0;

    const events = ["click", "pointerdown", "touchstart", "keyup"];

    for (const event of events) {
      window.addEventListener(event, this.resetTimeout);
    }

    this.resetTimeout();
  },
  resetTimeout() {
    if (this.idleTimeout) clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(this.onIdleTimeout, IDLE_TIMEOUT_MS);
    window.dispatchEvent(new CustomEvent("activity_detected"));
  },
  onIdleTimeout() {
    window.dispatchEvent(new CustomEvent("idle_detected"));
  },

  tick(time) {
    if (time - this.lastInputCheck < INPUT_CHECK_INTERVAL_MS) return;

    const userinput = this.el.systems.userinput;

    let basicActivity = false;
    for (const activityPath of BASIC_ACTIVITY_PATHS) {
      basicActivity = basicActivity || !!userinput.get(activityPath);
    }

    const characterAcceleration = userinput.get(CHARACTER_ACCELERATION_PATH);

    let clip, actions, mixer;
    let isAssemblrAvatar = false;
    const element = document.querySelector("#avatar-rig .model");

    const mesh = element.object3D;
    const elComponents = mesh.el.components;
    if (elComponents.hasOwnProperty("animation-mixer")) {
      mixer = elComponents["animation-mixer"].mixer;

      const animationList = elComponents["animation-mixer"].animations;
      animationList.forEach(animation => {
        if (animation.name === "Run") isAssemblrAvatar = true;
      });
    }

    const animationSwitcher = (currentName, expectedName) => {
      if (currentName === expectedName) {
        return 1;
      } else {
        return 0;
      }
    };

    const switchToIdle = function() {
      //mesh.parent.el.setAttribute("networked-avatar", { move_forward: false, move_backward: false });
      //elComponents["networked-avatar"].data.move_forward = false;
      //mesh.parent.el.components["networked-avatar"].data.move_forward = false;
      if (!mixer) return;
      clip = mesh.animations.find(({ name }) => name === "Idle");
      if (clip) {
        actions = mixer.clipAction(clip);
        mixer._actions.forEach(item => {
          // if (item._clip.name === "Run") item.weight = 0;
          // if (item._clip.name === "Idle") item.weight = 1;
          item.weight = animationSwitcher(item._clip.name, "Idle");
        });
        if (window[`myLastAnimation`] !== "Idle") actions.time = 0;

        actions.play();

        mixer.update(0.001);
        window[`myLastAnimation`] = "Idle";
      }
    };

    const switchToRun = function(speed) {
      window[`myLastAnimation`] = "Run";
      // if (speed === 1) {
      //   mesh.parent.el.setAttribute("networked-avatar", { move_forward: true });
      // } else if (speed === -1) {
      //   mesh.parent.el.setAttribute("networked-avatar", { move_backward: true });
      // }
      if (!mixer) return;
      clip = mesh.animations.find(({ name }) => name === "Run");
      if (clip) {
        actions = mixer.clipAction(clip);
        actions.weight = 1;
        mixer._actions.forEach(item => {
          item.weight = animationSwitcher(item._clip.name, "Run");
          if (item._clip.name === "Run") {
            item.timeScale = speed;
          }
        });
        actions.play();
        mixer.update(0.001);
      }
    };

    const switchToSideMove = function(speed) {
      window[`myLastAnimation`] = "Run";
      // if (speed === 1) {
      //   mesh.parent.el.setAttribute("networked-avatar", { move_forward: true });
      // } else if (speed === -1) {
      //   mesh.parent.el.setAttribute("networked-avatar", { move_backward: true });
      // }
      if (!mixer) return;
      const animationName = speed === 1 ? "Run Right" : "Run Left";
      clip = mesh.animations.find(({ name }) => name === animationName);
      if (clip) {
        actions = mixer.clipAction(clip);
        actions.weight = 1;
        mixer._actions.forEach(item => {
          item.weight = animationSwitcher(item._clip.name, animationName);
        });
        actions.play();
        mixer.update(0.001);
      }
    };

    const active =
      basicActivity ||
      !!(characterAcceleration && characterAcceleration[0]) ||
      !!(characterAcceleration && characterAcceleration[1]);

    if (active) {
      if (mesh.animations.length > 3 && isAssemblrAvatar) {
        if (characterAcceleration[1] > 0) {
          switchToRun(1);
        } else if (characterAcceleration[1] < 0) {
          switchToRun(-1);
        } else if (characterAcceleration[0] > 0) {
          //move right
          switchToSideMove(1);
        } else if (characterAcceleration[0] < 0) {
          //move left
          switchToSideMove(-1);
        }
      }
      this.resetTimeout();
    } else {
      if (isAssemblrAvatar) switchToIdle();
    }
  },
  remove() {}
});
