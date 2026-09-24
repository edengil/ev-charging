const fs = require("fs");
const p = "C:/Users/edeng/Downloads/ev-charge-manager/app-source.js";
let t = fs.readFileSync(p, "utf8");
const start = t.indexOf("function CompleteSession({");
if (start < 0) throw new Error("CompleteSession not found");
const bodyOpen = t.indexOf("}) {", start);
if (bodyOpen < 0) throw new Error("body not found");
let bal = 0;
let end = -1;
for (let i = bodyOpen + 3; i < t.length; i++) {
  if (t[i] === "{") bal++;
  else if (t[i] === "}") {
    bal--;
    if (bal === 0) {
      end = i + 1;
      break;
    }
  }
}
if (end < 0) throw new Error("end not found");
console.log("replacing", end - start, "chars");

const newFn = fs.readFileSync("C:/Users/edeng/Downloads/ev-charge-manager/scripts/_complete_session_new.js", "utf8");
t = t.slice(0, start) + newFn.trim() + t.slice(end);
fs.writeFileSync(p, t);
console.log("ok");
