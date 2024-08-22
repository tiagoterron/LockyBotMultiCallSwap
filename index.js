import { Console } from "console";
import { ethers, utils }  from "ethers";
import fs  from "fs";
import dotenv from 'dotenv';
import multicallAbi from './abi.json' assert { type: "json" }
import { getProvider, router, getNonce, getGasEstimates, CreateNewWallet, SaveFile, sleep, approveRouterIfNeeded } from "./lib.js";
dotenv.config()


const multicallAddress = "0x75979348AaC4b33B0D624f043C40caDA655664aA";

const swapDetails = [
    {
        tokenAddress: "0xd429a52a56c712aB8ba11EaCd8Bf178E7c3b4D80",
        router: router.uniswap
    },
    // {
    //     tokenAddress: "0x7480527815ccAE421400Da01E052b120Cc4255E9",
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
//   {
//         tokenAddress: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
//         router: router.uniswap
//   },
  
  // ADD MORE TOKENS IF YOU LIKE
];





export async function prepareMultiSwap(callback) {
    try{
    var provider = getProvider();
    const signer = new ethers.Wallet(process.env.privateKey, provider);
    var fundingWalletBalance = await provider.getBalance(signer.address);
    console.log(`Initiating Main Wallet`, signer.address);
    console.log(`Current balance`, utils.formatUnits(fundingWalletBalance, 18));
   
  const multicallContract = new ethers.Contract(multicallAddress, multicallAbi, signer);
  
  const approvals = swapDetails.map(async (item) => {
    return await approveRouterIfNeeded({
        router: item?.router,
        amount: ethers.utils.parseUnits("100000", 18),
        owner: signer?.address,
        spender: multicallAddress,
        signer: signer,
        provider: provider,
        token: item?.tokenAddress
    });
});

// Wait for all approvals to complete
const approvalResults = await Promise.all(approvals);
// Check if all approvals were successful
if (approvalResults.every(res => res === true)) {
  const swapDetailsFormatted = swapDetails.map(detail => ({
    tokenAddress: detail.tokenAddress,
    ethAmount: ethers.utils.parseUnits("0", 18),
    recipient: signer.address,
    router: detail.router
  }));
  
    const nonce = await getNonce(signer, {provider: provider});
    var tx = {
        to: multicallAddress,
        data: multicallContract.interface.encodeFunctionData("executeSwap", [
            swapDetailsFormatted
        ]),
        value: fundingWalletBalance.mul(20).div(100),
        // value: ethers.utils.parseUnits("0.0001", 18),
        nonce: nonce
      };
    var { gasLimit, gasPrice } = await getGasEstimates(tx, {provider: provider});


    const txResponse = await signer.sendTransaction({
      ...tx,
      gasLimit,
      gasPrice 
    });
    
    console.log(`Swapping`)
    const receipt = await txResponse.wait();
    callback(true)
    console.log("Transaction Hash:", receipt?.transactionHash);
}
}catch(err){
    callback(true)
    console.log(err)
}
}


// var isReady = false;
// await prepareMultiSwap((status) => {
//     isReady = status;
// });


// let isReady = true;
// const interval = setInterval(async () => {
//     if (isReady) {
//         isReady = false;
//         await prepareMultiSwap((status) => {
//             isReady = status;
//         });
//     } else {
//         console.log(`Latest transaction was not confirmed yet`)
//     }
// }, 10000);