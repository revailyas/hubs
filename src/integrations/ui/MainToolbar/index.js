import React from "react";
import "./index.scss";
import Toolbar3D from "../../../assets/toolbar/toolbar_3d.svg";
import Toolbar2D from "../../../assets/toolbar/toolbar_images.svg";
import ToolbarReaction from "../../../assets/toolbar/toolbar_react.svg";
import ToolbarShare from "../../../assets/toolbar/toolbar_share.svg";
import ToolbarChat from "../../../assets/toolbar/toolbar_chat.svg";
const Place3DToolbar = () => {
  return (
    <div
      onClick={() => {
        const libraryContainer = document.getElementById("library-ui-container");
        libraryContainer.classList.remove("hidden");
      }}
      className="toolbar-item objects"
    >
      <div className="icon-container">
        <img alt="" src={Toolbar3D} />
      </div>
      <span>3D Objects</span>
    </div>
  );
};

const Place2DToolbar = () => {
  return (
    <div
      onClick={() => {
        const libraryContainer = document.getElementById("library-ui-container-2d");
        libraryContainer.classList.remove("hidden");
      }}
      className="toolbar-item images"
    >
      <div className="icon-container">
        <img alt="" src={Toolbar2D} />
      </div>
      <span>Images</span>
    </div>
  );
};

const PlaceReactionToolbar = () => {
  return (
    <div className="toolbar-item reaction">
      <div className="icon-container">
        <img alt="" src={ToolbarReaction} />
      </div>
      <span>React</span>
    </div>
  );
};

const ShareScreenToolbar = () => {
  return (
    <div className="toolbar-item reaction">
      <div className="icon-container">
        <img alt="" src={ToolbarShare} />
      </div>
      <span>Share</span>
    </div>
  );
};

const ChatToolbar = () => {
  return (
    <div className="toolbar-item reaction">
      <div className="icon-container">
        <img alt="" src={ToolbarChat} />
      </div>
      <span>Chat</span>
    </div>
  );
};

const SeparatorToolbar = () => {
  return <div className="separator-toolbar" />;
};

export { Place3DToolbar, Place2DToolbar, SeparatorToolbar, PlaceReactionToolbar, ShareScreenToolbar, ChatToolbar };
