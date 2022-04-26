import "./index.scss";
import React, { useEffect, useState } from "react";
import { getCurrentToken } from "../../firebase/auth";

const LibraryUI3D = () => {
  const [libraryToken, setLibraryToken] = useState("");

  useEffect(() => {
    async function func() {
      const token = await getCurrentToken();
      console.log({ libraryToken: token });
      setLibraryToken(token);
    }
    func();
  }, []);

  return (
    libraryToken !== "" && (
      <div id="library-ui-container" className="hidden">
        <iframe
          //src="https://production.depbsux1nbfvt.amplifyapp.com/library3d"
          src={`http://${window.location.hostname}:3002/library3d`}
          frameBorder={"none"}
          onLoad={e => {
            const element = e.target;
            element.contentWindow.postMessage(
              {
                id: "webplayer-token",
                data: libraryToken
              },
              "*"
            );
          }}
        />
      </div>
    )
  );
};

const LibraryUI2D = () => {
  const [libraryToken, setLibraryToken] = useState("");

  useEffect(() => {
    async function func() {
      const token = await getCurrentToken();
      console.log({ libraryToken: token });
      setLibraryToken(token);
    }
    func();
  }, []);

  return (
    libraryToken !== "" && (
      <div id="library-ui-container-2d" className="hidden">
        <iframe
          //src="https://production.depbsux1nbfvt.amplifyapp.com/library3d"
          src={`http://${window.location.hostname}:3002/library2d`}
          frameBorder={"none"}
          onLoad={e => {
            const element = e.target;
            element.contentWindow.postMessage(
              {
                id: "webplayer-token",
                data: libraryToken
              },
              "*"
            );
          }}
        />
      </div>
    )
  );
};

export { LibraryUI3D, LibraryUI2D };
