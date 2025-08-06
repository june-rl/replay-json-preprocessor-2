export type Car = {
    location:
        {
            x: number,
            y: number,
            z: number
        },
    rotation:
        {
            w: number,
            x: number,
            y: number,
            z: number
        },
    linear_velocity:
        {
            x: number,
            y: number,
            z: number
        },
    angular_velocity:
        {
            x: number,
            y: number,
            z: number
        },
    boost: number,
    team: number,
    hidden: 0 | 1,
}

export type Ball = {
    location:
        {
            x: number,
            y: number,
            z: number
        }
    team: Colour
}

// blue, orange, neutral
export type Colour = {
    blue: 0|1,
    orange: 0|1,
    neutral: 0|1
};