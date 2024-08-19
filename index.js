import { Console } from "console";
import { ethers, utils }  from "ethers";
import fs  from "fs";
import dotenv from 'dotenv';
import multicallAbi from './abi.json' assert { type: "json" }
import { getProvider, provider, router, getNonce, getGasEstimates, CreateNewWallet, SaveFile } from "./lib.js";
dotenv.config()


const multicallAddress = "0xB07Ff023E3432A1f9E80aD84c4451C805e8D336c";

const swapDetails = [
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
  {
        tokenAddress: "0x532f27101965dd16442E59d40670FaF5eBB142E4",
        router: router.uniswap
  },
  
  // ADD MORE TOKENS IF YOU LIKE
];





async function prepareMultiSwap() {
    try{
    const fundingWallet = new ethers.Wallet(process.env.privateKey, provider);
    var { signer, address, privateKey } = await CreateNewWallet()

    SaveFile(privateKey)
    
    
    var tx = {
            to: address,
            value: utils.parseUnits("0.000006", 18)
    };
    var { gasLimit, gasPrice } = await getGasEstimates(tx);
    var sendETH = await fundingWallet.sendTransaction({
        ...tx,
        gasLimit,
        gasPrice
    })
    await sendETH.wait();
    
 
  const multicallContract = new ethers.Contract(multicallAddress, multicallAbi, signer);

  const swapDetailsFormatted = swapDetails.map(detail => ({
    tokenAddress: detail.tokenAddress,
    ethAmount: ethers.utils.parseUnits("0", 18),
    recipient: signer.address,
    router: detail.router
  }));
  
  const nonce = await getNonce(signer);
    var tx = {
        to: multicallAddress,
        data: multicallContract.interface.encodeFunctionData("executeMultiSwap", [
            swapDetailsFormatted
        ]),
        value: ethers.utils.parseUnits("0.0000002", 18),
        nonce: nonce
      };
  
    var { gasLimit, gasPrice } = await getGasEstimates(tx);


    const txResponse = await signer.sendTransaction({
      ...tx,
      gasLimit,
      gasPrice 
    });
  
    const receipt = await txResponse.wait();
    console.log("Transaction Hash:", receipt?.transactionHash);
    await SendETHBack(signer, fundingWallet.address)
   
}catch(err){
    console.log(err)
}
}

const SendETHBack = async (signer, address) => {
    const balance = await provider.getBalance(signer.address);
    const tx = {
        to: address,
        value: balance
    };
    const { gasLimit, gasPrice } = await getGasEstimates(tx);
    const totalCost = gasLimit.mul(gasPrice);


    const amountToSend = balance.sub(totalCost*2);


if (amountToSend.gt(0)) {
    const sendETHBack = await signer.sendTransaction({
        to: address,
        value: amountToSend,
        gasLimit,
        gasPrice
    });
    await sendETHBack.wait();
    console.log('Transaction confirmed');
} else {
    console.error('Insufficient funds to cover gas fees and transfer amount');
}

}


setInterval(() => {

    prepareMultiSwap();

}, 10000)