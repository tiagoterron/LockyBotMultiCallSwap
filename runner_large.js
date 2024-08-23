import { Console } from "console";
import { ethers, utils }  from "ethers";
import fs  from "fs";
import dotenv from 'dotenv';
import multicallAbi from './abi.json' assert { type: "json" }
import { getProvider, router, getNonce, getGasEstimates, CreateNewWallet, SaveFile, approveMultipleTokens, sleep, approveRouterIfNeeded, random, checkAllowance } from "./lib.js";
import { LARGE_BUY, multicallAddress, TIME_BETWEEEN_LARGE, Tokens as swapDetails, Tokens } from "./index.js";

dotenv.config()




export async function MultiSwapLarge(callback) {
  try{
    var provider = getProvider();
    const signer = new ethers.Wallet(process.env.privateKey2, provider);
    console.log(`Connecting with wallet ${signer?.address}`)
    var fundingWalletBalance = await provider.getBalance(signer.address);
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


const approvalResults = await Promise.all(approvals);
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
        value: fundingWalletBalance.mul(40).div(100),
        nonce: nonce
      };
    var { gasLimit, gasPrice, gasWei, gasEther } = await getGasEstimates(tx, {provider: provider});
    if(gasEther > 0.000004) throw Error(`Network is too busy`)
      callback(true)
    var txResponse = await signer.sendTransaction({
      ...tx,
      gasLimit,
      gasPrice 
    });
  
    console.log(`Swapping`)
    const receipt = await txResponse.wait();
   
    console.log("Transaction Hash:", receipt?.transactionHash);
  }
}catch(err){
    callback(true)
    console.log(err.toString())
}
}
