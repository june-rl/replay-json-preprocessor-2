import {createReplayFromJSON} from "./lib/Replay";

const INPUT_PATH = '';
const MODE: 'normal' | 'segmented' = "segmented"; // 'normal' or 'segmented'
const EXTRAS = false; // whether to include extra data in the output

const outputFolderName = 'out_default';

import {readFile, lstat, readdir, access, mkdir, writeFile} from "fs/promises";
import path from "node:path";
import {parseReplaySegmented} from "./segmented";
import {parseReplayNormal} from "./normal";


const filePath = path.resolve(INPUT_PATH);
const stat = await lstat(filePath);

if(!stat.isDirectory()) {
    throw new Error(`Input path ${filePath} is not a directory.`);
}

const files = await readdir(filePath);
const outputFolderPath = path.join(filePath, outputFolderName);
await access(outputFolderPath).catch(async () => {
    await mkdir(outputFolderPath);
})
if(MODE === "segmented") {
    // Ensure output folders exist
    [0,1,2].forEach(async (n) => {
        await access(path.join(outputFolderPath, `${n}`)).catch(async () => {
            await mkdir(outputFolderPath);
        })
    })
}


for(const file of files) {
    const name = path.basename(file, '.json');

    try {
        console.log("processing file ", path.join(filePath, file));

        const txt = await readFile(path.join(filePath, file));
        const replayJSON = JSON.parse(txt.toString());
        const replay = createReplayFromJSON(replayJSON);


        switch (MODE) {
            case "normal":
                const lines = parseReplayNormal(replay, EXTRAS);
                const outputFilePath = path.join(outputFolderPath, `${name}.csv`);
                console.log(`Writing to ${outputFilePath}`);

                await writeFile(outputFilePath, lines.join("\n"));

                break;
            case "segmented":
                try{
                    const fileTexts = parseReplaySegmented(replay, EXTRAS, 30 * 5, 30, 4);

                    fileTexts.forEach(async (fileText, index) => {
                        const outputFilePath = path.join(outputFolderPath, `${fileText.outcome}`, `${name}_${index}.csv`);
                        console.log(`Writing to ${outputFilePath}`);
                        // Write the text to the file

                        await writeFile(outputFilePath, fileText.text);
                    })
                }
                catch (e) {
                    console.log(`Error processing file ${file}:`, e);
                }
                break;
        }

    } catch(e){
        console.log(`Error processing file ${file}:`, e);
    }

}