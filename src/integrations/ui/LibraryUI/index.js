import "./index.scss";
import React from "react";

const LibraryUI = () => {
  return (
    <div id="library-ui-container" className="hidden">
      <iframe src="https://assemblr-editor-library.netlify.app/library3d" frameBorder={"none"} />
    </div>
  );
};

export default LibraryUI;
