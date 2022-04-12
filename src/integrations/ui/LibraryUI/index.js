import "./index.scss";
import React, { useEffect, useState } from "react";
import { getCurrentToken } from "../../firebase/auth";

const LibraryUI = () => {
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
          src="https://production.depbsux1nbfvt.amplifyapp.com/library3d"
          frameBorder={"none"}
          onLoad={e => {
            const element = e.target;
            console.log("ngirim token");
            console.log(libraryToken);
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

export default LibraryUI;
