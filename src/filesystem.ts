import {createReplayFromJSON} from "./lib/Replay";

const INPUT_PATH = '\\\\lil-nas-x\\June\\replays\\JSON';
const MODE: 'normal' | 'segmented' = "normal"; // 'normal' or 'segmented'
const EXTRAS = true; // whether to include extra data in the output

const outputFolderName = 'out_normal';

import {readFile, lstat, readdir, access, mkdir, writeFile} from "fs/promises";
import path from "node:path";
import {parseReplaySegmented} from "./segmented";
import {parseReplayNormal} from "./normal";
import {generateCSVHeader} from "./lib/utils";


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
        const outcomeFolderPath = path.join(outputFolderPath, `${n}`);
        await access(outcomeFolderPath).catch(async () => {
            await mkdir(outcomeFolderPath);
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

                const lines = parseReplayNormal(replay, EXTRAS, 30 * 5);
                const outputFilePath = path.join(outputFolderPath, `${name}.csv`);
                console.log(`Writing to ${outputFilePath}`);

                const text = generateCSVHeader(EXTRAS, true) + "\n" + lines.join("\n");

                await writeFile(outputFilePath, text);

                break;
            case "segmented":
                try{
                    const fileTexts = parseReplaySegmented(replay, EXTRAS, 30 * 2, 60, 5);

                    for( const [index, value] of fileTexts.entries()) {
                        const outputFilePath = path.join(outputFolderPath, `${value.outcome}`, `${name}_${index}.csv`);
                        console.log(`Writing to ${outputFilePath}`);
                        // Write the text to the file

                        const text = generateCSVHeader(EXTRAS, false) + "\n" + value.text;

                        await writeFile(outputFilePath, text);
                    }
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