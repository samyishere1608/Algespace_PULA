import { ReactElement } from "react";
import "@styles/views/loader.scss";

export default function Loader(): ReactElement {
    return (
        <div className={"loader-container"}>
            <div className={"loader"}></div>
        </div>
    );
}
