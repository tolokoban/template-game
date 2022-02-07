import "./index.css"
import { fetchAssets } from "./assets"
import { startApplication } from "./main"

const ASSETS = {
    diamTexture: "assets/img/row-diam.png",
    welcomeTexture: "assets/img/welcome.jpg",
}

async function start() {
    console.log("Loading assets...")
    const progress = createProgress()
    const assets = await fetchAssets(ASSETS, (value: number) => {
        progress.setAttribute("value", `${100 * value}`)
    })
    console.log("Assets loaded.")
    const canvas = document.getElementById("canvas")
    if (!canvas) throw Error("Unable to find main Canvas!")

    startApplication(canvas as HTMLCanvasElement, assets)
    removeSplashScreen()
}

function createProgress() {
    const progress = document.createElement("progress")
    progress.setAttribute("id", "tgd-progress")
    progress.setAttribute("min", "0")
    progress.setAttribute("max", "100")
    document.getElementById("tgd-logo")?.appendChild(progress)
    return progress
}

function removeSplashScreen() {
    const div = document.getElementById("tgd-logo")
    if (!div) throw Error("There is no splash screen!")

    const DURATION = 900
    div.style.setProperty("--duration", `${DURATION}ms`)
    div.classList.add("vanish")
    window.setTimeout(() => {
        document.body.removeChild(div)
    }, DURATION)
}

void start()
