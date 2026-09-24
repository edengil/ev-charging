import sharp from "sharp";
import fs from "fs";

const mark = await sharp("brand/eden-gil-mark.svg").resize(88, 88).png().toBuffer();
const base = await sharp("icons/ev-charge-app-icon-source.png").resize(512, 512).png().toBuffer();
const pill = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <rect x="206" y="400" width="100" height="100" rx="50" fill="rgba(15,70,68,0.55)"/>
  </svg>`
);

const composed = await sharp(base)
  .composite([
    { input: pill, top: 0, left: 0 },
    { input: mark, top: 406, left: 212 },
  ])
  .png()
  .toBuffer();

await sharp(composed).toFile("icons/icon-512.png");
await sharp(composed).resize(192, 192).toFile("icons/icon-192.png");
await sharp(composed).resize(180, 180).toFile("icons/apple-touch-icon.png");
await sharp(composed).resize(32, 32).toFile("icons/favicon-32.png");
await sharp(composed).toFile("icons/ev-charge-app-icon.png");
console.log("composed ok", fs.statSync("icons/apple-touch-icon.png").size);
