"use client";

import { useEffect } from "react";
import miniapp from "@farcaster/miniapp-sdk";
import Home from "../../page";

export default function MiniappPage() {
    useEffect(() => {
        miniapp.actions.ready();
    }, []);

    return <Home />;
}
