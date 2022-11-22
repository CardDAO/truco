import { BigNumber } from "ethers"
import { formatEther, formatUnits, Interface } from "ethers/lib/utils"
import { useState } from "react"
import { useContractRead } from "wagmi"

export const useCurrentBet = (matchAddress) => {
    const [ betValue, setBetValue ] = useState(0)

    useContractRead({
       addressOrName: process.env.FRONT_MATCH_FACADE_ADDRESS as string,
       contractInterface: new Interface(["function getCurrentBet(address) public view returns (uint256)"]),
       functionName: 'getCurrentBet',
       args: [matchAddress],
       onSuccess: (data) => {
           if (data) {
               console.log('get current bet value data', data)
               setBetValue(data.toNumber())

           }
       }
    })

    return {
        currentBetValue: betValue
    }

}
