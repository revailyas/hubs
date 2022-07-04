import { CursorTargettingSystem } from "./cursor-targetting-system";
import { PositionAtBorderSystem } from "../components/position-at-border";
import { BoneVisibilitySystem } from "../components/bone-visibility";
import { AnimationMixerSystem } from "../components/animation-mixer";
import { UVScrollSystem } from "../components/uv-scroll";
import { CursorTogglingSystem } from "./cursor-toggling-system";
import { PhysicsSystem } from "./physics-system";
import { ConstraintsSystem } from "./constraints-system";
import { TwoPointStretchingSystem } from "./two-point-stretching-system";
import { SingleActionButtonSystem, HoldableButtonSystem, HoverButtonSystem } from "./button-systems";
import { DrawingMenuSystem } from "./drawing-menu-system";
import { HoverMenuSystem } from "./hover-menu-system";
import { SuperSpawnerSystem } from "./super-spawner-system";
import { HapticFeedbackSystem } from "./haptic-feedback-system";
import { SoundEffectsSystem } from "./sound-effects-system";
import { ScenePreviewCameraSystem } from "./scene-preview-camera-system";
import { InteractionSfxSystem } from "./interaction-sfx-system";
import { SpriteSystem } from "./sprites";
import { CameraSystem } from "./camera-system";
import { WaypointSystem } from "./waypoint-system";
import { CharacterControllerSystem } from "./character-controller-system";
import { waitForDOMContentLoaded } from "../utils/async-utils";
import { CursorPoseTrackingSystem } from "./cursor-pose-tracking";
import { MenuAnimationSystem } from "./menu-animation-system";
import { AudioSettingsSystem } from "./audio-settings-system";
import { AudioSystem } from "./audio-system";
import { ShadowSystem } from "./shadow-system";
import { MediaFramesSystem } from "./media-frames";
import { InspectYourselfSystem } from "./inspect-yourself-system";
import { EmojiSystem } from "./emoji-system";
import { AudioZonesSystem } from "./audio-zones-system";
import { GainSystem } from "./audio-gain-system";
import { EnvironmentSystem } from "./environment-system";
import { NameTagVisibilitySystem } from "./name-tag-visibility-system";

function miliSecondDiff(date1, date2) {
  return Math.abs(date1.getTime() - date2.getTime());
}

AFRAME.registerSystem("hubs-systems", {
  init() {
    waitForDOMContentLoaded().then(() => {
      this.DOMContentDidLoad = true;
    });
    this.cursorTogglingSystem = new CursorTogglingSystem();
    this.interactionSfxSystem = new InteractionSfxSystem();
    this.superSpawnerSystem = new SuperSpawnerSystem();
    this.cursorTargettingSystem = new CursorTargettingSystem();
    this.positionAtBorderSystem = new PositionAtBorderSystem();
    this.physicsSystem = new PhysicsSystem(this.el.object3D);
    this.constraintsSystem = new ConstraintsSystem(this.physicsSystem);
    this.twoPointStretchingSystem = new TwoPointStretchingSystem();
    this.singleActionButtonSystem = new SingleActionButtonSystem();
    this.holdableButtonSystem = new HoldableButtonSystem();
    this.hoverButtonSystem = new HoverButtonSystem();
    this.hoverMenuSystem = new HoverMenuSystem();
    this.hapticFeedbackSystem = new HapticFeedbackSystem();
    this.audioSystem = new AudioSystem(this.el);
    this.soundEffectsSystem = new SoundEffectsSystem(this.el);
    this.scenePreviewCameraSystem = new ScenePreviewCameraSystem();
    this.spriteSystem = new SpriteSystem(this.el);
    this.cameraSystem = new CameraSystem(this.el.camera, this.el.renderer);
    this.drawingMenuSystem = new DrawingMenuSystem(this.el);
    this.characterController = new CharacterControllerSystem(this.el);
    this.waypointSystem = new WaypointSystem(this.el, this.characterController);
    this.cursorPoseTrackingSystem = new CursorPoseTrackingSystem();
    this.menuAnimationSystem = new MenuAnimationSystem();
    this.audioSettingsSystem = new AudioSettingsSystem(this.el);
    this.animationMixerSystem = new AnimationMixerSystem();
    this.boneVisibilitySystem = new BoneVisibilitySystem();
    this.uvScrollSystem = new UVScrollSystem();
    this.shadowSystem = new ShadowSystem(this.el);
    this.mediaFramesSystem = new MediaFramesSystem(this.physicsSystem, this.el.systems.interaction);
    this.inspectYourselfSystem = new InspectYourselfSystem();
    this.emojiSystem = new EmojiSystem(this.el);
    this.audioZonesSystem = new AudioZonesSystem();
    this.gainSystem = new GainSystem();
    this.environmentSystem = new EnvironmentSystem(this.el);
    this.nameTagSystem = new NameTagVisibilitySystem(this.el);
  },

  tick(t, dt) {
    if (!this.DOMContentDidLoad) return;
    const systems = AFRAME.scenes[0].systems;
    systems.userinput.tick2();
    systems.interaction.tick2();

    // We run this earlier in the frame so things have a chance to override properties run by animations
    this.animationMixerSystem.tick(dt);

    this.characterController.tick(t, dt);
    this.cursorTogglingSystem.tick(systems.interaction, systems.userinput, this.el);
    this.interactionSfxSystem.tick(systems.interaction, systems.userinput, this.soundEffectsSystem);
    this.superSpawnerSystem.tick();
    this.emojiSystem.tick(t, systems.userinput);
    this.cursorPoseTrackingSystem.tick();
    this.cursorTargettingSystem.tick(t);
    this.hoverMenuSystem.tick();
    this.positionAtBorderSystem.tick();
    this.constraintsSystem.tick();
    this.twoPointStretchingSystem.tick();
    this.singleActionButtonSystem.tick();
    this.holdableButtonSystem.tick();
    this.hoverButtonSystem.tick();
    this.drawingMenuSystem.tick();
    this.hapticFeedbackSystem.tick(
      this.twoPointStretchingSystem,
      this.singleActionButtonSystem.didInteractLeftThisFrame,
      this.singleActionButtonSystem.didInteractRightThisFrame
    );
    this.soundEffectsSystem.tick();
    this.scenePreviewCameraSystem.tick();
    this.physicsSystem.tick(dt);
    this.inspectYourselfSystem.tick(this.el, systems.userinput, this.cameraSystem);
    this.cameraSystem.tick(this.el, dt);
    this.waypointSystem.tick(t, dt);
    this.menuAnimationSystem.tick(t);
    this.spriteSystem.tick(t, dt);
    this.uvScrollSystem.tick(dt);
    this.shadowSystem.tick();
    this.mediaFramesSystem.tick();
    this.audioZonesSystem.tick(this.el);
    this.gainSystem.tick();
    this.nameTagSystem.tick();

    // We run this late in the frame so that its the last thing to have an opinion about the scale of an object
    this.boneVisibilitySystem.tick();
    AFRAME.scenes[0].object3D.children.forEach(child => {
      if (
        child.el &&
        child.el.id.includes("naf-") &&
        child.el.components &&
        child.el.components.hasOwnProperty("networked-avatar")
      ) {
        const moveForwards = child.el.components["networked-avatar"].data.move_forward;
        const moveBackwards = child.el.components["networked-avatar"].data.move_backward;
        const moveRight = child.el.components["networked-avatar"].data.move_right;
        const moveLeft = child.el.components["networked-avatar"].data.move_left;
        let mixer, clip, actions, mesh;
        const element = document.getElementById(child.el.id).children[4];
        if (element) {
          mesh = document.getElementById(child.el.id).children[4].object3D;
          try {
            mixer = document.getElementById(child.el.id).children[4].components["animation-mixer"].mixer;
          } catch (error) {
            return;
          }
        }
        const animationSwitcher = (currentName, expectedName) => {
          if (currentName === expectedName) {
            return 1;
          } else {
            return 0;
          }
        };
        const switchToIdle = function() {
          clip = mesh.animations.find(({ name }) => name === "Idle");
          if (clip) {
            actions = mixer.clipAction(clip);
            mixer._actions.forEach(item => {
              item.weight = animationSwitcher(item._clip.name, "Idle");
            });
            if (window[`lastAnimation${child.el.id}`] !== "Idle") actions.time = 0;

            actions.play();

            mixer.update(0.001);
            window[`lastAnimation${child.el.id}`] = "Idle";
          }
        };

        const switchToRun = function(speed) {
          window[`lastAnimation${child.el.id}`] = "Run";
          //console.log("run" + " " + speed);
          clip = mesh.animations.find(({ name }) => name === "Run");
          if (clip) {
            actions = mixer.clipAction(clip);
            actions.weight = 1;
            mixer._actions.forEach(item => {
              if (item._clip.name === "Idle") item.weight = 0;
              if (item._clip.name === "Run") {
                item.weight = 1;
                item.timeScale = speed;
              }
            });
            actions.play();
            child.lastMove = new Date();
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
          const animationName = "Run Right";
          clip = mesh.animations.find(({ name }) => name === animationName);
          if (clip) {
            actions = mixer.clipAction(clip);
            actions.weight = 1;
            mixer._actions.forEach(item => {
              item.weight = animationSwitcher(item._clip.name, animationName);
              if (item._clip.name === "Run Right") {
                item.weight = 1;
                item.timeScale = speed;
              }
            });
            actions.play();
            child.lastMove = new Date();
            mixer.update(0.001);
          }
        };

        const switchToRunAndSide = function(speed1, speed2) {
          window[`myLastAnimation`] = "Run";
          if (!mixer) return;
          mixer._actions.forEach(item => {
            item.weight = 0;
            item.timeScale = 0;
          });
          const clip1 = mesh.animations.find(({ name }) => name === "Run");
          const clip2 = mesh.animations.find(({ name }) => name === "Run Right");
          if (clip1 && clip2) {
            const action1 = mixer.clipAction(clip1);
            action1.weight = 1;
            action1.timeScale = speed1;
            action1.play();
            const action2 = mixer.clipAction(clip2);
            action2.weight = 1;
            action2.timeScale = speed2;
            action2.play();

            mixer.update(0.001);
            console.log(action1.timeScale + " " + action2.timeScale);
          }
        };

        try {
          if (moveForwards || moveBackwards || moveRight || moveLeft) {
            let speed = 1;
            if (moveForwards || moveBackwards) {
              speed = moveForwards ? 1 : -1;
              switchToRun(speed);
            } else {
              speed = moveRight ? 1 : -1;
              switchToSideMove(speed);
            }

            let isMovingStraight, isMovingSide, straightSpeed, sideSpeed;

            if (moveForwards || moveBackwards) {
              isMovingStraight = true;
              straightSpeed = moveForwards ? 1 : -1;
            }

            if (moveLeft || moveRight) {
              isMovingSide = true;
              sideSpeed = moveRight ? 1 : -1;
            }
            if (isMovingStraight && isMovingSide) {
              switchToRunAndSide(straightSpeed, sideSpeed);
            } else if (isMovingStraight) {
              switchToRun(straightSpeed);
            } else if (isMovingSide) {
              switchToSideMove(sideSpeed);
            }

            if (!isMovingStraight && !isMovingSide) switchToIdle();
          } else {
            if (child.lastMove) {
              const lastMove = child.lastMove;
              const now = new Date();
              const switchHandler = miliSecondDiff(lastMove, now);
              if (switchHandler > 50) {
                switchToIdle();
              }
            } else {
              switchToIdle();
            }
          }
        } catch (error) {
          return;
        }
      }
    });
  },

  remove() {
    this.cursorTargettingSystem.remove();
  }
});
