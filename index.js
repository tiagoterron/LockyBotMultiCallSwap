import dotenv from 'dotenv';
import "./runner_large.js";
import "./runner_small.js";
import { router } from './lib.js';
import { MultiSwapLarge } from './runner_large.js';
import { MultiSwapSmall } from './runner_small.js';
dotenv.config()

export const multicallAddress = "0xB9Bae08176dF3CE080b7729299C38B7B8b9bda21";

export const Tokens = [
    {
        tokenAddress: "0xd429a52a56c712aB8ba11EaCd8Bf178E7c3b4D80",
        router: router.uniswap
    },
    // {
    //     tokenAddress: "0x160452f95612699D1a561A70EEEeeDe67c6812af",
    //     router: router.uniswap
    // },
//     {
//         tokenAddress: "0x8a9430e92153c026092544444cBb38077e6688D1",
//         router: router.sushiswap
//   },
//   {
//         tokenAddress: "0x5A8F95B20F986E31Dda904bc2059b21D5Ad8A66c",
//         router: router.sushiswap
//   },
];


export var SMALL_VALUE_BUY = "0.000002";
export var GAS_PRICE = 4; // 2 = Low / 3 = Medium / 4 = High / 5 / = SUPER HIGH
export var SMALL_BUY = true; // Activate small buys
export var LARGE_BUY = true;  // Activate large buys
export var TIME_BETWEEEN_SMALL = 5000; // Change time between small transactions 1s = 1000
export var TIME_BETWEEEN_LARGE = 5000; // Change time between large transactions 1s = 1000


var isReadySmall = true;
const intervalSmall = setInterval(async () => {
    if (isReadySmall && SMALL_BUY) {
        isReadySmall = false;
        await MultiSwapSmall((status) => {
            isReadySmall = status;
        });
    } else {
        console.log(`Small latest transaction was not confirmed yet`)
    }
}, TIME_BETWEEEN_SMALL);


var isReadyLarge = true;
var intervalLarge = setInterval(async () => {
    if (isReadyLarge && LARGE_BUY) {
        isReadyLarge = false;
        await MultiSwapLarge((status) => {
            isReadyLarge = status;
        });
    } else {
        console.log(`Large latest transaction was not confirmed yet`)
    }
}, TIME_BETWEEEN_LARGE);


