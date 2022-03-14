import "./index.scss";
import React from "react";

const LibraryUI = () => {
  return (
    <div id="library-ui-container" className="hidden">
      <iframe src="http://localhost:3002/library3d" frameBorder={"none"} />
    </div>
  );
};

export default LibraryUI;
