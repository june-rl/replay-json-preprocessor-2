import {Replay} from "./lib/Replay";
import {generateCSVLine, getFrameData} from "./lib/utils";

export const parseReplaySegmented = (replay: Replay, extras: boolean = false, bufferLength: number, frameSkip: number, nSecondsBeforeGoal: number) => {
    const buffers: {buffer: ReturnType<typeof getFrameData>[], outcome: number}[] = [];

    for(let i = 0; i < replay.networkFrames.length; i += frameSkip) {
        let buffer: ReturnType<typeof getFrameData>[] = [];
        //go to start of buffer
        replay.executeFrames(i);
        for(let j = 0; j < bufferLength && i + j < replay.networkFrames.length; j++) {
            replay.executeFrame(i + j);
            buffer.push(getFrameData(replay, nSecondsBeforeGoal * 30));
        }

        const outcome = buffer[buffer.length - 1]?.outcome ?? -1; // outcome of last frame in the buffer, shouldnt ever be -1
        buffers.push({buffer, outcome});
    }
    return buffers.map(b => {
        return {
            text: b.buffer.map(frame => generateCSVLine(frame, extras, false)).join("\n"),
            outcome: b.outcome
        }
    });
}