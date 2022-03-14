import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { ReactComponent as PenIcon } from "../icons/Pen.svg";
import { ReactComponent as CameraIcon } from "../icons/Camera.svg";
// import { ReactComponent as TextIcon } from "../icons/Text.svg";
// import { ReactComponent as LinkIcon } from "../icons/Link.svg";
import { ReactComponent as GIFIcon } from "../icons/GIF.svg";
import { ReactComponent as ObjectIcon } from "../icons/Object.svg";
import { ReactComponent as AvatarIcon } from "../icons/Avatar.svg";
import { ReactComponent as SceneIcon } from "../icons/Scene.svg";
import { ReactComponent as UploadIcon } from "../icons/Upload.svg";
import { PlacePopoverButton } from "./PlacePopover";
import { ObjectUrlModalContainer } from "./ObjectUrlModalContainer";
import configs from "../../utils/configs";
import { FormattedMessage } from "react-intl";
import { SHAPE, FIT } from "three-ammo/constants";

//REVA
import * as THREE from "three";
import { addMedia } from "../../utils/media-utils";
import { loadBLRFile } from "../../integrations/blr";
import { addAnimationComponents } from "../../utils/animation";
import { blrInfoExtractor } from "../../integrations/blr";

export function PlacePopoverContainer({ scene, mediaSearchStore, showNonHistoriedDialog, hubChannel }) {
  const [items, setItems] = useState([]);

  useEffect(
    () => {
      function updateItems() {
        const hasActiveCamera = !!scene.systems["camera-tools"].getMyCamera();
        const hasActivePen = !!scene.systems["pen-tools"].getMyPen();

        let nextItems = [
          hubChannel.can("spawn_drawing") && {
            id: "pen",
            icon: PenIcon,
            color: "accent5",
            label: <FormattedMessage id="place-popover.item-type.pen" defaultMessage="Pen" />,
            onSelect: () => scene.emit("penButtonPressed"),
            selected: hasActivePen
          },
          hubChannel.can("spawn_camera") && {
            id: "camera",
            icon: CameraIcon,
            color: "accent5",
            label: <FormattedMessage id="place-popover.item-type.camera" defaultMessage="Camera" />,
            onSelect: () => scene.emit("action_toggle_camera"),
            selected: hasActiveCamera
          }
        ];

        if (hubChannel.can("spawn_and_move_media")) {
          nextItems = [
            ...nextItems,
            // TODO: Create text/link dialog
            // { id: "text", icon: TextIcon, color: "blue", label: "Text" },
            // { id: "link", icon: LinkIcon, color: "blue", label: "Link" },
            configs.integration("tenor") && {
              id: "gif",
              icon: GIFIcon,
              color: "accent2",
              label: <FormattedMessage id="place-popover.item-type.gif" defaultMessage="GIF" />,
              onSelect: () => mediaSearchStore.sourceNavigate("gifs")
            },
            configs.integration("sketchfab") && {
              id: "model",
              icon: ObjectIcon,
              color: "accent2",
              label: <FormattedMessage id="place-popover.item-type.model" defaultMessage="3D Model" />,
              onSelect: () => mediaSearchStore.sourceNavigate("sketchfab")
            },
            // {
            //   id: "assemblr_library",
            //   icon: ObjectIcon,
            //   color: "accent1",
            //   label: <FormattedMessage id="place-popover.item-type.library" defaultMessage="Assemblr Library" />,
            //   onSelect: async () => {
            //     console.log("nambah object");

            //     // const blrID = "2_i04d6VDV1CelwzZw5MYMAn6DLQd2_1_blrf-BlackFootedFerret";
            //     // const blrPath = blrInfoExtractor(blrID);

            //     // const { entity } = addMedia(blrPath, "#interactable-media", 1);
            //     // entity.setAttribute("offset-relative-to", {
            //     //   target: "#avatar-pov-node",
            //     //   offset: { x: 0, y: 0, z: -1.5 }
            //     // });
            //     const libraryContainer = document.getElementById("library-ui-container");
            //     libraryContainer.classList.remove("hidden");
            //     console.log(libraryContainer);
            //   }
            // },
            {
              id: "avatar",
              icon: AvatarIcon,
              color: "accent1",
              label: <FormattedMessage id="place-popover.item-type.avatar" defaultMessage="Avatar" />,
              onSelect: () => mediaSearchStore.sourceNavigate("avatars")
            },
            {
              id: "scene",
              icon: SceneIcon,
              color: "accent1",
              label: <FormattedMessage id="place-popover.item-type.scene" defaultMessage="Scene" />,
              onSelect: () => mediaSearchStore.sourceNavigate("scenes")
            },
            // TODO: Launch system file prompt directly
            {
              id: "upload",
              icon: UploadIcon,
              color: "accent3",
              label: <FormattedMessage id="place-popover.item-type.upload" defaultMessage="Upload" />,
              onSelect: () => showNonHistoriedDialog(ObjectUrlModalContainer, { scene })
            }
          ];
        }

        setItems(nextItems);
      }

      hubChannel.addEventListener("permissions_updated", updateItems);

      updateItems();

      function onSceneStateChange(event) {
        if (event.detail === "camera" || event.detail === "pen") {
          updateItems();
        }
      }

      scene.addEventListener("stateadded", onSceneStateChange);
      scene.addEventListener("stateremoved", onSceneStateChange);

      return () => {
        hubChannel.removeEventListener("permissions_updated", updateItems);
        scene.removeEventListener("stateadded", onSceneStateChange);
        scene.removeEventListener("stateremoved", onSceneStateChange);
      };
    },
    [hubChannel, mediaSearchStore, showNonHistoriedDialog, scene]
  );

  return <PlacePopoverButton items={items} />;
}

PlacePopoverContainer.propTypes = {
  hubChannel: PropTypes.object.isRequired,
  scene: PropTypes.object.isRequired,
  mediaSearchStore: PropTypes.object.isRequired,
  showNonHistoriedDialog: PropTypes.func.isRequired
};
