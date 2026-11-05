// i18next resolves plurals per language. Japanese has no "one" bucket, so a missing *_one key must
// fall back to the base key rather than printing the key or an empty string.
const fs = require("fs");
const path = require("path");
const i18next = require(path.join(__dirname, "..", "..", "reactapp", "node_modules", "i18next"));

const transRoot = path.join(__dirname, "..", "..", "reactapp", "src", "assets", "translations");
const resources = {};
for (const lang of ["en", "ja"]) {
    resources[lang] = { student: JSON.parse(fs.readFileSync(path.join(transRoot, lang, "student.json"), "utf8")) };
}

(async () => {
    for (const lang of ["en", "ja"]) {
        const instance = i18next.createInstance();
        await instance.init({ lng: lang, fallbackLng: false, defaultNS: "student", resources, interpolation: { escapeValue: false } });
        const one = instance.t("reflection-simple-q2-mistakes", { count: 1, part: "x" });
        const many = instance.t("reflection-simple-q2-mistakes", { count: 5, part: "x" });
        const chip = instance.t("reflection-session-chip-finished", { count: 1 });
        const clean = instance.t("reflection-session-chip-clean", { count: 1 });
        console.log(`[${lang}] count=1 ->`, JSON.stringify(one));
        console.log(`[${lang}] count=5 ->`, JSON.stringify(many));
        console.log(`[${lang}] chip_one ->`, JSON.stringify(chip));
        console.log(`[${lang}] clean_one ->`, JSON.stringify(clean));
        console.log(`[${lang}] missing key ->`, JSON.stringify(instance.t("definitely-not-a-key")));
    }
})();
