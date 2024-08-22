import dotenv from 'dotenv';
import { MultiSwapLarge } from "./runner_large.js";
import { MultiSwapSmall } from "./runner_small.js";
import { router } from './lib.js';
dotenv.config()

export const Tokens = [
    {
        tokenAddress: "0xd429a52a56c712aB8ba11EaCd8Bf178E7c3b4D80",
        router: router.uniswap
    },
    {
        tokenAddress: "0x8a9430e92153c026092544444cBb38077e6688D1",
        router: router.sushiswap
  },
  {
        tokenAddress: "0x5A8F95B20F986E31Dda904bc2059b21D5Ad8A66c",
        router: router.sushiswap
  },
];

var SMALL_BUY = true;
var LARGE_BUY = false; 
var TIME_BETWEEEN = 5000;


var isReadyLarge = true;
var intervalLarge = setInterval(async () => {
    if (isReadyLarge && LARGE_BUY) {
        isReadyLarge = false;
        await MultiSwapLarge((status) => {
            isReadyLarge = status;
        });
    } else {
        console.log(`Latest transaction was not confirmed yet`)
    }
}, TIME_BETWEEEN);




var isReadySmall = true;
const intervalSmall = setInterval(async () => {
    if (isReadySmall && SMALL_BUY) {
        isReadySmall = false;
        await MultiSwapSmall((status) => {
            isReadySmall = status;
        });
    } else {
        console.log(`Latest transaction was not confirmed yet`)
    }
}, TIME_BETWEEEN);
