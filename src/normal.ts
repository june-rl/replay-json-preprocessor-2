import {createReplayFromJSON} from "./lib/Replay";
import {Replay} from "./lib/Replay";
import {generateCSVLine, getCars, getFrameData} from "./lib/utils";

export const parseReplayNormal = (replay: Replay, extras: boolean = false, nSecondsBeforeGoal: number) => {
    const lines = [];
    for(let i = 0; i < replay.networkFrames.length; i++) {
        replay.executeFrame(i);
        try{
            lines.push(generateCSVLine(getFrameData(replay, nSecondsBeforeGoal * 30), extras));
        } catch (e) {
            console.log(e)
        }
    }

    return lines;
}