import { useState } from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "devomegle:psa-seen";

const MafiModal = () => {
    const [open, setOpen] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) !== "1";
        } catch {
            return true;
        }
    })

    const close = () => {
        try {
            localStorage.setItem(STORAGE_KEY, "1");
        } catch {
            // Private browsing can block storage; the modal simply shows again.
        }
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-center">Public Service Announcement</DialogTitle>
                    <div className="relative h-80 bg-black rounded-lg aspect-square">
                        <img src="https://media1.tenor.com/m/-7ON2Lqx030AAAAd/mai-garib-hu.gif" alt=""
                            className="w-full h-full mx-auto object-contain"
                        />
                    </div>
                    <DialogDescription>
                        Hey, this is a rough proof of concept for the actual project.
                        <br /> Thanks for trying it out! Signaling now runs entirely on Firestore, so there is no separate server to boot. There might be bugs, but they are being fixed and new features are being added. If you run into any issues or have feature ideas, feel free to reach out{' '}
                        <a href="https://sahilverma.dev/links"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500"
                        >here</a>
                        . Thanks!
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button onClick={close} type="button">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default MafiModal
