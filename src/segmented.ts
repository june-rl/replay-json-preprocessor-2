import {Replay} from "./lib/Replay";
import {generateCSVLine, getFrameData} from "./lib/utils";

export const parseReplaySegmented = (replay: Replay, extras: boolean = false, bufferLength: number, frameSkip: number, nSecondsBeforeGoal: number) => {
    const buffers: {buffer: ReturnType<typeof getFrameData>[], outcome: number}[] = [];

    for(let i = 0; i < replay.networkFrames.length; i += frameSkip) {

        if(i + bufferLength >= replay.networkFrames.length) {
            break; // if we are at the end of the replay, skip
        }

        let buffer: ReturnType<typeof getFrameData>[] = [];
        //go to start of buffer
        replay.executeFrames(i);
        for(let j = 0; j < bufferLength; j++) {
            replay.executeFrame(i + j);
            let data = undefined;
            while(!data){
                try{
                    data = getFrameData(replay, nSecondsBeforeGoal * 30);
                    if(!data) throw "no data"; // if we get no data, skip to next frame
                } catch(e) {
                    //console.log(`Error getting frame data at frame ${i + j}:`, e);
                    data = undefined; // reset data if there's an error
                    replay.executeFrame(++i + j)
                }
            }
            buffer.push(data);
        }

        const outcome = buffer[buffer.length - 1]?.outcome ?? -1; // outcome of last frame in the buffer, shouldnt ever be -1
        if( outcome === -1) {
            console.log(`Skipping buffer at frame ${i} due to no outcome.`);
            continue; // skip buffers with no outcome
        }
        buffers.push({buffer, outcome});
    }
    return buffers.map(b => {
        return {
            text: b.buffer.map(frame => generateCSVLine(frame, extras, false)).join("\n"),
            outcome: b.outcome
        }
    });
}