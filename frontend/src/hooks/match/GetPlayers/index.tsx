import { ethers } from "ethers"
import { Interface } from "ethers/lib/utils"
import { useEffect, useState } from "react"
import { useContractRead } from "wagmi"

export const useGetPlayers = (matchAddress) => {
    const [ players, setPlayers ] = useState([])
    const [ error, setError ] = useState("")
    const [ validAddress, setValidAddress ] = useState(false)

    //0x8e80FFe6Dc044F4A766Afd6e5a8732Fe0977A493
    const { error: requestPlayersError, refetch } = useContractRead({
       addressOrName: matchAddress,
       contractInterface: new Interface(["function getPlayers() public view returns (address[2])"]),
       functionName: 'getPlayers',
       enabled: (matchAddress && validAddress),
       onSuccess: (data) => {
           if (data) {
            console.log('is valid',data)
            setError("")
            setPlayers(data!! as [])
           }
       },
       onError: (err: Error) => {
           setError("Fail get match")
       }
    })

    useEffect(() => {
        try {
            ethers.utils.getAddress(matchAddress)
            setValidAddress(true)
            refetch({ throwOnError: false, cancelRefetch: true })
        } catch {
            setValidAddress(false)
        }
    }, [matchAddress, refetch])

    useEffect(() => {
            console.log('errorsito', requestPlayersError)
        if(requestPlayersError) {
            setValidAddress(false)
            setError("Contract response error")
        }

    }, [requestPlayersError])

    return {
        players,
        error
    }
}
