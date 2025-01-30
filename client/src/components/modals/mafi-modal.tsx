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
const MafiModal = () => {
    const [open, setOpen] = useState(true)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                        <br /> Thanks for trying it out! We're currently using free tiers of various services <b>(Kyuki me gareeb hun)</b> like Render.io, so it might take some time to load—sorry about that. There might be bugs, but I'm actively fixing them and adding new features. If you run into any issues or have feature ideas, feel free to reach out{' '}
                        <a href="https://sahilverma.dev/links"
                            target="_blank"
                            className="text-blue-500"
                        >here</a>
                        . Thanks!
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button

                        onClick={() => setOpen(false)}

                        type="submit">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default MafiModal