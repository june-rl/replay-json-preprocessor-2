type NetworkFrameActor = {
    actor_id: number,
    stream_id?: number,
    name_id?: number,
    object_id: number,
    attribute: any,
}

type NetworkFrame = {
    time: number,
    delta: number,
    new_actors: NetworkFrameActor[],
    deleted_actors: number[],
    updated_actors: NetworkFrameActor[]
}

type Goal = {
    frame: number,
    team: number
}

export class Replay {
    actors: Map<number, Map<string, Map<string, any>>> = new Map();
    actorNameId: Map<number, number> = new Map();
    networkFrames: NetworkFrame[] = []
    objectNames: string[] = []
    actorNames: string[] = []

    goals: Goal[] = [];

    currentFrame = -1;

    constructor(objectNames: string[], actorNames: string[], networkFrames: any[], goals: Goal[] = []) {
        this.objectNames = objectNames;
        this.actorNames = actorNames;
        this.networkFrames = networkFrames;
        this.goals = goals;
    }

    clearActors() {
        this.actors = new Map();
    }

    setAttribute(actorId: number, objectId: number, name: string, value: any) {
        if (!this.actors.has(actorId)) {
            this.actors.set(actorId, new Map());
        }

        const objectName = this.objectNames[objectId];

        if (!this.actors.get(actorId)?.has(objectName)) {
            this.actors.get(actorId)?.set(objectName, new Map());
        }

        this.actors.get(actorId)?.get(objectName)?.set(name, value);
    }

    getActor(actorId: number) {
        return this.actors.get(actorId);
    }

    getObjectIdFromName(objectName: string) {
        return this.objectNames.indexOf(objectName);
    }

    findActorsByObjectName(objectName: string) {
        return new Map([...this.actors].filter(([actor_id, object_map]) => {
            return object_map.has(objectName);
        }));
    }

    findNextUpdateFrame(actorId: number, currentFrame: number, objectName?: string) {
        for (let i = currentFrame + 1; i < this.networkFrames.length; i++) {
            const frame = this.networkFrames[i];
            const updated_actor = frame.updated_actors.find(actor => actor.actor_id === actorId);
            if (updated_actor) {
                if (objectName) {
                    if (updated_actor.object_id === this.getObjectIdFromName(objectName)) {
                        return i;
                    }
                } else {
                    return i;
                }
            }
        }
    }


    executeFrame(frameIndex: number) {
        const frame = this.networkFrames[frameIndex];

        // new actors
        for (const actor of frame.new_actors) {
            this.actors.set(actor.actor_id, new Map());

            if (actor.object_id) {
                this.actors.get(actor.actor_id)?.set(this.objectNames[actor.object_id], new Map());
            }

            if (actor.name_id) {
                this.actorNameId.set(actor.actor_id, actor.name_id)
            }

        }

        // deleted actors
        for (const actor of frame.deleted_actors) {
            this.actors.delete(actor);
            this.actorNameId.delete(actor);
        }

        // updated actors
        for (const actor of frame.updated_actors) {
            if (actor.attribute) {
                this.setAttribute(actor.actor_id, actor.object_id, Object.keys(actor.attribute)[0], Object.values(actor.attribute)[0]);
            }
        }

        this.currentFrame = frameIndex;

    }

    //clear state and execute first n frames
    executeFrames(count: number) {
        this.clearActors()
        for (let n = 0; n < count; n++) {
            this.executeFrame(n)
        }
    }
}

export const printReplayData = (replay: Replay) => {
    for (const [actor_id, object_map] of replay.actors) {
        const actorNameId = replay.actorNameId.get(actor_id)
        console.log(`\n\n-- Actor ${actor_id} ( ${actorNameId ? replay.actorNames[actorNameId] : actorNameId} ) --`);

        for (const [object_name, attributes] of object_map) {
            console.log(`\n - Object ${object_name} (${replay.getObjectIdFromName(object_name)}) -`);
            for (const [name, value] of attributes) {
                console.log(`${name}:\n${JSON.stringify(value, null, 2)}`);
            }
        }
    }
}

export const createReplayFromJSON = (replayJSON: any) => {
    const network_frames = replayJSON.network_frames.frames;
    const goals: Goal[] = replayJSON['properties']['Goals'].map((g: any) => {
        return {
            frame: g.frame,
            team: g.PlayerTeam
        };
    })
    return new Replay(replayJSON.objects, replayJSON.names, network_frames, goals);
}