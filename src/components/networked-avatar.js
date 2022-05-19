/**
 * Stores networked avatar state.
 * @namespace avatar
 * @component networked-avatar
 */
AFRAME.registerComponent("networked-avatar", {
  schema: {
    left_hand_pose: { default: 0 },
    right_hand_pose: { default: 0 },
    idle: { default: false },
    move_forward: { default: false },
    move_backward: { default: false },
    move_left: { default: false },
    move_right: { default: false }
  }
});
