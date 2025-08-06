import {program} from 'commander';

program
    .option('-i, --input <path>', 'Path to the input replay folder')
    .option('-o, --output <path>', 'Path to output folder')
    .option('-s, --symmetry', 'Enable symmetry mode')
    .option('-f, --features', 'Enable additional features')
    .option('-m --segmented-mode', 'Use segmented mode')
    .option('-b, --buffer-length <length>', 'Length of the buffer')
    .option('-s, --skip-frames <count>', 'Frame skip')
    .option('-n --n-seconds <seconds>', 'Number of seconds before goal')
.parse(process.argv);

const options = program.opts();

let inputPath: string = options.input || '';
let outputPath: string = options.output || '';
let symmetry: boolean = false;
let features: boolean = false;
let mode: 'default' | 'segmented' = options.segmentedMode ? 'segmented' : 'default';
let bufferLength: number = parseInt(options.bufferLength) || 90;
let skipFrames: number = parseInt(options.skipFrames) || 30;
let nSeconds: number = parseInt(options.nSeconds) || 2;
