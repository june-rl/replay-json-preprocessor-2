import {Ball, Car, Colour} from "./types.js";
import {createReplayFromJSON, Replay} from "./Replay.js";
import {readFile} from "fs/promises";

export const getCars = (replay: Replay): Car[] => {
    const carActors = replay.findActorsByObjectName("Archetypes.Car.Car_Default");
    const boostActors = replay.findActorsByObjectName("Archetypes.CarComponents.CarComponent_Boost");

    const carActorsBoostMap = new Map<number, number>();

    boostActors.forEach((objectMap, key) => {
        const actor_id = objectMap.get("TAGame.CarComponent_TA:Vehicle")?.get("ActiveActor")?.actor;
        const boost_amount = objectMap.get("TAGame.CarComponent_Boost_TA:ReplicatedBoost")?.get("ReplicatedBoost")?.boost_amount
        carActorsBoostMap.set(actor_id, boost_amount)
    })

    const cars: Car[] = [];

    carActors.forEach((objectMap, key) => {

        const location = objectMap.get("TAGame.RBActor_TA:ReplicatedRBState")?.get("RigidBody").location ?? {x:0, y:0, z:0};
        const rotation = objectMap.get("TAGame.RBActor_TA:ReplicatedRBState")?.get("RigidBody").rotation ?? {w: 0, x:0, y:0, z:0};
        const linear_velocity = objectMap.get("TAGame.RBActor_TA:ReplicatedRBState")?.get("RigidBody").linear_velocity ?? {x:0, y:0, z:0};
        const angular_velocity = objectMap.get("TAGame.RBActor_TA:ReplicatedRBState")?.get("RigidBody").angular_velocity ?? {x:0, y:0, z:0};
        const boost = carActorsBoostMap.get(key) || 0;
        const team = objectMap.get("TAGame.Car_TA:TeamPaint")?.get("TeamPaint")?.team;
        const hidden = objectMap.get("Engine.Actor:bHidden")?.get("Boolean") ? 1 : 0;
        cars.push({
            location,
            rotation,
            linear_velocity,
            angular_velocity,
            boost,
            team,
            hidden
        })
    });

    const visible = cars.filter(car => car.hidden === 0);

    if(visible.filter(c => c.team === 0).length !== 3 || visible.filter(c => c.team === 1).length !== 3) {
        throw new Error("Invalid number of cars per team")
    }

    // cars are sorted by team, blue first then orange
    return visible.toSorted((a, b) => a.team - b.team);
}

export const getBall = (replay: Replay): Ball | null => {
    const ballActor = replay.findActorsByObjectName("Archetypes.Ball.Ball_Default").values().next().value;

    if(!ballActor) {
        return null;
    }

    // @ts-ignore
    const teamValue = ballActor.get("TAGame.Ball_TA:HitTeamNum")?.get("Byte");
    let team: Colour;
    if(teamValue === undefined) {
        team = {
            blue: 0,
            orange: 0,
            neutral: 1
        }
    } else {
        team = {
            blue: teamValue === 0 ? 1 : 0,
            orange: teamValue === 1 ? 1 : 0,
            neutral: 0
        }
    }

    return {
        // @ts-ignore
        location: ballActor.get("TAGame.RBActor_TA:ReplicatedRBState")?.get("RigidBody")?.location,
        team
    }
}

// 0 if nothing, 1 if blue team wins, 2 if orange team wins
export const getOutcome = (replay: Replay, frameThreshold: number): number => {
    let goalsWithinThreshold = replay.goals.filter(g => g.frame - replay.currentFrame < frameThreshold && g.frame - replay.currentFrame > 0);
    if (goalsWithinThreshold.length == 0){
        return 0;
    } else {
        const goal = goalsWithinThreshold[0];
        return goal.team === 0 ? 1 : 2
    }
}

export const generateCSVHeader = (extras: boolean = false, outcome: boolean = true) => {
    return [1,2,3,4,5,6].map(n => [`car${n}_location_x`,`car${n}_location_y`,`car${n}_location_z`,`car${n}_boost`].join(",")).join(",") + "," +
    "ball_location_x,ball_location_y,ball_location_z," +
    (extras ? "blue_goal_distance,orange_goal_distance," + [1,2,3,4,5,6].map(n => `car${n}_ball_distance`).join(",") + "," : "") +
    outcome ? ",outcome" : "";
}

export const generateCSVLine = (data: ReturnType<typeof getFrameData>, extras: boolean, outcome: boolean = true) => {
    let line = [];
    if (!data) return; // skip empty lines

    data.cars.forEach((car => {
        line.push(car.location.x, car.location.y, car.location.z, car.boost);
    }))

    line.push(data.ball.location.x, data.ball.location.y, data.ball.location.z);

    if(extras){
        line.push(data.extras.blueGoalDistance, data.extras.orangeGoalDistance);
        line.push(...data.extras.carBallDistances);
    }

    if(outcome) line.push(data.outcome);
    return line;
}

export const getFrameData = (replay: Replay, frameThreshold: number) => {
    const cars = getCars(replay);
    const ball = getBall(replay);
    const outcome = getOutcome(replay, frameThreshold);

    try{
        if(cars.length !== 6) {
            console.log("Not 6 cars found. skipping frame")
            return null;
        }
        if(!ball) {
            console.log("No ball found. skipping frame");
            return null;
        }

        // cut out frames after goal scored
        let frameThreshold = 8*30; // 8 seconda at 30hz
        let goalsWithinThreshold = replay.goals.filter(g => replay.currentFrame - g.frame < frameThreshold && replay.currentFrame > g.frame);
        if(goalsWithinThreshold.length > 0) {
            return null;
        }

        // Extras
        const BLUE_GOAL_Y = -5120
        const ORANGE_GOAL_Y = 5120;

        // Ball distance from blue goal
        const blueGoalDistance = distance3D(ball.location, {x: 0, y: BLUE_GOAL_Y, z: 0});
        // Ball distance from orange goal
        const orangeGoalDistance = distance3D(ball.location, {x: 0, y: ORANGE_GOAL_Y, z: 0});

        // For each car, distance from ball
        const carBallDistances = cars.map((c, index) => {
            return distance3D(c.location, ball.location);
        })

        return {
            cars,
            ball,
            extras: {blueGoalDistance, orangeGoalDistance, carBallDistances},
            outcome
        }

    } catch (e) {
        throw(`Frame ${replay.currentFrame}: Error generating CSV line\n${e}`);
    }
}

export const loadReplayFile = async (filePath: string): Promise<Replay> => {
    const txt = await readFile(filePath);
    // @ts-ignore
    const replayJSON = JSON.parse(txt);
    return createReplayFromJSON(replayJSON);
}

const distance3D = (a: {x: number, y: number, z: number}, b: {x: number, y: number, z: number}) => {
    return Math.sqrt(
        Math.pow(a.x - b.x, 2) +
        Math.pow(a.y - b.y, 2) +
        Math.pow(a.z - b.z, 2)
    );
}